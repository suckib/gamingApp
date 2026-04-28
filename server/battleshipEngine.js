// ─── Pure battleship engine — no side effects, server-authoritative logic ─

export const BOARD_SIZE = 10;

export const FLEET = [
  { type: 'carrier',    size: 5 },
  { type: 'battleship', size: 4 },
  { type: 'cruiser',    size: 3 },
  { type: 'submarine',  size: 3 },
  { type: 'destroyer',  size: 2 },
];

export const TOTAL_SHIP_CELLS = FLEET.reduce((sum, s) => sum + s.size, 0);

const FLEET_BY_TYPE = Object.fromEntries(FLEET.map(s => [s.type, s]));

const inBounds = (r, c) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
const cellKey = (r, c) => `${r},${c}`;

/**
 * Validate that an array of ship placements forms a legal fleet.
 * Each ship: { type, cells: [[r,c], ...] }
 * Returns { valid: true } or { valid: false, error }.
 */
export function validateFleet(ships) {
  if (!Array.isArray(ships)) return { valid: false, error: 'Fleet must be an array' };
  if (ships.length !== FLEET.length) {
    return { valid: false, error: `Expected ${FLEET.length} ships, got ${ships.length}` };
  }

  const seenTypes = new Set();
  const occupied = new Set();

  for (const ship of ships) {
    if (!ship || typeof ship !== 'object') {
      return { valid: false, error: 'Each ship must be an object' };
    }
    const spec = FLEET_BY_TYPE[ship.type];
    if (!spec) return { valid: false, error: `Unknown ship type: ${ship.type}` };
    if (seenTypes.has(ship.type)) return { valid: false, error: `Duplicate ship: ${ship.type}` };
    seenTypes.add(ship.type);

    if (!Array.isArray(ship.cells) || ship.cells.length !== spec.size) {
      return { valid: false, error: `${ship.type} must have ${spec.size} cells` };
    }

    for (const cell of ship.cells) {
      if (!Array.isArray(cell) || cell.length !== 2) {
        return { valid: false, error: `Invalid cell in ${ship.type}` };
      }
      const [r, c] = cell;
      if (!Number.isInteger(r) || !Number.isInteger(c) || !inBounds(r, c)) {
        return { valid: false, error: `Cell out of bounds in ${ship.type}: [${r},${c}]` };
      }
      const key = cellKey(r, c);
      if (occupied.has(key)) {
        return { valid: false, error: `Overlap at [${r},${c}] in ${ship.type}` };
      }
      occupied.add(key);
    }

    if (!isStraightLine(ship.cells)) {
      return { valid: false, error: `${ship.type} cells must form a contiguous straight line` };
    }
  }

  return { valid: true };
}

/** Cells must be all-same-row or all-same-col, with no gaps. */
function isStraightLine(cells) {
  if (cells.length < 2) return true;
  const rows = cells.map(([r]) => r);
  const cols = cells.map(([, c]) => c);
  const allSameRow = rows.every(r => r === rows[0]);
  const allSameCol = cols.every(c => c === cols[0]);
  if (!allSameRow && !allSameCol) return false;

  const axis = allSameRow ? cols : rows;
  const sorted = [...axis].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false;
  }
  return true;
}

/**
 * Resolve a single shot against a defender's fleet (immutable).
 *
 *   defenderShips:  [{ type, size, cells, hits, sunk }, ...]
 *   shotsReceived:  Set<"r,c">
 *   row, col:       coordinates of the shot
 *
 * Returns { result, ship?, gameOver, updatedShips, updatedShotsReceived }.
 *   result === 'sunk' includes a `ship` payload revealing the full ship.
 *   The caller is responsible for rejecting duplicate shots before calling.
 */
export function resolveShot(defenderShips, shotsReceived, row, col) {
  const updatedShotsReceived = new Set(shotsReceived);
  updatedShotsReceived.add(cellKey(row, col));

  const hitShipIndex = defenderShips.findIndex(s =>
    s.cells.some(([r, c]) => r === row && c === col)
  );

  if (hitShipIndex === -1) {
    return {
      result: 'miss',
      gameOver: false,
      updatedShips: defenderShips,
      updatedShotsReceived,
    };
  }

  const target = defenderShips[hitShipIndex];
  const newHits = target.hits + 1;
  const sunk = newHits >= target.size;
  const updatedShip = { ...target, hits: newHits, sunk };
  const updatedShips = defenderShips.map((s, i) => (i === hitShipIndex ? updatedShip : s));
  const gameOver = updatedShips.every(s => s.sunk);

  return {
    result: sunk ? 'sunk' : 'hit',
    ship: sunk ? { type: updatedShip.type, cells: updatedShip.cells } : undefined,
    gameOver,
    updatedShips,
    updatedShotsReceived,
  };
}

/**
 * Generate a random valid fleet placement.
 * Returns [{ type, size, cells }, ...] in FLEET order.
 */
export function randomFleet() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const placed = tryRandomPlacement();
    if (placed) return placed;
  }
  throw new Error('randomFleet: failed to place fleet after 50 attempts');
}

function tryRandomPlacement() {
  const occupied = new Set();
  const ships = [];

  for (const spec of FLEET) {
    let placed = false;
    for (let i = 0; i < 200 && !placed; i++) {
      const horizontal = Math.random() < 0.5;
      const maxR = horizontal ? BOARD_SIZE : BOARD_SIZE - spec.size + 1;
      const maxC = horizontal ? BOARD_SIZE - spec.size + 1 : BOARD_SIZE;
      const r0 = Math.floor(Math.random() * maxR);
      const c0 = Math.floor(Math.random() * maxC);

      const cells = [];
      for (let k = 0; k < spec.size; k++) {
        cells.push(horizontal ? [r0, c0 + k] : [r0 + k, c0]);
      }
      if (cells.some(([r, c]) => occupied.has(cellKey(r, c)))) continue;

      cells.forEach(([r, c]) => occupied.add(cellKey(r, c)));
      ships.push({ type: spec.type, size: spec.size, cells });
      placed = true;
    }
    if (!placed) return null;
  }
  return ships;
}
