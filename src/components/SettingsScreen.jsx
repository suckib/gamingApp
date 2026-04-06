import { useState } from 'react';

const RANGES = [
  { value: 64,  label: '1 – 64',  desc: 'Classic fill'   },
  { value: 80,  label: '1 – 80',  desc: 'Lottery style'  },
  { value: 100, label: '1 – 100', desc: 'Extended range'  },
];

const SPEEDS = [
  { value: 1000, label: '1 s' },
  { value: 2000, label: '2 s' },
  { value: 3000, label: '3 s' },
  { value: 5000, label: '5 s' },
];

export default function SettingsScreen({ defaults, onStart, onHome }) {
  const [range,     setRange]     = useState(defaults.range);
  const [callMode,  setCallMode]  = useState(defaults.callMode);
  const [autoSpeed, setAutoSpeed] = useState(defaults.autoSpeed);
  const [gameMode,  setGameMode]  = useState(defaults.gameMode);
  const cardClass = 'w-full max-w-[560px] rounded-2xl border border-panel-700/90 bg-panel-900/90 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur';
  const toggleBase = 'flex-1 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition disabled:opacity-45';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(124,111,255,0.12),transparent_24%),linear-gradient(180deg,#111937_0%,#0b0f1e_52%,#090d1a_100%)] px-5 py-12 text-copy-50 sm:px-8 md:py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8">
        <h1 className="flex flex-col items-center gap-1 text-center">
          <span className="bg-linear-to-r from-brand-500 via-pink-400 to-gold-400 bg-clip-text text-[clamp(3rem,10vw,5.5rem)] font-black tracking-[0.28em] text-transparent">
            BINGO
          </span>
          <span className="text-[clamp(1rem,4vw,1.45rem)] font-medium tracking-[0.32em] text-copy-300">
            8 x 8
          </span>
        </h1>

        <section className={cardClass}>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-copy-300">Number Range</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {RANGES.map(r => (
              <button
                key={r.value}
                className={[
                  'flex flex-col gap-1 rounded-xl border-2 px-4 py-4 text-left transition',
                  range === r.value
                    ? 'border-brand-500 bg-brand-500/15 shadow-[0_0_0_1px_rgba(124,111,255,0.25)]'
                    : 'border-transparent bg-panel-800 hover:border-brand-500/80',
                ].join(' ')}
                onClick={() => setRange(r.value)}
              >
                <span className="text-base font-bold text-copy-50">{r.label}</span>
                <span className="text-xs text-copy-300">{r.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-copy-300">Call Mode</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className={[
                toggleBase,
                callMode === 'manual'
                  ? 'border-brand-500 bg-brand-500/15 text-brand-200'
                  : 'border-transparent bg-panel-800 text-copy-50 hover:border-brand-500/80',
              ].join(' ')}
              onClick={() => setCallMode('manual')}
            >
              Manual Draw
            </button>
            <button
              className={[
                toggleBase,
                callMode === 'auto'
                  ? 'border-brand-500 bg-brand-500/15 text-brand-200'
                  : 'border-transparent bg-panel-800 text-copy-50 hover:border-brand-500/80',
              ].join(' ')}
              onClick={() => setCallMode('auto')}
            >
              Auto Draw
            </button>
          </div>

          {callMode === 'auto' && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-medium uppercase tracking-[0.12em] text-copy-300">Speed</span>
              {SPEEDS.map(s => (
                <button
                  key={s.value}
                  className={[
                    'rounded-full border-2 px-4 py-1.5 text-xs font-semibold transition',
                    autoSpeed === s.value
                      ? 'border-gold-400 bg-gold-400/10 text-gold-400'
                      : 'border-transparent bg-panel-800 text-copy-300 hover:border-gold-400 hover:text-gold-400',
                  ].join(' ')}
                  onClick={() => setAutoSpeed(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className={cardClass}>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-copy-300">Game Mode</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className={[
                toggleBase,
                gameMode === 'single'
                  ? 'border-brand-500 bg-brand-500/15 text-brand-200'
                  : 'border-transparent bg-panel-800 text-copy-50 hover:border-brand-500/80',
              ].join(' ')}
              onClick={() => setGameMode('single')}
            >
              Single Player
            </button>
            <button
              className={[
                toggleBase,
                gameMode === 'dual'
                  ? 'border-brand-500 bg-brand-500/15 text-brand-200'
                  : 'border-transparent bg-panel-800 text-copy-50 hover:border-brand-500/80',
              ].join(' ')}
              onClick={() => setGameMode('dual')}
            >
              Vs AI
            </button>
          </div>
        </section>

        <button
          className="rounded-full bg-linear-to-r from-brand-500 to-brand-600 px-12 py-4 text-lg font-extrabold tracking-[0.08em] text-white shadow-[0_10px_30px_rgba(124,111,255,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(124,111,255,0.55)]"
          onClick={() => onStart({ range, callMode, autoSpeed, gameMode })}
        >
          Start Game
        </button>

        {onHome && (
          <button
            className="rounded-full border-2 border-panel-700 bg-panel-900/50 px-10 py-3 font-semibold text-copy-300 transition hover:border-copy-300 hover:text-copy-50"
            onClick={onHome}
          >
            ← Back to Games
          </button>
        )}
      </div>
    </div>
  );
}
