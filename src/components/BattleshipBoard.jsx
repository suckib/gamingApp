import { BOARD_SIZE, cellKey } from '../lib/battleship';

/**
 * Renders a 10×10 battleship board.
 *   mode='own':       shows own ships + incoming hits/misses (+ optional placement preview)
 *   mode='opponent':  shows fired cells with hit/miss/sunk markers
 */
export default function BattleshipBoard({
  mode,
  ships = [],            // own mode: full ship objects
  shotsReceived,         // own mode: Set<"r,c">
  shotResults,           // opponent mode: Map<"r,c", 'miss'|'hit'|'sunk'>
  sunkShips,             // opponent mode: array of revealed { type, cells }
  preview,               // own mode (placement): { cells: [[r,c]], valid: bool }
  onCellClick,
  onCellHover,
  onCellLeave,
  disabled = false,
}) {
  const shipCellMap = new Map();
  if (mode === 'own') {
    for (const s of ships) {
      for (const [r, c] of s.cells) shipCellMap.set(cellKey(r, c), s);
    }
  }
  const previewKeys = preview ? new Set(preview.cells.map(([r, c]) => cellKey(r, c))) : null;
  const sunkKeys = mode === 'opponent' && sunkShips
    ? new Set(sunkShips.flatMap(s => s.cells.map(([r, c]) => cellKey(r, c))))
    : null;

  const stateAt = (r, c) => {
    const k = cellKey(r, c);
    if (mode === 'own') {
      const ship = shipCellMap.get(k);
      const hit = shotsReceived?.has(k);
      if (ship && hit) return ship.sunk ? 'sunk' : 'ship-hit';
      if (ship) return 'ship';
      if (hit) return 'miss';
      if (previewKeys?.has(k)) return preview.valid ? 'preview-good' : 'preview-bad';
      return 'empty';
    }
    if (sunkKeys?.has(k)) return 'sunk';
    const r0 = shotResults?.get(k);
    if (r0 === 'hit') return 'opp-hit';
    if (r0 === 'miss') return 'opp-miss';
    return 'unknown';
  };

  return (
    <div
      className="grid w-full max-w-[420px] gap-[2px] rounded-lg border border-panel-700 bg-panel-950 p-2"
      style={{ gridTemplateColumns: `repeat(${BOARD_SIZE}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, i) => {
        const r = Math.floor(i / BOARD_SIZE);
        const c = i % BOARD_SIZE;
        const state = stateAt(r, c);
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onCellClick?.(r, c)}
            onMouseEnter={() => onCellHover?.(r, c)}
            onMouseLeave={() => onCellLeave?.()}
            className={[
              'aspect-square rounded-sm border text-[11px] sm:text-sm font-bold flex items-center justify-center transition',
              CELL_STYLE[state],
              disabled ? 'cursor-default' : 'cursor-pointer',
            ].join(' ')}
          >
            {CELL_LABEL[state] ?? ''}
          </button>
        );
      })}
    </div>
  );
}

const CELL_STYLE = {
  empty:         'border-panel-700 bg-panel-800/60 hover:border-brand-500 hover:bg-panel-700',
  unknown:       'border-panel-700 bg-panel-800/60 hover:border-brand-500 hover:bg-panel-700',
  ship:          'border-brand-400 bg-brand-500/40',
  'ship-hit':    'border-rose-500 bg-rose-500/50 text-rose-100',
  miss:          'border-panel-600 bg-panel-700/40 text-copy-300',
  'opp-hit':     'border-rose-500 bg-rose-500/40 text-rose-100',
  'opp-miss':    'border-panel-600 bg-panel-700/40 text-copy-300',
  sunk:          'border-rose-700 bg-rose-700/70 text-rose-50',
  'preview-good':'border-emerald-400 bg-emerald-500/40',
  'preview-bad': 'border-rose-500 bg-rose-500/30',
};

const CELL_LABEL = {
  'ship-hit': '✕',
  'opp-hit':  '✕',
  sunk:       '✕',
  miss:       '·',
  'opp-miss': '·',
};
