# Online Multiplayer Bingo — Technical Design Document

> **Version**: 1.0  
> **Date**: 2026-04-06  
> **Status**: Implementation Phase  

---

## 1. Overview

Add a real-time online multiplayer mode to the 8×8 Bingo game allowing 2–8 players
to compete in the same room with synchronized number draws. A dedicated **game server**
handles rooms, draw sequencing, board generation, and authoritative win detection so
that no client can cheat or gain a network-latency advantage.

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                     CLIENTS  (React)                     │
│                                                          │
│  OnlineBingoPage ─► useOnlineBingo (hook)                │
│       │                   │                              │
│       │          socket.io-client                        │
│       ▼                   │                              │
│  BingoBoard (reused)      │                              │
└───────────────────────────┼──────────────────────────────┘
                            │  WebSocket (Socket.io)
                            ▼
┌───────────────────────────────────────────────────────────┐
│                  SERVER  (Node.js)                         │
│                                                           │
│  index.js ────► Socket.io event handlers                  │
│       │                                                   │
│       ├── roomManager.js  (room CRUD, player tracking)    │
│       └── bingoEngine.js  (board gen, draw, win check)    │
│                                                           │
│  State: in-memory Map<roomCode, Room>                     │
│  Future: MongoDB / Redis for persistence & horizontal     │
│          scaling via Socket.io Redis adapter               │
└───────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

| Layer          | Technology                | Reason                                      |
|----------------|---------------------------|---------------------------------------------|
| Transport      | **Socket.io 4.x**         | WebSocket with auto-fallback, rooms, reconnect |
| Server Runtime | **Node.js + Express**     | Lightweight, same-language as client         |
| Server State   | **In-memory `Map`**       | Minimal latency, no DB round-trip for live games |
| Client         | **React 18 + socket.io-client** | Integrates cleanly with existing hooks  |
| Future DB      | **MongoDB**               | Game history, leaderboards, player profiles  |
| Future Scale   | **Redis (Socket.io adapter)** | Horizontal server scaling               |

---

## 4. Server Design

### 4.1 File Structure

```
server/
├── package.json        # separate package, independent deploy
├── index.js            # Express + Socket.io entry, event handlers
├── roomManager.js      # Room lifecycle (create, join, leave, cleanup)
└── bingoEngine.js      # Pure functions: shuffle, generateBoard, markBoard, checkWin
```

### 4.2 Room Data Structure

```js
{
  code:         "X7KM3P",            // 6-char alphanumeric (no ambiguous chars)
  hostId:       "socket-id-abc",     // socket ID of the host
  settings: {
    range:      64,                  // 64 | 80 | 100
    callMode:   "auto",             // "auto" | "manual"
    autoSpeed:  2000,               // ms between auto-draws
  },
  players:      Map<socketId, {     // connected players
    id:    "socket-id-abc",
    name:  "Alice",
    board: [[{value, marked}]],     // 8×8 board (null until game starts)
  }>,
  state:        "waiting",          // "waiting" | "playing" | "finished"
  pool:         [14, 7, 52, ...],   // shuffled draw queue
  called:       [],                 // numbers drawn so far
  current:      null,               // last drawn number
  winner:       null,               // { id, name, winInfo } | { tie, players }
  drawInterval: null,               // timer handle for auto-draw
}
```

### 4.3 Room Code Generation

Uses a 30-character alphabet (uppercase + digits, excluding ambiguous `I`, `L`, `O`, `0`, `1`)
to generate 6-character codes → ~729 million combinations. Collision check against active rooms.

---

## 5. Socket Events Protocol

### 5.1 Client → Server

| Event            | Payload                                         | Auth     |
|------------------|-------------------------------------------------|----------|
| `room:create`    | `{ playerName, settings: {range, callMode, autoSpeed} }` | any |
| `room:join`      | `{ roomCode, playerName }`                      | any      |
| `room:leave`     | `{}`                                            | in-room  |
| `game:start`     | `{}`                                            | host     |
| `game:draw`      | `{}`                                            | host     |
| `game:toggleAuto`| `{}`                                            | host     |
| `game:playAgain` | `{}`                                            | host     |

