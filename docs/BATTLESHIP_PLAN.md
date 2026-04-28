# Online Battleship — Technical Design Document

> **Version**: 1.0
> **Date**: 2026-04-28
> **Status**: Planning
> **Author**: Implementation plan for adding Battleship to the bingo-8x8 game hub

---

## 1. Overview

Add a real-time online 1-vs-1 Battleship game to the existing multi-game hub.
The game reuses the codebase's established patterns:

- Pure game engine (mirrors `bingoEngine.js`, `tttEngine.js`)
- Stateful room manager (mirrors `roomManager.js`, `tttRoomManager.js`)
- Phase-based UI (lobby → waiting → **placement** → playing → finished)
- Server-authoritative state — the server alone holds true ship positions; clients only see what the server reveals

Battleship is a **strict 2-player** game like Tic-Tac-Toe but with a richer pre-game
phase (ship placement) and per-player private state (each player's own fleet is
hidden from the opponent).

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                     CLIENTS  (React)                     │
│                                                          │
│  BattleshipPage ─► useBattleshipGame      (local vs AI)  │
│  OnlineBattleshipView ─► useOnlineBattleship (online)    │
│       │                   │                              │
│       │          socket.io-client (shared instance)      │
│       ▼                   │                              │
│  BattleshipBoard (own + opponent grids)                  │
│  ShipPlacementPanel (drag/rotate during placement)       │
└───────────────────────────┼──────────────────────────────┘
                            │  WebSocket (Socket.io)
                            ▼
┌───────────────────────────────────────────────────────────┐
│                  SERVER  (Node.js)                         │
│                                                            │
│  index.js ────► Socket.io event handlers (bs:* events)    │
│       │                                                    │
│       ├── battleshipRoomManager.js                         │
│       │     (room CRUD, placement validation, turn logic)  │
│       └── battleshipEngine.js                              │
│             (placement validation, fire resolution,        │
│              ship-sunk + game-over detection)              │
│                                                            │
│  State: in-memory Map<roomCode, Room>                      │
└───────────────────────────────────────────────────────────┘
```

---

## 3. Game Rules (Reference)

| Aspect          | Decision                                                            |
|-----------------|---------------------------------------------------------------------|
| Board size      | **10 × 10** (classic). Coordinates: A–J × 1–10 internally `[r][c]`. |
| Fleet           | 1×Carrier(5), 1×Battleship(4), 1×Cruiser(3), 1×Submarine(3), 1×Destroyer(2) — **17 total cells** |
| Placement       | Horizontal or vertical only (no diagonals). Ships cannot overlap or extend past edges. |
| Adjacent ships  | **Allowed** by default (configurable later). Classic rules forbid touching — we'll keep simple for v1. |
| Turn order      | Host fires first.                                                   |
| Hit reward      | One shot per turn — **no extra turn on hit** (cleaner state machine). |
| Win condition   | All 17 ship cells of opponent are hit.                              |
| Sunk feedback   | Server reveals ship type and full coordinates only when sunk.       |
| Surrender       | A player leaving mid-game = opponent wins (matches existing TTT/Bingo behavior). |

---

## 4. Server Design

### 4.1 File Structure

```
server/
├── index.js                       # add bs:* event handlers
├── battleshipEngine.js            # NEW — pure functions
└── battleshipRoomManager.js       # NEW — room lifecycle + game state
```

### 4.2 Room Data Structure

```js
{
  code:         "B7KM3P",
  hostId:       "socket-id-abc",
  state:        "waiting" | "placement" | "playing" | "finished",
  createdAt:    1735300000000,
  lastActivity: 1735300000000,
  players: {
    [socketId]: {
      id:        "socket-id-abc",
      name:      "Sakib",
      isHost:    true,
      ready:     false,                  // placement complete?
      ships: [                           // SERVER-ONLY — never sent to opponent
        { type: "carrier",    size: 5, cells: [[0,0],[0,1],[0,2],[0,3],[0,4]], hits: 0, sunk: false },
        { type: "battleship", size: 4, cells: [...], hits: 0, sunk: false },
        // ...
      ],
      shotsReceived: Set<"r,c">,         // cells opponent has fired at
      shotsFired:    Set<"r,c">,         // cells this player has fired at
    }
  },
  currentTurn:  "socket-id-abc" | null,  // whose turn to fire (set when state → 'playing')
  winner:       "socket-id-abc" | null,
}
```

### 4.3 Engine API (`battleshipEngine.js` — pure)

```js
// Constants
FLEET = [
  { type: 'carrier',    size: 5 },
  { type: 'battleship', size: 4 },
  { type: 'cruiser',    size: 3 },
  { type: 'submarine',  size: 3 },
  { type: 'destroyer',  size: 2 },
];
BOARD_SIZE = 10;

