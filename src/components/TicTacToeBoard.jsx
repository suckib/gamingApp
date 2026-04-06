export default function TicTacToeBoard({ board, onMove, disabled, winningCombo = [] }) {
  const isWinningCell = (index) => winningCombo && winningCombo.includes(index);

  return (
    <div className="flex justify-center">
      <div className="grid grid-cols-3 gap-2 rounded-2xl border-2 border-panel-700 bg-panel-900 p-4 sm:gap-3 sm:p-6">
        {board.map((cell, index) => (
          <button
            key={index}
            className={[
              'h-20 w-20 rounded-lg text-3xl font-extrabold transition sm:h-24 sm:w-24 sm:text-4xl',
              'border-2 flex items-center justify-center',
              isWinningCell(index)
                ? 'border-gold-400 bg-gold-400/20 text-gold-400 shadow-[0_0_12px_rgba(255,215,0,0.5)]'
                : cell
                  ? 'border-brand-500 bg-brand-500/15 text-brand-200'
                  : 'border-panel-700 bg-panel-800 text-copy-300 hover:border-brand-500 hover:bg-panel-700',
              disabled && !cell && 'cursor-not-allowed opacity-50',
            ].join(' ')}
            onClick={() => !disabled && onMove(index)}
            disabled={disabled || cell !== null}
          >
            {cell === 'X' && '✕'}
            {cell === 'O' && '◯'}
          </button>
        ))}
      </div>
    </div>
  );
}
