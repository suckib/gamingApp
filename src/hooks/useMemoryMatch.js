import { useState, useCallback, useRef } from 'react';

const CARD_EMOJIS = ['🍎', '🍋', '🍇', '🍒', '🥝', '🍊', '🫐', '🍑'];

function generateDeck(pairCount) {
  const emojis = CARD_EMOJIS.slice(0, pairCount);
  const cards = [...emojis, ...emojis].map((emoji, i) => ({
    id: i,
    emoji,
    flipped: false,
    matched: false,
  }));
  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function useMemoryMatch({ pairs = 8 } = {}) {
  const [cards, setCards] = useState(() => generateDeck(pairs));
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const lockedRef = useRef(false);
  const flippedRef = useRef([]);
  const cardsRef = useRef(cards);      // synchronous mirror of cards state

  const totalPairs = pairs;
  const gameOver = matches === totalPairs;

  const flipCard = useCallback((index) => {
    if (lockedRef.current) return;
    if (flippedRef.current.includes(index)) return;
    if (flippedRef.current.length >= 2) return;

    const cur = cardsRef.current;
    const card = cur[index];
    if (card.flipped || card.matched) return;

    // Flip the card — direct value, no updater function
    const afterFlip = cur.map((c, i) => i === index ? { ...c, flipped: true } : c);
    cardsRef.current = afterFlip;
    setCards(afterFlip);

    flippedRef.current = [...flippedRef.current, index];

    if (flippedRef.current.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = flippedRef.current;

      if (afterFlip[first].emoji === afterFlip[second].emoji) {
        // Match — all setters at top level with direct values
        const afterMatch = afterFlip.map((c, i) =>
          i === first || i === second ? { ...c, matched: true, flipped: true } : c
        );
        cardsRef.current = afterMatch;
        setCards(afterMatch);
        setMatches(m => m + 1);
        flippedRef.current = [];
      } else {
        // Mismatch — flip back after delay
        lockedRef.current = true;
        setTimeout(() => {
          const afterUnflip = cardsRef.current.map((c, i) =>
            i === first || i === second ? { ...c, flipped: false } : c
          );
          cardsRef.current = afterUnflip;
          setCards(afterUnflip);
          lockedRef.current = false;
          flippedRef.current = [];
        }, 800);
      }
    }
  }, []);

  const reset = useCallback(() => {
    const deck = generateDeck(pairs);
    cardsRef.current = deck;
    setCards(deck);
    setMoves(0);
    setMatches(0);
    lockedRef.current = false;
    flippedRef.current = [];
  }, [pairs]);

  return { cards, moves, matches, totalPairs, gameOver, flipCard, reset };
}
