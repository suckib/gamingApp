import { useState, useCallback } from 'react';

// ─── AI Logic ──────────────────────────────────────────────────────────────

/**
 * Calculate best move for AI using minimax algorithm.
 * Looks for winning move, blocks opponent, or chooses strategic position.
 */
function findBestMove(board) {
  // Check if AI (X) can win
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      const test = [...board];
      test[i] = 'X';
      if (checkWinner(test) === 'X') return i;
    }
  }

  // Block opponent from winning
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      const test = [...board];
      test[i] = 'O';
      if (checkWinner(test) === 'O') return i;
    }
  }

  // Take center if available
  if (board[4] === null) return 4;

  // Take corners with preference
  const corners = [0, 2, 6, 8].filter(i => board[i] === null);
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];

  // Take any available
  const available = board.map((cell, i) => (cell === null ? i : null)).filter(i => i !== null);
  return available[Math.floor(Math.random() * available.length)];
}

// ─── Win Detection ─────────────────────────────────────────────────────────

const WINNING_COMBOS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function checkWinner(board) {
  for (let combo of WINNING_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], winningCombo: combo };
    }
  }
  return null;
}

export function isBoardFull(board) {
  return board.every(cell => cell !== null);
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useTicTacToe({ mode }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [aiMovePending, setAiMovePending] = useState(false);

  const makeMove = useCallback((index) => {
    setBoard(prev => {
      if (prev[index] !== null || gameOver) return prev;

      const newBoard = [...prev];
      newBoard[index] = isXNext ? 'X' : 'O';

      const result = checkWinner(newBoard);
      if (result) {
        setGameOver(true);
        setWinner(result);
        return newBoard;
      }

      if (isBoardFull(newBoard)) {
        setGameOver(true);
        setWinner({ winner: null, winningCombo: [] });
        return newBoard;
      }

      setIsXNext(!isXNext);
      return newBoard;
    });
  }, [gameOver, isXNext]);

  // AI move (if AI's turn and game not over)
  const handleAIMove = useCallback(() => {
    if (!gameOver && !isXNext && mode === 'ai' && !aiMovePending) {
      setAiMovePending(true);
      setTimeout(() => {
        setBoard(prev => {
          const aiIndex = findBestMove(prev);
          if (aiIndex === undefined) {
            setAiMovePending(false);
            return prev;
          }

          const newBoard = [...prev];
          newBoard[aiIndex] = 'O';

          const result = checkWinner(newBoard);
          if (result) {
            setGameOver(true);
            setWinner(result);
            setAiMovePending(false);
            return newBoard;
          }

          if (isBoardFull(newBoard)) {
            setGameOver(true);
            setWinner({ winner: null, winningCombo: [] });
            setAiMovePending(false);
            return newBoard;
          }

          setIsXNext(true);
          setAiMovePending(false);
          return newBoard;
        });
      }, 500);
    }
  }, [gameOver, isXNext, mode, aiMovePending]);

  const reset = useCallback(() => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setGameOver(false);
    setWinner(null);
    setAiMovePending(false);
  }, []);

  return { board, isXNext, gameOver, winner, makeMove, reset, handleAIMove };
}
