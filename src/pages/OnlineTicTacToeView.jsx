import { useState } from 'react';
import { useOnlineTicTacToe } from '../hooks/useOnlineTicTacToe';
import TicTacToeBoard from '../components/TicTacToeBoard';

export default function OnlineTicTacToeView({ onBack }) {
  const online = useOnlineTicTacToe();

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Connection indicator */}
      <div className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${online.connected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
        <span className={`h-2 w-2 rounded-full ${online.connected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
        {online.connected ? 'Connected' : 'Disconnected'}
      </div>

      {/* Error toast */}
      {online.error && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-xl border border-rose-400 bg-rose-500/20 px-6 py-3 text-sm font-semibold text-rose-300 shadow-xl">
          {online.error}
        </div>
      )}

      {online.phase === 'lobby' && <Lobby online={online} onBack={onBack} />}
      {online.phase === 'waiting' && <WaitingRoom online={online} />}
      {online.phase === 'playing' && <GameView online={online} />}
      {online.phase === 'finished' && <FinishedView online={online} />}
    </div>
  );
}

// ─── Lobby ──────────────────────────────────────────────────────────────────

function Lobby({ online, onBack }) {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [tab, setTab] = useState('create');

  const canCreate = name.trim().length > 0;
  const canJoin = name.trim().length > 0 && joinCode.trim().length >= 4;

  const toggleBase = 'flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition';
  const cardClass = 'w-full max-w-md rounded-2xl border border-panel-700 bg-panel-900/90 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.35)]';

  return (
    <>
      <h1 className="flex flex-col items-center gap-1 text-center">
        <span className="bg-linear-to-r from-brand-500 via-pink-400 to-gold-400 bg-clip-text text-[clamp(2rem,8vw,3.5rem)] font-black tracking-[0.2em] text-transparent">
          TIC TAC TOE
        </span>
        <span className="text-sm tracking-[0.2em] text-copy-300">Online Multiplayer</span>
      </h1>

      <div className={cardClass}>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-copy-300">Your Name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value.slice(0, 16))} placeholder="Enter your name…" className="w-full rounded-xl border border-panel-700 bg-panel-800 px-4 py-3 text-base font-semibold text-copy-50 outline-none transition focus:border-brand-500" />
      </div>

      <div className="flex w-full max-w-md gap-2">
        <button className={`${toggleBase} ${tab === 'create' ? 'border-brand-500 bg-brand-500/15 text-brand-200' : 'border-transparent bg-panel-800 text-copy-300 hover:border-brand-500/80'}`} onClick={() => setTab('create')}>Create Room</button>
        <button className={`${toggleBase} ${tab === 'join' ? 'border-brand-500 bg-brand-500/15 text-brand-200' : 'border-transparent bg-panel-800 text-copy-300 hover:border-brand-500/80'}`} onClick={() => setTab('join')}>Join Room</button>
      </div>

      {tab === 'create' && (
        <div className={cardClass}>
          <p className="mb-4 text-xs text-copy-300">Create a room and share the code with your friend.</p>
          <button disabled={!canCreate || !online.connected} onClick={() => online.createRoom(name.trim())} className="w-full rounded-xl bg-linear-to-r from-brand-500 to-brand-600 py-3 font-bold text-white shadow-[0_8px_24px_rgba(124,111,255,0.4)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-45">
            Create Room
          </button>
        </div>
      )}

      {tab === 'join' && (
        <div className={cardClass}>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-copy-300">Room Code</label>
          <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="Enter 6-char code…" className="mb-4 w-full rounded-xl border border-panel-700 bg-panel-800 px-4 py-3 text-center text-2xl font-black tracking-[0.3em] text-copy-50 outline-none transition focus:border-brand-500" maxLength={6} />
          <button disabled={!canJoin || !online.connected} onClick={() => online.joinRoom(joinCode.trim(), name.trim())} className="w-full rounded-xl bg-linear-to-r from-gold-400 to-gold-500 py-3 font-bold text-ink-950 shadow-[0_8px_24px_rgba(255,215,0,0.3)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-45">
            Join Room
          </button>
        </div>
      )}

      <button onClick={onBack} className="rounded-full border border-panel-700 bg-panel-900/50 px-10 py-3 font-semibold text-copy-300 transition hover:border-copy-300 hover:text-copy-50">
        ← Back
      </button>
    </>
  );
}

// ─── Waiting Room ───────────────────────────────────────────────────────────

function WaitingRoom({ online }) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(online.roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <h1 className="bg-linear-to-r from-brand-500 via-pink-400 to-gold-400 bg-clip-text text-3xl font-black tracking-[0.15em] text-transparent">
        WAITING ROOM
      </h1>

      <div className="flex flex-col items-center gap-2">
        <span className="text-xs uppercase tracking-[0.2em] text-copy-300">Room Code</span>
        <div className="flex items-center gap-3">
          <span className="rounded-xl border-2 border-brand-500 bg-panel-900 px-6 py-3 text-3xl font-black tracking-[0.35em] text-brand-200">{online.roomCode}</span>
          <button onClick={copyCode} className="rounded-lg border border-panel-700 bg-panel-800 px-3 py-3 text-sm font-semibold text-copy-300 transition hover:border-brand-500 hover:text-copy-50">
            {copied ? '✓' : '📋'}
          </button>
        </div>
        <p className="text-xs text-copy-300">Share this code with your opponent</p>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-panel-700 bg-panel-900 p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-copy-300">Players ({online.players.length}/2)</h2>
        <div className="flex flex-col gap-2">
          {online.players.map(p => (
            <div key={p.id} className={`flex items-center justify-between rounded-lg px-4 py-2 ${p.id === online.playerId ? 'border border-brand-500/40 bg-brand-500/10' : 'bg-panel-800'}`}>
              <span className="text-sm font-semibold">{p.name}</span>
              <div className="flex items-center gap-2">
                {p.symbol && <span className="rounded bg-panel-700 px-2 py-0.5 text-[10px] font-bold text-copy-50">{p.symbol}</span>}
                {p.isHost && <span className="rounded bg-gold-400/20 px-2 py-0.5 text-[10px] font-bold text-gold-400">HOST</span>}
                {p.id === online.playerId && <span className="rounded bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-brand-200">YOU</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        {online.isHost && (
          <button disabled={online.players.length < 2} onClick={online.startGame} className="rounded-full bg-linear-to-r from-emerald-500 to-cyan-500 px-8 py-3 font-bold text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-45">
            Start Game ({online.players.length}/2)
          </button>
        )}
        <button onClick={online.leaveRoom} className="rounded-full border border-panel-700 bg-panel-800 px-8 py-3 font-bold text-copy-300 transition hover:border-rose-400 hover:text-rose-400">
          Leave Room
        </button>
      </div>

      {!online.isHost && <p className="text-sm text-copy-300">Waiting for host to start…</p>}
    </>
  );
}

// ─── Game View ──────────────────────────────────────────────────────────────

function GameView({ online }) {
  const myName = online.players.find(p => p.id === online.playerId)?.name || 'You';
  const opponentName = online.players.find(p => p.id !== online.playerId)?.name || 'Opponent';

  const turnLabel = online.isMyTurn ? `Your turn (${online.mySymbol})` : `${opponentName}'s turn`;

  return (
    <>
      <header className="flex w-full items-center justify-between">
        <button className="rounded-full border border-panel-700 bg-panel-900 px-4 py-2 text-xs font-semibold text-copy-300 transition hover:border-rose-400 hover:text-rose-400" onClick={online.leaveRoom}>← Leave</button>
        <div className="flex flex-col items-center">
          <h1 className="bg-linear-to-r from-brand-500 via-pink-400 to-gold-400 bg-clip-text text-xl font-black tracking-[0.12em] text-transparent">TIC TAC TOE</h1>
          <span className="text-[10px] font-semibold tracking-[0.2em] text-copy-300">{online.roomCode}</span>
        </div>
        <div className="w-[72px]" />
      </header>

      {/* Status */}
      <div className="rounded-xl border border-panel-700 bg-panel-900 px-6 py-3 text-center">
        <p className="text-lg font-semibold">
          {online.isMyTurn
            ? <span className="text-brand-200">{turnLabel}</span>
            : <span className="text-copy-300">{turnLabel}</span>
          }
        </p>
      </div>

      {/* Players bar */}
      <div className="flex w-full max-w-xs justify-between rounded-xl border border-panel-700 bg-panel-900 px-4 py-2">
        <div className={`text-sm font-bold ${online.mySymbol === 'X' && online.isMyTurn ? 'text-brand-200' : 'text-copy-300'}`}>
          {online.mySymbol === 'X' ? '✕' : '◯'} {myName}
        </div>
        <span className="text-panel-700">vs</span>
        <div className={`text-sm font-bold ${online.mySymbol !== 'X' && !online.isMyTurn ? 'text-brand-200' : 'text-copy-300'}`}>
          {online.mySymbol === 'X' ? '◯' : '✕'} {opponentName}
        </div>
      </div>

      <TicTacToeBoard
        board={online.board}
        onMove={online.makeMove}
        disabled={!online.isMyTurn}
        winningCombo={[]}
      />
    </>
  );
}

// ─── Finished View ──────────────────────────────────────────────────────────

function FinishedView({ online }) {
  const isDraw = online.winner?.draw;
  const opponentLeft = online.winner?.reason === 'opponent_left';
  const iWon = online.winner?.winnerId === online.playerId;
  const winnerName = online.winner?.winnerName || 'Someone';
  const winCombo = online.winner?.winningCombo || [];

  let emoji, title, subtitle;
  if (isDraw) {
    emoji = '🤝'; title = "IT'S A DRAW!"; subtitle = 'No one wins this round.';
  } else if (opponentLeft) {
    emoji = '🏆'; title = iWon ? 'YOU WIN!' : `${winnerName} WINS!`; subtitle = 'Opponent left the game';
  } else if (iWon) {
    emoji = '🎉'; title = 'YOU WIN!'; subtitle = 'Great game!';
  } else {
    emoji = '😔'; title = `${winnerName} WINS!`; subtitle = 'Better luck next time!';
  }

  return (
    <>
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-gold-400/50 bg-gold-400/10 px-10 py-8 text-center">
        <span className="text-6xl">{emoji}</span>
        <h1 className="bg-linear-to-r from-gold-400 to-gold-500 bg-clip-text text-4xl font-black tracking-[0.15em] text-transparent">{title}</h1>
        <p className="text-lg font-semibold text-copy-50">{subtitle}</p>
      </div>

      <TicTacToeBoard
        board={online.board}
        onMove={() => {}}
        disabled={true}
        winningCombo={winCombo}
      />

      <div className="flex gap-3">
        {online.isHost && (
          <button onClick={online.playAgain} className="rounded-full bg-linear-to-r from-brand-500 to-brand-600 px-8 py-3 font-bold text-white shadow-[0_8px_24px_rgba(124,111,255,0.4)] transition hover:-translate-y-0.5">
            Play Again
          </button>
        )}
        <button onClick={online.leaveRoom} className="rounded-full border border-panel-700 bg-panel-800 px-8 py-3 font-bold text-copy-300 transition hover:border-copy-300 hover:text-copy-50">
          Leave Room
        </button>
      </div>

      {!online.isHost && <p className="text-sm text-copy-300">Waiting for host to restart…</p>}
    </>
  );
}
