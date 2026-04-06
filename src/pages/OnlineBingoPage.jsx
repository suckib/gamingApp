import { useState } from 'react';
import { useOnlineBingo } from '../hooks/useOnlineBingo';
import BingoBoard from '../components/BingoBoard';
import { checkWin } from '../hooks/useBingoGame';

const RANGES = [
  { value: 64, label: '1 – 64' },
  { value: 80, label: '1 – 80' },
  { value: 100, label: '1 – 100' },
];
const SPEEDS = [
  { value: 1000, label: '1 s' },
  { value: 2000, label: '2 s' },
  { value: 3000, label: '3 s' },
  { value: 5000, label: '5 s' },
];

export default function OnlineBingoView({ onBack }) {
  const online = useOnlineBingo();

  return (
    <div className="min-h-screen px-4 py-6 text-copy-50 sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6">

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
        {online.phase === 'waiting' && <WaitingRoom online={online} onBack={onBack} />}
        {online.phase === 'playing' && <GameView online={online} onBack={onBack} />}
        {online.phase === 'finished' && <FinishedView online={online} onBack={onBack} />}
      </div>
    </div>
  );
}

// ─── Lobby ──────────────────────────────────────────────────────────────────

function Lobby({ online, onBack }) {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [range, setRange] = useState(64);
  const [callMode, setCallMode] = useState('auto');
  const [autoSpeed, setAutoSpeed] = useState(2000);
  const [tab, setTab] = useState('create');

  const canCreate = name.trim().length > 0;
  const canJoin = name.trim().length > 0 && joinCode.trim().length >= 4;

  const cardClass = 'w-full max-w-md rounded-2xl border border-panel-700 bg-panel-900/90 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.35)]';
  const toggleBase = 'flex-1 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition';

  return (
    <>
      <h1 className="flex flex-col items-center gap-1 text-center">
        <span className="bg-linear-to-r from-brand-500 via-cyan-400 to-emerald-400 bg-clip-text text-[clamp(2rem,8vw,4rem)] font-black tracking-[0.2em] text-transparent">
          BINGO ONLINE
        </span>
        <span className="text-sm tracking-[0.2em] text-copy-300">Real-time Multiplayer</span>
      </h1>

      {/* Name */}
      <div className={cardClass}>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-copy-300">Your Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value.slice(0, 16))}
          placeholder="Enter your name…"
          className="w-full rounded-xl border border-panel-700 bg-panel-800 px-4 py-3 text-base font-semibold text-copy-50 outline-none transition focus:border-brand-500"
        />
      </div>

      {/* Tabs */}
      <div className="flex w-full max-w-md gap-2">
        <button className={`${toggleBase} ${tab === 'create' ? 'border-brand-500 bg-brand-500/15 text-brand-200' : 'border-transparent bg-panel-800 text-copy-300 hover:border-brand-500/80'}`} onClick={() => setTab('create')}>
          Create Room
        </button>
        <button className={`${toggleBase} ${tab === 'join' ? 'border-brand-500 bg-brand-500/15 text-brand-200' : 'border-transparent bg-panel-800 text-copy-300 hover:border-brand-500/80'}`} onClick={() => setTab('join')}>
          Join Room
        </button>
      </div>

      {tab === 'create' && (
        <div className={cardClass}>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-copy-300">Room Settings</h2>

          {/* Range */}
          <div className="mb-4 flex gap-2">
            {RANGES.map(r => (
              <button key={r.value} className={`flex-1 rounded-lg border-2 px-3 py-2 text-xs font-bold transition ${range === r.value ? 'border-brand-500 bg-brand-500/15 text-brand-200' : 'border-transparent bg-panel-800 text-copy-300 hover:border-brand-500/50'}`} onClick={() => setRange(r.value)}>
                {r.label}
              </button>
            ))}
          </div>

          {/* Call mode */}
          <div className="mb-4 flex gap-2">
            <button className={`${toggleBase} ${callMode === 'auto' ? 'border-brand-500 bg-brand-500/15 text-brand-200' : 'border-transparent bg-panel-800 text-copy-300'}`} onClick={() => setCallMode('auto')}>Auto Draw</button>
            <button className={`${toggleBase} ${callMode === 'manual' ? 'border-brand-500 bg-brand-500/15 text-brand-200' : 'border-transparent bg-panel-800 text-copy-300'}`} onClick={() => setCallMode('manual')}>Manual Draw</button>
          </div>

          {callMode === 'auto' && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-[0.1em] text-copy-300">Speed</span>
              {SPEEDS.map(s => (
                <button key={s.value} className={`rounded-full border-2 px-3 py-1 text-xs font-semibold transition ${autoSpeed === s.value ? 'border-gold-400 bg-gold-400/10 text-gold-400' : 'border-transparent bg-panel-800 text-copy-300 hover:border-gold-400'}`} onClick={() => setAutoSpeed(s.value)}>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <button
            disabled={!canCreate || !online.connected}
            onClick={() => online.createRoom(name.trim(), { range, callMode, autoSpeed })}
            className="w-full rounded-xl bg-linear-to-r from-brand-500 to-brand-600 py-3 font-bold text-white shadow-[0_8px_24px_rgba(124,111,255,0.4)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-45"
          >
            Create Room
          </button>
        </div>
      )}

      {tab === 'join' && (
        <div className={cardClass}>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-copy-300">Room Code</h2>
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="Enter 6-char code…"
            className="mb-4 w-full rounded-xl border border-panel-700 bg-panel-800 px-4 py-3 text-center text-2xl font-black tracking-[0.3em] text-copy-50 outline-none transition focus:border-brand-500"
            maxLength={6}
          />
          <button
            disabled={!canJoin || !online.connected}
            onClick={() => online.joinRoom(joinCode.trim(), name.trim())}
            className="w-full rounded-xl bg-linear-to-r from-cyan-500 to-emerald-500 py-3 font-bold text-white shadow-[0_8px_24px_rgba(6,182,212,0.35)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-45"
          >
            Join Room
          </button>
        </div>
      )}

      <button onClick={onBack} className="rounded-full border border-panel-700 bg-panel-900/50 px-10 py-3 font-semibold text-copy-300 transition hover:border-copy-300 hover:text-copy-50">
        ← Back to Settings
      </button>
    </>
  );
}

// ─── Waiting Room ────────────────────────────────────────────────────────────

function WaitingRoom({ online }) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(online.roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const rangeLabel = RANGES.find(r => r.value === online.settings?.range)?.label || '?';
  const modeLabel = online.settings?.callMode === 'auto' ? 'Auto Draw' : 'Manual Draw';

  return (
    <>
      <h1 className="bg-linear-to-r from-brand-500 via-cyan-400 to-emerald-400 bg-clip-text text-3xl font-black tracking-[0.15em] text-transparent">
        WAITING ROOM
      </h1>

      {/* Room code */}
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs uppercase tracking-[0.2em] text-copy-300">Room Code</span>
        <div className="flex items-center gap-3">
          <span className="rounded-xl border-2 border-brand-500 bg-panel-900 px-6 py-3 text-3xl font-black tracking-[0.35em] text-brand-200">
            {online.roomCode}
          </span>
          <button onClick={copyCode} className="rounded-lg border border-panel-700 bg-panel-800 px-3 py-3 text-sm font-semibold text-copy-300 transition hover:border-brand-500 hover:text-copy-50">
            {copied ? '✓' : '📋'}
          </button>
        </div>
        <p className="text-xs text-copy-300">Share this code with other players</p>
      </div>

      {/* Settings display */}
      <div className="flex gap-4 rounded-xl border border-panel-700 bg-panel-900 px-6 py-3">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.1em] text-copy-300">Range</div>
          <div className="text-sm font-bold">{rangeLabel}</div>
        </div>
        <div className="h-8 w-px bg-panel-700" />
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.1em] text-copy-300">Mode</div>
          <div className="text-sm font-bold">{modeLabel}</div>
        </div>
      </div>

      {/* Player list */}
      <div className="w-full max-w-sm rounded-2xl border border-panel-700 bg-panel-900 p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-copy-300">
          Players ({online.players.length}/8)
        </h2>
        <div className="flex flex-col gap-2">
          {online.players.map((p) => (
            <div key={p.id} className={`flex items-center justify-between rounded-lg px-4 py-2 ${p.id === online.playerId ? 'border border-brand-500/40 bg-brand-500/10' : 'bg-panel-800'}`}>
              <span className="text-sm font-semibold">{p.name}</span>
              <div className="flex items-center gap-2">
                {p.isHost && <span className="rounded bg-gold-400/20 px-2 py-0.5 text-[10px] font-bold text-gold-400">HOST</span>}
                {p.id === online.playerId && <span className="rounded bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-brand-200">YOU</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {online.isHost && (
          <button
            disabled={online.players.length < 2}
            onClick={online.startGame}
            className="rounded-full bg-linear-to-r from-emerald-500 to-cyan-500 px-8 py-3 font-bold text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-45"
          >
            Start Game ({online.players.length}/2+)
          </button>
        )}
        <button onClick={online.leaveRoom} className="rounded-full border border-panel-700 bg-panel-800 px-8 py-3 font-bold text-copy-300 transition hover:border-rose-400 hover:text-rose-400">
          Leave Room
        </button>
      </div>

      {!online.isHost && (
        <p className="text-sm text-copy-300">Waiting for host to start the game…</p>
      )}
    </>
  );
}

// ─── Game View ──────────────────────────────────────────────────────────────

function GameView({ online }) {
  const totalDrawn = online.called.length;
  const range = online.settings?.range || 64;

  // Detect local win for board highlighting
  const localWin = online.board ? checkWin(online.board) : null;

  const controlBase = 'rounded-full px-7 py-3 text-sm font-bold tracking-[0.04em] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-45';

  return (
    <>
      {/* Header */}
      <header className="flex w-full items-center justify-between border-b border-panel-700 pb-4">
        <button className="rounded-full border border-panel-700 bg-panel-900 px-4 py-2 text-xs font-semibold text-copy-300 transition hover:border-rose-400 hover:text-rose-400" onClick={online.leaveRoom}>
          ← Leave
        </button>
        <div className="flex flex-col items-center">
          <h1 className="bg-linear-to-r from-brand-500 via-cyan-400 to-emerald-400 bg-clip-text text-lg font-black tracking-[0.12em] text-transparent sm:text-xl">
            BINGO ONLINE
          </h1>
          <span className="text-[10px] font-semibold tracking-[0.2em] text-copy-300">{online.roomCode}</span>
        </div>
        <div className="flex items-baseline gap-1 text-sm font-bold text-copy-300">
          <span className="text-xl text-copy-50">{totalDrawn}</span>
          <span className="text-panel-700">/</span>
          <span>{range}</span>
        </div>
      </header>

      {/* Current number */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-brand-500 bg-panel-900 shadow-[0_0_28px_rgba(124,111,255,0.4)] sm:h-28 sm:w-28">
          <div className="text-[clamp(1.8rem,5vw,2.8rem)] font-black text-copy-50 animate-[numberPop_0.45s_cubic-bezier(0.175,0.885,0.32,1.275)]" key={online.current ?? 'init'}>
            {online.current ?? '?'}
          </div>
        </div>
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-copy-300">Current Number</p>
      </div>

      {/* Board + Sidebar */}
      <div className="flex w-full flex-col items-center gap-5 lg:flex-row lg:items-start lg:justify-center">
        <BingoBoard board={online.board} winInfo={localWin} />

        {/* Players sidebar */}
        <div className="w-full max-w-[200px] rounded-xl border border-panel-700 bg-panel-900 p-3">
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-copy-300">Players</h3>
          <div className="flex flex-col gap-1.5">
            {online.players.map(p => (
              <div key={p.id} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${p.id === online.playerId ? 'bg-brand-500/10 text-brand-200' : 'text-copy-300'}`}>
                {p.isHost && <span className="text-gold-400">★</span>}
                <span>{p.name}</span>
                {p.id === online.playerId && <span className="text-[9px] text-brand-500">(you)</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-3">
        {online.isHost && online.settings?.callMode === 'manual' && (
          <button className={`${controlBase} bg-linear-to-r from-brand-500 to-brand-600 text-white shadow-[0_8px_24px_rgba(124,111,255,0.4)]`} onClick={online.drawNumber}>
            Draw Number
          </button>
        )}
        {online.isHost && online.settings?.callMode === 'auto' && (
          <button className={`${controlBase} border ${online.autoRunning ? 'border-rose-400 bg-panel-800 text-rose-400' : 'border-mint-400 bg-panel-800 text-mint-400'}`} onClick={online.toggleAuto}>
            {online.autoRunning ? 'Pause' : 'Resume'}
          </button>
        )}
      </div>

      {/* Called numbers */}
      {online.called.length > 0 && (
        <div className="w-full rounded-xl border border-panel-700 bg-panel-900 p-4">
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-copy-300">Called Numbers</h3>
          <div className="flex flex-wrap gap-1.5">
            {[...online.called].reverse().map((num, i) => (
              <span key={num} className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-bold ${i === 0 ? 'border border-brand-500 bg-brand-500/20 text-brand-200' : 'bg-panel-800 text-copy-300'}`}>
                {num}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Finished View ──────────────────────────────────────────────────────────

function FinishedView({ online }) {
  const isTie = online.winner?.tie;
  const isNoWinner = online.winner?.noWinner;
  const iWon = online.winner?.winnerId === online.playerId;
  const opponentsLeft = online.winner?.reason === 'opponents_left';

  // Detect local win for board highlighting
  const localWin = online.board ? checkWin(online.board) : null;

  let title, subtitle, emoji;
  if (isNoWinner) {
    emoji = '😐';
    title = 'NO WINNER';
    subtitle = 'All numbers drawn, no one got bingo!';
  } else if (isTie) {
    emoji = '🤝';
    title = 'TIE!';
    subtitle = online.winner.tiedPlayers?.map(p => p.name).join(' & ') + ' won simultaneously!';
  } else if (opponentsLeft) {
    emoji = '🏆';
    title = iWon ? 'YOU WIN!' : `${online.winner.winnerName} WINS!`;
    subtitle = 'All opponents left the game';
  } else if (iWon) {
    emoji = '🎉';
    title = 'BINGO!';
    subtitle = 'You won!';
  } else {
    emoji = '😔';
    title = 'BINGO!';
    subtitle = `${online.winner?.winnerName || 'Someone'} won!`;
  }

  return (
    <>
      {/* Winner banner */}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-gold-400/50 bg-gold-400/10 px-10 py-8 text-center">
        <span className="text-6xl">{emoji}</span>
        <h1 className="bg-linear-to-r from-gold-400 to-gold-500 bg-clip-text text-4xl font-black tracking-[0.15em] text-transparent">
          {title}
        </h1>
        <p className="text-lg font-semibold text-copy-50">{subtitle}</p>
      </div>

      {/* Board with highlights */}
      {online.board && (
        <BingoBoard board={online.board} winInfo={iWon ? localWin : null} />
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {online.isHost && (
          <button onClick={online.playAgain} className="rounded-full bg-linear-to-r from-emerald-500 to-cyan-500 px-8 py-3 font-bold text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] transition hover:-translate-y-0.5">
            Play Again
          </button>
        )}
        <button onClick={online.leaveRoom} className="rounded-full border border-panel-700 bg-panel-800 px-8 py-3 font-bold text-copy-300 transition hover:border-copy-300 hover:text-copy-50">
          Leave Room
        </button>
      </div>

      {!online.isHost && (
        <p className="text-sm text-copy-300">Waiting for host to restart or leave…</p>
      )}
    </>
  );
}
