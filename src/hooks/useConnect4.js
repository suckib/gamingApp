import { useState, useCallback } from 'react';

const ROWS = 6;
const COLS = 7;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function getLowestEmptyRow(board, col) {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === null) return r;
  }
  return -1;
}

function checkWin(board, row, col, player) {
  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal ↘
    [1, -1],  // diagonal ↙
  ];

  for (const [dr, dc] of directions) {
    const cells = [[row, col]];
    // check both directions along this line
    for (const sign of [1, -1]) {
      for (let i = 1; i <= 3; i++) {
        const r = row + dr * i * sign;
        const c = col + dc * i * sign;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
        if (board[r][c] !== player) break;
        cells.push([r, c]);
      }
    }
    if (cells.length >= 4) return cells;
  }
  return null;
}

function isBoardFull(board) {
  return board[0].every(cell => cell !== null);
}

// Simple AI: check for winning move, block opponent, or pick strategic column
function findAIMove(board, aiPlayer, humanPlayer) {
  // 1. Win if possible
  for (let c = 0; c < COLS; c++) {
    const r = getLowestEmptyRow(board, c);
    if (r === -1) continue;
    const test = board.map(row => [...row]);
    test[r][c] = aiPlayer;
    if (checkWin(test, r, c, aiPlayer)) return c;
  }
  // 2. Block opponent
  for (let c = 0; c < COLS; c++) {
    const r = getLowestEmptyRow(board, c);
    if (r === -1) continue;
    const test = board.map(row => [...row]);
    test[r][c] = humanPlayer;
    if (checkWin(test, r, c, humanPlayer)) return c;
  }
  // 3. Prefer center
  if (getLowestEmptyRow(board, 3) !== -1) return 3;
  // 4. Prefer columns near center
  const order = [3, 2, 4, 1, 5, 0, 6];
  for (const c of order) {
    if (getLowestEmptyRow(board, c) !== -1) return c;
  }
  return 0;
}

export function useConnect4({ mode }) {
  const [board, setBoard] = useState(createBoard);
  const [isRedNext, setIsRedNext] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);     // null | 'red' | 'yellow' | 'draw'
  const [winCells, setWinCells] = useState(null);
  const [aiPending, setAiPending] = useState(false);

  const dropDisc = useCallback((col) => {
    setBoard(prev => {
      const row = getLowestEmptyRow(prev, col);
      if (row === -1) return prev;

      const next = prev.map(r => [...r]);
      const player = isRedNext ? 'red' : 'yellow';
      next[row][col] = player;

      const cells = checkWin(next, row, col, player);
      if (cells) {
        setGameOver(true);
        setWinner(player);
        setWinCells(cells);
        return next;
      }
      if (isBoardFull(next)) {
        setGameOver(true);
        setWinner('draw');
        return next;
      }
      setIsRedNext(!isRedNext);
      return next;
    });
  }, [isRedNext]);

  const handleAIMove = useCallback(() => {
    if (gameOver || isRedNext || mode !== 'ai' || aiPending) return;
    setAiPending(true);
    setTimeout(() => {
      setBoard(prev => {
        const col = findAIMove(prev, 'yellow', 'red');
        const row = getLowestEmptyRow(prev, col);
        if (row === -1) { setAiPending(false); return prev; }

        const next = prev.map(r => [...r]);
        next[row][col] = 'yellow';

        const cells = checkWin(next, row, col, 'yellow');
        if (cells) {
          setGameOver(true);
          setWinner('yellow');
          setWinCells(cells);
          setAiPending(false);
          return next;
        }
        if (isBoardFull(next)) {
          setGameOver(true);
          setWinner('draw');
          setAiPending(false);
          return next;
        }
        setIsRedNext(true);
        setAiPending(false);
        return next;
      });
    }, 450);
  }, [gameOver, isRedNext, mode, aiPending]);

  const reset = useCallback(() => {
    setBoard(createBoard());
    setIsRedNext(true);
    setGameOver(false);
    setWinner(null);
    setWinCells(null);
    setAiPending(false);
  }, []);

  return { board, isRedNext, gameOver, winner, winCells, dropDisc, handleAIMove, reset, ROWS, COLS };
}