### 5.2 Server → Client

| Event            | Payload                                         | Target   |
|------------------|-------------------------------------------------|----------|
| `room:created`   | `{ roomCode, playerId, players[], settings }`   | sender   |
| `room:joined`    | `{ roomCode, playerId, players[], settings, isHost }` | sender |
| `room:updated`   | `{ players[] }`                                 | room     |
| `room:error`     | `{ message }`                                   | sender   |
| `game:started`   | `{ board[][], poolSize }`                       | each player (unique board) |
| `game:drawn`     | `{ number, called[], remaining }`               | room     |
| `game:winner`    | `{ winnerId, winnerName, winInfo }` or `{ tie, tiedPlayers[] }` | room |
| `game:over`      | `{ reason: "pool_exhausted" }`                  | room     |
| `game:autoState` | `{ running: bool }`                             | room     |
| `game:restarted` | `{ board[][], poolSize }`                       | each player |

---

## 6. Game Flow Sequence

```
  HOST                    SERVER                  PLAYER 2
   │                        │                        │
   ├── room:create ────────►│                        │
   │◄── room:created ───────┤                        │
   │    (code: X7KM3P)      │                        │
   │                        │◄── room:join ──────────┤
   │                        │     (code: X7KM3P)     │
   │◄── room:updated ───────┤──► room:joined ───────►│
   │                        │                        │
   ├── game:start ─────────►│                        │
   │    (host only)         │                        │
   │◄── game:started ───────┤──► game:started ──────►│
   │    (board A)           │    (board B — unique)  │
   │                        │                        │
   │         [AUTO MODE: server draws on interval]   │
   │                        │                        │
   │◄── game:drawn ─────────┤──► game:drawn ────────►│
   │    {num: 42}           │    {num: 42}           │
   │                        │                        │
   │    ... more draws ...  │                        │
   │                        │                        │
   │◄── game:winner ────────┤──► game:winner ───────►│
   │    {winner: player2}   │    {winner: player2}   │
   │                        │                        │
   ├── game:playAgain ─────►│                        │
   │◄── game:restarted ─────┤──► game:restarted ───►│
```

---

## 7. Win Detection Strategy

**Server-authoritative**: After every draw, the server marks ALL player boards and checks
each for win conditions (Row → Column → Diagonal → Anti-Diagonal → Blackout).

Advantages:
- **Fair**: No network-latency advantage — everyone's board is checked simultaneously
- **Cheat-proof**: Boards live on the server, clients can't fake a win
- **Simple**: No "claim" race conditions

If multiple players win on the same draw → **tie** announced with all winners' info.

---

## 8. Room Lifecycle

```
  ┌──────────┐   host creates    ┌─────────┐   host starts   ┌─────────┐
  │  (none)  │ ─────────────────►│ WAITING │ ────────────────►│ PLAYING │
  └──────────┘                   └─────────┘                  └─────────┘
                                      │                            │
                                      │  players join/leave        │  win detected /
                                      │  (2-8 players)             │  pool exhausted
                                      │                            │
                                      │                       ┌────▼─────┐
                                      │                       │ FINISHED │
                                      │                       └────┬─────┘
                                      │                            │
                                      │◄──── host: play again ────┘
                                      │
                                      │  all players leave
                                      ▼
                                 ┌──────────┐
                                 │ DESTROYED │
                                 └──────────┘
```

- **WAITING**: 2–8 players, host can configure & start
- **PLAYING**: Numbers being drawn, boards being marked
- **FINISHED**: Winner announced, host can restart or room is left
- **DESTROYED**: Last player disconnects, room removed from memory

Idle rooms are garbage-collected after **30 minutes** of inactivity.

---

## 9. Client Design

### 9.1 Hook: `useOnlineBingo`

Single React hook managing the entire online flow:

