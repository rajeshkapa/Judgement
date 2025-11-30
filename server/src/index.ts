import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { GameEngine } from './GameEngine';
import { ClientGameState, ClientPlayer, GameState } from './types';

const app = express();
app.use(cors());

const server = http.createServer(app);

// Serve static files from 'public' directory
app.use(express.static('public'));

const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for now, restrict in prod
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Room management
const rooms: Map<string, GameEngine> = new Map();

// Helper to sanitize state for client
function getClientState(state: GameState, socketId: string): ClientGameState {
    const myPlayer = state.players.find(p => p.socketId === socketId);
    const mySeatIndex = myPlayer ? myPlayer.id : -1;

    const clientPlayers: ClientPlayer[] = state.players.map(p => {
        const isMe = p.socketId === socketId;
        return {
            id: p.id,
            socketId: p.socketId,
            name: p.name,
            currentBid: p.currentBid,
            tricksWon: p.tricksWon,
            totalScore: p.totalScore,
            connected: p.connected,
            cardCount: p.hand.length,
            hand: isMe ? p.hand : undefined // Only show my hand
        };
    });

    return {
        roomId: state.roomId,
        round: state.round,
        dealerIndex: state.dealerIndex,
        currentPlayerIndex: state.currentPlayerIndex,
        players: clientPlayers,
        currentTrick: state.currentTrick,
        trumpSuit: state.trumpSuit,
        phase: state.phase,
        leadSuit: state.leadSuit,
        log: state.log,
        chatLog: state.chatLog,
        turnDeadline: state.turnDeadline,
        mySeatIndex
    };
}

function broadcastUpdate(roomCode: string) {
    const game = rooms.get(roomCode);
    if (!game) return;

    const state = game.getState();
    state.players.forEach(player => {
        if (player.connected) {
            const clientState = getClientState(state, player.socketId);
            io.to(player.socketId).emit('game_update', clientState);
        }
    });
}

io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', (playerName: string) => {
        const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        const game = new GameEngine(roomCode, () => broadcastUpdate(roomCode));
        rooms.set(roomCode, game);

        game.addPlayer(socket.id, playerName);
        socket.join(roomCode);

        socket.emit('room_created', roomCode);
        broadcastUpdate(roomCode);
    });

    socket.on('join_room', ({ roomCode, playerName }: { roomCode: string, playerName: string }) => {
        const game = rooms.get(roomCode);
        if (!game) {
            socket.emit('error', 'Room not found');
            return;
        }

        if (game.getState().phase !== 'LOBBY') {
            socket.emit('error', 'Game already started');
            return;
        }

        const player = game.addPlayer(socket.id, playerName);
        if (!player) {
            socket.emit('error', 'Room is full');
            return;
        }

        socket.join(roomCode);
        broadcastUpdate(roomCode);
    });

    socket.on('start_game', (roomCode: string) => {
        const game = rooms.get(roomCode);
        if (!game) return;

        // Only host (first player?) can start? 
        // For simplicity, anyone in room can start if full.
        if (game.startGame()) {
            broadcastUpdate(roomCode);
        } else {
            socket.emit('error', 'Need 4 players to start');
        }
    });

    socket.on('place_bid', ({ roomCode, bid }: { roomCode: string, bid: number }) => {
        const game = rooms.get(roomCode);
        if (!game) return;

        if (game.placeBid(socket.id, bid)) {
            broadcastUpdate(roomCode);
        } else {
            socket.emit('error', 'Invalid bid');
        }
    });

    socket.on('play_card', ({ roomCode, cardId }: { roomCode: string, cardId: string }) => {
        const game = rooms.get(roomCode);
        if (!game) return;

        if (game.playCard(socket.id, cardId)) {
            broadcastUpdate(roomCode);
        } else {
            socket.emit('error', 'Invalid move');
        }
    });

    socket.on('send_message', ({ roomCode, message }: { roomCode: string, message: string }) => {
        const game = rooms.get(roomCode);
        if (!game) return;

        const player = game.getState().players.find(p => p.socketId === socket.id);
        if (player) {
            game.addChatMessage(player.name, message);
            broadcastUpdate(roomCode);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Find room user was in
        rooms.forEach((game, roomCode) => {
            const player = game.getState().players.find(p => p.socketId === socket.id);
            if (player) {
                game.removePlayer(socket.id);
                broadcastUpdate(roomCode);

                // If room empty, delete?
                const connectedCount = game.getState().players.filter(p => p.connected).length;
                if (connectedCount === 0) {
                    rooms.delete(roomCode);
                }
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
