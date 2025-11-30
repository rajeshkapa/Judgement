import React from 'react';
import { Card as CardType } from '../logic/types';
import { clsx } from 'clsx';

interface CardProps {
    card?: CardType;
    onClick?: () => void;
    isValid?: boolean;
    hidden?: boolean; // For bot hands (card back)
    className?: string;
    small?: boolean; // For played cards in center
}

export const Card: React.FC<CardProps> = ({ card, onClick, isValid = true, hidden = false, className, small = false }) => {
    if (hidden) {
        return (
            <div
                className={clsx(
                    "bg-blue-800 border-2 border-white rounded-lg shadow-md flex items-center justify-center select-none",
                    small ? "w-12 h-16" : "w-20 h-28",
                    className
                )}
            >
                <div className="w-full h-full bg-opacity-20 bg-pattern-dots"></div>
            </div>
        );
    }

    if (!card) return null;

    const isRed = card.suit === 'Hearts' || card.suit === 'Diamonds';
    const suitSymbol = {
        'Spades': '♠',
        'Hearts': '♥',
        'Diamonds': '♦',
        'Clubs': '♣'
    }[card.suit];

    return (
        <div
            onClick={isValid ? onClick : undefined}
            className={clsx(
                "bg-white rounded-lg shadow-md flex flex-col items-center justify-between p-1 select-none transition-transform",
                small ? "w-12 h-16 text-xs" : "w-20 h-28 text-base",
                isValid ? "cursor-pointer hover:-translate-y-2" : "opacity-50 cursor-not-allowed",
                isRed ? "text-red-600" : "text-black",
                className
            )}
        >
            <div className="self-start font-bold leading-none">{card.rank}</div>
            <div className="text-2xl">{suitSymbol}</div>
            <div className="self-end font-bold leading-none rotate-180">{card.rank}</div>
        </div>
    );
};
