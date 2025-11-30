import React, { useState } from 'react';
import { useGame } from '../context/GameContext';

export const Lobby: React.FC = () => {
    const { createRoom, joinRoom, error, clearError } = useGame();
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [mode, setMode] = useState<'menu' | 'join'>('menu');

    const handleCreate = () => {
        if (!name) return;
        createRoom(name);
    };

    const handleJoin = () => {
        if (!name || !roomCode) return;
        joinRoom(roomCode.toUpperCase(), name);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-green-800 text-white font-sans">
            <h1 className="text-6xl font-bold mb-12 drop-shadow-lg">Management</h1>

            <div className="bg-green-900 p-8 rounded-xl shadow-2xl border border-green-700 w-96">
                {error && (
                    <div className="bg-red-500 text-white p-3 rounded mb-4 text-center cursor-pointer" onClick={clearError}>
                        {error}
                    </div>
                )}

                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2 text-green-200">Your Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full p-3 rounded bg-green-800 border border-green-600 focus:border-yellow-400 focus:outline-none text-white placeholder-green-500"
                        placeholder="Enter your name"
                    />
                </div>

                {mode === 'menu' ? (
                    <div className="space-y-4">
                        <button
                            onClick={handleCreate}
                            disabled={!name}
                            className={`w-full py-3 rounded font-bold text-lg transition-colors ${name ? 'bg-yellow-500 hover:bg-yellow-400 text-green-900' : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            Create Room
                        </button>
                        <button
                            onClick={() => setMode('join')}
                            className="w-full py-3 rounded font-bold text-lg bg-green-700 hover:bg-green-600 text-white transition-colors"
                        >
                            Join Room
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-green-200">Room Code</label>
                            <input
                                type="text"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                className="w-full p-3 rounded bg-green-800 border border-green-600 focus:border-yellow-400 focus:outline-none text-white placeholder-green-500 uppercase tracking-widest"
                                placeholder="ABCD"
                                maxLength={4}
                            />
                        </div>
                        <button
                            onClick={handleJoin}
                            disabled={!name || roomCode.length !== 4}
                            className={`w-full py-3 rounded font-bold text-lg transition-colors ${name && roomCode.length === 4 ? 'bg-yellow-500 hover:bg-yellow-400 text-green-900' : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            Join Game
                        </button>
                        <button
                            onClick={() => setMode('menu')}
                            className="w-full py-2 text-green-400 hover:text-white text-sm"
                        >
                            Back
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
