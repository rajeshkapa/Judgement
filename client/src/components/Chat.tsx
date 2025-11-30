import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';

export const Chat: React.FC = () => {
    const { gameState, socket } = useGame();
    const [message, setMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [gameState?.chatLog]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !gameState?.roomId) return;

        socket?.emit('send_message', { roomCode: gameState.roomId, message });
        setMessage('');
    };

    if (!gameState) return null;

    return (
        <div className="fixed bottom-4 left-4 w-80 bg-black/50 backdrop-blur-sm rounded-lg border border-white/10 flex flex-col h-64 z-50">
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-white/20">
                {gameState.chatLog.map((msg, i) => (
                    <div key={i} className="text-sm">
                        <span className="font-bold text-yellow-400">{msg.sender}:</span>
                        <span className="text-white ml-2">{msg.message}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="p-2 border-t border-white/10">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full bg-white/10 text-white rounded px-3 py-1 text-sm focus:outline-none focus:bg-white/20 placeholder-white/50"
                />
            </form>
        </div>
    );
};
