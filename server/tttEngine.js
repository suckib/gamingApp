// ─── Pure tic-tac-toe engine — server-authoritative logic ─────────────────

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

/**
 * Check for a winner on a 9-cell board.
 * Returns { winner: 'X'|'O', winningCombo: [a,b,c] } or null.
 */
export function checkWinner(board) {
  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], winningCombo: combo };
    }
  }
  return null;
}

/** Returns true if every cell is occupied */
export function isBoardFull(board) {
  return board.every(cell => cell !== null);
}
