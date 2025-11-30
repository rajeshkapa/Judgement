export type Suit = 'Spades' | 'Hearts' | 'Diamonds' | 'Clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
    suit: Suit;
    rank: Rank;
    value: number;
    id: string;
}

export interface Player {
    id: number; // 0-3, seat index
    socketId: string; // Socket.io ID
    name: string;
    hand: Card[];
    currentBid: number | null;
    tricksWon: number;
    totalScore: number;
    connected: boolean;
}

export interface PlayedCard {
    playerId: number;
    card: Card;
}

export type Phase = 'LOBBY' | 'DEALING' | 'BIDDING' | 'PLAYING' | 'TRICK_WON' | 'SCORING' | 'GAME_OVER';

export interface GameState {
    roomId: string;
    round: number;
    dealerIndex: number;
    currentPlayerIndex: number;
    players: Player[]; // Fixed size 4, null if empty? Or just use connected flag
    currentTrick: PlayedCard[];
    trumpSuit: Suit;
    phase: Phase;
    leadSuit: Suit | null;
    log: string[];
    chatLog: { sender: string, message: string, timestamp: number }[];
    turnDeadline: number | null; // Timestamp for turn timeout
}

export interface ClientGameState extends Omit<GameState, 'players'> {
    players: ClientPlayer[];
    mySeatIndex: number;
}

export interface ClientPlayer extends Omit<Player, 'hand'> {
    cardCount: number;
    hand?: Card[]; // Only present for "me"
}
