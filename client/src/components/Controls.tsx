import React from 'react';
import { useGame } from '../context/GameContext';

export const Controls: React.FC = () => {
    const { gameState, placeBid } = useGame();

    if (!gameState || gameState.mySeatIndex === -1) return null;

    const myPlayer = gameState.players[gameState.mySeatIndex];
    const isMyTurn = gameState.currentPlayerIndex === gameState.mySeatIndex;
    const isBidding = gameState.phase === 'BIDDING';

    if (!isBidding || !isMyTurn) return null;

    const maxBid = gameState.round;
    const bids = Array.from({ length: maxBid + 1 }, (_, i) => i);

    // Hook Rule Calculation
    let forbiddenBid = -1;
    if (gameState.dealerIndex === gameState.mySeatIndex) {
        const currentSum = gameState.players.reduce((sum, p) => sum + (p.currentBid || 0), 0);
        forbiddenBid = maxBid - currentSum;
    }

    return (
        <div className="absolute bottom-40 left-1/2 -translate-x-1/2 bg-slate-800 p-4 rounded-xl shadow-xl z-50">
            <h3 className="text-center mb-2 font-bold text-white">Place Your Bid</h3>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {bids.map(bid => (
                    <button
                        key={bid}
                        onClick={() => placeBid(bid)}
                        disabled={bid === forbiddenBid}
                        className={`
              w-10 h-10 rounded-full font-bold transition-colors
              ${bid === forbiddenBid
                                ? 'bg-red-900 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-500 text-white'}
            `}
                        title={bid === forbiddenBid ? "Hook Rule: Cannot make bids sum to round count" : ""}
                    >
                        {bid}
                    </button>
                ))}
            </div>
        </div>
    );
};
