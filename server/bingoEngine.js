// ─── Pure bingo engine — no side effects, shared logic for server ─────────

/** Fisher-Yates shuffle — returns a new array */
export function shuffle(arr) {
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
export function generateBoard(range) {
  const pool = shuffle(Array.from({ length: range }, (_, i) => i + 1)).slice(0, 64);
  return Array.from({ length: 8 }, (_, r) =>
    pool.slice(r * 8, r * 8 + 8).map(value => ({ value, marked: false }))
  );
}

/** Return a new board with `num` marked */
export function markBoard(board, num) {
  return board.map(row =>
    row.map(cell => (cell.value === num ? { ...cell, marked: true } : cell))
  );
}

/**
 * Check win conditions in priority order:
 * Row → Column → Main Diagonal → Anti-Diagonal → Blackout
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
