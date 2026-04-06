import { useNavigate } from 'react-router-dom';

const GAMES = [
  {
    id: 'bingo',
    name: 'BINGO 8×8',
    description: 'Classic bingo game on an 8×8 board',
    emoji: '🎰',
    color: 'from-brand-500 to-brand-600',
  },
  {
    id: 'tictactoe',
    name: 'Tic Tac Toe',
    description: 'Play against your friend or AI',
    emoji: '⭕',
    color: 'from-gold-400 to-gold-500',
  },
  {
    id: 'connect4',
    name: 'Connect 4',
    description: 'Drop discs, connect four, outplay your opponent',
    emoji: '🔴',
    color: 'from-rose-500 to-orange-500',
  },
  {
    id: 'memory-match',
    name: 'Memory Match',
    description: 'Flip cards and match pairs as fast as possible',
    emoji: '🧠',
    color: 'from-cyan-500 to-sky-600',
  },
  {
    id: '2048',
    name: '2048',
    description: 'Merge tiles and chase the 2048 block',
    emoji: '🔢',
    color: 'from-amber-400 to-yellow-600',
  },
  {
    id: 'snake',
    name: 'Snake',
    description: 'Arcade movement, tight turns, longer runs',
    emoji: '🐍',
    color: 'from-emerald-500 to-lime-600',
    comingSoon: true,
  },
  {
    id: 'minesweeper',
    name: 'Minesweeper',
    description: 'Clear the grid without triggering hidden mines',
    emoji: '💣',
    color: 'from-slate-500 to-slate-700',
    comingSoon: true,
  },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(124,111,255,0.12),transparent_24%),linear-gradient(180deg,#111937_0%,#0b0f1e_52%,#090d1a_100%)] px-5 py-16 text-copy-50 sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-12">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="bg-linear-to-r from-brand-500 via-pink-400 to-gold-400 bg-clip-text text-[clamp(2.5rem,10vw,4.5rem)] font-black tracking-[0.28em] text-transparent">
            GAME HUB
          </h1>
          <p className="text-lg text-copy-300">Choose a game to play</p>
        </div>

        {/* Games Grid */}
        <div className="grid w-full gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {GAMES.map(game => (
            <button
              key={game.id}
              onClick={() => !game.comingSoon && navigate(`/game/${game.id}`)}
              disabled={game.comingSoon}
              className={[
                'group relative flex flex-col gap-4 rounded-2xl border border-panel-700 bg-linear-to-br',
                game.color,
                'p-8 text-left shadow-[0_16px_48px_rgba(0,0,0,0.35)] transition',
                game.comingSoon
                  ? 'opacity-60 cursor-not-allowed grayscale-[30%]'
                  : 'hover:-translate-y-1 hover:shadow-[0_24px_64px_rgba(124,111,255,0.35)]',
              ].join(' ')}
            >
              {game.comingSoon && (
                <span className="absolute top-3 right-3 rounded-full bg-ink-950/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-copy-50 backdrop-blur">
                  Under Development
                </span>
              )}
              <div className="text-5xl transition group-hover:scale-110">{game.emoji}</div>
              <h2 className="text-2xl font-bold text-white">{game.name}</h2>
              <p className="text-sm text-gray-200">{game.description}</p>
              {!game.comingSoon && (
                <div className="mt-2 inline-flex items-center gap-2 text-white font-semibold">
                  Play <span>→</span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer note */}
        <p className="mt-8 text-center text-xs text-copy-300">
          More games coming soon...
        </p>
      </div>
    </div>
  );
}
