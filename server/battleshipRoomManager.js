import { validateFleet, resolveShot, BOARD_SIZE } from './battleshipEngine.js';

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

function sanitizeName(name) {
  return String(name || 'Player').replace(/[^a-zA-Z0-9 _-]/g, '').trim().slice(0, 16) || 'Player';
}

// ─── Battleship Room Manager ────────────────────────────────────────────

export default class BattleshipRoomManager {
  constructor() {
    this.rooms = new Map();        // code → room
    this.playerRooms = new Map();  // socketId → code
  }

  // ── Queries ──────────────────────────────────────────────────────────

  getRoom(code) { return this.rooms.get(code) || null; }

  getPlayerRoom(socketId) {
    const code = this.playerRooms.get(socketId);
    return code ? this.rooms.get(code) || null : null;
  }

  serializePlayers(room) {
    return [...room.players.entries()].map(([id, p]) => ({
      id,
      name: p.name,
      isHost: id === room.hostId,
      ready: p.ready,
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
      state: 'waiting',     // waiting | placement | playing | finished
      currentTurn: null,    // socketId of whose turn to fire
      winner: null,         // { winnerId, winnerName, reason }
      lastActivity: Date.now(),
    };

    room.players.set(socketId, newPlayer(name));
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
    room.players.set(socketId, newPlayer(name));
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

    if (room.hostId === socketId) {
      room.hostId = room.players.keys().next().value;
    }

    // If game was in progress (placement or playing), remaining player wins
    if (room.state === 'placement' || room.state === 'playing') {
      room.state = 'finished';
      const remaining = room.players.entries().next().value;
      room.winner = {
        winnerId: remaining[0],
        winnerName: remaining[1].name,
        reason: 'opponent_left',
      };
    }

    room.lastActivity = Date.now();
    return { room, destroyed: false };
  }

  // ── Start Placement Phase ────────────────────────────────────────────

  startPlacement(code) {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Room not found' };
    if (room.state !== 'waiting') return { error: 'Game already started' };
    if (room.players.size < 2) return { error: 'Need 2 players' };

    room.state = 'placement';
    for (const [, player] of room.players) {
      player.ships = [];
      player.shotsReceived = new Set();
      player.ready = false;
    }
    room.winner = null;
    room.currentTurn = null;
    room.lastActivity = Date.now();

    return { room };
  }

  // ── Submit Placement ─────────────────────────────────────────────────

  submitPlacement(code, socketId, ships) {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Room not found' };
    if (room.state !== 'placement') return { error: 'Not in placement phase' };

    const player = room.players.get(socketId);
    if (!player) return { error: 'Not in this room' };
    if (player.ready) return { error: 'Already submitted' };

    const validation = validateFleet(ships);
    if (!validation.valid) return { error: validation.error };

    player.ships = ships.map(s => ({
      type: s.type,
      size: s.cells.length,
      cells: s.cells.map(([r, c]) => [r, c]),
      hits: 0,
      sunk: false,
    }));
    player.ready = true;
    player.shotsReceived = new Set();
    room.lastActivity = Date.now();

    const allReady = [...room.players.values()].every(p => p.ready);
    let started = false;
    if (allReady) {
      room.state = 'playing';
      room.currentTurn = room.hostId;   // host fires first
      started = true;
    }

    return { room, ready: true, bothReady: allReady, started };
  }

  // ── Fire Shot ────────────────────────────────────────────────────────

  fireShot(code, shooterId, row, col) {
    const room = this.rooms.get(code);
    if (!room || room.state !== 'playing') return { error: 'Game not in progress' };
    if (room.currentTurn !== shooterId) return { error: 'Not your turn' };
    if (!Number.isInteger(row) || !Number.isInteger(col) ||
        row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
      return { error: 'Coordinates out of bounds' };
    }

    let defenderId = null;
    for (const id of room.players.keys()) {
      if (id !== shooterId) { defenderId = id; break; }
    }
    if (!defenderId) return { error: 'No opponent found' };
    const defender = room.players.get(defenderId);

    if (defender.shotsReceived.has(`${row},${col}`)) {
      return { error: 'Already fired at this cell' };
    }

    const outcome = resolveShot(defender.ships, defender.shotsReceived, row, col);
    defender.ships = outcome.updatedShips;
    defender.shotsReceived = outcome.updatedShotsReceived;

    let nextTurn;
    if (outcome.gameOver) {
      room.state = 'finished';
      const shooter = room.players.get(shooterId);
      room.winner = {
        winnerId: shooterId,
        winnerName: shooter.name,
        reason: 'fleet_sunk',
      };
      nextTurn = null;
    } else {
      room.currentTurn = defenderId;
      nextTurn = defenderId;
    }

    room.lastActivity = Date.now();
    return {
      shooterId,
      row,
      col,
      result: outcome.result,
      ship: outcome.ship,
      gameOver: outcome.gameOver,
      winner: room.winner,
      nextTurn,
    };
  }

  // ── Reset for Play Again ─────────────────────────────────────────────

  resetGame(code) {
    const room = this.rooms.get(code);
    if (!room) return { error: 'Room not found' };

    room.state = 'placement';
    for (const [, player] of room.players) {
      player.ships = [];
      player.shotsReceived = new Set();
      player.ready = false;
    }
    room.currentTurn = null;
    room.winner = null;
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

function newPlayer(name) {
  return {
    name,
    ready: false,
    ships: [],                      // server-only — never broadcast to opponent
    shotsReceived: new Set(),       // cells the opponent has fired at this player
  };
}
