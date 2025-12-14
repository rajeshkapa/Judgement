import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';

export const Lobby: React.FC = () => {
    const { lobbyRooms, createRoom, joinRoom, error, clearError, getLobbyRooms } = useGame();

    // Initialize name from URL param 'user' if present, otherwise localStorage
    const [name, setName] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('user') || localStorage.getItem('playerName') || '';
    });

    useEffect(() => {
        getLobbyRooms();
    }, []);

    const handleCreate = () => {
        if (!name.trim()) return;
        localStorage.setItem('playerName', name);
        createRoom(name);
    };

    const handleJoin = (roomId: string) => {
        if (!name.trim()) return;
        localStorage.setItem('playerName', name);
        joinRoom(roomId, name);
    };

    return (
        <div className="flex flex-col items-center min-h-screen bg-green-800 text-white font-sans p-8">
            <h1 className="text-6xl font-bold mb-8 drop-shadow-lg">Management</h1>

            <div className="w-full max-w-4xl bg-green-900 rounded-xl shadow-2xl border border-green-700 overflow-hidden">
                {/* Header Section */}
                <div className="p-6 border-b border-green-700 bg-green-950/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <label className="text-green-300 font-medium whitespace-nowrap">Your Name:</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="flex-1 md:w-64 p-2 rounded bg-green-800 border border-green-600 focus:border-yellow-400 focus:outline-none text-white placeholder-green-500"
                            placeholder="Enter your name"
                        />
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={!name.trim()}
                        className={`px-6 py-2 rounded font-bold text-lg transition-colors shadow-lg ${name.trim()
                            ? 'bg-yellow-500 hover:bg-yellow-400 text-green-900'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        Create New Room
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500 text-white p-3 text-center cursor-pointer hover:bg-red-600 transition-colors" onClick={clearError}>
                        {error} (Click to dismiss)
                    </div>
                )}

                {/* Room List */}
                <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4 text-green-100 border-b border-green-700 pb-2">Available Rooms</h2>

                    {lobbyRooms.length === 0 ? (
                        <div className="text-center py-12 text-green-400 italic bg-green-950/30 rounded-lg border border-green-800">
                            No active rooms found. Create one to get started!
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-green-300 border-b border-green-700">
                                        <th className="p-3">Room Name</th>
                                        <th className="p-3">Host</th>
                                        <th className="p-3">Players</th>
                                        <th className="p-3">Status</th>
                                        <th className="p-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lobbyRooms.map((room) => (
                                        <tr key={room.roomId} className="border-b border-green-800 hover:bg-green-800/50 transition-colors">
                                            <td className="p-3 font-mono text-yellow-200">{room.roomId}</td>
                                            <td className="p-3">{room.hostName}</td>
                                            <td className="p-3">
                                                <span className={`${room.playerCount === 4 ? 'text-red-400' : 'text-green-300'}`}>
                                                    {room.playerCount}/{room.maxPlayers}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${room.status === 'WAITING' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-yellow-100'
                                                    }`}>
                                                    {room.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={() => handleJoin(room.roomId)}
                                                    disabled={!name.trim() || room.playerCount >= 4 || room.status !== 'WAITING'}
                                                    className={`px-4 py-1 rounded text-sm font-bold transition-colors ${!name.trim() || room.playerCount >= 4 || room.status !== 'WAITING'
                                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                                        : 'bg-green-600 hover:bg-green-500 text-white'
                                                        }`}
                                                >
                                                    {room.status === 'PLAYING' ? 'In Progress' : room.playerCount >= 4 ? 'Full' : 'Join'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
