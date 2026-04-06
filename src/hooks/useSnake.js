import { useState, useCallback, useRef, useEffect } from 'react';

const GRID = 20;          // 20×20 board
const TICK_MS = 120;      // base speed
const DIRECTIONS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

function randomFood(snake) {
  const occupied = new Set(snake.map(([x, y]) => `${x},${y}`));
  let pos;
  do {
    pos = [Math.floor(Math.random() * GRID), Math.floor(Math.random() * GRID)];
  } while (occupied.has(`${pos[0]},${pos[1]}`));
  return pos;
}

function initialState() {
  const snake = [[10, 10], [9, 10], [8, 10]];
  return {
    snake,
    food: randomFood(snake),
    dir: 'right',
    nextDir: 'right',
    score: 0,
    gameOver: false,
    started: false,
  };
}

export function useSnake() {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  const tickRef = useRef(null);

  // Keep ref in sync so the interval callback always sees latest state
  useEffect(() => { stateRef.current = state; }, [state]);

  const tick = useCallback(() => {
    setState(prev => {
      if (prev.gameOver || !prev.started) return prev;

      const dir = prev.nextDir;
      const [dx, dy] = DIRECTIONS[dir];
      const [hx, hy] = prev.snake[0];
      const nx = hx + dx;
      const ny = hy + dy;

      // Wall collision
      if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) {
        return { ...prev, dir, gameOver: true };
      }

      // Self collision (skip tail because it will move away — unless eating)
      const ateFood = nx === prev.food[0] && ny === prev.food[1];
      const body = ateFood ? prev.snake : prev.snake.slice(0, -1);
      if (body.some(([sx, sy]) => sx === nx && sy === ny)) {
        return { ...prev, dir, gameOver: true };
      }

      const newSnake = [[nx, ny], ...prev.snake];
      if (!ateFood) newSnake.pop();

      const newScore = ateFood ? prev.score + 10 : prev.score;
      const newFood = ateFood ? randomFood(newSnake) : prev.food;

      return { ...prev, snake: newSnake, food: newFood, dir, score: newScore };
    });
  }, []);

  // Game loop
  const start = useCallback(() => {
    setState(prev => ({ ...prev, started: true }));
    clearInterval(tickRef.current);
    tickRef.current = setInterval(tick, TICK_MS);
  }, [tick]);

  const pause = useCallback(() => {
    clearInterval(tickRef.current);
    tickRef.current = null;
    setState(prev => ({ ...prev, started: false }));
  }, []);

  // Stop interval on game over
  useEffect(() => {
    if (state.gameOver) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, [state.gameOver]);

  // Cleanup on unmount
  useEffect(() => () => clearInterval(tickRef.current), []);

  const changeDir = useCallback((newDir) => {
    setState(prev => {
      // Prevent reversing into yourself
      if (OPPOSITE[newDir] === prev.dir) return prev;
      return { ...prev, nextDir: newDir };
    });
  }, []);

  const reset = useCallback(() => {
    clearInterval(tickRef.current);
    tickRef.current = null;
    setState(initialState());
  }, []);

  return { state, start, pause, changeDir, reset, GRID };
}
