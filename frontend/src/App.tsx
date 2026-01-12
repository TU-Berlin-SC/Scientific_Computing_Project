import React, { useState, useEffect, useCallback } from 'react';
import BoardView from './components/BoardView';
import Controls from './components/Controls';
import ResultView from './components/ResultView';
import { MinesweeperGame } from './minesweeper';
import { AlgorithmType, TspObjective } from './types/simulation';
import type { Board, SimulationResult } from './types/simulation';
import './App.css';

const game = new MinesweeperGame();

const App: React.FC = () => {
  const [board, setBoard] = useState<Board | null>(null);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const [config, setConfig] = useState({ width: 10, mines: 25 });
  const [algorithm, setAlgorithm] = useState<AlgorithmType>(AlgorithmType.Greedy);
  const [tspObjective, setTspObjective] = useState<TspObjective>(TspObjective.MinDistance);

  const initGame = useCallback(async () => {
    await game.initialize(config.width, config.width, config.mines, algorithm);
    game.setTspObjective(tspObjective);
    setBoard(game.getState());
  }, [config, algorithm, tspObjective]);

  useEffect(() => { initGame(); }, [initGame]);

  const handleStep = () => {
    if (board?.game_over) return;
    const nextState = game.runStep();
    if (nextState) setBoard({...nextState});
  };
  
  const handleRunFull = () => {
    if (board?.game_over) return;
    setIsRunning(true);
    // Added a small delay or try/catch to prevent UI lockup and WASM panics
    try {
      const finalState = game.runFullGame();
      if (finalState) setBoard({...finalState});
    } catch (e) {
      console.error("WASM Engine Error:", e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleBatch = (n: number) => {
    setIsRunning(true);
    try {
      const batchResults = game.runBatch(n);
      setResults(prev => [...batchResults, ...prev]);
      const state = game.getState();
      if (state) setBoard({...state});
    } finally {
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    initGame();
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-section">
          <span className="icon">⬢</span>
          <h1>3D MINESWEEPER SOLVER</h1>
        </div>
      </header>

      <main className="main-content">
        <section className="canvas-pane">
          {board && <BoardView board={board} onCellClick={() => {}} />}
          <div className="stats-overlay-container">
             <ResultView results={results} />
          </div>
        </section>

        <aside className="sidebar-pane">
          <Controls 
            board={board}
            config={config}
            isRunning={isRunning}
            algorithm={algorithm}
            tspObjective={tspObjective}
            onConfigChange={(key: string, val: number) => setConfig(prev => ({...prev, [key]: val}))}
            onAlgorithmChange={setAlgorithm}
            onTspChange={setTspObjective}
            onStep={handleStep}
            onRunFullGame={handleRunFull}
            onRunBatch={handleBatch}
            onReset={handleReset}
          />
        </aside>
      </main>
    </div>
  );
};

export default App;