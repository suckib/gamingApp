import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import BingoPage from './pages/BingoPage';
import TicTacToePage from './pages/TicTacToe';
import Connect4Page from './pages/Connect4Page';
import MemoryMatchPage from './pages/MemoryMatchPage';
import Game2048Page from './pages/Game2048Page';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game/bingo" element={<BingoPage />} />
        <Route path="/game/tictactoe" element={<TicTacToePage />} />
        <Route path="/game/connect4" element={<Connect4Page />} />
        <Route path="/game/memory-match" element={<MemoryMatchPage />} />
        <Route path="/game/2048" element={<Game2048Page />} />
      </Routes>
    </Router>
  );
}
