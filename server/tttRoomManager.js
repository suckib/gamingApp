import { checkWinner, isBoardFull } from './tttEngine.js';

// ─── Room code generation ────────────────────────────────────────────────
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(existingCodes) {
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
  } while (existingCodes.has(code));
  return code;
}

function sanitizeName(name) {
  return String(name || 'Player').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 16) || 'Player';
}

// ─── TTT Room Manager ───────────────────────────────────────────────────

export default class TttRoomManager {
  constructor() {
    this.rooms = new Map();       // code → room
    this.playerRooms = new Map(); // socketId → code
  }

  getRoom(code) { return this.rooms.get(code) || null; }

  getPlayerRoom(socketId) {
    const code = this.playerRooms.get(socketId);
    return code ? this.rooms.get(code) || null : null;
  }

  serializePlayers(room) {
    return [...room.players.entries()].map(([id, p]) => ({
      id, name: p.name, symbol: p.symbol, isHost: id === room.hostId,
    }));
  }

  // ── Create ───────────────────────────────────────────────────────────

  createRoom(socketId, playerName) {
    if (this.playerRooms.has(socketId)) return { error: 'Already in a room' };

    const code = generateCode(this.rooms);
    const name = sanitizeName(playerName);

    const room = {
      code,
      hostId: socketId,
      players: new Map(),
      state: 'waiting',       // waiting | playing | finished
      board: Array(9).fill(null),
      currentTurn: null,      // socketId of whose turn it is
      winner: null,           // { winnerId, winnerName, symbol, winningCombo } | { draw:true }
      lastActivity: Date.now(),
    };

    room.players.set(socketId, { name, symbol: 'X' }); // host is always X
    this.rooms.set(code, room);
    this.playerRooms.set(socketId, code);

    return { room, code };
  }

  // ── Join ─────────────────────────────────────────────────────────────

  joinRoom(code, socketId, playerName) {
    if (this.playerRooms.has(socketId)) return { error: 'Already in a room' };

    const room = this.rooms.get(code);
    if (!room) return { error: 'Room not found' };
    if (room.state !== 'waiting') return { error: 'Game already in progress' };
    if (room.players.size >= 2) return { error: 'Room is full (2 players max)' };

    const name = sanitizeName(playerName);
    room.players.set(socketId, { name, symbol: 'O' }); // joiner is O
    this.playerRooms.set(socketId, code);
    room.lastActivity = Date.now();

    return { room };
  }

  // ── Leave ────────────────────────────────────────────────────────────

  leaveRoom(socketId) {
    const code = this.playerRooms.get(socketId);
    if (!code) return null;

    const room = this.rooms.get(code);
    if (!room) { this.playerRooms.delete(socketId); return null; }

    room.players.delete(socketId);
    this.playerRooms.delete(socketId);

    if (room.players.size === 0) {
      this.rooms.delete(code);
      return { room, destroyed: true };
    }

    // Promote remaining player to host
    if (room.hostId === socketId) {
      room.hostId = room.players.keys().next().value;
    }

    // If game was in progress, the remaining player wins
    if (room.state === 'playing') {
      room.state = 'finished';
      const remaining = room.players.entries().next().value;
      room.winner = {
        winnerId: remaining[0],
        winnerName: remaining[1].name,
        symbol: remaining[1].symbol,
        winningCombo: [],
        reason: 'opponent_left',
      };
    }

    room.lastActivity = Date.now();
    return { room, destroyed: false };
  }

  // ── Start Game ───────────────────────────────────────────────────────

  startGame(code) {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Room not found' };
    if (room.state !== 'waiting') return { error: 'Game already started' };
    if (room.players.size < 2) return { error: 'Need 2 players' };

    room.state = 'playing';
    room.board = Array(9).fill(null);
    room.winner = null;
    // X always goes first — find the player with symbol X
    room.currentTurn = [...room.players.entries()].find(([, p]) => p.symbol === 'X')[0];
    room.lastActivity = Date.now();

    return { room };
  }

  // ── Make Move ────────────────────────────────────────────────────────

  makeMove(code, socketId, index) {
    const room = this.rooms.get(code);
    if (!room || room.state !== 'playing') return { error: 'Game not in progress' };
    if (room.currentTurn !== socketId) return { error: 'Not your turn' };
    if (index < 0 || index > 8 || room.board[index] !== null) return { error: 'Invalid move' };

    const player = room.players.get(socketId);
    room.board[index] = player.symbol;
    room.lastActivity = Date.now();

    // Check for win
    const result = checkWinner(room.board);
    if (result) {
      room.state = 'finished';
      room.winner = {
        winnerId: socketId,
        winnerName: player.name,
        symbol: result.winner,
        winningCombo: result.winningCombo,
      };
      return { room, board: room.board, winner: room.winner };
    }

    // Check for draw
    if (isBoardFull(room.board)) {
      room.state = 'finished';
      room.winner = { draw: true };
      return { room, board: room.board, winner: room.winner };
    }

    // Switch turn
    const otherPlayer = [...room.players.entries()].find(([id]) => id !== socketId);
    room.currentTurn = otherPlayer[0];

    return { room, board: room.board, winner: null };
  }

  // ── Reset for Play Again ─────────────────────────────────────────────

  resetGame(code) {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Room not found' };

    // Swap symbols for fairness
    for (const [, player] of room.players) {
      player.symbol = player.symbol === 'X' ? 'O' : 'X';
    }

    room.state = 'playing';
    room.board = Array(9).fill(null);
    room.winner = null;
    room.currentTurn = [...room.players.entries()].find(([, p]) => p.symbol === 'X')[0];
    room.lastActivity = Date.now();

    return { room };
  }

  // ── Idle Cleanup ─────────────────────────────────────────────────────

  cleanupIdle(maxAgeMs = 30 * 60 * 1000) {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (now - room.lastActivity > maxAgeMs) {
        for (const id of room.players.keys()) this.playerRooms.delete(id);
        this.rooms.delete(code);
      }
    }
  }
}
