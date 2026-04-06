import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnake } from '../hooks/useSnake';

export default function SnakePage() {
  const navigate = useNavigate();
  const { state, start, pause, changeDir, reset, GRID } = useSnake();
  const { snake, food, score, gameOver, started } = state;

  const snakeSet = new Set(snake.map(([x, y]) => `${x},${y}`));
  const headKey = `${snake[0][0]},${snake[0][1]}`;

  // Keyboard controls
  const onKey = useCallback((e) => {
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    const dir = map[e.key];
    if (dir) {
      e.preventDefault();
      changeDir(dir);
      if (!started && !gameOver) start();
    }
    if (e.key === ' ') {
      e.preventDefault();
      if (gameOver) reset();
      else if (started) pause();
      else start();
    }
  }, [changeDir, start, pause, reset, started, gameOver]);

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  // Swipe controls for mobile
  useEffect(() => {
    let sx, sy;
    const onTouchStart = (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    const onTouchEnd = (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (Math.max(ax, ay) < 30) return;
      const dir = ax > ay ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      changeDir(dir);
      if (!started && !gameOver) start();
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => { window.removeEventListener('touchstart', onTouchStart); window.removeEventListener('touchend', onTouchEnd); };
  }, [changeDir, start, started, gameOver]);

  return (
    <div className="min-h-screen px-4 py-6 text-copy-50 sm:px-6">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-5">
        {/* Header */}
        <header className="flex w-full items-center justify-between">
          <button
            className="rounded-full border border-panel-700 bg-panel-900 px-4 py-2 text-xs font-semibold text-copy-300 transition hover:border-brand-500 hover:text-copy-50"
            onClick={() => { pause(); navigate('/'); }}
          >
            ← Games
          </button>
          <h1 className="bg-linear-to-r from-emerald-400 to-lime-400 bg-clip-text text-3xl font-black tracking-[0.12em] text-transparent">
            SNAKE
          </h1>
          <div className="flex items-baseline gap-1 text-sm font-bold text-copy-300">
            <span className="text-xl text-copy-50">{score}</span>
            <small className="text-[11px] uppercase tracking-[0.12em]">pts</small>
          </div>
        </header>

        {/* Game Over / Start overlay */}
        {(gameOver || !started) && (
          <div className={`w-full rounded-xl border p-4 text-center ${gameOver ? 'border-rose-400 bg-rose-400/15' : 'border-emerald-400 bg-emerald-400/15'}`}>
            {gameOver ? (
              <>
                <p className="text-xl font-bold text-rose-400">💀 Game Over!</p>
                <p className="mt-1 text-sm text-copy-300">Score: {score}</p>
              </>
            ) : (
              <p className="text-lg font-semibold text-emerald-300">
                Press any arrow key or swipe to start
              </p>
            )}
          </div>
        )}

        {/* Grid */}
        <div
          className="grid w-full rounded-2xl border-2 border-panel-700 bg-panel-900 p-1"
          style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)`, aspectRatio: '1 / 1' }}
        >
          {Array.from({ length: GRID * GRID }, (_, i) => {
            const x = i % GRID;
            const y = Math.floor(i / GRID);
            const key = `${x},${y}`;
            const isHead = key === headKey;
            const isSnake = snakeSet.has(key);
            const isFood = x === food[0] && y === food[1];

            return (
              <div
                key={i}
                className={[
                  'aspect-square rounded-[2px] transition-colors duration-75',
                  isHead  ? 'bg-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.7)]'
                  : isSnake ? 'bg-emerald-500'
                  : isFood  ? 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)] rounded-full'
                  : '',
                ].join(' ')}
              />
            );
          })}
        </div>

        <p className="text-xs text-copy-300">Arrow keys / WASD to move · Space to pause</p>

        {/* D-pad for mobile */}
        <div className="grid grid-cols-3 gap-2 sm:hidden">
          <div />
          <button className="flex h-12 items-center justify-center rounded-xl border border-panel-700 bg-panel-800 text-lg font-bold text-copy-300 active:bg-panel-700" onClick={() => { changeDir('up'); if (!started && !gameOver) start(); }}>▲</button>
          <div />
          <button className="flex h-12 items-center justify-center rounded-xl border border-panel-700 bg-panel-800 text-lg font-bold text-copy-300 active:bg-panel-700" onClick={() => { changeDir('left'); if (!started && !gameOver) start(); }}>◀</button>
          <button className="flex h-12 items-center justify-center rounded-xl border border-panel-700 bg-panel-800 text-xs font-bold text-copy-300 active:bg-panel-700" onClick={() => { if (gameOver) reset(); else if (started) pause(); else start(); }}>
            {gameOver ? '↻' : started ? '⏸' : '▶'}
          </button>
          <button className="flex h-12 items-center justify-center rounded-xl border border-panel-700 bg-panel-800 text-lg font-bold text-copy-300 active:bg-panel-700" onClick={() => { changeDir('right'); if (!started && !gameOver) start(); }}>▶</button>
          <div />
          <button className="flex h-12 items-center justify-center rounded-xl border border-panel-700 bg-panel-800 text-lg font-bold text-copy-300 active:bg-panel-700" onClick={() => { changeDir('down'); if (!started && !gameOver) start(); }}>▼</button>
          <div />
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          {gameOver ? (
            <button className="rounded-full bg-linear-to-r from-emerald-500 to-lime-600 px-7 py-3 font-bold text-white shadow-[0_8px_24px_rgba(52,211,153,0.35)] transition hover:-translate-y-0.5" onClick={reset}>
              🔄 Play Again
            </button>
          ) : started ? (
            <button className="rounded-full border border-rose-400 bg-panel-900 px-7 py-3 font-bold text-rose-400 transition hover:-translate-y-0.5" onClick={pause}>
              ⏸ Pause
            </button>
          ) : (
            <button className="rounded-full bg-linear-to-r from-emerald-500 to-lime-600 px-7 py-3 font-bold text-white shadow-[0_8px_24px_rgba(52,211,153,0.35)] transition hover:-translate-y-0.5" onClick={start}>
              ▶ Start
            </button>
          )}
          <button className="rounded-full border border-panel-700 bg-panel-900 px-7 py-3 font-bold text-copy-300 transition hover:border-copy-300 hover:text-copy-50" onClick={() => { reset(); }}>
            New Game
          </button>
        </div>
      </div>
    </div>
  );
}