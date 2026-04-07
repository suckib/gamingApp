import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:3001`;

/** Mark a single number on an 8×8 board */
function markBoard(board, num) {
  return board.map(row =>
    row.map(cell => (cell.value === num ? { ...cell, marked: true } : cell))
  );
}

/**
 * useOnlineBingo — manages the full online multiplayer flow:
 * connection → lobby → waiting room → playing → finished
 */
export function useOnlineBingo() {
  const socketRef = useRef(null);

  // Connection
  const [connected, setConnected] = useState(false);

  // Phase: lobby → waiting → playing → finished
  const [phase, setPhase] = useState('lobby');

  // Room state
  const [roomCode, setRoomCode] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [settings, setSettings] = useState(null);

  // Game state
  const [board, setBoard] = useState(null);
  const [called, setCalled] = useState([]);
  const [current, setCurrent] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [winner, setWinner] = useState(null);
  const [autoRunning, setAutoRunning] = useState(false);

  // Error
  const [error, setError] = useState(null);

  // ── Socket connection & event wiring ─────────────────────────────────

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // ── Room events ──────────────────────────────────────────────────

    socket.on('room:created', (data) => {
      setRoomCode(data.roomCode);
      setPlayerId(data.playerId);
      setPlayers(data.players);
      setSettings(data.settings);
      setIsHost(true);
      setPhase('waiting');
      setError(null);
    });

    socket.on('room:joined', (data) => {
      setRoomCode(data.roomCode);
      setPlayerId(data.playerId);
      setPlayers(data.players);
      setSettings(data.settings);
      setIsHost(data.isHost);
      setPhase('waiting');
      setError(null);
    });

    socket.on('room:updated', (data) => {
      setPlayers(data.players);
      // Check if I became host
      setIsHost(prev => {
        const me = data.players.find(p => p.id === socketRef.current?.id);
        return me ? me.isHost : prev;
      });
    });

    socket.on('room:error', (data) => {
      setError(data.message);
      // Clear error after 4 seconds
      setTimeout(() => setError(null), 4000);
    });

    // ── Game events ──────────────────────────────────────────────────

    socket.on('game:started', (data) => {
      setBoard(data.board);
      setRemaining(data.poolSize);
      setCalled([]);
      setCurrent(null);
      setWinner(null);
      setPhase('playing');
    });

    socket.on('game:restarted', (data) => {
      setBoard(data.board);
      setRemaining(data.poolSize);
      setCalled([]);
      setCurrent(null);
      setWinner(null);
      setPhase('playing');
    });

    socket.on('game:drawn', (data) => {
      setCurrent(data.number);
      setCalled(data.called);
      setRemaining(data.remaining);
      setBoard(prev => prev ? markBoard(prev, data.number) : prev);
    });

    socket.on('game:winner', (data) => {
      setWinner(data);
      setPhase('finished');
    });

    socket.on('game:over', (data) => {
      setWinner({ noWinner: true, reason: data.reason });
      setPhase('finished');
    });

    socket.on('game:autoState', (data) => {
      setAutoRunning(data.running);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────

  const createRoom = useCallback((playerName, roomSettings) => {
    socketRef.current?.emit('room:create', {
      playerName,
      settings: roomSettings,
    });
  }, []);

  const joinRoom = useCallback((code, playerName) => {
    socketRef.current?.emit('room:join', {
      roomCode: code,
      playerName,
    });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('room:leave');
    setPhase('lobby');
    setRoomCode(null);
    setPlayers([]);
    setIsHost(false);
    setBoard(null);
    setCalled([]);
    setCurrent(null);
    setWinner(null);
    setAutoRunning(false);
    setError(null);
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('game:start');
  }, []);

  const drawNumber = useCallback(() => {
    socketRef.current?.emit('game:draw');
  }, []);

  const toggleAuto = useCallback(() => {
    socketRef.current?.emit('game:toggleAuto');
  }, []);

  const playAgain = useCallback(() => {
    socketRef.current?.emit('game:playAgain');
  }, []);

  return {
    // Connection
    connected,
    // Room
    phase, roomCode, playerId, players, isHost, settings,
    // Game
    board, called, current, remaining, winner, autoRunning,
    // Actions
    createRoom, joinRoom, leaveRoom, startGame, drawNumber, toggleAuto, playAgain,
    // Error
    error,
  };
}
