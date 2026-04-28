import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import RoomManager from './roomManager.js';
import TttRoomManager from './tttRoomManager.js';
import BattleshipRoomManager from './battleshipRoomManager.js';
import { randomFleet } from './battleshipEngine.js';

// ─── Bootstrap ───────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',           // tighten for production
    methods: ['GET', 'POST'],
  },
});

const rooms = new RoomManager();
const tttRooms = new TttRoomManager();
const bsRooms = new BattleshipRoomManager();

// Health endpoint
app.get('/', (_req, res) => res.json({
  status: 'ok',
  bingoRooms: rooms.rooms.size,
  tttRooms: tttRooms.rooms.size,
  bsRooms: bsRooms.rooms.size,
}));

// Idle cleanup every 5 minutes
setInterval(() => {
  rooms.cleanupIdle();
  tttRooms.cleanupIdle();
  bsRooms.cleanupIdle();
}, 5 * 60 * 1000);

// ─── Socket.io Events ───────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  // ── Create Room ────────────────────────────────────────────────────

  socket.on('room:create', ({ playerName, settings } = {}) => {
    const result = rooms.createRoom(socket.id, playerName, settings || {});
    if (result.error) {
      socket.emit('room:error', { message: result.error });
      return;
    }
    const { room, code } = result;
    socket.join(code);
    socket.emit('room:created', {
      roomCode: code,
      playerId: socket.id,
      players: rooms.serializePlayers(room),
      settings: room.settings,
    });
    console.log(`[room:create] ${code} by ${socket.id}`);
  });

  // ── Join Room ──────────────────────────────────────────────────────

  socket.on('room:join', ({ roomCode, playerName } = {}) => {
    const code = (roomCode || '').toUpperCase().trim();
    const result = rooms.joinRoom(code, socket.id, playerName);
    if (result.error) {
      socket.emit('room:error', { message: result.error });
      return;
    }
    const { room } = result;
    socket.join(code);
    socket.emit('room:joined', {
      roomCode: code,
      playerId: socket.id,
      players: rooms.serializePlayers(room),
      settings: room.settings,
      isHost: false,
    });
    // Broadcast to others in the room
    socket.to(code).emit('room:updated', {
      players: rooms.serializePlayers(room),
    });
    console.log(`[room:join] ${socket.id} → ${code}`);
  });

  // ── Leave Room ─────────────────────────────────────────────────────

  socket.on('room:leave', () => {
    handleLeave(socket);
  });

  // ── Start Game ─────────────────────────────────────────────────────

  socket.on('game:start', () => {
    const room = rooms.getPlayerRoom(socket.id);
    if (!room || room.hostId !== socket.id) {
      socket.emit('room:error', { message: 'Only host can start' });
      return;
    }

    const result = rooms.startGame(room.code);
    if (result.error) {
      socket.emit('room:error', { message: result.error });
      return;
    }

    // Send each player their unique board
    for (const [id, player] of room.players) {
      io.to(id).emit('game:started', {
        board: player.board,
        poolSize: room.pool.length,
      });
    }

    // Start auto-draw if configured
    if (room.settings.callMode === 'auto') {
      startAutoDraw(room);
    }

    console.log(`[game:start] ${room.code}`);
  });

  // ── Manual Draw ────────────────────────────────────────────────────

  socket.on('game:draw', () => {
    const room = rooms.getPlayerRoom(socket.id);
    if (!room || room.hostId !== socket.id) {
      socket.emit('room:error', { message: 'Only host can draw' });
      return;
    }
    if (room.settings.callMode !== 'manual') {
      socket.emit('room:error', { message: 'Game is in auto-draw mode' });
      return;
    }
    executeDraw(room);
  });

  // ── Toggle Auto-Draw ──────────────────────────────────────────────

  socket.on('game:toggleAuto', () => {
    const room = rooms.getPlayerRoom(socket.id);
    if (!room || room.hostId !== socket.id) return;
    if (room.state !== 'playing') return;
    if (room.settings.callMode !== 'auto') return;

    if (room.drawInterval) {
      clearInterval(room.drawInterval);
      room.drawInterval = null;
      io.to(room.code).emit('game:autoState', { running: false });
    } else {
      startAutoDraw(room);
      io.to(room.code).emit('game:autoState', { running: true });
    }
  });

  // ── Play Again ─────────────────────────────────────────────────────

  socket.on('game:playAgain', () => {
    const room = rooms.getPlayerRoom(socket.id);
    if (!room || room.hostId !== socket.id) return;

    const result = rooms.resetGame(room.code);
    if (result.error) return;

    for (const [id, player] of room.players) {
      io.to(id).emit('game:restarted', {
        board: player.board,
        poolSize: room.pool.length,
      });
    }

    if (room.settings.callMode === 'auto') {
      startAutoDraw(room);
    }

    console.log(`[game:playAgain] ${room.code}`);
  });

  // ── Disconnect ─────────────────────────────────────────────────────

  socket.on('disconnect', (reason) => {
    console.log(`[disconnect] ${socket.id} — ${reason}`);
    handleLeave(socket);
    handleTttLeave(socket);
    handleBsLeave(socket);
  });

  // ═══════════════════════════════════════════════════════════════════
  // ═══ TIC-TAC-TOE EVENTS ═══════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════

  socket.on('ttt:create', ({ playerName } = {}) => {
    const result = tttRooms.createRoom(socket.id, playerName);
    if (result.error) { socket.emit('ttt:error', { message: result.error }); return; }
    const { room, code } = result;
    socket.join(`ttt-${code}`);
    socket.emit('ttt:created', {
      roomCode: code,
      playerId: socket.id,
      players: tttRooms.serializePlayers(room),
    });
    console.log(`[ttt:create] ${code} by ${socket.id}`);
  });

  socket.on('ttt:join', ({ roomCode, playerName } = {}) => {
    const code = (roomCode || '').toUpperCase().trim();
    const result = tttRooms.joinRoom(code, socket.id, playerName);
    if (result.error) { socket.emit('ttt:error', { message: result.error }); return; }
    const { room } = result;
    socket.join(`ttt-${code}`);
    socket.emit('ttt:joined', {
      roomCode: code,
      playerId: socket.id,
      players: tttRooms.serializePlayers(room),
    });
    socket.to(`ttt-${code}`).emit('ttt:updated', {
      players: tttRooms.serializePlayers(room),
    });
    console.log(`[ttt:join] ${socket.id} → ${code}`);
  });

  socket.on('ttt:leave', () => {
    handleTttLeave(socket);
  });

  socket.on('ttt:start', () => {
    const room = tttRooms.getPlayerRoom(socket.id);
    if (!room || room.hostId !== socket.id) {
      socket.emit('ttt:error', { message: 'Only host can start' }); return;
    }
    const result = tttRooms.startGame(room.code);
    if (result.error) { socket.emit('ttt:error', { message: result.error }); return; }

    io.to(`ttt-${room.code}`).emit('ttt:started', {
      board: room.board,
      currentTurn: room.currentTurn,
      players: tttRooms.serializePlayers(room),
    });
    console.log(`[ttt:start] ${room.code}`);
  });

  socket.on('ttt:move', ({ index } = {}) => {
    const room = tttRooms.getPlayerRoom(socket.id);
    if (!room) { socket.emit('ttt:error', { message: 'Not in a room' }); return; }

    const result = tttRooms.makeMove(room.code, socket.id, index);
    if (result.error) { socket.emit('ttt:error', { message: result.error }); return; }

    io.to(`ttt-${room.code}`).emit('ttt:moved', {
      board: result.board,
      currentTurn: room.currentTurn,
      index,
      symbol: room.players.get(socket.id).symbol === 'X' ? 'X' : 'O',
    });

    if (result.winner) {
      io.to(`ttt-${room.code}`).emit('ttt:gameover', result.winner);
    }
  });

  socket.on('ttt:playAgain', () => {
    const room = tttRooms.getPlayerRoom(socket.id);
    if (!room || room.hostId !== socket.id) return;

    const result = tttRooms.resetGame(room.code);
    if (result.error) return;

    io.to(`ttt-${room.code}`).emit('ttt:restarted', {
      board: room.board,
      currentTurn: room.currentTurn,
      players: tttRooms.serializePlayers(room),
    });
    console.log(`[ttt:playAgain] ${room.code}`);
  });

  // ═══════════════════════════════════════════════════════════════════
  // ═══ BATTLESHIP EVENTS ════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════

  socket.on('bs:create', ({ playerName } = {}) => {
    const result = bsRooms.createRoom(socket.id, playerName);
    if (result.error) { socket.emit('bs:error', { message: result.error }); return; }
    const { room, code } = result;
    socket.join(`bs-${code}`);
    socket.emit('bs:created', {
      roomCode: code,
      playerId: socket.id,
      players: bsRooms.serializePlayers(room),
    });
    console.log(`[bs:create] ${code} by ${socket.id}`);
  });

  socket.on('bs:join', ({ roomCode, playerName } = {}) => {
    const code = (roomCode || '').toUpperCase().trim();
    const result = bsRooms.joinRoom(code, socket.id, playerName);
    if (result.error) { socket.emit('bs:error', { message: result.error }); return; }
    const { room } = result;
    socket.join(`bs-${code}`);
    socket.emit('bs:joined', {
      roomCode: code,
      playerId: socket.id,
      players: bsRooms.serializePlayers(room),
    });
    socket.to(`bs-${code}`).emit('bs:updated', {
      players: bsRooms.serializePlayers(room),
    });
    console.log(`[bs:join] ${socket.id} → ${code}`);
  });

  socket.on('bs:leave', () => { handleBsLeave(socket); });

  socket.on('bs:start', () => {
    const room = bsRooms.getPlayerRoom(socket.id);
    if (!room || room.hostId !== socket.id) {
      socket.emit('bs:error', { message: 'Only host can start' }); return;
    }
    const result = bsRooms.startPlacement(room.code);
    if (result.error) { socket.emit('bs:error', { message: result.error }); return; }

    io.to(`bs-${room.code}`).emit('bs:placementStarted', {
      players: bsRooms.serializePlayers(room),
    });
    console.log(`[bs:start] ${room.code}`);
  });

  socket.on('bs:randomFleet', () => {
    try {
      const ships = randomFleet();
      socket.emit('bs:randomFleet', { ships });
    } catch (err) {
      socket.emit('bs:error', { message: 'Failed to generate fleet' });
    }
  });

  socket.on('bs:placeFleet', ({ ships } = {}) => {
    const room = bsRooms.getPlayerRoom(socket.id);
    if (!room) { socket.emit('bs:error', { message: 'Not in a room' }); return; }

    const result = bsRooms.submitPlacement(room.code, socket.id, ships);
    if (result.error) { socket.emit('bs:error', { message: result.error }); return; }

    io.to(`bs-${room.code}`).emit('bs:placementReady', {
      playerId: socket.id,
      players: bsRooms.serializePlayers(room),
    });

    if (result.started) {
      // Send each player their own fleet + shared turn info
      for (const [id, player] of room.players) {
        io.to(id).emit('bs:gameStarted', {
          currentTurn: room.currentTurn,
          ships: player.ships,
        });
      }
      console.log(`[bs:gameStarted] ${room.code}`);
    }
  });

  socket.on('bs:fire', ({ row, col } = {}) => {
    const room = bsRooms.getPlayerRoom(socket.id);
    if (!room) { socket.emit('bs:error', { message: 'Not in a room' }); return; }

    const result = bsRooms.fireShot(room.code, socket.id, row, col);
    if (result.error) { socket.emit('bs:error', { message: result.error }); return; }

    io.to(`bs-${room.code}`).emit('bs:shotResult', {
      shooterId: result.shooterId,
      row: result.row,
      col: result.col,
      result: result.result,
      ship: result.ship,
      nextTurn: result.nextTurn,
    });

    if (result.gameOver) {
      io.to(`bs-${room.code}`).emit('bs:gameOver', {
        winnerId: result.winner.winnerId,
        winnerName: result.winner.winnerName,
        reason: result.winner.reason,
      });
      console.log(`[bs:gameOver] ${room.code} winner=${result.winner.winnerId}`);
    }
  });

  socket.on('bs:playAgain', () => {
    const room = bsRooms.getPlayerRoom(socket.id);
    if (!room || room.hostId !== socket.id) return;

    const result = bsRooms.resetGame(room.code);
    if (result.error) return;

    io.to(`bs-${room.code}`).emit('bs:placementStarted', {
      players: bsRooms.serializePlayers(room),
    });
    console.log(`[bs:playAgain] ${room.code}`);
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────

function handleLeave(socket) {
  const result = rooms.leaveRoom(socket.id);
  if (!result) return;

  const { room, destroyed } = result;
  socket.leave(room.code);

  if (!destroyed) {
    io.to(room.code).emit('room:updated', {
      players: rooms.serializePlayers(room),
    });
    if (room.winner && room.winner.reason === 'opponents_left') {
      io.to(room.code).emit('game:winner', {
        winnerId: room.winner.id,
        winnerName: room.winner.name,
        winInfo: room.winner.winInfo,
        reason: 'opponents_left',
      });
    }
  }
  console.log(`[leave] ${socket.id} from ${room.code}${destroyed ? ' (destroyed)' : ''}`);
}

function handleTttLeave(socket) {
  const result = tttRooms.leaveRoom(socket.id);
  if (!result) return;

  const { room, destroyed } = result;
  socket.leave(`ttt-${room.code}`);

  if (!destroyed) {
    io.to(`ttt-${room.code}`).emit('ttt:updated', {
      players: tttRooms.serializePlayers(room),
    });
    if (room.winner && room.winner.reason === 'opponent_left') {
      io.to(`ttt-${room.code}`).emit('ttt:gameover', room.winner);
    }
  }
  console.log(`[ttt:leave] ${socket.id} from ${room.code}${destroyed ? ' (destroyed)' : ''}`);
}

function handleBsLeave(socket) {
  const result = bsRooms.leaveRoom(socket.id);
  if (!result) return;

  const { room, destroyed } = result;
  socket.leave(`bs-${room.code}`);

  if (!destroyed) {
    io.to(`bs-${room.code}`).emit('bs:updated', {
      players: bsRooms.serializePlayers(room),
    });
    if (room.winner && room.winner.reason === 'opponent_left') {
      io.to(`bs-${room.code}`).emit('bs:gameOver', {
        winnerId: room.winner.winnerId,
        winnerName: room.winner.winnerName,
        reason: 'opponent_left',
      });
    }
  }
  console.log(`[bs:leave] ${socket.id} from ${room.code}${destroyed ? ' (destroyed)' : ''}`);
}

function executeDraw(room) {
  const result = rooms.drawNumber(room.code);
  if (!result) return;

  io.to(room.code).emit('game:drawn', {
    number: result.num,
    called: [...room.called],
    remaining: room.pool.length,
  });

  if (result.winners.length > 0) {
    if (result.winners.length === 1) {
      io.to(room.code).emit('game:winner', {
        winnerId: result.winners[0].id,
        winnerName: result.winners[0].name,
        winInfo: result.winners[0].winInfo,
      });
    } else {
      io.to(room.code).emit('game:winner', {
        tie: true,
        tiedPlayers: result.winners.map(w => ({
          id: w.id,
          name: w.name,
          winInfo: w.winInfo,
        })),
      });
    }
  } else if (result.poolExhausted) {
    io.to(room.code).emit('game:over', { reason: 'pool_exhausted' });
  }
}

function startAutoDraw(room) {
  if (room.drawInterval) clearInterval(room.drawInterval);
  room.drawInterval = setInterval(() => {
    if (room.state !== 'playing') {
      clearInterval(room.drawInterval);
      room.drawInterval = null;
      return;
    }
    executeDraw(room);
  }, room.settings.autoSpeed);
  io.to(room.code).emit('game:autoState', { running: true });
}

// ─── Start ───────────────────────────────────────────────────────────────

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🎱 Bingo server listening on http://0.0.0.0:${PORT}`);
});
