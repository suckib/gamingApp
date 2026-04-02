import { useMemo } from 'react';

const COLORS = ['#ff6b6b', '#ffd700', '#4ecdc4', '#45b7d1', '#96ceb4', '#ff9f43', '#a29bfe'];

function formatWin(info) {
  if (!info) return '';
  switch (info.type) {
    case 'Row':           return `Row ${info.detail} complete!`;
    case 'Column':        return `Column ${info.detail} complete!`;
    case 'Diagonal':      return 'Main diagonal complete!';
    case 'Anti-Diagonal': return 'Anti-diagonal complete!';
    case 'Blackout':      return '🔥 BLACKOUT — all cells marked!';
    default:              return '';
  }
}

const HERO = {
  player: { emoji: '🎉', title: 'BINGO!',  sub: 'You Win!' },
  ai:     { emoji: '🤖', title: 'BINGO!',  sub: 'AI Wins!' },
  tie:    { emoji: '🤝', title: 'TIE!',    sub: "It's a Draw!" },
};

export default function WinModal({ winner, winInfo, gameMode, onPlayAgain, onBack }) {
  const { emoji, title, sub } = HERO[winner];

  // Deterministic confetti positions (avoids Math.random in render)
  const confetti = useMemo(() =>
    Array.from({ length: 48 }, (_, i) => ({
      left:  `${(i * 2.1) % 100}%`,
      delay: `${(i * 0.06) % 2.4}s`,
      size:  `${8 + (i % 5) * 2}px`,
      color: COLORS[i % COLORS.length],
    })), []);

  // For tie, show both win types; otherwise show the single win
  const playerDetail = winner === 'tie' ? winInfo?.player : winner === 'player' ? winInfo : null;
  const aiDetail     = winner === 'tie' ? winInfo?.ai     : winner === 'ai'     ? winInfo : null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-ink-950/82 backdrop-blur-sm" onClick={onPlayAgain}>
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        {confetti.map((c, i) => (
          <div
            key={i}
            className="absolute top-[-20px] rounded-[2px] animate-[confettiFall_3.2s_ease-in_forwards]"
            style={{ left: c.left, animationDelay: c.delay, width: c.size, height: c.size, background: c.color }}
          />
        ))}
      </div>

      <div
        className="relative z-10 w-[min(90%,400px)] rounded-[20px] border border-panel-700 bg-panel-900 px-10 py-10 text-center shadow-[0_24px_60px_rgba(0,0,0,0.6)] animate-[cardIn_0.45s_cubic-bezier(0.175,0.885,0.32,1.275)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-3 text-6xl animate-[emojiPop_0.5s_0.2s_cubic-bezier(0.175,0.885,0.32,1.275)_both]">{emoji}</div>
        <h2 className="bg-linear-to-r from-gold-400 to-gold-500 bg-clip-text text-5xl font-black tracking-[0.15em] text-transparent">{title}</h2>
        <p className="mt-1.5 text-xl font-bold text-copy-50">{sub}</p>

        {gameMode === 'dual' && winner === 'tie' ? (
          <div className="mt-2 flex flex-col gap-1">
            <p className="text-sm text-copy-300">You: {formatWin(playerDetail)}</p>
            <p className="text-sm text-copy-300">AI: {formatWin(aiDetail)}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-copy-300">{formatWin(playerDetail || aiDetail)}</p>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            className="rounded-full bg-linear-to-r from-gold-400 to-gold-500 px-7 py-3 text-sm font-bold text-ink-950 shadow-[0_4px_16px_rgba(255,215,0,0.35)] transition hover:-translate-y-0.5"
            onClick={onPlayAgain}
          >
            Play Again
          </button>
          <button
            className="rounded-full border border-panel-700 bg-panel-800 px-7 py-3 text-sm font-bold text-copy-300 transition hover:-translate-y-0.5 hover:border-copy-300 hover:text-copy-50"
            onClick={onBack}
          >
            Settings
          </button>
        </div>
      </div>
    </div>
  );
}
