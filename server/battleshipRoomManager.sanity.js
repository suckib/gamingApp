// ─── Sanity script for battleshipRoomManager — `node server/battleshipRoomManager.sanity.js`

import BattleshipRoomManager from './battleshipRoomManager.js';
import { randomFleet } from './battleshipEngine.js';

let passed = 0;
let failed = 0;

function check(label, cond, detail) {
  if (cond) { passed++; console.log(`  PASS  ${label}`); }
  else { failed++; console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`); }
}

// ── Setup ────────────────────────────────────────────────────────────
const mgr = new BattleshipRoomManager();
const HOST = 'socket-host';
const JOINER = 'socket-joiner';

console.log('\n── Create / Join ──');
const created = mgr.createRoom(HOST, 'Alice');
check('createRoom returns code', typeof created.code === 'string' && created.code.length === 6);
check('host registered in room', created.room.hostId === HOST);
check('host in waiting state', created.room.state === 'waiting');

const dup = mgr.createRoom(HOST, 'Alice');
check('rejects double-create from same socket', !!dup.error);

const joined = mgr.joinRoom(created.code, JOINER, 'Bob');
check('joinRoom succeeds', !joined.error);
check('room has 2 players', joined.room.players.size === 2);

const thirdJoin = mgr.joinRoom(created.code, 'socket-third', 'Carol');
check('rejects 3rd player', !!thirdJoin.error);

const wrongCode = mgr.joinRoom('NOPE99', 'socket-third', 'Carol');
check('rejects unknown room code', !!wrongCode.error);

console.log('\n── Start placement ──');
const startedNotHost = mgr.startPlacement(created.code);
check('startPlacement returns room', !startedNotHost.error);
check('state is placement', created.room.state === 'placement');
check('both players not ready', [...created.room.players.values()].every(p => !p.ready));

console.log('\n── Submit placement ──');
const fleetA = randomFleet();
const fleetB = randomFleet();

const placeA = mgr.submitPlacement(created.code, HOST, fleetA);
check('host placement accepted', !placeA.error && placeA.ready);
check('host marked ready', created.room.players.get(HOST).ready === true);
check('not yet started (one player)', placeA.started === false);
check('state still placement', created.room.state === 'placement');

const replace = mgr.submitPlacement(created.code, HOST, fleetA);
check('rejects double-submit', !!replace.error);

const badFleet = mgr.submitPlacement(created.code, JOINER, [{ type: 'carrier', cells: [[0,0]] }]);
check('rejects invalid fleet', !!badFleet.error);
check('joiner still not ready after rejection', created.room.players.get(JOINER).ready === false);

const placeB = mgr.submitPlacement(created.code, JOINER, fleetB);
check('joiner placement accepted', !placeB.error);
check('both ready triggers playing', placeB.started === true);
check('state is playing', created.room.state === 'playing');
check('host fires first', created.room.currentTurn === HOST);

console.log('\n── Fire shot ──');
const wrongTurn = mgr.fireShot(created.code, JOINER, 0, 0);
check('rejects shot when not your turn', !!wrongTurn.error);

const oob = mgr.fireShot(created.code, HOST, -1, 0);
check('rejects out-of-bounds shot', !!oob.error);

// Pick a guaranteed-miss cell (not in joiner's fleet) — find empty
const joinerCells = new Set(fleetB.flatMap(s => s.cells.map(([r,c]) => `${r},${c}`)));
let missR = -1, missC = -1;
outer: for (let r = 0; r < 10; r++) {
  for (let c = 0; c < 10; c++) {
    if (!joinerCells.has(`${r},${c}`)) { missR = r; missC = c; break outer; }
  }
}
const missShot = mgr.fireShot(created.code, HOST, missR, missC);
check('miss returns "miss"', missShot.result === 'miss');
check('turn passes to joiner after shot', created.room.currentTurn === JOINER);

const dupShot = mgr.fireShot(created.code, JOINER, missR, missC);
// JOINER firing into HOST's grid — different defender, so this should NOT be a duplicate
check('opposite-direction shot is not a duplicate', !dupShot.error);

// Now from HOST's turn: re-firing the same cell into joiner SHOULD be rejected
// (need to wait for HOST's turn again — but joiner just shot, so it's HOST's turn)
const dupOwn = mgr.fireShot(created.code, HOST, missR, missC);
check('duplicate shot at same cell rejected', !!dupOwn.error);

// Sink joiner's destroyer (2 cells)
const destroyerB = fleetB.find(s => s.type === 'destroyer');
let lastShot;
for (const [r, c] of destroyerB.cells) {
  // ensure HOST's turn
  while (created.room.currentTurn !== HOST) {
    // joiner takes some throwaway shot
    const target = (() => {
      const hostCells = new Set(fleetA.flatMap(s => s.cells.map(([r,c]) => `${r},${c}`)));
      const received = created.room.players.get(HOST).shotsReceived;
      for (let rr = 0; rr < 10; rr++) for (let cc = 0; cc < 10; cc++) {
        const key = `${rr},${cc}`;
        if (!hostCells.has(key) && !received.has(key)) return [rr, cc];
      }
      return null;
    })();
    mgr.fireShot(created.code, JOINER, target[0], target[1]);
  }
  lastShot = mgr.fireShot(created.code, HOST, r, c);
}
check('sinking destroyer returns "sunk"', lastShot.result === 'sunk');
check('sunk reveals ship payload', lastShot.ship?.type === 'destroyer');

console.log('\n── Sink entire fleet → game over ──');
// HOST sinks the rest of joiner's ships
const remainingShips = fleetB.filter(s => s.type !== 'destroyer');
let finalShot;
for (const ship of remainingShips) {
  for (const [r, c] of ship.cells) {
    while (created.room.currentTurn !== HOST && created.room.state === 'playing') {
      const hostCells = new Set(fleetA.flatMap(s => s.cells.map(([r,c]) => `${r},${c}`)));
      const received = created.room.players.get(HOST).shotsReceived;
      let target = null;
      for (let rr = 0; rr < 10 && !target; rr++) for (let cc = 0; cc < 10 && !target; cc++) {
        const key = `${rr},${cc}`;
        if (!hostCells.has(key) && !received.has(key)) target = [rr, cc];
      }
      mgr.fireShot(created.code, JOINER, target[0], target[1]);
    }
    if (created.room.state !== 'playing') break;
    finalShot = mgr.fireShot(created.code, HOST, r, c);
    if (finalShot.gameOver) break;
  }
  if (finalShot?.gameOver) break;
}
check('gameOver fires when all ships sunk', finalShot.gameOver === true);
check('state transitions to finished', created.room.state === 'finished');
check('winner is HOST', created.room.winner?.winnerId === HOST);
check('winner reason is fleet_sunk', created.room.winner?.reason === 'fleet_sunk');

console.log('\n── Reset for play again ──');
const reset = mgr.resetGame(created.code);
check('resetGame succeeds', !reset.error);
check('back to placement state', created.room.state === 'placement');
check('ships cleared', created.room.players.get(HOST).ships.length === 0);
check('ready flags cleared', [...created.room.players.values()].every(p => !p.ready));

console.log('\n── Leave mid-game ──');
mgr.submitPlacement(created.code, HOST, randomFleet());
mgr.submitPlacement(created.code, JOINER, randomFleet());
check('back in playing state', created.room.state === 'playing');
const left = mgr.leaveRoom(JOINER);
check('leave returns room', !!left);
check('state finished after leave', created.room.state === 'finished');
check('remaining player wins', created.room.winner?.winnerId === HOST);
check('reason is opponent_left', created.room.winner?.reason === 'opponent_left');

console.log('\n── Cleanup empty room ──');
mgr.leaveRoom(HOST);
check('room destroyed when empty', mgr.getRoom(created.code) === null);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