// Validate a full fleet placement
validateFleet(ships)
  → { valid: boolean, error?: string }
  // Checks: every fleet type present exactly once, all cells in bounds,
  //         orientation valid (horiz/vert), no overlaps.

// Resolve a single shot against a defender's ships (immutable)
resolveShot(defenderShips, shotsReceived, row, col)
  → { result: 'miss' | 'hit' | 'sunk',
      ship?: { type, cells },           // present only when result === 'sunk'
      gameOver: boolean,
      updatedShips, updatedShotsReceived }

// Auto-place fleet (used by AI and "Random" button on placement screen)
randomFleet()
  → ships[]    // valid randomly placed fleet
```

### 4.4 RoomManager API (`battleshipRoomManager.js`)

```js
class BattleshipRoomManager {
  createRoom(socketId, playerName)              → { roomCode, room }
  joinRoom(code, socketId, playerName)          → { room }       // max 2 players
  leaveRoom(socketId)                           → { code, leftPlayer, autoWinner? }
  submitPlacement(code, socketId, ships)        → { ready, bothReady }
  fireShot(code, socketId, row, col)
    → { result: 'miss'|'hit'|'sunk',
        ship?, gameOver, winner?, nextTurn }
  resetGame(code)                               → { room }       // play-again
  getOpponentView(room, viewerId)               → { ownGrid, opponentGrid, currentTurn }
  cleanupIdle(maxAgeMs)
}
```

`getOpponentView` is the **privacy boundary** — it constructs the per-player payload
that strips out the opponent's ship positions, leaving only the cells that the viewer
has already fired at (and their hit/miss/sunk status).

### 4.5 Socket Events

All events use the `bs:` prefix to mirror the `ttt:` convention.

#### Client → Server

| Event                       | Payload                              | Effect                                           |
|-----------------------------|--------------------------------------|--------------------------------------------------|
| `bs:create`                 | `{ playerName }`                     | Create room, return code                         |
| `bs:join`                   | `{ roomCode, playerName }`           | Join existing room                               |
| `bs:leave`                  | `{}`                                 | Voluntary leave                                  |
| `bs:start`                  | `{}`                                 | Host starts placement phase (needs 2 players)    |
| `bs:placeFleet`             | `{ ships }`                          | Submit final ship placement                      |
| `bs:randomFleet`            | `{}`                                 | Server returns a random valid fleet              |
| `bs:fire`                   | `{ row, col }`                       | Fire at opponent's grid                          |
| `bs:playAgain`              | `{}`                                 | Host requests reset                              |

#### Server → Client

| Event                       | Payload                                                          |
|-----------------------------|------------------------------------------------------------------|
| `bs:created`                | `{ roomCode, playerId, room }`                                   |
| `bs:joined`                 | `{ roomCode, playerId, room }`                                   |
| `bs:updated`                | `{ room }` (sanitized — no ships)                                |
| `bs:placementStarted`       | `{ deadline?: timestamp }` (optional placement timer)            |
| `bs:randomFleet`            | `{ ships }`                                                      |
| `bs:placementReady`         | `{ playerId }` (one player has finalized)                        |
| `bs:gameStarted`            | `{ currentTurn, ownGrid, opponentGrid }` (per-player payload)    |
| `bs:shotResult`             | `{ shooterId, row, col, result, ship?, nextTurn }`               |
| `bs:gameOver`               | `{ winnerId, reason: 'fleet_sunk'\|'opponent_left' }`            |
| `bs:error`                  | `{ message }`                                                    |

### 4.6 Authoritative Validation (server-side checks before mutating state)

| Action          | Checks                                                                          |
|-----------------|---------------------------------------------------------------------------------|
| `bs:placeFleet` | sender is in room; state === 'placement'; player not already ready; engine.validateFleet passes |
| `bs:fire`       | state === 'playing'; sender === currentTurn; coords in bounds; cell not already fired at by sender |
| `bs:start`      | sender === host; player count === 2                                             |
| `bs:playAgain`  | sender === host; state === 'finished'                                           |

---

## 5. Client Design

### 5.1 File Structure

```
src/
├── pages/
│   ├── BattleshipPage.jsx              # NEW — local vs AI shell
│   └── OnlineBattleshipView.jsx        # NEW — online lobby/placement/play/end
├── hooks/
│   ├── useBattleshipGame.js            # NEW — local + AI opponent
│   └── useOnlineBattleship.js          # NEW — socket-driven state
├── components/
│   ├── BattleshipBoard.jsx             # NEW — 10×10 grid, two render modes (own/opponent)
│   ├── ShipPlacementPanel.jsx          # NEW — drag/place/rotate UI
│   ├── BattleshipFleetStatus.jsx       # NEW — small "ships remaining" sidebar
│   └── BattleshipSettings.jsx          # NEW — local/online + name input (mirrors TicTacToeSettings)
└── App.jsx                             # add /game/battleship route
```

### 5.2 State Machine (online)

```
┌───────┐  bs:created       ┌─────────┐  bs:start (host)   ┌───────────┐
│ lobby │ ────────────────► │ waiting │ ─────────────────► │ placement │
└───────┘                   └─────────┘                    └─────┬─────┘
                                                                 │ both ready
                                                                 ▼
                            ┌──────────┐  bs:gameOver      ┌─────────┐
                            │ finished │ ◄──────────────── │ playing │
                            └────┬─────┘                   └─────────┘
                                 │ host: bs:playAgain
                                 ▼
                            (back to placement)
