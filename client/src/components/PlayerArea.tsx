import React from 'react';
import { ClientPlayer, GameState } from '../logic/types';
import { Card } from './Card';
import { clsx } from 'clsx';
import { useGame } from '../context/GameContext';

interface PlayerAreaProps {
    player: ClientPlayer;
    position: 'bottom' | 'left' | 'top' | 'right';
    gameState: GameState;
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({ player, position, gameState }) => {
    const { playCard } = useGame();
    const isCurrentTurn = gameState.currentPlayerIndex === player.id;
    const isDealer = gameState.dealerIndex === player.id;
    const isMe = position === 'bottom';

    const handleCardClick = (cardId: string) => {
        if (isMe && isCurrentTurn && gameState.phase === 'PLAYING') {
            playCard(cardId);
        }
    };

    // Determine valid cards for highlighting
    let validCardIds = new Set<string>();
    if (isMe && isCurrentTurn && gameState.phase === 'PLAYING' && player.hand) {
        if (!gameState.leadSuit) {
            player.hand.forEach(c => validCardIds.add(c.id));
        } else {
            const followSuitCards = player.hand.filter(c => c.suit === gameState.leadSuit);
            if (followSuitCards.length > 0) {
                followSuitCards.forEach(c => validCardIds.add(c.id));
            } else {
                player.hand.forEach(c => validCardIds.add(c.id));
            }
        }
    }

    const containerClasses = clsx(
        "absolute flex flex-col items-center p-4 transition-all duration-300",
        {
            'bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl': position === 'bottom',
            'top-0 left-1/2 -translate-x-1/2': position === 'top',
            'left-0 top-1/2 -translate-y-1/2': position === 'left',
            'right-0 top-1/2 -translate-y-1/2': position === 'right',
            'bg-yellow-500/20 rounded-xl': isCurrentTurn,
        }
    );

    const handClasses = clsx(
        "flex gap-[-2rem]",
        {
            'flex-row -space-x-8': position === 'bottom' || position === 'top',
            'flex-col -space-y-12': position === 'left' || position === 'right',
        }
    );

    // If not me, generate dummy cards for backs
    const cardsToRender = isMe && player.hand
        ? player.hand
        : Array.from({ length: player.cardCount }, (_, i) => ({ id: `back-${i}`, suit: 'Spades', rank: '2', value: 0 }));

    return (
        <div className={containerClasses}>
            {/* Stats */}
            <div className={clsx("bg-slate-800/80 p-2 rounded-lg text-center mb-2 min-w-[120px]", isDealer && "border-2 border-yellow-500")}>
                <div className="font-bold text-lg text-white">{player.name} {isDealer && "👑"}</div>
                <div className="text-sm text-gray-300">Score: {player.totalScore}</div>
                {player.currentBid !== null && (
                    <div className="text-sm font-mono bg-slate-700 text-white rounded px-1 mt-1">
                        Bid: {player.currentBid} | Won: {player.tricksWon}
                    </div>
                )}
                {!player.connected && <div className="text-xs text-red-500 font-bold">DISCONNECTED</div>}
            </div>

            {/* Hand */}
            <div className={handClasses}>
                {cardsToRender.map((card, index) => (
                    <div key={index} className="relative transition-transform hover:z-10">
                        <Card
                            card={card as any} // Cast because dummy cards aren't full Card objects but Card component handles it if hidden
                            hidden={!isMe}
                            isValid={isMe ? validCardIds.has(card.id) : true}
                            onClick={() => isMe ? handleCardClick(card.id) : undefined}
                            className={position === 'left' || position === 'right' ? 'rotate-90' : ''}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};
