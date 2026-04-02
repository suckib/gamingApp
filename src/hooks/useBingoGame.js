import { useState, useCallback } from 'react';

// ─── Pure helper functions (no side effects, easy to unit-test) ──────────────

/** Fisher-Yates shuffle – returns a new array */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate an 8×8 board.
 * Picks 64 unique numbers from [1..range], shuffled, arranged in rows.
 */
function generateBoard(range) {
  const pool = shuffle(Array.from({ length: range }, (_, i) => i + 1)).slice(0, 64);
  return Array.from({ length: 8 }, (_, r) =>
    pool.slice(r * 8, r * 8 + 8).map(value => ({ value, marked: false }))
  );
}

/** Return a new board with `num` marked */
function markBoard(board, num) {
  return board.map(row =>
    row.map(cell => (cell.value === num ? { ...cell, marked: true } : cell))
  );
}

/**
 * Check win conditions in priority order:
 * Row → Column → Main Diagonal → Anti-Diagonal → Blackout
 * Returns { type, detail? } or null.
 */
export function checkWin(board) {
  for (let r = 0; r < 8; r++) {
    if (board[r].every(c => c.marked)) return { type: 'Row', detail: r + 1 };
  }
  for (let c = 0; c < 8; c++) {
    if (board.every(row => row[c].marked)) return { type: 'Column', detail: c + 1 };
  }
  if (board.every((row, i) => row[i].marked)) return { type: 'Diagonal' };
  if (board.every((row, i) => row[7 - i].marked)) return { type: 'Anti-Diagonal' };
  if (board.flat().every(c => c.marked)) return { type: 'Blackout' };
  return null;
}

/** Returns true if cell (r, c) is part of the winning pattern */
export function isWinCell(r, c, winInfo) {
  if (!winInfo) return false;
  switch (winInfo.type) {
    case 'Row':           return r === winInfo.detail - 1;
    case 'Column':        return c === winInfo.detail - 1;
    case 'Diagonal':      return r === c;
    case 'Anti-Diagonal': return r + c === 7;
    case 'Blackout':      return true;
    default:              return false;
  }
}

// ─── Initial state factory ──────────────────────────────────────────────────

function initState(range, gameMode) {
  return {
    playerBoard: generateBoard(range),
    aiBoard: gameMode === 'dual' ? generateBoard(range) : null,
    // pool is a shuffled draw queue; numbers are shifted off the front
    pool: shuffle(Array.from({ length: range }, (_, i) => i + 1)),
    called: [],      // history, newest first
    current: null,   // last drawn number
    winner: null,    // null | 'player' | 'ai' | 'tie'
    winInfo: null,   // win detail for highlighting
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

/**
 * useBingoGame – all game state and actions in one place.
 * The draw function uses the functional setState form so it is always
 * working with the latest state (no stale-closure issues with auto-draw).
 */
export function useBingoGame({ range, gameMode }) {
  const [state, setState] = useState(() => initState(range, gameMode));

  const draw = useCallback(() => {
    setState(prev => {
      if (prev.winner || prev.pool.length === 0) return prev;

      const [num, ...rest] = prev.pool;
      const newPlayer = markBoard(prev.playerBoard, num);
      const newAi = prev.aiBoard ? markBoard(prev.aiBoard, num) : null;

      const playerWin = checkWin(newPlayer);
      const aiWin     = newAi ? checkWin(newAi) : null;

      let winner  = null;
      let winInfo = null;
      if      (playerWin && aiWin) { winner = 'tie';    winInfo = { player: playerWin, ai: aiWin }; }
      else if (playerWin)          { winner = 'player'; winInfo = playerWin; }
      else if (aiWin)              { winner = 'ai';     winInfo = aiWin; }

      return {
        ...prev,
        playerBoard: newPlayer,
        aiBoard:     newAi,
        pool:        rest,
        called:      [num, ...prev.called],
        current:     num,
        winner,
        winInfo,
      };
    });
  }, []);

  const reset = useCallback(() => setState(initState(range, gameMode)), [range, gameMode]);

  return { state, draw, reset };
}
