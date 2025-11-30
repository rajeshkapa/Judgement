import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState } from '../logic/types';

interface GameContextType {
    gameState: GameState | null;
    socket: Socket | null;
    isConnected: boolean;
    createRoom: (name: string) => void;
    joinRoom: (roomCode: string, name: string) => void;
    startGame: () => void;
    placeBid: (bid: number) => void;
    playCard: (cardId: string) => void;
    error: string | null;
    clearError: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Default initial state for UI before connection
const INITIAL_STATE: GameState = {
    roomId: '',
    round: 1,
    dealerIndex: 0,
    currentPlayerIndex: 0,
    players: [],
    currentTrick: [],
    trumpSuit: 'Hearts',
    phase: 'LOBBY',
    leadSuit: null,
    log: [],
    chatLog: [],
    turnDeadline: null,
    mySeatIndex: -1
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Connect to server
        // Use relative path in production (same origin), localhost in dev
        const socketUrl = import.meta.env.PROD ? '/' : 'https://management-izrn.onrender.com';
        const newSocket = io(socketUrl);
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
            createRoom,
            joinRoom,
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
