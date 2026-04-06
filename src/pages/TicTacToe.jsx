import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTicTacToe, checkWinner, isBoardFull } from '../hooks/useTicTacToe';
import TicTacToeBoard from '../components/TicTacToeBoard';
import TicTacToeSettings from '../components/TicTacToeSettings';

export default function TicTacToePage() {
  const navigate = useNavigate();
  const [gameMode, setGameMode] = useState(null); // null | 'multiplayer' | 'ai'
  const {
    board,
    isXNext,
    gameOver,
    winner,
    makeMove,
    reset,
    handleAIMove,
  } = useTicTacToe({ mode: gameMode });

  // Trigger AI move only once when it's AI's turn (using effect, not render)
  useEffect(() => {
    if (gameMode === 'ai' && !isXNext && !gameOver) {
      handleAIMove();
    }
  }, [isXNext, gameOver, gameMode, handleAIMove]);

  const currentPlayer = isXNext ? 'X' : 'O';
  const getPlayerLabel = (player) => {
    if (gameMode === 'ai') {
      return player === 'X' ? '👤 You' : '🤖 AI';
    }
    return player === 'X' ? '👤 Player 1' : '👤 Player 2';
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(124,111,255,0.12),transparent_24%),linear-gradient(180deg,#111937_0%,#0b0f1e_52%,#090d1a_100%)] px-4 py-6 text-copy-50 sm:px-6">
      <div className="mx-auto w-full max-w-2xl">
        {!gameMode ? (
          <TicTacToeSettings
            onSelectMode={setGameMode}
            onBack={() => navigate('/')}
          />
        ) : (
          <>
            {/* Header */}
            <header className="mb-6 flex items-center justify-between">
              <button
                className="rounded-full border border-panel-700 bg-panel-900 px-4 py-2 text-xs font-semibold text-copy-300 transition hover:border-brand-500 hover:text-copy-50"
                onClick={() => setGameMode(null)}
              >
                ← Back
              </button>
              <h1 className="bg-linear-to-r from-brand-500 to-pink-400 bg-clip-text text-2xl font-black tracking-[0.12em] text-transparent sm:text-3xl">
                TIC TAC TOE
              </h1>
              <div className="w-[72px]" />
            </header>

            {/* Game Status */}
            <div className="mb-6 rounded-xl border border-panel-700 bg-panel-900 p-4 text-center">
              {gameOver ? (
                <>
                  {winner?.winner ? (
                    <p className="text-xl font-bold text-gold-400">
                      🎉 {getPlayerLabel(winner.winner)} Wins!
                    </p>
                  ) : (
                    <p className="text-xl font-bold text-brand-200">
                      It's a Draw!
                    </p>
                  )}
                </>
              ) : (
                <p className="text-lg font-semibold">
                  Current: <span className="text-brand-200">{getPlayerLabel(currentPlayer)}</span>
                </p>
              )}
            </div>

            {/* Board */}
            <TicTacToeBoard
              board={board}
              onMove={makeMove}
              disabled={gameOver || (gameMode === 'ai' && !isXNext)}
              winningCombo={winner?.winningCombo}
            />

            {/* Controls */}
            <div className="mt-8 flex gap-3">
              <button
                className="flex-1 rounded-full bg-linear-to-r from-brand-500 to-brand-600 px-6 py-3 font-bold text-white shadow-[0_8px_24px_rgba(124,111,255,0.4)] transition hover:-translate-y-0.5"
                onClick={reset}
              >
                🔄 Play Again
              </button>
              <button
                className="flex-1 rounded-full border border-panel-700 bg-panel-900 px-6 py-3 font-bold text-copy-300 transition hover:border-copy-300 hover:text-copy-50"
                onClick={() => setGameMode(null)}
              >
                Change Mode
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
