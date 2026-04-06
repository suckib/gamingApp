import { useState, useCallback } from 'react';

const SIZE = 4;

function createEmptyGrid() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function addRandom(grid) {
  const empty = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (grid[r][c] === 0) empty.push([r, c]);
  if (empty.length === 0) return grid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = grid.map(row => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function rotateLeft(grid) {
  return grid[0].map((_, c) => grid.map(row => row[c])).reverse();
}

function rotateRight(grid) {
  return grid[0].map((_, c) => grid.map(row => row[c]).reverse());
}

function rotate180(grid) {
  return grid.map(row => [...row].reverse()).reverse();
}

// Slide and merge a single row to the left
function slideRow(row) {
  const filtered = row.filter(v => v !== 0);
  const result = [];
  let scored = 0;
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      result.push(merged);
      scored += merged;
      i += 2;
    } else {
      result.push(filtered[i]);
      i++;
    }
  }
  while (result.length < SIZE) result.push(0);
  return { row: result, scored };
}

function moveLeft(grid) {
  let score = 0;
  const next = grid.map(row => {
    const { row: newRow, scored } = slideRow(row);
    score += scored;
    return newRow;
  });
  return { grid: next, score };
}

function move(grid, direction) {
  let rotated;
  switch (direction) {
    case 'left':  rotated = grid; break;
    case 'right': rotated = rotate180(grid); break;
    case 'up':    rotated = rotateLeft(grid); break;
    case 'down':  rotated = rotateRight(grid); break;
    default:      return { grid, score: 0 };
  }
  const { grid: moved, score } = moveLeft(rotated);
  let result;
  switch (direction) {
    case 'left':  result = moved; break;
    case 'right': result = rotate180(moved); break;
    case 'up':    result = rotateRight(moved); break;
    case 'down':  result = rotateLeft(moved); break;
    default:      result = moved;
  }
  return { grid: result, score };
}

function gridsEqual(a, b) {
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (a[r][c] !== b[r][c]) return false;
  return true;
}

function canMove(grid) {
  for (const dir of ['left', 'right', 'up', 'down']) {
    const { grid: next } = move(grid, dir);
    if (!gridsEqual(grid, next)) return true;
  }
  return false;
}

function hasWon(grid) {
  return grid.some(row => row.some(v => v >= 2048));
}

function initGrid() {
  let g = createEmptyGrid();
  g = addRandom(g);
  g = addRandom(g);
  return g;
}

export function use2048() {
  const [grid, setGrid] = useState(initGrid);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);

  const handleMove = useCallback((direction) => {
    if (gameOver) return;
    setGrid(prev => {
      const { grid: next, score: gained } = move(prev, direction);
      if (gridsEqual(prev, next)) return prev; // nothing moved

      const withNew = addRandom(next);

      setScore(s => {
        const total = s + gained;
        setBest(b => Math.max(b, total));
        return total;
      });

      if (hasWon(withNew) && !won) setWon(true);
      if (!canMove(withNew)) setGameOver(true);

      return withNew;
    });
  }, [gameOver, won]);

  const reset = useCallback(() => {
    setGrid(initGrid());
    setScore(0);
    setGameOver(false);
    setWon(false);
  }, []);

  return { grid, score, best, gameOver, won, handleMove, reset, SIZE };
}
