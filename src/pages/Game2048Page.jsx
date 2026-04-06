import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { use2048 } from '../hooks/use2048';

const TILE_COLORS = {
  0:    'bg-panel-800 border-panel-700',
  2:    'bg-gray-200 border-gray-300 text-gray-800',
  4:    'bg-amber-100 border-amber-200 text-amber-900',
  8:    'bg-orange-300 border-orange-400 text-white',
  16:   'bg-orange-500 border-orange-600 text-white',
  32:   'bg-red-400 border-red-500 text-white',
  64:   'bg-red-600 border-red-700 text-white',
  128:  'bg-yellow-300 border-yellow-400 text-yellow-900',
  256:  'bg-yellow-400 border-yellow-500 text-yellow-900',
  512:  'bg-yellow-500 border-yellow-600 text-white',
  1024: 'bg-amber-500 border-amber-600 text-white',
  2048: 'bg-amber-400 border-amber-500 text-white',
};

function getTileClass(value) {
  return TILE_COLORS[value] || 'bg-purple-500 border-purple-600 text-white';
}

export default function Game2048Page() {
  const navigate = useNavigate();
  const { grid, score, best, gameOver, won, handleMove, reset, SIZE } = use2048();

  const onKey = useCallback((e) => {
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    if (map[e.key]) { e.preventDefault(); handleMove(map[e.key]); }
  }, [handleMove]);

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  // Swipe support
  useEffect(() => {
    let startX, startY;
    const onTouchStart = (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; };
    const onTouchEnd = (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      const absDx = Math.abs(dx), absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) < 30) return;
      if (absDx > absDy) handleMove(dx > 0 ? 'right' : 'left');
      else handleMove(dy > 0 ? 'down' : 'up');
    };
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => { window.removeEventListener('touchstart', onTouchStart); window.removeEventListener('touchend', onTouchEnd); };
  }, [handleMove]);

  return (
    <div className="min-h-screen px-4 py-6 text-copy-50 sm:px-6">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
        <header className="flex w-full items-center justify-between">
          <button className="rounded-full border border-panel-700 bg-panel-900 px-4 py-2 text-xs font-semibold text-copy-300 transition hover:border-brand-500 hover:text-copy-50" onClick={() => navigate('/')}>← Games</button>
          <h1 className="bg-linear-to-r from-amber-400 to-yellow-500 bg-clip-text text-3xl font-black tracking-[0.12em] text-transparent">2048</h1>
          <button className="rounded-full border border-panel-700 bg-panel-900 px-4 py-2 text-xs font-semibold text-copy-300 transition hover:border-brand-500 hover:text-copy-50" onClick={reset}>New</button>
        </header>

        <div className="flex w-full gap-3">
          <div className="flex-1 rounded-xl border border-panel-700 bg-panel-900 p-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-copy-300">Score</div>
            <div className="text-2xl font-bold">{score}</div>
          </div>
          <div className="flex-1 rounded-xl border border-panel-700 bg-panel-900 p-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-copy-300">Best</div>
            <div className="text-2xl font-bold">{best}</div>
          </div>
        </div>

        {(gameOver || won) && (
          <div className={`w-full rounded-xl border p-4 text-center ${won ? 'border-gold-400 bg-gold-400/15' : 'border-rose-400 bg-rose-400/15'}`}>
            <p className={`text-xl font-bold ${won ? 'text-gold-400' : 'text-rose-400'}`}>
              {won ? '🎉 You reached 2048!' : '💀 Game Over!'}
            </p>
            <p className="mt-1 text-sm text-copy-300">Score: {score}</p>
          </div>
        )}

        <div className="grid w-full grid-cols-4 gap-2 rounded-2xl border-2 border-panel-700 bg-panel-900 p-3">
          {grid.flat().map((value, i) => (
            <div
              key={i}
              className={[
                'flex aspect-square items-center justify-center rounded-lg border-2 font-extrabold transition-all',
                value >= 1024 ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl',
                getTileClass(value),
              ].join(' ')}
            >
              {value || ''}
            </div>
          ))}
        </div>

        <p className="text-xs text-copy-300">Use arrow keys or swipe to move tiles</p>

        <button className="rounded-full bg-linear-to-r from-amber-400 to-yellow-600 px-8 py-3 font-bold text-ink-950 shadow-[0_8px_24px_rgba(245,158,11,0.35)] transition hover:-translate-y-0.5" onClick={reset}>
          🔄 New Game
        </button>
      </div>
    </div>
  );
}