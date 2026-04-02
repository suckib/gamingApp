import { useEffect, useRef, useState } from 'react';
import { useBingoGame } from '../hooks/useBingoGame';
import BingoBoard from './BingoBoard';
import WinModal from './WinModal';

export default function GameScreen({ settings, onBack }) {
  const { range, callMode, gameMode, autoSpeed } = settings;
  const { state, draw, reset } = useBingoGame({ range, gameMode });
  const { playerBoard, aiBoard, called, current, winner, winInfo } = state;

  const [autoRunning, setAutoRunning] = useState(callMode === 'auto');
  const intervalRef = useRef(null);

  // ── Auto-draw interval ─────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (autoRunning && !winner && state.pool.length > 0) {
      intervalRef.current = setInterval(draw, autoSpeed);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRunning, winner, draw, autoSpeed, state.pool.length]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function handleReset() {
    reset();
    if (callMode === 'auto') setAutoRunning(true);
  }

  // Resolve per-board winInfo for highlighting
  const playerWinInfo = winner === 'player' ? winInfo
                      : winner === 'tie'    ? winInfo?.player
                      : null;
  const aiWinInfo     = winner === 'ai'     ? winInfo
                      : winner === 'tie'    ? winInfo?.ai
                      : null;

  const totalDrawn = range - state.pool.length;
  const controlBase = 'rounded-full px-7 py-3 text-sm font-bold tracking-[0.04em] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-45';

  return (
    <div className="min-h-screen px-4 pb-12 text-copy-50 sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-5">
        <header className="flex w-full max-w-6xl items-center justify-between border-b border-panel-700 py-4">
          <button
            className="rounded-full border border-panel-700 bg-panel-900 px-4 py-2 text-xs font-semibold text-copy-300 transition hover:border-brand-500 hover:text-copy-50"
            onClick={onBack}
          >
            ← Settings
          </button>
          <h1 className="bg-linear-to-r from-brand-500 to-pink-400 bg-clip-text text-[clamp(1rem,3vw,1.5rem)] font-black tracking-[0.16em] text-transparent">
            BINGO 8×8
          </h1>
          <div className="flex items-baseline gap-1 text-sm font-bold text-copy-300">
            <span className="text-xl text-copy-50">{totalDrawn}</span>
            <span className="text-panel-700">/</span>
            <span>{range}</span>
            <small className="ml-1 text-[11px] uppercase tracking-[0.12em]">drawn</small>
          </div>
        </header>

        <div className="flex flex-col items-center gap-2">
          <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-brand-500 bg-panel-900 shadow-[0_0_28px_rgba(124,111,255,0.4)]">
            <div
              className="text-[clamp(2rem,6vw,3rem)] font-black text-copy-50 animate-[numberPop_0.45s_cubic-bezier(0.175,0.885,0.32,1.275)]"
              key={current ?? 'init'}
            >
              {current ?? '?'}
            </div>
          </div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-copy-300">Current Number</p>
        </div>

        <div className={[
          'flex w-full flex-wrap items-start justify-center gap-6',
          gameMode === 'dual' ? 'xl:gap-8' : '',
        ].join(' ')}>
          <BingoBoard
            board={playerBoard}
            winInfo={playerWinInfo}
            label={gameMode === 'dual' ? 'YOU' : null}
          />
          {gameMode === 'dual' && aiBoard && (
            <BingoBoard
              board={aiBoard}
              winInfo={aiWinInfo}
              label="AI"
            />
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {callMode === 'manual' ? (
            <button
              className={`${controlBase} bg-linear-to-r from-brand-500 to-brand-600 text-white shadow-[0_8px_24px_rgba(124,111,255,0.4)]`}
              onClick={draw}
              disabled={!!winner || state.pool.length === 0}
            >
              Draw Number
            </button>
          ) : (
            <button
              className={[
                controlBase,
                autoRunning
                  ? 'border border-rose-400 bg-panel-800 text-rose-400'
                  : 'border border-mint-400 bg-panel-800 text-mint-400',
              ].join(' ')}
              onClick={() => setAutoRunning(r => !r)}
              disabled={!!winner || state.pool.length === 0}
            >
              {autoRunning ? 'Pause' : 'Resume'}
            </button>
          )}
          <button
            className={`${controlBase} border border-panel-700 bg-panel-800 text-copy-300 hover:border-copy-300 hover:text-copy-50`}
            onClick={handleReset}
          >
            New Game
          </button>
        </div>

        <div className="w-full max-w-3xl rounded-2xl border border-panel-700 bg-panel-900 px-5 py-4 shadow-[0_16px_48px_rgba(0,0,0,0.28)]">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-copy-300">Called Numbers</h4>
          <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
            {called.length === 0 && <span className="text-sm italic text-copy-300">No numbers drawn yet</span>}
            {called.map((n, i) => (
              <span
                key={`${n}-${i}`}
                className={[
                  'inline-flex h-7 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-bold transition',
                  i === 0
                    ? 'scale-105 border-brand-500 bg-brand-500/25 text-brand-200'
                    : 'border-panel-700 bg-panel-800 text-copy-300',
                ].join(' ')}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
        {winner && (
          <WinModal
            winner={winner}
            winInfo={winInfo}
            gameMode={gameMode}
            onPlayAgain={handleReset}
            onBack={onBack}
          />
        )}
      </div>
    </div>
  );
}
