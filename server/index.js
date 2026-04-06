import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import RoomManager from './roomManager.js';

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

// Health endpoint
app.get('/', (_req, res) => res.json({ status: 'ok', rooms: rooms.rooms.size }));

// Idle cleanup every 5 minutes
setInterval(() => rooms.cleanupIdle(), 5 * 60 * 1000);

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
    // If game ended because opponents left
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

httpServer.listen(PORT, () => {
  console.log(`🎱 Bingo server listening on http://localhost:${PORT}`);
});
