import { useState, useCallback, useEffect, useRef } from 'react';
import {
  BOARD_SIZE,
  FLEET,
  cellKey,
  validateFleet,
  resolveShot,
  randomFleet,
} from '../lib/battleship';

const AI_DELAY_MS = 700;

/**
 * Local battleship game hook with AI opponent.
 * Phase machine: 'placement' → 'playing' → 'finished'.
 */
export function useBattleshipGame() {
  const [phase, setPhase] = useState('placement');
  const [playerShips, setPlayerShips] = useState([]);
  const [aiShips, setAiShips] = useState([]);
  const [playerShotsReceived, setPlayerShotsReceived] = useState(new Set());
  const [aiShotsReceived, setAiShotsReceived] = useState(new Set());
  const [turn, setTurn] = useState('player');
  const [winner, setWinner] = useState(null); // 'player' | 'ai' | null
  const [myShotResults, setMyShotResults] = useState(new Map()); // "r,c" → 'miss'|'hit'|'sunk'
  const [aiShotResults, setAiShotResults] = useState(new Map());
  const [revealedAiSunkShips, setRevealedAiSunkShips] = useState([]);
  const [revealedPlayerSunkShips, setRevealedPlayerSunkShips] = useState([]);
  const aiThinkingRef = useRef(false);

  const confirmPlacement = useCallback((ships) => {
    const v = validateFleet(ships);
    if (!v.valid) return v;
    const init = ships.map(s => ({
      type: s.type,
      size: s.cells.length,
      cells: s.cells,
      hits: 0,
      sunk: false,
    }));
    setPlayerShips(init);
    const ai = randomFleet().map(s => ({ ...s, hits: 0, sunk: false }));
    setAiShips(ai);
    setPlayerShotsReceived(new Set());
    setAiShotsReceived(new Set());
    setMyShotResults(new Map());
    setAiShotResults(new Map());
    setRevealedAiSunkShips([]);
    setRevealedPlayerSunkShips([]);
    setTurn('player');
    setWinner(null);
    setPhase('playing');
    return { valid: true };
  }, []);

  const playerFire = useCallback((row, col) => {
    if (phase !== 'playing' || turn !== 'player' || winner) return;
    const k = cellKey(row, col);
    if (aiShotsReceived.has(k)) return;

    const outcome = resolveShot(aiShips, aiShotsReceived, row, col);
    setAiShips(outcome.updatedShips);
    setAiShotsReceived(outcome.updatedShotsReceived);
    setMyShotResults(prev => new Map(prev).set(k, outcome.result));
    if (outcome.result === 'sunk' && outcome.ship) {
      setRevealedAiSunkShips(prev => [...prev, outcome.ship]);
    }
    if (outcome.gameOver) {
      setWinner('player');
      setPhase('finished');
      return;
    }
    setTurn('ai');
  }, [phase, turn, winner, aiShips, aiShotsReceived]);

  // AI turn: random untouched cell
  useEffect(() => {
    if (phase !== 'playing' || turn !== 'ai' || winner) return;
    if (aiThinkingRef.current) return;
    aiThinkingRef.current = true;

    const t = setTimeout(() => {
      const candidates = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          if (!playerShotsReceived.has(cellKey(r, c))) candidates.push([r, c]);
        }
      }
      if (candidates.length === 0) {
        aiThinkingRef.current = false;
        return;
      }
      const [row, col] = candidates[Math.floor(Math.random() * candidates.length)];
      const outcome = resolveShot(playerShips, playerShotsReceived, row, col);
      setPlayerShips(outcome.updatedShips);
      setPlayerShotsReceived(outcome.updatedShotsReceived);
      setAiShotResults(prev => new Map(prev).set(cellKey(row, col), outcome.result));
      if (outcome.result === 'sunk' && outcome.ship) {
        setRevealedPlayerSunkShips(prev => [...prev, outcome.ship]);
      }
      if (outcome.gameOver) {
        setWinner('ai');
        setPhase('finished');
      } else {
        setTurn('player');
      }
      aiThinkingRef.current = false;
    }, AI_DELAY_MS);

    return () => {
      clearTimeout(t);
      aiThinkingRef.current = false;
    };
  }, [phase, turn, winner, playerShips, playerShotsReceived]);

  const reset = useCallback(() => {
    setPhase('placement');
    setPlayerShips([]);
    setAiShips([]);
    setPlayerShotsReceived(new Set());
    setAiShotsReceived(new Set());
    setMyShotResults(new Map());
    setAiShotResults(new Map());
    setRevealedAiSunkShips([]);
    setRevealedPlayerSunkShips([]);
    setTurn('player');
    setWinner(null);
    aiThinkingRef.current = false;
  }, []);

  const fleetStatus = (ships) =>
    FLEET.map(spec => {
      const s = ships.find(x => x.type === spec.type);
      return { type: spec.type, size: spec.size, sunk: s?.sunk ?? false };
    });

  return {
    phase,
    turn,
    winner,
    playerShips,
    aiShips,                 // exposed only for end-of-game reveal
    playerShotsReceived,
    myShotResults,
    aiShotResults,
    revealedAiSunkShips,
    revealedPlayerSunkShips,
    playerFleetStatus: fleetStatus(playerShips),
    aiFleetStatus: fleetStatus(aiShips),
    confirmPlacement,
    playerFire,
    reset,
  };
}