```
useOnlineBingo() → {
  // Connection
  connected: boolean

  // Room state
  phase: 'lobby' | 'waiting' | 'playing' | 'finished'
  roomCode: string | null
  players: Array<{ id, name, isHost }>
  isHost: boolean
  settings: { range, callMode, autoSpeed }

  // Game state
  board: Cell[][] | null
  called: number[]
  current: number | null
  winner: { ... } | null
  remaining: number
  autoRunning: boolean

  // Actions
  createRoom(playerName, settings)
  joinRoom(roomCode, playerName)
  leaveRoom()
  startGame()
  drawNumber()
  toggleAuto()
  playAgain()

  // Error
  error: string | null
}
```

### 9.2 Page: `OnlineBingoPage`

Multi-phase page component:

| Phase      | UI                                                    |
|------------|-------------------------------------------------------|
| `lobby`    | Name input, Create Room (with settings), Join Room    |
| `waiting`  | Room code (copyable), player list, Start (host)       |
| `playing`  | BingoBoard, current number, called list, player list  |
| `finished` | Winner banner, board with highlights, Play Again      |

Reuses existing `BingoBoard` component for rendering the 8×8 grid.

---

## 10. Security Considerations

| Threat                    | Mitigation                                        |
|---------------------------|---------------------------------------------------|
| Fake win claims           | Server-side win detection only                    |
| Board manipulation        | Boards generated & stored server-side             |
| Host impersonation        | Socket ID verified against `room.hostId`          |
| Room code brute force     | Rate limiting on join attempts                    |
| Denial of service         | Max 8 players/room, max rooms cap, idle cleanup   |
| Player name XSS           | Names sanitized (alphanumeric + spaces, max 16)   |

---

## 11. Scalability Path

### Phase 1 — Current (MVP)
- Single Node.js server, in-memory state
- Supports ~1000 concurrent rooms comfortably

### Phase 2 — Persistence
- Add MongoDB for game history, leaderboards, player stats
- Store completed game results for analytics

### Phase 3 — Horizontal Scaling
- Add Redis adapter for Socket.io → multiple server instances
- Move room state to Redis for shared access
- Load balancer (sticky sessions or Redis pub/sub)

### Phase 4 — Enhanced Features
- Player accounts & authentication (JWT)
- Matchmaking queue (auto-pair players)
- Spectator mode
- Chat system
- Custom board themes

---

## 12. Development Setup

### Start the game server:
```bash
cd server
npm install
npm run dev          # starts on port 3001 with --watch
```

### Start the React client:
```bash
cd "d:\bingo app"
npm install          # installs socket.io-client
npm run dev          # Vite on port 5173
```

### Environment Variables:
```bash
# Client (.env or .env.local)
VITE_SOCKET_URL=http://localhost:3001

# Server
PORT=3001
```

---

## 13. File Changes Summary

### New Files
| File                              | Purpose                              |
|-----------------------------------|--------------------------------------|
| `server/package.json`             | Server dependencies                  |
| `server/index.js`                 | Express + Socket.io entry point      |
| `server/roomManager.js`           | Room CRUD and player tracking        |
| `server/bingoEngine.js`           | Board generation, marking, win check |
| `src/hooks/useOnlineBingo.js`     | Client socket hook for online play   |
| `src/pages/OnlineBingoPage.jsx`   | Full online multiplayer UI           |

### Modified Files
| File                              | Change                               |
|-----------------------------------|--------------------------------------|
| `src/App.jsx`                     | Add `/game/bingo-online` route       |
| `src/pages/HomePage.jsx`          | Add "BINGO Online" game card         |
| `package.json`                    | Add `socket.io-client` dependency    |

---

## 14. Testing Plan

| Test Type     | What                                           |
|---------------|-------------------------------------------------|
| Unit          | `bingoEngine.js` — board gen, marking, win check |
| Integration   | Room lifecycle — create, join, start, draw, win  |
| E2E           | Two browser tabs playing a full game             |
| Edge cases    | Host disconnect, player leave mid-game, tie      |
| Load          | 50+ concurrent rooms with auto-draw              |
