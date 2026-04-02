import { isWinCell } from '../hooks/useBingoGame';

const COL_HEADERS = ['1','2','3','4','5','6','7','8'];

export default function BingoBoard({ board, winInfo, label }) {
  const boardSizeClass = label ? 'sm:[--cell-size:42px] [--cell-size:28px] md:[--cell-size:42px] xl:[--cell-size:46px]' : '[--cell-size:clamp(34px,6vw,52px)]';

  return (
    <div className="flex flex-col items-center gap-2.5">
      {label && (
        <div className="rounded-full border border-panel-700 bg-panel-800 px-4 py-1 text-[11px] font-extrabold tracking-[0.24em] text-copy-300 uppercase">
          {label}
        </div>
      )}
      <div
        className={[
          boardSizeClass,
          'rounded-2xl border border-panel-700 bg-panel-900 p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.32)]',
          winInfo ? 'animate-[boardWin_1s_ease_infinite_alternate] shadow-[0_0_0_3px_#ffd700,0_0_34px_rgba(255,215,0,0.45)]' : '',
        ].join(' ')}
      >
        <div className="mb-1.5 grid grid-cols-8">
          {COL_HEADERS.map(h => (
            <div key={h} className="flex h-5 items-center justify-center text-[10px] font-bold tracking-[0.12em] text-copy-300">
              {h}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-8 gap-1">
          {board.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={[
                  'relative flex h-[var(--cell-size)] w-[var(--cell-size)] items-center justify-center overflow-hidden rounded-md border border-panel-700 bg-panel-800 transition',
                  cell.marked ? 'animate-[cellMark_0.35s_cubic-bezier(0.175,0.885,0.32,1.275)] border-brand-500 bg-brand-500/20' : '',
                  isWinCell(r, c, winInfo) ? 'animate-[cellWin_0.6s_ease_infinite_alternate] border-gold-400 bg-gold-400/25' : '',
                ].join(' ')}
              >
                {cell.marked && (
                  <span className={[
                    'absolute right-1 top-0.5 text-[9px] font-black',
                    isWinCell(r, c, winInfo) ? 'text-gold-400' : 'text-brand-500',
                  ].join(' ')}>
                    ✓
                  </span>
                )}
                <span className={[
                  'text-[clamp(0.48rem,1.4vw,0.78rem)] font-bold',
                  isWinCell(r, c, winInfo) ? 'text-gold-400' : cell.marked ? 'text-brand-200' : 'text-copy-300',
                ].join(' ')}>
                  {cell.value}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
