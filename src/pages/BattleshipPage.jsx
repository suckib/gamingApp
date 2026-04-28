import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBattleshipGame } from '../hooks/useBattleshipGame';
import BattleshipBoard from '../components/BattleshipBoard';
import BattleshipFleetStatus from '../components/BattleshipFleetStatus';
import BattleshipSettings from '../components/BattleshipSettings';
import ShipPlacementPanel from '../components/ShipPlacementPanel';

const PAGE_BG = 'min-h-screen bg-[radial-gradient(circle_at_top,rgba(124,111,255,0.12),transparent_24%),linear-gradient(180deg,#111937_0%,#0b0f1e_52%,#090d1a_100%)] px-4 py-6 text-copy-50 sm:px-6';

export default function BattleshipPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // null | 'ai' | 'online'
  const game = useBattleshipGame();

  if (!mode) {
    return (
      <div className={PAGE_BG}>
        <div className="mx-auto w-full max-w-3xl">
          <BattleshipSettings
            onSelectMode={setMode}
            onBack={() => navigate('/')}
          />
        </div>
      </div>
    );
  }

  if (mode === 'online') {
    return (
      <div className={PAGE_BG}>
        <div className="mx-auto w-full max-w-3xl pt-20 text-center text-copy-300">
          <p className="text-xl font-semibold">Online battleship is coming soon.</p>
          <button
            onClick={() => setMode(null)}
            className="mt-6 rounded-full border border-panel-700 bg-panel-900 px-6 py-2 text-sm text-copy-100 hover:border-brand-500"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={PAGE_BG}>
      <div className="mx-auto w-full max-w-5xl">
        <Header onBack={() => { game.reset(); setMode(null); }} />

        {game.phase === 'placement' && (
          <ShipPlacementPanel
            onConfirm={game.confirmPlacement}
            onBack={() => { game.reset(); setMode(null); }}
          />
        )}

        {game.phase === 'playing' && <PlayView game={game} />}

        {game.phase === 'finished' && (
          <FinishedView
            game={game}
            onPlayAgain={game.reset}
            onChangeMode={() => { game.reset(); setMode(null); }}
          />
        )}
      </div>
    </div>
  );
}

function Header({ onBack }) {
  return (
    <header className="mb-6 flex items-center justify-between">
      <button
        onClick={onBack}
        className="rounded-full border border-panel-700 bg-panel-900 px-4 py-2 text-xs font-semibold text-copy-300 transition hover:border-brand-500 hover:text-copy-50"
      >
        ← Back
      </button>
      <h1 className="bg-linear-to-r from-brand-500 to-pink-400 bg-clip-text text-2xl font-black tracking-[0.18em] text-transparent sm:text-3xl">
        BATTLESHIP
      </h1>
      <div className="w-[72px]" />
    </header>
  );
}

function PlayView({ game }) {
  const isPlayerTurn = game.turn === 'player';
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-panel-700 bg-panel-900 p-4 text-center">
        <p className="text-base font-semibold sm:text-lg">
          {isPlayerTurn
            ? <>🎯 <span className="text-brand-200">Your turn</span> — fire at the enemy grid</>
            : <>⏳ <span className="text-copy-300">Enemy is firing…</span></>}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BoardPanel
          title="Your Fleet"
          subtitle="Incoming fire shows here"
          board={
            <BattleshipBoard
              mode="own"
              ships={game.playerShips}
              shotsReceived={game.playerShotsReceived}
              disabled
            />
          }
          status={<BattleshipFleetStatus ships={game.playerFleetStatus} label="Your ships" />}
        />

        <BoardPanel
          title="Enemy Waters"
          subtitle={isPlayerTurn ? 'Click a cell to fire' : 'Wait for your turn'}
          highlight={isPlayerTurn}
          board={
            <BattleshipBoard
              mode="opponent"
              shotResults={game.myShotResults}
              sunkShips={game.revealedAiSunkShips}
              onCellClick={game.playerFire}
              disabled={!isPlayerTurn}
            />
          }
          status={<BattleshipFleetStatus ships={game.aiFleetStatus} label="Enemy ships" />}
        />
      </div>
    </div>
  );
}

function BoardPanel({ title, subtitle, board, status, highlight }) {
  return (
    <div
      className={[
        'flex flex-col gap-3 rounded-2xl border bg-panel-900/60 p-4',
        highlight ? 'border-brand-500 shadow-[0_0_24px_rgba(124,111,255,0.25)]' : 'border-panel-700',
      ].join(' ')}
    >
      <div>
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-copy-50">{title}</h3>
        <p className="text-xs text-copy-300">{subtitle}</p>
      </div>
      <div className="flex justify-center">{board}</div>
      {status}
    </div>
  );
}

function FinishedView({ game, onPlayAgain, onChangeMode }) {
  const won = game.winner === 'player';
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-panel-700 bg-panel-900 p-6 text-center">
        {won ? (
          <p className="text-3xl font-black text-gold-400">🏆 Victory!</p>
        ) : (
          <p className="text-3xl font-black text-rose-400">💥 Defeated</p>
        )}
        <p className="mt-2 text-sm text-copy-300">
          {won ? 'You sank the enemy fleet!' : 'The enemy sank your fleet!'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BoardPanel
          title="Your Fleet"
          subtitle="Final state"
          board={
            <BattleshipBoard
              mode="own"
              ships={game.playerShips}
              shotsReceived={game.playerShotsReceived}
              disabled
            />
          }
          status={<BattleshipFleetStatus ships={game.playerFleetStatus} label="Your ships" />}
        />
        <BoardPanel
          title="Enemy Fleet"
          subtitle="Revealed"
          board={
            <BattleshipBoard
              mode="own"
              ships={game.aiShips}
              shotsReceived={game.aiShotsReceived}
              disabled
            />
          }
          status={<BattleshipFleetStatus ships={game.aiFleetStatus} label="Enemy ships" />}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onPlayAgain}
          className="flex-1 rounded-full bg-linear-to-r from-brand-500 to-brand-600 px-6 py-3 font-bold text-white shadow-[0_8px_24px_rgba(124,111,255,0.4)] transition hover:-translate-y-0.5"
        >
          🔄 Play Again
        </button>
        <button
          onClick={onChangeMode}
          className="flex-1 rounded-full border border-panel-700 bg-panel-900 px-6 py-3 font-bold text-copy-300 transition hover:border-copy-300 hover:text-copy-50"
        >
          Change Mode
        </button>
      </div>
    </div>
  );
}
