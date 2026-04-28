export default function BattleshipSettings({ onSelectMode, onBack }) {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="bg-linear-to-r from-brand-500 via-pink-400 to-gold-400 bg-clip-text text-[clamp(2.5rem,10vw,4rem)] font-black tracking-[0.28em] text-transparent">
          BATTLESHIP
        </h1>
        <p className="mt-2 text-copy-300">Sink the enemy fleet before they sink yours</p>
      </div>

      <div className="grid w-full gap-6 sm:grid-cols-2">
        <button
          onClick={() => onSelectMode('ai')}
          className="group flex flex-col gap-4 rounded-2xl border border-panel-700 bg-linear-to-br from-gold-400 to-gold-500 p-8 text-left shadow-[0_16px_48px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:shadow-[0_24px_64px_rgba(255,215,0,0.35)]"
        >
          <div className="text-5xl">🤖</div>
          <h2 className="text-2xl font-bold text-ink-950">Vs AI</h2>
          <p className="text-sm text-amber-900">Take on the computer fleet</p>
          <div className="mt-2 inline-flex items-center gap-2 font-semibold text-ink-950">
            Play <span>→</span>
          </div>
        </button>

        <button
          onClick={() => onSelectMode('online')}
          className="group flex flex-col gap-4 rounded-2xl border border-panel-700 bg-linear-to-br from-emerald-500 to-cyan-500 p-8 text-left shadow-[0_16px_48px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:shadow-[0_24px_64px_rgba(16,185,129,0.35)]"
        >
          <div className="text-5xl">🌐</div>
          <h2 className="text-2xl font-bold text-white">Online</h2>
          <p className="text-sm text-emerald-100">Play another captain over the network</p>
          <div className="mt-2 inline-flex items-center gap-2 font-semibold text-white">
            Play <span>→</span>
          </div>
        </button>
      </div>

      <button
        onClick={onBack}
        className="rounded-full border-2 border-panel-700 bg-panel-900/50 px-10 py-3 font-semibold text-copy-300 transition hover:border-copy-300 hover:text-copy-50"
      >
        ← Back to Games
      </button>
    </div>
  );
}
