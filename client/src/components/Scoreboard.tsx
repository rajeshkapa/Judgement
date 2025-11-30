import React from 'react';
import { useGame } from '../context/GameContext';

export const Scoreboard: React.FC = () => {
    const { gameState, startGame } = useGame();

    if (!gameState || (gameState.phase !== 'SCORING' && gameState.phase !== 'GAME_OVER')) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-8 rounded-xl max-w-2xl w-full border border-slate-600">
                <h2 className="text-3xl font-bold text-center mb-6">
                    {gameState.phase === 'GAME_OVER' ? 'Game Over' : `Round ${gameState.round - 1} Complete`}
                </h2>

                <table className="w-full text-left mb-8">
                    <thead>
                        <tr className="border-b border-slate-600">
                            <th className="p-2">Player</th>
                            <th className="p-2">Bid</th>
                            <th className="p-2">Won</th>
                            <th className="p-2">Total Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {gameState.players.map(p => (
                            <tr key={p.id} className="border-b border-slate-700/50">
                                <td className="p-2 font-bold">{p.name} {gameState.dealerIndex === p.id && '👑'}</td>
                                <td className="p-2">{p.currentBid}</td>
                                <td className="p-2">{p.tricksWon}</td>
                                <td className="p-2 text-xl text-yellow-500">{p.totalScore}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-center">
                    {gameState.phase === 'GAME_OVER' ? (
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold text-lg"
                        >
                            Play Again
                        </button>
                    ) : (
                        <button
                            onClick={startGame}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold text-lg"
                        >
                            Start Round {gameState.round}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
