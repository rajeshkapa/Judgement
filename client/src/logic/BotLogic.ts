import { Card, GameState, Player, Suit } from './types';

export class BotLogic {
    /**
     * Determines the bid for a bot based on its hand.
     * Heuristic: 1 bid for every Ace, King, or High Trump (J, Q, K, A of Hearts).
     */
    public getBid(player: Player, gameState: GameState): number {
        let bid = 0;
        const hand = player.hand;
        const trumpSuit = gameState.trumpSuit;

        hand.forEach(card => {
            // High cards (A, K) of any suit
            if (card.rank === 'A' || card.rank === 'K') {
                bid++;
            }
            // High Trumps (J, Q, K, A) - Avoid double counting if already counted as A/K
            else if (card.suit === trumpSuit && (card.rank === 'J' || card.rank === 'Q')) {
                bid++;
            }
        });

        // Hook Rule Check:
        // If this bot is the dealer (last bidder), ensure bid doesn't make sum == round cards.
        // The GameEngine handles the validation, but the Bot should be smart enough not to try an invalid bid.
        // However, GameEngine.placeBid returns false if invalid.
        // We should calculate the invalid bid here to avoid it.

        if (gameState.dealerIndex === player.id) {
            const currentSum = gameState.players.reduce((sum, p) => sum + (p.currentBid || 0), 0);
            const cardsInRound = gameState.round;
            const forbiddenBid = cardsInRound - currentSum;

            if (bid === forbiddenBid) {
                // Adjust bid
                if (bid > 0) bid--;
                else bid++;
            }
        }

        return bid;
    }

    /**
     * Determines which card to play.
     */
    public playCard(player: Player, gameState: GameState): string {
        const validCards = this.getValidCards(player, gameState);
        if (validCards.length === 0) return ''; // Should not happen

        // If only one card, play it
        if (validCards.length === 1) return validCards[0].id;

        const leadSuit = gameState.leadSuit;
        const trumpSuit = gameState.trumpSuit;
        const tricksWon = player.tricksWon;
        const bid = player.currentBid || 0;
        const needsToWin = tricksWon < bid;

        // Strategy:
        // If Leading:
        if (!leadSuit) {
            // If we need to win, play high cards (Aces, Kings)
            if (needsToWin) {
                // Try to find a high card
                const highCard = validCards.find(c => c.value >= 13); // K or A
                if (highCard) return highCard.id;
                // Or play a high trump
                const highTrump = validCards.find(c => c.suit === trumpSuit && c.value >= 11);
                if (highTrump) return highTrump.id;
            }
            // Otherwise play low cards to avoid winning accidentally
            // Sort by value ascending
            validCards.sort((a, b) => a.value - b.value);
            return validCards[0].id;
        }

        // If Following:
        // Check if we can win the trick
        const currentTrick = gameState.currentTrick;
        // Find current winning card
        // (Simplified: just look at our valid cards)

        if (needsToWin) {
            // Try to win
            // If we have the lead suit, play the highest one we have
            const followSuitCards = validCards.filter(c => c.suit === leadSuit);
            if (followSuitCards.length > 0) {
                followSuitCards.sort((a, b) => b.value - a.value); // Descending
                // Check if this card actually beats the current best? 
                // For MVP, just play highest.
                return followSuitCards[0].id;
            }

            // If we don't have lead suit, can we trump?
            const trumpCards = validCards.filter(c => c.suit === trumpSuit);
            if (trumpCards.length > 0) {
                trumpCards.sort((a, b) => a.value - b.value); // Play lowest trump that wins? Or just lowest trump.
                return trumpCards[0].id;
            }

            // Can't win, dump lowest
            validCards.sort((a, b) => a.value - b.value);
            return validCards[0].id;
        } else {
            // Try to lose
            // If following suit, play lowest
            const followSuitCards = validCards.filter(c => c.suit === leadSuit);
            if (followSuitCards.length > 0) {
                followSuitCards.sort((a, b) => a.value - b.value); // Ascending
                return followSuitCards[0].id;
            }

            // If not following suit, dump high non-trump cards (slough)
            const nonTrump = validCards.filter(c => c.suit !== trumpSuit);
            if (nonTrump.length > 0) {
                nonTrump.sort((a, b) => b.value - a.value); // Dump highest trash
                return nonTrump[0].id;
            }

            // If only trumps left, play lowest
            validCards.sort((a, b) => a.value - b.value);
            return validCards[0].id;
        }
    }

    private getValidCards(player: Player, gameState: GameState): Card[] {
        if (!gameState.leadSuit) return player.hand;

        const followSuitCards = player.hand.filter(c => c.suit === gameState.leadSuit);
        if (followSuitCards.length > 0) {
            return followSuitCards;
        }
        return player.hand;
    }
}
