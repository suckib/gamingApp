import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMemoryMatch } from '../hooks/useMemoryMatch';

const PAIR_OPTIONS = [
  { value: 6, label: '6 pairs', desc: '12 cards — quick round' },
  { value: 8, label: '8 pairs', desc: '16 cards — classic' },
];

export default function MemoryMatchPage() {
  const navigate = useNavigate();
  const [pairs, setPairs] = useState(null);

  if (!pairs) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 text-copy-50">
        <h1 className="bg-linear-to-r from-cyan-400 to-sky-500 bg-clip-text text-[clamp(2.5rem,10vw,4rem)] font-black tracking-[0.2em] text-transparent">
          MEMORY MATCH
        </h1>
        <p className="text-copy-300">Choose difficulty</p>
        <div className="grid w-full max-w-sm gap-4">
          {PAIR_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPairs(opt.value)}
              className="rounded-2xl border border-panel-700 bg-linear-to-br from-cyan-500 to-sky-600 p-6 text-left transition hover:-translate-y-1"
            >
              <span className="text-2xl font-bold text-white">{opt.label}</span>
              <span className="ml-3 text-sm text-cyan-100">{opt.desc}</span>
            </button>
          ))}
        </div>
        <button onClick={() => navigate('/')} className="rounded-full border-2 border-panel-700 bg-panel-900/50 px-10 py-3 font-semibold text-copy-300 transition hover:border-copy-300 hover:text-copy-50">
          ← Back to Games
        </button>
      </div>
    );
  }

  return <MemoryGame pairs={pairs} onBack={() => setPairs(null)} onHome={() => navigate('/')} />;
}

function MemoryGame({ pairs, onBack }) {
  const { cards, moves, matches, totalPairs, gameOver, flipCard, reset } = useMemoryMatch({ pairs });
  const gridCols = pairs <= 6 ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-4';

  return (
    <div className="min-h-screen px-4 py-6 text-copy-50 sm:px-6">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-5">
        <header className="flex w-full items-center justify-between">
          <button className="rounded-full border border-panel-700 bg-panel-900 px-4 py-2 text-xs font-semibold text-copy-300 transition hover:border-brand-500 hover:text-copy-50" onClick={onBack}>← Back</button>
          <h1 className="bg-linear-to-r from-cyan-400 to-sky-500 bg-clip-text text-2xl font-black tracking-[0.12em] text-transparent">MEMORY</h1>
          <div className="w-[72px]" />
        </header>

        <div className="flex w-full gap-3">
          <div className="flex-1 rounded-xl border border-panel-700 bg-panel-900 p-3 text-center">
            <div className="text-xs uppercase tracking-[0.14em] text-copy-300">Moves</div>
            <div className="text-2xl font-bold">{moves}</div>
          </div>
          <div className="flex-1 rounded-xl border border-panel-700 bg-panel-900 p-3 text-center">
            <div className="text-xs uppercase tracking-[0.14em] text-copy-300">Matched</div>
            <div className="text-2xl font-bold">{matches} / {totalPairs}</div>
          </div>
        </div>

        {gameOver && (
          <div className="w-full rounded-xl border border-gold-400 bg-gold-400/15 p-4 text-center">
            <p className="text-xl font-bold text-gold-400">🎉 All Matched in {moves} moves!</p>
          </div>
        )}

        <div className={`grid w-full gap-2 sm:gap-3 ${gridCols}`}>
          {cards.map((card, i) => (
            <button
              key={card.id}
              onClick={() => flipCard(i)}
              disabled={card.flipped || card.matched}
              className={[
                'flex aspect-square items-center justify-center rounded-xl border-2 text-3xl font-bold transition-all duration-300 sm:text-4xl',
                card.matched
                  ? 'border-emerald-400 bg-emerald-500/20 scale-95'
                  : card.flipped
                    ? 'border-cyan-400 bg-cyan-500/20'
                    : 'border-panel-700 bg-panel-800 hover:border-cyan-400 hover:bg-panel-700 cursor-pointer',
              ].join(' ')}
            >
              {card.flipped || card.matched ? card.emoji : '?'}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button className="rounded-full bg-linear-to-r from-cyan-500 to-sky-600 px-7 py-3 font-bold text-white shadow-[0_8px_24px_rgba(6,182,212,0.35)] transition hover:-translate-y-0.5" onClick={reset}>
            🔄 Play Again
          </button>
          <button className="rounded-full border border-panel-700 bg-panel-900 px-7 py-3 font-bold text-copy-300 transition hover:border-copy-300 hover:text-copy-50" onClick={onBack}>
            Difficulty
          </button>
        </div>
      </div>
    </div>
  );
}