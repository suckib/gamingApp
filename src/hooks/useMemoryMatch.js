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
  const [flipped, setFlipped] = useState([]);    // indices of currently flipped (max 2)
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const lockedRef = useRef(false);               // ref to prevent clicks during mismatch delay (avoids stale closure)

  const totalPairs = pairs;
  const gameOver = matches === totalPairs;

  const flipCard = useCallback((index) => {
    if (lockedRef.current) return;
    setCards(prev => {
      const card = prev[index];
      if (card.flipped || card.matched) return prev;

      const next = prev.map((c, i) => i === index ? { ...c, flipped: true } : c);

      setFlipped(prevFlipped => {
        const newFlipped = [...prevFlipped, index];

        if (newFlipped.length === 2) {
          setMoves(m => m + 1);
          const [first, second] = newFlipped;
          const firstCard = prev[first];
          const secondCard = next[second];

          if (firstCard.emoji === secondCard.emoji) {
            // Match found
            setCards(curr =>
              curr.map((c, i) =>
                i === first || i === second ? { ...c, matched: true, flipped: true } : c
              )
            );
            setMatches(m => m + 1);
            return [];
          } else {
            // Mismatch – flip back after delay
            lockedRef.current = true;
            setTimeout(() => {
              setCards(curr =>
                curr.map((c, i) =>
                  i === first || i === second ? { ...c, flipped: false } : c
                )
              );
              lockedRef.current = false;
            }, 800);
            return [];
          }
        }
        return newFlipped;
      });

      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setCards(generateDeck(pairs));
    setFlipped([]);
    setMoves(0);
    setMatches(0);
    lockedRef.current = false;
  }, [pairs]);

  return { cards, moves, matches, totalPairs, gameOver, flipCard, reset };
}
