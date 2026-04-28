// ─── Sanity script for battleshipEngine — run with `node server/battleshipEngine.sanity.js`

import {
  BOARD_SIZE,
  FLEET,
  TOTAL_SHIP_CELLS,
  validateFleet,
  resolveShot,
  randomFleet,
} from './battleshipEngine.js';

let passed = 0;
let failed = 0;

function check(label, cond, detail) {
  if (cond) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('\n── Constants ──');
check('BOARD_SIZE is 10', BOARD_SIZE === 10);
check('FLEET has 5 ships', FLEET.length === 5);
check('TOTAL_SHIP_CELLS is 17', TOTAL_SHIP_CELLS === 17);

console.log('\n── validateFleet ──');

const goodFleet = [
  { type: 'carrier',    cells: [[0,0],[0,1],[0,2],[0,3],[0,4]] },
  { type: 'battleship', cells: [[2,0],[2,1],[2,2],[2,3]] },
  { type: 'cruiser',    cells: [[4,0],[4,1],[4,2]] },
  { type: 'submarine',  cells: [[6,0],[6,1],[6,2]] },
  { type: 'destroyer',  cells: [[8,0],[8,1]] },
];
check('valid fleet accepted', validateFleet(goodFleet).valid === true);

const verticalFleet = [
  { type: 'carrier',    cells: [[0,0],[1,0],[2,0],[3,0],[4,0]] },
  { type: 'battleship', cells: [[0,2],[1,2],[2,2],[3,2]] },
  { type: 'cruiser',    cells: [[0,4],[1,4],[2,4]] },
  { type: 'submarine',  cells: [[0,6],[1,6],[2,6]] },
  { type: 'destroyer',  cells: [[0,8],[1,8]] },
];
check('vertical fleet accepted', validateFleet(verticalFleet).valid === true);

check('rejects non-array', validateFleet(null).valid === false);
check('rejects wrong count', validateFleet(goodFleet.slice(0, 3)).valid === false);

const dupTypes = [...goodFleet];
dupTypes[1] = { type: 'carrier', cells: [[2,0],[2,1],[2,2],[2,3]] };
check('rejects duplicate ship type', validateFleet(dupTypes).valid === false);

const wrongSize = [
  { ...goodFleet[0], cells: [[0,0],[0,1],[0,2],[0,3]] }, // carrier with 4 cells
  ...goodFleet.slice(1),
];
check('rejects wrong cell count', validateFleet(wrongSize).valid === false);

const outOfBounds = [
  { type: 'carrier', cells: [[0,8],[0,9],[0,10],[0,11],[0,12]] },
  ...goodFleet.slice(1),
];
check('rejects out-of-bounds cells', validateFleet(outOfBounds).valid === false);

const overlap = [
  goodFleet[0],
  { type: 'battleship', cells: [[0,2],[0,3],[0,4],[0,5]] }, // overlaps carrier
  ...goodFleet.slice(2),
];
check('rejects overlapping ships', validateFleet(overlap).valid === false);

const diagonal = [
  { type: 'carrier', cells: [[0,0],[1,1],[2,2],[3,3],[4,4]] },
  ...goodFleet.slice(1),
];
check('rejects diagonal placement', validateFleet(diagonal).valid === false);

const gap = [
  { type: 'carrier', cells: [[0,0],[0,1],[0,2],[0,3],[0,5]] }, // gap at col 4
  ...goodFleet.slice(1),
];
check('rejects gapped placement', validateFleet(gap).valid === false);

const unknownType = [
  { type: 'submarinex', cells: [[0,0],[0,1],[0,2]] },
  ...goodFleet.slice(1),
];
check('rejects unknown ship type', validateFleet(unknownType).valid === false);

console.log('\n── resolveShot ──');

const runtimeShips = goodFleet.map(s => ({
  ...s,
  size: FLEET.find(f => f.type === s.type).size,
  hits: 0,
  sunk: false,
}));

const missResult = resolveShot(runtimeShips, new Set(), 9, 9);
check('miss returns "miss"', missResult.result === 'miss');
check('miss does not mutate ships', missResult.updatedShips === runtimeShips);
check('miss adds to shotsReceived', missResult.updatedShotsReceived.has('9,9'));
check('miss is not gameOver', missResult.gameOver === false);

const hitResult = resolveShot(runtimeShips, new Set(), 0, 0);
check('hit on carrier returns "hit"', hitResult.result === 'hit');
check('hit increments ship.hits', hitResult.updatedShips[0].hits === 1);
check('hit does not sink 5-cell ship', hitResult.updatedShips[0].sunk === false);

// Sink the destroyer (2 cells) in two shots
const afterFirst = resolveShot(runtimeShips, new Set(), 8, 0);
const afterSecond = resolveShot(afterFirst.updatedShips, afterFirst.updatedShotsReceived, 8, 1);
check('second hit sinks destroyer', afterSecond.result === 'sunk');
check('sunk includes ship payload', afterSecond.ship?.type === 'destroyer');
check('sunk reveals all cells', afterSecond.ship?.cells?.length === 2);
check('sinking one ship is not gameOver', afterSecond.gameOver === false);

// Sink everything → gameOver
let ships = runtimeShips;
let shots = new Set();
let lastResult;
for (const s of goodFleet) {
  for (const [r, c] of s.cells) {
    lastResult = resolveShot(ships, shots, r, c);
    ships = lastResult.updatedShips;
    shots = lastResult.updatedShotsReceived;
  }
}
check('sinking entire fleet sets gameOver', lastResult.gameOver === true);
check('all ships marked sunk', ships.every(s => s.sunk));

console.log('\n── randomFleet ──');

for (let i = 0; i < 100; i++) {
  const fleet = randomFleet();
  const v = validateFleet(fleet);
  if (!v.valid) {
    check(`randomFleet iteration ${i} produces valid fleet`, false, v.error);
    break;
  }
}
check('randomFleet always produces valid fleets (100 iterations)', true);

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
