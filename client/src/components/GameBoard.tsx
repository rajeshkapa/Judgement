import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { PlayerArea } from './PlayerArea';
import { Card } from './Card';
import { Controls } from './Controls';
import { Scoreboard } from './Scoreboard';

export const GameBoard: React.FC = () => {
    const { gameState, startGame } = useGame();
    const [timeLeft, setTimeLeft] = useState<number>(0);

    useEffect(() => {
        if (!gameState?.turnDeadline) {
            setTimeLeft(0);
            return;
        }

        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((gameState.turnDeadline! - Date.now()) / 1000));
            setTimeLeft(remaining);
        }, 1000);

        return () => clearInterval(interval);
    }, [gameState?.turnDeadline]);

    if (!gameState) return null;

    // Wait for players or start
    if (gameState.phase === 'LOBBY') {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-green-900 text-white">
                <div className="text-center">
                    <h1 className="text-6xl font-bold mb-4">Lobby</h1>
                    <div className="text-2xl mb-8">Room Code: {gameState.roomId}</div>
                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-2">Players ({gameState.players.length}/4):</h2>
                        {gameState.players.map(p => (
                            <div key={p.id} className="text-lg">{p.name} {p.id === gameState.mySeatIndex ? '(You)' : ''}</div>
                        ))}
                    </div>
                    {gameState.players.length === 4 && (
                        <button
                            onClick={startGame}
                            className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-4 rounded-xl font-bold text-2xl shadow-xl transition-transform hover:scale-105"
                        >
                            Start Game
                        </button>
                    )}
                    {gameState.players.length < 4 && (
                        <div className="text-gray-400 animate-pulse">Waiting for players...</div>
                    )}
                </div>
            </div>
        );
    }

    // Seat Rotation Logic
    // My Seat is always Bottom (0 visual index)
    // Order is Anti-Clockwise (Right, Top, Left) relative to me?
    // Let's stick to the mapping:
    // Bottom: mySeatIndex
    // Right: (mySeatIndex + 1) % 4
    // Top: (mySeatIndex + 2) % 4
    // Left: (mySeatIndex + 3) % 4

    // Wait, if play is Clockwise (0->1->2->3), then:
    // If I am 0. 1 is Left. 2 is Top. 3 is Right.
    // Standard card table: Play moves to the Left (Clockwise).
    // So if I am 0. Next player is 1. Where do they sit? Left.
    // Next is 2. Top.
    // Next is 3. Right.
    // So:
    // Left: (mySeatIndex + 1) % 4
    // Top: (mySeatIndex + 2) % 4
    // Right: (mySeatIndex + 3) % 4

    // Let's verify "Anti-Clockwise play" in prompt.
    // "Hearts = Trump, Anti-Clockwise play."
    // Ah! Anti-Clockwise play means 0 -> 3 -> 2 -> 1 -> 0.
    // If play is Anti-Clockwise:
    // If I am 0. Next player is 3. Where do they sit? Right.
    // Next is 2. Top.
    // Next is 1. Left.
    // So:
    // Right: (mySeatIndex - 1 + 4) % 4  (Player 3)
    // Top: (mySeatIndex - 2 + 4) % 4 (Player 2)
    // Left: (mySeatIndex - 3 + 4) % 4 (Player 1)

    // Let's check indices in `GameEngine`:
    // `currentPlayerIndex = (currentPlayerIndex + 1) % 4`
    // This implies index increases: 0 -> 1 -> 2 -> 3.
    // If play is Anti-Clockwise, then the physical arrangement must be such that 1 is to the Right of 0?
    // If 0 is Bottom. And play goes 0 -> 1. And play is Anti-Clockwise.
    // Then 1 must be on the Right.
    // 2 must be Top.
    // 3 must be Left.
    // So:
    // Bottom: mySeatIndex
    // Right: (mySeatIndex + 1) % 4
    // Top: (mySeatIndex + 2) % 4
    // Left: (mySeatIndex + 3) % 4

    const getPlayerAt = (offset: number) => {
        const index = (gameState.mySeatIndex + offset) % 4;
        return gameState.players.find(p => p.id === index)!;
    };

    const bottomPlayer = gameState.players.find(p => p.id === gameState.mySeatIndex)!;
    const rightPlayer = getPlayerAt(1);
    const topPlayer = getPlayerAt(2);
    const leftPlayer = getPlayerAt(3);

    return (
        <div className="h-screen w-screen bg-green-900 overflow-hidden relative select-none font-sans">
            {/* Table Felt Texture */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] pointer-events-none"></div>

            {/* Info Dashboard */}
            <div className="absolute top-4 left-4 bg-black/50 p-4 rounded-lg text-white z-10">
                <div className="text-xl font-bold">Round {gameState.round} / 13</div>
                <div className="text-sm text-red-400 font-bold">Trump: ♥ Hearts</div>
                <div className="mt-2 text-xs opacity-75">
                    Phase: {gameState.phase}
                </div>
                {timeLeft > 0 && (
                    <div className="mt-2 text-xl font-bold text-yellow-400 animate-pulse">
                        Time: {timeLeft}s
                    </div>
                )}
            </div>



            {/* Game Log */}
            <div className="absolute bottom-4 right-4 w-64 h-48 bg-black/50 p-2 rounded-lg text-white overflow-y-auto z-10 text-xs font-mono">
                {gameState.log.slice().reverse().map((msg, i) => (
                    <div key={i} className="mb-1 border-b border-white/10 pb-1">{msg}</div>
                ))}
            </div>

            {/* Scoreboard Panel */}
            <div className="absolute top-4 right-4 bg-black/50 p-4 rounded-lg text-white z-10 min-w-[220px]">
                <div className="text-lg font-bold mb-2 border-b border-white/20 pb-1 flex justify-between items-end">
                    <span>Scoreboard</span>
                    <span className="text-xs font-normal opacity-75">Round {gameState.round}</span>
                </div>

                {/* Header */}
                <div className="grid grid-cols-[1fr,40px,40px,50px] gap-2 text-xs font-bold opacity-75 mb-2 border-b border-white/10 pb-1">
                    <div>Player</div>
                    <div className="text-center">Bid</div>
                    <div className="text-center">Won</div>
                    <div className="text-right">Score</div>
                </div>

                {/* Rows */}
                {gameState.players.map(p => (
                    <div key={p.id} className={`grid grid-cols-[1fr,40px,40px,50px] gap-2 text-sm mb-1 items-center ${p.id === gameState.currentPlayerIndex ? 'text-yellow-400 font-bold' : ''}`}>
                        <div className="truncate">{p.name}</div>
                        <div className="text-center font-mono">{p.currentBid !== null ? p.currentBid : '-'}</div>
                        <div className="text-center font-mono">{p.tricksWon}</div>
                        <div className="text-right font-mono">{p.totalScore}</div>
                    </div>
                ))}

                {/* Footer */}
                <div className="mt-2 pt-2 border-t border-white/20 flex justify-between font-bold text-sm">
                    <span>Total Bids:</span>
                    <span>{gameState.players.reduce((sum, p) => sum + (p.currentBid || 0), 0)} / {gameState.round}</span>
                </div>
            </div>

            {/* Trick Winner Overlay */}
            {gameState.phase === 'TRICK_WON' && (
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce">
                    <div className="bg-yellow-500 text-black px-6 py-3 rounded-full font-bold text-2xl shadow-xl border-4 border-white flex items-center gap-2">
                        <span>{gameState.players[gameState.currentPlayerIndex].name} Won!</span>
                        <span className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">+1</span>
                    </div>
                </div>
            )}

            {/* Players */}
            {bottomPlayer && <PlayerArea player={bottomPlayer} position="bottom" gameState={gameState} />}
            {rightPlayer && <PlayerArea player={rightPlayer} position="right" gameState={gameState} />}
            {topPlayer && <PlayerArea player={topPlayer} position="top" gameState={gameState} />}
            {leftPlayer && <PlayerArea player={leftPlayer} position="left" gameState={gameState} />}

            {/* Center Trick Area */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 flex items-center justify-center">
                {gameState.currentTrick.map((play, i) => {
                    // Calculate relative position for card animation
                    // We need to know which visual position this player is in
                    // 0: Bottom, 1: Right, 2: Top, 3: Left (Visual)

                    // play.playerId is the absolute ID.
                    // We need relative offset from mySeatIndex.
                    // offset = (play.playerId - mySeatIndex + 4) % 4

                    const offset = (play.playerId - gameState.mySeatIndex + 4) % 4;

                    const offsets = [
                        'translate-y-8', // 0 (Bottom)
                        'translate-x-8', // 1 (Right)
                        '-translate-y-8', // 2 (Top)
                        '-translate-x-8'  // 3 (Left)
                    ];

                    return (
                        <div key={i} className={`absolute ${offsets[offset]} transition-all duration-500`}>
                            <Card card={play.card} small />
                            <div className="text-[10px] text-center bg-black/50 rounded px-1 mt-1 text-white truncate max-w-[60px]">
                                {gameState.players.find(p => p.id === play.playerId)?.name}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Controls */}
            <Controls />

            {/* Overlays */}
            <Scoreboard />
        </div>
    );
};