```

### 5.3 Component Responsibilities

- **BattleshipBoard** — props: `grid`, `mode: 'own' | 'opponent'`, `onCellClick`, `disabled`
  - **own mode**: shows own ships + incoming hits/misses
  - **opponent mode**: shows only fired cells (hit/miss/sunk markers); clickable when it's your turn
- **ShipPlacementPanel** — list of unplaced ships; click ship → enter placement; click cell on own board to anchor; `R` key (or button) to rotate; "Randomize" + "Confirm" actions.
- **BattleshipFleetStatus** — compact list of remaining/sunk ships per side.
- **OnlineBattleshipView** — top-level orchestrator switching on `phase` (lobby/waiting/placement/playing/finished) — mirrors `OnlineBingoPage` and `OnlineTicTacToeView` shape.

### 5.4 Local vs AI

`useBattleshipGame.js` provides offline play against a simple AI:

- **AI placement**: `randomFleet()` (same engine).
- **AI targeting (v1)**: random untouched cells.
- **AI targeting (v2 — stretch)**: hunt-and-target — after a hit, queue adjacent cells until ship is sunk.

This mirrors how `useTicTacToe.js` includes a minimax AI.

---

## 6. Multiplayer Flow (End-to-End)

### 6.1 Create / Join

Identical to TTT — `bs:create` → `bs:created`; second player `bs:join` → `bs:joined`,
host receives `bs:updated`.

### 6.2 Placement Phase

1. Host emits `bs:start` (only valid with 2 players).
2. Server sets state → `'placement'`, broadcasts `bs:placementStarted`.
3. Each client shows their own empty 10×10 with `ShipPlacementPanel`.
4. Player either drags ships or clicks **Randomize** (`bs:randomFleet` → server returns one).
5. Player clicks **Confirm** → emits `bs:placeFleet { ships }`.
6. Server validates via `engine.validateFleet()`, marks player `ready: true`, broadcasts `bs:placementReady` (without revealing ships).
7. When **both** players are ready: server picks `currentTurn = hostId`, sets state → `'playing'`, emits `bs:gameStarted` to **each player individually** with their per-player view.

### 6.3 Combat Phase

1. Active player clicks an opponent grid cell → emits `bs:fire { row, col }`.
2. Server validates (correct turn, in bounds, not already fired).
3. Server calls `engine.resolveShot(...)` against opponent's ships.
4. Server broadcasts `bs:shotResult` to **both** players:
   - `{ shooterId, row, col, result: 'miss'|'hit'|'sunk', ship?: { type, cells }, nextTurn }`
   - `ship` field only present on `sunk`, revealing the full ship coords.
5. If `result === 'sunk'` and it was the opponent's last ship → server sets `winner`, broadcasts `bs:gameOver`.

### 6.4 End / Replay

- `bs:gameOver` includes `winnerId` + `reason`.
- Host can emit `bs:playAgain` → state resets to `'placement'`, ships cleared, ready flags reset.
- Either player leaving mid-game → opponent wins (`reason: 'opponent_left'`).

---

## 7. UI/UX Notes

- **Two boards visible during play**: own grid (left, smaller) and opponent grid (right, larger and clickable). Active board is highlighted by a subtle ring.
- **Cell states** (own grid): empty / ship / ship-hit / miss.
- **Cell states** (opponent grid): unknown / hit / miss / sunk-cell.
- **Sunk reveal**: when opponent ship is sunk, fade in the full ship outline on opponent grid in red.
- **Turn indicator**: large banner — "Your turn" / "Opponent's turn — waiting…"
- **Placement UX**: keyboard `R` rotates ship; invalid drop position shown in red; valid in green.
- **Mobile**: long-press to rotate; tap-to-place fallback. Boards scale to viewport with `aspect-ratio: 1`.

---

## 8. Security & Anti-Cheat

| Risk                                  | Mitigation                                                               |
|---------------------------------------|--------------------------------------------------------------------------|
| Client guesses ship positions via inspecting payloads | Ship positions **never** leave the server until sunk.    |
| Client fires when not their turn      | Server validates `currentTurn === socketId` on every `bs:fire`.          |
| Client fires same cell twice          | Server tracks `shotsFired` Set per player; rejects duplicates.           |
| Client submits invalid fleet          | `engine.validateFleet()` rejects; client receives `bs:error`.            |
| Spam-fire to find ships via timing    | Move resolution is constant-time; no early-exit branches.                |
| Rate limiting                         | (Future) Per-socket throttle — e.g., max 5 events/sec.                   |

---

## 9. Implementation Milestones

### Milestone 1 — Engine + tests (server, no UI)
- `battleshipEngine.js`: `FLEET`, `validateFleet`, `resolveShot`, `randomFleet`
- Sanity-check via a short Node script (no formal test framework yet)

### Milestone 2 — RoomManager + socket events
- `battleshipRoomManager.js` with all methods
- Wire `bs:*` events in `server/index.js`
- Manual test with two browser tabs hitting raw events

### Milestone 3 — Local play + AI (offline)
- `BattleshipBoard`, `ShipPlacementPanel`, `BattleshipFleetStatus`
- `useBattleshipGame.js` with random AI
- Add `/game/battleship` route, link from `HomePage`

### Milestone 4 — Online flow
- `useOnlineBattleship.js`, `OnlineBattleshipView.jsx`, `BattleshipSettings.jsx`
- Lobby → placement → play → finished phases
- "Play again" loop

### Milestone 5 — Polish
- Sunk-ship reveal animation
- Mobile-friendly placement (long-press rotate)
- Smarter AI (hunt-and-target)
- Sound effects (optional)

### Milestone 6 — Hardening (shared with other online games)
- Reconnection handling
- Rate limiting
- Shared socket context across all online games
- Error boundaries

---

## 10. Open Questions

1. **Adjacent ships allowed?** v1 = yes, classic = no. Decide before Milestone 1.
2. **Placement timer?** Optional 60s timer with auto-randomize on timeout — out of scope for v1.
3. **Spectator mode?** Out of scope for v1; max 2 players.
4. **Match history / stats?** Requires DB; out of scope until persistence layer is added (parallel to other games).
5. **Salvo variant?** (Multiple shots per turn equal to remaining ships.) Out of scope; v1 = classic single-shot.

---

## 11. Estimated Effort

| Milestone | Effort  |
|-----------|---------|
| M1 Engine | 0.5 day |
| M2 Server | 1 day   |
| M3 Local  | 1.5 days |
| M4 Online | 1.5 days |
| M5 Polish | 1 day   |
| **Total** | **~5.5 days** of focused work |
