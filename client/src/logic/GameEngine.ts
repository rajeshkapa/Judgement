import { Card, GameState, Player, Rank, Suit, PlayedCard, Phase } from './types';

export class GameEngine {
    private state: GameState;
    private deck: Card[] = [];

    constructor() {
        this.state = this.getInitialState();
        this.initializeDeck();
    }

    private getInitialState(): GameState {
        return {
            round: 1,
            dealerIndex: Math.floor(Math.random() * 4),
            currentPlayerIndex: 0, // Will be set correctly in startRound
            players: [
                { id: 0, name: 'You', isHuman: true, hand: [], currentBid: null, tricksWon: 0, totalScore: 0 },
                { id: 1, name: 'Bot Right', isHuman: false, hand: [], currentBid: null, tricksWon: 0, totalScore: 0 },
                { id: 2, name: 'Bot Top', isHuman: false, hand: [], currentBid: null, tricksWon: 0, totalScore: 0 },
                { id: 3, name: 'Bot Left', isHuman: false, hand: [], currentBid: null, tricksWon: 0, totalScore: 0 },
            ],
            currentTrick: [],
            trumpSuit: 'Hearts',
            phase: 'DEALING',
            leadSuit: null,
            log: ['Game Started!'],
        };
    }

    public getState(): GameState {
        return this.state;
    }

    private initializeDeck() {
        const suits: Suit[] = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
        const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.deck = [];

        suits.forEach(suit => {
            ranks.forEach(rank => {
                let value = parseInt(rank);
                if (rank === 'J') value = 11;
                if (rank === 'Q') value = 12;
                if (rank === 'K') value = 13;
                if (rank === 'A') value = 14;

                this.deck.push({
                    suit,
                    rank,
                    value,
                    id: `${rank}-${suit}`
                });
            });
        });
    }

    private shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    public startRound() {
        if (this.state.round > 13) {
            this.state.phase = 'GAME_OVER';
            this.addLog('Game Over!');
            return;
        }

        this.initializeDeck();
        this.shuffleDeck();

        // Reset round-specific player stats
        this.state.players.forEach(p => {
            p.hand = [];
            p.currentBid = null;
            p.tricksWon = 0;
        });

        this.state.currentTrick = [];
        this.state.leadSuit = null;

        // Deal cards
        // Start dealing to Dealer's Right (Anti-Clockwise: +1)
        let dealTargetIndex = (this.state.dealerIndex + 1) % 4;
        const cardsToDeal = this.state.round;

        this.addLog(`Round ${this.state.round}: Dealing ${cardsToDeal} cards.`);

        let cardIndex = 0;
        for (let i = 0; i < cardsToDeal; i++) {
            for (let p = 0; p < 4; p++) {
                const playerIndex = (dealTargetIndex + p) % 4;
                this.state.players[playerIndex].hand.push(this.deck[cardIndex++]);
            }
        }

        // Sort hands
        this.state.players.forEach(p => {
            p.hand.sort((a, b) => {
                if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
                return b.value - a.value; // High to low
            });
        });

        this.state.phase = 'BIDDING';
        // Bidding starts with player to Dealer's right
        this.state.currentPlayerIndex = (this.state.dealerIndex + 1) % 4;
        this.addLog(`${this.state.players[this.state.currentPlayerIndex].name} starts bidding.`);
    }

    public placeBid(playerId: number, bid: number): boolean {
        if (this.state.phase !== 'BIDDING') return false;
        if (this.state.currentPlayerIndex !== playerId) return false;

        // Validate Hook Rule
        // If it's the last bidder (Dealer), sum of bids cannot equal round number
        const isDealer = playerId === this.state.dealerIndex;
        if (isDealer) {
            const currentSum = this.state.players.reduce((sum, p) => sum + (p.currentBid || 0), 0);
            if (currentSum + bid === this.state.round) {
                // Invalid bid
                return false;
            }
        }

        this.state.players[playerId].currentBid = bid;
        this.addLog(`${this.state.players[playerId].name} bids ${bid}.`);

        // Move to next player
        if (isDealer) {
            // Bidding finished
            this.state.phase = 'PLAYING';
            // Play starts with player to Dealer's right
            this.state.currentPlayerIndex = (this.state.dealerIndex + 1) % 4;
            this.addLog('Bidding complete. Play starts.');
        } else {
            this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % 4;
        }

        return true;
    }

