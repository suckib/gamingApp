import { shuffle, generateBoard, markBoard, checkWin } from './bingoEngine.js';

// ─── Room code generation ────────────────────────────────────────────────
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no ambiguous I,L,O,0,1

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

// ─── Sanitize player name ────────────────────────────────────────────────
function sanitizeName(name) {
  return String(name || 'Player').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 16) || 'Player';
}

// ─── Room Manager ────────────────────────────────────────────────────────

export default class RoomManager {
  constructor() {
    this.rooms = new Map();       // code → room
    this.playerRooms = new Map(); // socketId → code
  }

  // ── Queries ──────────────────────────────────────────────────────────

  getRoom(code) {
    return this.rooms.get(code) || null;
  }

  getPlayerRoom(socketId) {
    const code = this.playerRooms.get(socketId);
    return code ? this.rooms.get(code) || null : null;
  }

  isHost(socketId) {
    const room = this.getPlayerRoom(socketId);
    return room ? room.hostId === socketId : false;
  }

  serializePlayers(room) {
    return [...room.players.entries()].map(([id, p]) => ({
      id,
      name: p.name,
      isHost: id === room.hostId,
    }));
  }

  // ── Create ───────────────────────────────────────────────────────────

  createRoom(socketId, playerName, settings) {
    if (this.playerRooms.has(socketId)) {
      return { error: 'You are already in a room' };
    }

    const code = generateCode(this.rooms);
    const name = sanitizeName(playerName);

    const room = {
      code,
      hostId: socketId,
      settings: {
        range: [64, 80, 100].includes(settings.range) ? settings.range : 64,
        callMode: settings.callMode === 'manual' ? 'manual' : 'auto',
        autoSpeed: [1000, 2000, 3000, 5000].includes(settings.autoSpeed) ? settings.autoSpeed : 2000,
      },
      players: new Map(),
      state: 'waiting',   // waiting | playing | finished
      pool: [],
      called: [],
      current: null,
      winner: null,
      drawInterval: null,
      lastActivity: Date.now(),
    };

    room.players.set(socketId, { name, board: null });
    this.rooms.set(code, room);
    this.playerRooms.set(socketId, code);

    return { room, code };
  }

  // ── Join ─────────────────────────────────────────────────────────────

  joinRoom(code, socketId, playerName) {
    if (this.playerRooms.has(socketId)) {
      return { error: 'You are already in a room' };
    }

    const room = this.rooms.get(code);
    if (!room) return { error: 'Room not found' };
    if (room.state !== 'waiting') return { error: 'Game already in progress' };
    if (room.players.size >= 8) return { error: 'Room is full (max 8 players)' };

    const name = sanitizeName(playerName);
    room.players.set(socketId, { name, board: null });
    this.playerRooms.set(socketId, code);
    room.lastActivity = Date.now();

    return { room };
  }

  // ── Leave ────────────────────────────────────────────────────────────

  leaveRoom(socketId) {
    const code = this.playerRooms.get(socketId);
    if (!code) return null;

    const room = this.rooms.get(code);
    if (!room) {
      this.playerRooms.delete(socketId);
      return null;
    }

    room.players.delete(socketId);
    this.playerRooms.delete(socketId);

    // If room is empty, destroy it
    if (room.players.size === 0) {
      if (room.drawInterval) clearInterval(room.drawInterval);
      this.rooms.delete(code);
      return { room, destroyed: true };
    }

    // If host left, promote next player
    if (room.hostId === socketId) {
      room.hostId = room.players.keys().next().value;
    }

    // If game is playing and only 1 player left, end game
    if (room.state === 'playing' && room.players.size < 2) {
      if (room.drawInterval) clearInterval(room.drawInterval);
      room.state = 'finished';
      const lastPlayer = room.players.entries().next().value;
      room.winner = { id: lastPlayer[0], name: lastPlayer[1].name, winInfo: null, reason: 'opponents_left' };
    }

    room.lastActivity = Date.now();
    return { room, destroyed: false };
  }

  // ── Start Game ───────────────────────────────────────────────────────

  startGame(code) {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Room not found' };
    if (room.state !== 'waiting') return { error: 'Game already started' };
    if (room.players.size < 2) return { error: 'Need at least 2 players' };

    room.state = 'playing';
    room.pool = shuffle(Array.from({ length: room.settings.range }, (_, i) => i + 1));
    room.called = [];
    room.current = null;
    room.winner = null;

    // Generate unique board for each player
    for (const [id, player] of room.players) {
      player.board = generateBoard(room.settings.range);
    }

    room.lastActivity = Date.now();
    return { room };
  }

  // ── Draw Number ──────────────────────────────────────────────────────

  drawNumber(code) {
    const room = this.rooms.get(code);
    if (!room || room.state !== 'playing' || room.pool.length === 0) return null;

    const num = room.pool.shift();
    room.called.push(num);
    room.current = num;

    // Mark all boards and check for wins
    const winners = [];
    for (const [id, player] of room.players) {
      player.board = markBoard(player.board, num);
      const win = checkWin(player.board);
      if (win) {
        winners.push({ id, name: player.name, winInfo: win });
      }
    }

    room.lastActivity = Date.now();

    if (winners.length > 0) {
      if (room.drawInterval) clearInterval(room.drawInterval);
      room.drawInterval = null;
      room.state = 'finished';

      if (winners.length === 1) {
        room.winner = winners[0];
      } else {
        room.winner = { tie: true, players: winners };
      }

      return { num, winners, poolExhausted: false };
    }

    if (room.pool.length === 0) {
      if (room.drawInterval) clearInterval(room.drawInterval);
      room.drawInterval = null;
      room.state = 'finished';
      return { num, winners: [], poolExhausted: true };
    }

    return { num, winners: [], poolExhausted: false };
  }

  // ── Reset for Play Again ─────────────────────────────────────────────

  resetGame(code) {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Room not found' };

    room.state = 'playing';
    room.pool = shuffle(Array.from({ length: room.settings.range }, (_, i) => i + 1));
    room.called = [];
    room.current = null;
    room.winner = null;
    if (room.drawInterval) clearInterval(room.drawInterval);
    room.drawInterval = null;

    for (const [id, player] of room.players) {
      player.board = generateBoard(room.settings.range);
    }

    room.lastActivity = Date.now();
    return { room };
  }

  // ── Idle Cleanup (call periodically) ─────────────────────────────────

  cleanupIdle(maxAgeMs = 30 * 60 * 1000) {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (now - room.lastActivity > maxAgeMs) {
        if (room.drawInterval) clearInterval(room.drawInterval);
        for (const id of room.players.keys()) {
          this.playerRooms.delete(id);
        }
        this.rooms.delete(code);
      }
    }
  }
}
