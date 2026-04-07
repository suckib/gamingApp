import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || `http://${window.location.hostname}:3001`;

export function useOnlineTicTacToe() {
  const socketRef = useRef(null);

  const [connected, setConnected] = useState(false);
  const [phase, setPhase] = useState('lobby'); // lobby | waiting | playing | finished
  const [roomCode, setRoomCode] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);

  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentTurn, setCurrentTurn] = useState(null);
  const [mySymbol, setMySymbol] = useState(null);
  const [winner, setWinner] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // ── Room events ──────────────────────────────────

    socket.on('ttt:created', (data) => {
      setRoomCode(data.roomCode);
      setPlayerId(data.playerId);
      setPlayers(data.players);
      setIsHost(true);
      setMySymbol('X');
      setPhase('waiting');
      setError(null);
    });

    socket.on('ttt:joined', (data) => {
      setRoomCode(data.roomCode);
      setPlayerId(data.playerId);
      setPlayers(data.players);
      setIsHost(false);
      setMySymbol('O');
      setPhase('waiting');
      setError(null);
    });

    socket.on('ttt:updated', (data) => {
      setPlayers(data.players);
      setIsHost(prev => {
        const me = data.players.find(p => p.id === socketRef.current?.id);
        return me ? me.isHost : prev;
      });
    });

    socket.on('ttt:error', (data) => {
      setError(data.message);
      setTimeout(() => setError(null), 4000);
    });

    // ── Game events ──────────────────────────────────

    socket.on('ttt:started', (data) => {
      setBoard(data.board);
      setCurrentTurn(data.currentTurn);
      setWinner(null);
      setPhase('playing');
      // Update my symbol from player list
      const me = data.players.find(p => p.id === socketRef.current?.id);
      if (me) setMySymbol(me.symbol);
    });

    socket.on('ttt:moved', (data) => {
      setBoard(data.board);
      setCurrentTurn(data.currentTurn);
    });

    socket.on('ttt:gameover', (data) => {
      setWinner(data);
      setPhase('finished');
    });

    socket.on('ttt:restarted', (data) => {
      setBoard(data.board);
      setCurrentTurn(data.currentTurn);
      setWinner(null);
      setPhase('playing');
      const me = data.players.find(p => p.id === socketRef.current?.id);
      if (me) setMySymbol(me.symbol);
    });

    return () => { socket.disconnect(); };
  }, []);

  // ── Actions ────────────────────────────────────────

  const createRoom = useCallback((playerName) => {
    socketRef.current?.emit('ttt:create', { playerName });
  }, []);

  const joinRoom = useCallback((code, playerName) => {
    socketRef.current?.emit('ttt:join', { roomCode: code, playerName });
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('ttt:leave');
    setPhase('lobby');
    setRoomCode(null);
    setPlayers([]);
    setIsHost(false);
    setBoard(Array(9).fill(null));
    setCurrentTurn(null);
    setWinner(null);
    setMySymbol(null);
    setError(null);
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('ttt:start');
  }, []);

  const makeMove = useCallback((index) => {
    socketRef.current?.emit('ttt:move', { index });
  }, []);

  const playAgain = useCallback(() => {
    socketRef.current?.emit('ttt:playAgain');
  }, []);

  const isMyTurn = currentTurn === playerId;

  return {
    connected, phase, roomCode, playerId, players, isHost,
    board, currentTurn, mySymbol, isMyTurn, winner,
    createRoom, joinRoom, leaveRoom, startGame, makeMove, playAgain,
    error,
  };
}
