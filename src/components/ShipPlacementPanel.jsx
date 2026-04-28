import { useState, useEffect, useMemo } from 'react';
import {
  BOARD_SIZE,
  FLEET,
  cellKey,
  inBounds,
  shipCellsAt,
  randomFleet,
} from '../lib/battleship';
import BattleshipBoard from './BattleshipBoard';

/**
 * Self-contained placement UI.
 *   - Click a ship in the panel → it becomes active
 *   - Hover the board → see preview (green = valid, red = invalid)
 *   - Click a cell → place the ship
 *   - Press R or click Rotate → toggle orientation
 *   - Click an already-placed ship → un-place it (becomes active again)
 *   - "Randomize" fills all 5 ships; "Confirm" submits to onConfirm.
 */
export default function ShipPlacementPanel({ onConfirm, onBack }) {
  const [placed, setPlaced] = useState({}); // { [type]: { cells } }
  const [activeType, setActiveType] = useState(FLEET[0].type);
  const [orientation, setOrientation] = useState('h');
  const [hover, setHover] = useState(null); // [r,c] | null

  // Press R to rotate
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        setOrientation(o => (o === 'h' ? 'v' : 'h'));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const occupied = useMemo(() => {
    const set = new Set();
    for (const s of Object.values(placed)) {
      for (const [r, c] of s.cells) set.add(cellKey(r, c));
    }
    return set;
  }, [placed]);

  const activeSpec = activeType ? FLEET.find(f => f.type === activeType) : null;

  // Build preview from hover + active ship
  const preview = (() => {
    if (!hover || !activeSpec) return null;
    const [r, c] = hover;
    const cells = shipCellsAt(r, c, activeSpec.size, orientation);
    const valid = cells.every(([rr, cc]) =>
      inBounds(rr, cc) && !occupied.has(cellKey(rr, cc))
    );
    return { cells, valid };
  })();

  const placedShipsForBoard = Object.entries(placed).map(([type, p]) => ({
    type,
    size: FLEET.find(f => f.type === type).size,
    cells: p.cells,
    hits: 0,
    sunk: false,
  }));

  const handleCellClick = (r, c) => {
    if (!activeSpec) return;
    const cells = shipCellsAt(r, c, activeSpec.size, orientation);
    const valid = cells.every(([rr, cc]) =>
      inBounds(rr, cc) && !occupied.has(cellKey(rr, cc))
    );
    if (!valid) return;
    setPlaced(prev => ({ ...prev, [activeSpec.type]: { cells } }));
    // Move active to next unplaced ship
    const next = FLEET.find(f => f.type !== activeSpec.type && !placed[f.type]);
    setActiveType(next?.type ?? null);
  };

  const handleShipClick = (type) => {
    if (placed[type]) {
      // Unplace and make it active
      setPlaced(prev => {
        const next = { ...prev };
        delete next[type];
        return next;
      });
      setActiveType(type);
    } else {
      setActiveType(type);
    }
  };

  const handleRandomize = () => {
    const ships = randomFleet();
    const map = {};
    for (const s of ships) map[s.type] = { cells: s.cells };
    setPlaced(map);
    setActiveType(null);
  };

  const handleClear = () => {
    setPlaced({});
    setActiveType(FLEET[0].type);
  };

  const allPlaced = FLEET.every(f => placed[f.type]);
  const handleConfirm = () => {
    if (!allPlaced) return;
    const ships = FLEET.map(f => ({ type: f.type, cells: placed[f.type].cells }));
    onConfirm(ships);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-black uppercase tracking-[0.18em] text-copy-50">
          Place Your Fleet
        </h2>
        <p className="mt-1 text-xs text-copy-300">
          Pick a ship → click the board to place it. Press <kbd className="rounded bg-panel-800 px-1.5 py-0.5 text-[10px]">R</kbd> to rotate.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        {/* Board */}
        <div className="flex justify-center">
          <BattleshipBoard
            mode="own"
            ships={placedShipsForBoard}
            shotsReceived={null}
            preview={preview}
            onCellClick={handleCellClick}
            onCellHover={(r, c) => setHover([r, c])}
            onCellLeave={() => setHover(null)}
          />
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-panel-700 bg-panel-900 p-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-copy-300">
              Fleet
            </div>
            <ul className="space-y-1.5">
              {FLEET.map(spec => {
                const isPlaced = !!placed[spec.type];
                const isActive = activeType === spec.type;
                return (
                  <li key={spec.type}>
                    <button
                      onClick={() => handleShipClick(spec.type)}
                      className={[
                        'flex w-full items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-xs transition',
                        isActive
                          ? 'border-brand-400 bg-brand-500/20 text-copy-50'
                          : isPlaced
                            ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400'
                            : 'border-panel-700 bg-panel-800 text-copy-200 hover:border-brand-500',
                      ].join(' ')}
                    >
                      <span className="capitalize font-semibold">{spec.type}</span>
                      <span className="flex gap-0.5">
                        {Array.from({ length: spec.size }).map((_, i) => (
                          <span
                            key={i}
                            className={[
                              'h-2 w-2 rounded-sm',
                              isPlaced ? 'bg-emerald-400' : 'bg-brand-400/60',
                            ].join(' ')}
                          />
                        ))}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOrientation(o => (o === 'h' ? 'v' : 'h'))}
              className="rounded-md border border-panel-700 bg-panel-900 px-3 py-2 text-xs font-semibold text-copy-100 transition hover:border-brand-500"
            >
              Rotate ({orientation === 'h' ? 'H' : 'V'})
            </button>
            <button
              onClick={handleRandomize}
              className="rounded-md border border-panel-700 bg-panel-900 px-3 py-2 text-xs font-semibold text-copy-100 transition hover:border-brand-500"
            >
              🎲 Randomize
            </button>
            <button
              onClick={handleClear}
              className="rounded-md border border-panel-700 bg-panel-900 px-3 py-2 text-xs font-semibold text-copy-300 transition hover:border-rose-500 hover:text-rose-200"
            >
              Clear
            </button>
            <button
              onClick={onBack}
              className="rounded-md border border-panel-700 bg-panel-900 px-3 py-2 text-xs font-semibold text-copy-300 transition hover:border-copy-300 hover:text-copy-50"
            >
              ← Back
            </button>
          </div>

          <button
            onClick={handleConfirm}
            disabled={!allPlaced}
            className={[
              'mt-1 rounded-full px-6 py-3 font-bold transition',
              allPlaced
                ? 'bg-linear-to-r from-brand-500 to-brand-600 text-white shadow-[0_8px_24px_rgba(124,111,255,0.4)] hover:-translate-y-0.5'
                : 'cursor-not-allowed bg-panel-800 text-copy-300',
            ].join(' ')}
          >
            {allPlaced ? '⚓ Confirm Fleet' : `Place ${FLEET.length - Object.keys(placed).length} more`}
          </button>
        </div>
      </div>
    </div>
  );
}