    public playCard(playerId: number, cardId: string): boolean {
        if (this.state.phase !== 'PLAYING') return false;
        if (this.state.currentPlayerIndex !== playerId) return false;

        const player = this.state.players[playerId];
        const cardIndex = player.hand.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return false;
        const card = player.hand[cardIndex];

        // Validate Follow Suit
        if (this.state.leadSuit) {
            const hasLeadSuit = player.hand.some(c => c.suit === this.state.leadSuit);
            if (hasLeadSuit && card.suit !== this.state.leadSuit) {
                return false; // Must follow suit
            }
        }

        // Play card
        player.hand.splice(cardIndex, 1);
        this.state.currentTrick.push({ playerId, card });

        if (!this.state.leadSuit) {
            this.state.leadSuit = card.suit;
        }

        this.addLog(`${player.name} plays ${card.rank} of ${card.suit}.`);

        // Check if trick is complete
        if (this.state.currentTrick.length === 4) {
            this.resolveTrick();
        } else {
            this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % 4;
        }

        return true;
    }

    private resolveTrick() {
        // Determine winner
        let winnerIndex = 0;
        let winningCard = this.state.currentTrick[0].card;
        const leadSuit = this.state.leadSuit!;

        for (let i = 1; i < 4; i++) {
            const played = this.state.currentTrick[i];
            const currentCard = played.card;

            if (currentCard.suit === 'Hearts' && winningCard.suit !== 'Hearts') {
                // Trumped
                winningCard = currentCard;
                winnerIndex = i;
            } else if (currentCard.suit === 'Hearts' && winningCard.suit === 'Hearts') {
                // Over-trumped
                if (currentCard.value > winningCard.value) {
                    winningCard = currentCard;
                    winnerIndex = i;
                }
            } else if (currentCard.suit === leadSuit && winningCard.suit === leadSuit) {
                // Followed suit, higher rank
                if (currentCard.value > winningCard.value) {
                    winningCard = currentCard;
                    winnerIndex = i;
                }
            }
            // Else: off-suit non-trump, loses
        }

        const winnerPlayerId = this.state.currentTrick[winnerIndex].playerId;
        this.state.players[winnerPlayerId].tricksWon++;
        this.addLog(`${this.state.players[winnerPlayerId].name} wins the trick!`);

        // Winner leads next trick
        this.state.currentPlayerIndex = winnerPlayerId;

        // PAUSE HERE: Set phase to TRICK_WON so UI can show the trick
        this.state.phase = 'TRICK_WON';
    }

    public continueAfterTrick() {
        if (this.state.phase !== 'TRICK_WON') return;

        // Clear trick
        this.state.currentTrick = [];
        this.state.leadSuit = null;

        // Check if round is over
        const cardsLeft = this.state.players[0].hand.length;
        if (cardsLeft === 0) {
            this.endRound();
        } else {
            // Continue playing
            this.state.phase = 'PLAYING';
        }
    }

    private endRound() {
        this.state.phase = 'SCORING';
        this.addLog('Round complete. Scoring...');

        this.state.players.forEach(p => {
            const bid = p.currentBid!;
            const won = p.tricksWon;
            let points = 0;

            if (bid === won) {
                points = (bid + 1) * 10 + bid;
            } else {
                points = 0;
            }

            p.totalScore += points;
            this.addLog(`${p.name}: Bid ${bid}, Won ${won} -> +${points} pts (Total: ${p.totalScore})`);
        });

        // Prepare for next round
        this.state.round++;
        // Dealer moves Clockwise (Left visually, but index - 1?)
        // "Dealer role moves Clockwise"
        // If we are sitting at table: Bottom -> Left -> Top -> Right -> Bottom
        // Indices: 0 -> 3 -> 2 -> 1 -> 0?
        // Wait, Standard Clockwise: 0 (Bottom) -> 3 (Left) -> 2 (Top) -> 1 (Right).
        // Let's use standard clockwise index math: (i - 1 + 4) % 4.
        this.state.dealerIndex = (this.state.dealerIndex - 1 + 4) % 4;

        if (this.state.round > 13) {
            // Check for ties
            const maxScore = Math.max(...this.state.players.map(p => p.totalScore));
            const winners = this.state.players.filter(p => p.totalScore === maxScore);

            if (winners.length > 1) {
                this.addLog(`Tie detected between ${winners.map(w => w.name).join(', ')}. Playing tiebreaker round 13.`);
                this.state.round = 13; // Replay round 13
                // Keep dealer moving? Or same dealer? Rules say "Play Round 13 again". 
                // Let's just let it flow, maybe reset round to 13 but keep dealer moving.
            } else {
                this.state.phase = 'GAME_OVER';
                this.addLog(`Game Over! Winner: ${winners[0].name}`);
                return;
            }
        }

        // Auto-start next round? Or wait for user?
        // Let's wait for user to click "Start Next Round"
        // But for now, we leave it in SCORING phase.
    }

    private addLog(message: string) {
        this.state.log.push(message);
        if (this.state.log.length > 50) this.state.log.shift();
    }
}
