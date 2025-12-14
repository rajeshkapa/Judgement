import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, LobbyRoom } from '../logic/types';

interface GameContextType {
    gameState: GameState | null;
    socket: Socket | null;
    isConnected: boolean;
    lobbyRooms: LobbyRoom[];
    createRoom: (name: string) => void;
    joinRoom: (roomCode: string, name: string) => void;
    getLobbyRooms: () => void;
    startGame: () => void;
    placeBid: (bid: number) => void;
    playCard: (cardId: string) => void;
    error: string | null;
    clearError: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [lobbyRooms, setLobbyRooms] = useState<LobbyRoom[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Session ID logic
        const params = new URLSearchParams(window.location.search);
        const debugUser = params.get('user');

        let sessionId = localStorage.getItem('sessionID');

        // If debug user is provided, use it as session ID (or distinct storage key)
        if (debugUser) {
            sessionId = `debug_session_${debugUser}`;
            // We don't save this to the main sessionID key to avoid messing up the main user
        } else if (!sessionId) {
            // Fallback for older browsers if crypto.randomUUID is not available
            if (typeof crypto.randomUUID === 'function') {
                sessionId = crypto.randomUUID();
            } else {
                sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
            }
            localStorage.setItem('sessionID', sessionId);
        }

        // Connect to server
        const socketUrl = import.meta.env.PROD ? '/' : 'http://localhost:3000';
        const newSocket = io(socketUrl, {
            auth: { sessionID: sessionId }
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            setIsConnected(true);
            console.log('Connected to server');
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
            console.log('Disconnected from server');
        });

        newSocket.on('game_update', (newState: GameState) => {
            setGameState(newState);
        });

        newSocket.on('lobby:update', (rooms: LobbyRoom[]) => {
            setLobbyRooms(rooms);
        });

        newSocket.on('error', (msg: string) => {
            setError(msg);
        });

        newSocket.on('room_created', (roomCode: string) => {
            console.log('Room created:', roomCode);
        });

        return () => {
            newSocket.close();
        };
    }, []);

    const createRoom = (name: string) => {
        socket?.emit('create_room', name);
    };

    const joinRoom = (roomCode: string, name: string) => {
        socket?.emit('join_room', { roomCode, playerName: name });
    };

    const getLobbyRooms = () => {
        socket?.emit('lobby:get_rooms');
    };

    const startGame = () => {
        if (gameState?.roomId) {
            socket?.emit('start_game', gameState.roomId);
        }
    };

    const placeBid = (bid: number) => {
        if (gameState?.roomId) {
            socket?.emit('place_bid', { roomCode: gameState.roomId, bid });
        }
    };

    const playCard = (cardId: string) => {
        if (gameState?.roomId) {
            socket?.emit('play_card', { roomCode: gameState.roomId, cardId });
        }
    };

    const clearError = () => setError(null);

    return (
        <GameContext.Provider value={{
            gameState,
            socket,
            isConnected,
            lobbyRooms,
            createRoom,
            joinRoom,
            getLobbyRooms,
            startGame,
            placeBid,
            playCard,
            error,
            clearError
        }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
};
