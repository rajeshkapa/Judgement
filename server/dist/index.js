"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const GameEngine_1 = require("./GameEngine");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const server = http_1.default.createServer(app);
// Serve static files from 'public' directory
app.use(express_1.default.static('public'));
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*", // Allow all for now, restrict in prod
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 3000;
// Room management
const rooms = new Map();
// Helper to sanitize state for client
function getClientState(state, socketId) {
    const myPlayer = state.players.find(p => p.socketId === socketId);
    const mySeatIndex = myPlayer ? myPlayer.id : -1;
    const clientPlayers = state.players.map(p => {
        const isMe = p.socketId === socketId;
        return {
            id: p.id,
            socketId: p.socketId,
            sessionId: p.sessionId,
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
function broadcastUpdate(roomCode) {
    const game = rooms.get(roomCode);
    if (!game)
        return;
    const state = game.getState();
    state.players.forEach(player => {
        if (player.connected) {
            const clientState = getClientState(state, player.socketId);
            io.to(player.socketId).emit('game_update', clientState);
        }
    });
    // Also broadcast lobby update since player count/status might have changed
    broadcastLobbyUpdate();
}
function getLobbyRooms() {
    const lobbyRooms = [];
    rooms.forEach((game, roomId) => {
        var _a;
        const state = game.getState();
        // Only show waiting rooms or maybe all? Let's show all for now.
        // Prompt says: "Room status changes to PLAYING (remove it from the public list or mark as locked)."
        // We'll mark as PLAYING.
        lobbyRooms.push({
            roomId,
            hostName: ((_a = state.players[0]) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown',
            playerCount: state.players.length,
            maxPlayers: 4,
            status: state.phase === 'LOBBY' ? 'WAITING' : 'PLAYING'
        });
    });
    return lobbyRooms;
}
function broadcastLobbyUpdate() {
    io.emit('lobby:update', getLobbyRooms());
}
// Cleanup empty rooms
setInterval(() => {
    rooms.forEach((game, roomId) => {
        const state = game.getState();
        const connectedCount = state.players.filter(p => p.connected).length;
        // If empty for a while, delete. 
        // For simplicity, if 0 connected players, delete immediately or after short buffer?
        // Prompt says: "If a room remains empty (0 players) for more than 1 minute"
        // We need to track last activity or just check periodically.
        // Let's just check if 0 connected.
        if (connectedCount === 0) {
            // We could add a timestamp to GameEngine to track when it became empty
            // But for now, let's just delete if empty to keep it simple as per "prevent server bloat"
            // Or maybe we should wait. Let's assume immediate for now if all disconnected.
            // Actually, if everyone disconnects, we might want to keep it for a bit for reconnection.
            // But if it's truly 0 players (never joined or all left), we can kill it.
            // Let's just log for now.
            // console.log(`Room ${roomId} is empty.`);
        }
    });
}, 60000);
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    const sessionId = socket.handshake.auth.sessionID;
    // 1. Try to reconnect to existing session
    let reconnected = false;
    if (sessionId) {
        rooms.forEach((game, roomCode) => {
            if (reconnected)
                return;
            if (game.reconnectPlayer(socket.id, sessionId)) {
                socket.join(roomCode);
                console.log(`Session ${sessionId} reconnected to room ${roomCode}`);
                broadcastUpdate(roomCode);
                reconnected = true;
            }
        });
    }
    if (!reconnected) {
        // Just a new connection in lobby
        socket.emit('lobby:update', getLobbyRooms());
    }
    socket.on('lobby:get_rooms', () => {
        socket.emit('lobby:update', getLobbyRooms());
    });
    socket.on('create_room', (playerName) => {
        const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        const game = new GameEngine_1.GameEngine(roomCode, () => broadcastUpdate(roomCode));
        rooms.set(roomCode, game);
        game.addPlayer(socket.id, sessionId, playerName);
        socket.join(roomCode);
        socket.emit('room_created', roomCode);
        broadcastUpdate(roomCode);
    });
    socket.on('join_room', ({ roomCode, playerName }) => {
        const game = rooms.get(roomCode);
        if (!game) {
            socket.emit('error', 'Room not found');
            return;
        }
        if (game.getState().phase !== 'LOBBY') {
            socket.emit('error', 'Game already started');
            return;
        }
        const player = game.addPlayer(socket.id, sessionId, playerName);
        if (!player) {
            socket.emit('error', 'Room is full');
            return;
        }
        socket.join(roomCode);
        broadcastUpdate(roomCode);
        // Auto-start check
        if (game.getState().players.length === 4) {
            // Start countdown
            io.to(roomCode).emit('game_countdown', 5); // 5 seconds
            // We should probably handle this in GameEngine or here.
            // Let's do a simple timeout here.
            setTimeout(() => {
                // Check if still full
                if (game.getState().players.length === 4) {
                    game.startGame();
                    broadcastUpdate(roomCode);
                }
                else {
                    io.to(roomCode).emit('game_countdown_cancelled');
                }
            }, 5000);
        }
    });
    socket.on('start_game', (roomCode) => {
        const game = rooms.get(roomCode);
        if (!game)
            return;
        if (game.startGame()) {
            broadcastUpdate(roomCode);
        }
        else {
            socket.emit('error', 'Need 4 players to start');
        }
    });
    socket.on('place_bid', ({ roomCode, bid }) => {
        const game = rooms.get(roomCode);
        if (!game)
            return;
        if (game.placeBid(socket.id, bid)) {
            broadcastUpdate(roomCode);
        }
        else {
            socket.emit('error', 'Invalid bid');
        }
    });
    socket.on('play_card', ({ roomCode, cardId }) => {
        const game = rooms.get(roomCode);
        if (!game)
            return;
        if (game.playCard(socket.id, cardId)) {
            broadcastUpdate(roomCode);
        }
        else {
            socket.emit('error', 'Invalid move');
        }
    });
    socket.on('send_message', ({ roomCode, message }) => {
        const game = rooms.get(roomCode);
        if (!game)
            return;
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
                // We'll let the cleanup interval handle it or do it here if we want instant cleanup.
                // Prompt says "If a room remains empty (0 players) for more than 1 minute".
                // So we shouldn't delete immediately.
                // We can tag the room with a "emptySince" timestamp.
                // For now, let's leave it to the interval (which I need to improve to respect the 1 min rule).
            }
        });
    });
});
// Improved cleanup with 1 min timeout
const emptyRooms = new Map(); // roomId -> timestamp
setInterval(() => {
    const now = Date.now();
    rooms.forEach((game, roomId) => {
        const state = game.getState();
        const connectedCount = state.players.filter(p => p.connected).length;
        if (connectedCount === 0) {
            if (!emptyRooms.has(roomId)) {
                emptyRooms.set(roomId, now);
            }
            else {
                const emptySince = emptyRooms.get(roomId);
                if (now - emptySince > 60000) {
                    rooms.delete(roomId);
                    emptyRooms.delete(roomId);
                    console.log(`Room ${roomId} deleted due to inactivity.`);
                    broadcastLobbyUpdate();
                }
            }
        }
        else {
            emptyRooms.delete(roomId);
        }
    });
}, 5000); // Check every 5 seconds
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
