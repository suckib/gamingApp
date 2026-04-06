import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConnect4 } from '../hooks/useConnect4';

function ModeSelect({ onSelect, onBack }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 text-copy-50">
      <h1 className="bg-linear-to-r from-rose-500 to-orange-400 bg-clip-text text-[clamp(2.5rem,10vw,4rem)] font-black tracking-[0.2em] text-transparent">
        CONNECT 4
      </h1>
      <p className="text-copy-300">Choose your game mode</p>
      <div className="grid w-full max-w-md gap-4">
        <button onClick={() => onSelect('multiplayer')} className="group flex flex-col gap-2 rounded-2xl border border-panel-700 bg-linear-to-br from-rose-500 to-orange-500 p-8 text-left transition hover:-translate-y-1">
          <span className="text-4xl">👥</span>
          <span className="text-xl font-bold text-white">Multiplayer</span>
          <span className="text-sm text-rose-100">Red vs Yellow — local 2-player</span>
        </button>
        <button onClick={() => onSelect('ai')} className="group flex flex-col gap-2 rounded-2xl border border-panel-700 bg-linear-to-br from-amber-400 to-yellow-600 p-8 text-left transition hover:-translate-y-1">
          <span className="text-4xl">🤖</span>
          <span className="text-xl font-bold text-ink-950">Vs AI</span>
          <span className="text-sm text-amber-900">You play Red, AI plays Yellow</span>
        </button>
      </div>
      <button onClick={onBack} className="rounded-full border-2 border-panel-700 bg-panel-900/50 px-10 py-3 font-semibold text-copy-300 transition hover:border-copy-300 hover:text-copy-50">
        ← Back to Games
      </button>
    </div>
  );
}

const DISC_COLORS = {
  red: 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]',
  yellow: 'bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.5)]',
};

export default function Connect4Page() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null);
  const { board, isRedNext, gameOver, winner, winCells, dropDisc, handleAIMove, reset, ROWS, COLS } = useConnect4({ mode });

  // Reset board when mode changes so stale state doesn't carry over
  useEffect(() => {
    reset();
  }, [mode, reset]);

  useEffect(() => {
    if (mode === 'ai' && !isRedNext && !gameOver) handleAIMove();
  }, [isRedNext, gameOver, mode, handleAIMove]);

  const isWinCell = (r, c) => winCells?.some(([wr, wc]) => wr === r && wc === c);
  const currentLabel = mode === 'ai'
    ? (isRedNext ? '👤 Your turn' : '🤖 AI thinking…')
    : (isRedNext ? '🔴 Red\'s turn' : '🟡 Yellow\'s turn');

  const winLabel = winner === 'draw' ? "It's a Draw!"
    : winner === 'red' ? (mode === 'ai' ? '🎉 You Win!' : '🔴 Red Wins!')
    : (mode === 'ai' ? '🤖 AI Wins!' : '🟡 Yellow Wins!');

  if (!mode) return <ModeSelect onSelect={setMode} onBack={() => navigate('/')} />;

  return (
    <div className="min-h-screen px-4 py-6 text-copy-50 sm:px-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5">
        <header className="flex w-full items-center justify-between">
          <button className="rounded-full border border-panel-700 bg-panel-900 px-4 py-2 text-xs font-semibold text-copy-300 transition hover:border-brand-500 hover:text-copy-50" onClick={() => setMode(null)}>← Back</button>
          <h1 className="bg-linear-to-r from-rose-500 to-orange-400 bg-clip-text text-2xl font-black tracking-[0.12em] text-transparent">CONNECT 4</h1>
          <div className="w-[72px]" />
        </header>

        <div className="w-full rounded-xl border border-panel-700 bg-panel-900 p-4 text-center text-lg font-semibold">
          {gameOver ? <span className="text-gold-400">{winLabel}</span> : currentLabel}
        </div>

        <div className="rounded-2xl border-2 border-blue-800 bg-blue-900/80 p-2 shadow-[0_16px_48px_rgba(0,0,0,0.4)] sm:p-3">
          <div className="mb-1 grid grid-cols-7 gap-1 sm:gap-1.5">
            {Array.from({ length: COLS }, (_, c) => (
              <button
                key={c}
                className="flex h-6 items-center justify-center rounded text-xs font-bold text-blue-300 transition hover:bg-blue-700/50 disabled:opacity-30"
                onClick={() => dropDisc(c)}
                disabled={gameOver || (mode === 'ai' && !isRedNext)}
              >
                ▼
              </button>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {board.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={[
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 sm:h-12 sm:w-12 transition cursor-pointer',
                    isWinCell(r, c)
                      ? 'border-gold-400 ring-2 ring-gold-400/60'
                      : 'border-blue-700',
                    cell ? DISC_COLORS[cell] : 'bg-blue-950',
                  ].join(' ')}
                  onClick={() => !gameOver && !(mode === 'ai' && !isRedNext) && dropDisc(c)}
                />
              ))
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button className="rounded-full bg-linear-to-r from-rose-500 to-orange-500 px-7 py-3 font-bold text-white shadow-[0_8px_24px_rgba(239,68,68,0.35)] transition hover:-translate-y-0.5" onClick={reset}>
            🔄 New Game
          </button>
          <button className="rounded-full border border-panel-700 bg-panel-900 px-7 py-3 font-bold text-copy-300 transition hover:border-copy-300 hover:text-copy-50" onClick={() => setMode(null)}>
            Change Mode
          </button>
        </div>
      </div>
    </div>
  );
}