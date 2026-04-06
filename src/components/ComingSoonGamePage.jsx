import { useNavigate } from 'react-router-dom';

export default function ComingSoonGamePage({ title, description, emoji, accentClass }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(124,111,255,0.12),transparent_24%),linear-gradient(180deg,#111937_0%,#0b0f1e_52%,#090d1a_100%)] px-4 py-8 text-copy-50 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col justify-center gap-8">
        <div className="flex items-center justify-between">
          <button
            className="rounded-full border border-panel-700 bg-panel-900 px-4 py-2 text-xs font-semibold text-copy-300 transition hover:border-brand-500 hover:text-copy-50"
            onClick={() => navigate('/')}
          >
            ← Back to Games
          </button>
          <div className="hidden rounded-full border border-panel-700 bg-panel-900/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-copy-300 sm:block">
            Coming Soon
          </div>
        </div>

        <div className="rounded-[28px] border border-panel-700/90 bg-panel-900/85 p-8 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur sm:p-12">
          <div className="flex flex-col gap-6 text-center sm:text-left">
            <div className="text-6xl sm:text-7xl">{emoji}</div>
            <div className="space-y-3">
              <div className={`inline-flex rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-white ${accentClass}`}>
                Next Up
              </div>
              <h1 className="text-4xl font-black tracking-[0.12em] text-white sm:text-5xl">{title}</h1>
              <p className="max-w-2xl text-base leading-7 text-copy-300 sm:text-lg">{description}</p>
            </div>

            <div className="grid gap-4 pt-2 sm:grid-cols-3">
              <div className="rounded-2xl border border-panel-700 bg-panel-800/70 p-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-copy-300">Status</div>
                <div className="text-lg font-bold text-copy-50">Planned</div>
              </div>
              <div className="rounded-2xl border border-panel-700 bg-panel-800/70 p-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-copy-300">Page</div>
                <div className="text-lg font-bold text-copy-50">Ready</div>
              </div>
              <div className="rounded-2xl border border-panel-700 bg-panel-800/70 p-5">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-copy-300">Next Step</div>
                <div className="text-lg font-bold text-copy-50">Build Game Logic</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}