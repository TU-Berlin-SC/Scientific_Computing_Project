import React, { useState, useEffect } from 'react';
import Header from './components/InputSection/Header';
import Menu from './components/InputSection/Menu';
import BoardView from './components/BoardView';
import AlgorithmSelector from './components/InputSection/AlgorithmSelector';
import ControlPanel from './components/InputSection/ControlPanel'; 
import ResultPanel from './components/ResultSection/ResultPanel';
import { AlgorithmType, AlgorithmInfo } from './types/simulation';
import type { GameConfig, Preset, GameRecord, GameStats } from './types';

const defaultPresets: Preset[] = [
  { id: 'preset1', name: 'Easy (9x9)', width: 9, height: 9, mines: 10 },
  { id: 'preset2', name: 'Medium (16x16)', width: 16, height: 16, mines: 40 },
  { id: 'preset3', name: 'Hard (30x16)', width: 30, height: 16, mines: 99 },
];

// 유저님이 제공해주신 잘 작동하는 더미 보드 생성기
const createDummyBoard = (dimensions: number[], mineCount: number) => {
  const numDimensions = dimensions.length;
  let cells = [];
  if (numDimensions === 3 && dimensions[0] === 6) {
    const [faces, rows, cols] = dimensions;
    for (let f = 0; f < faces; f++) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          cells.push({
            coordinates: [f, y, x],
            is_revealed: Math.random() > 0.9,
            is_mine: Math.random() < 0.1,
            is_flagged: false,
            adjacent_mines: Math.floor(Math.random() * 4),
          });
        }
      }
    }
  } else {
    const totalCells = dimensions.reduce((a, b) => a * b, 1);
    for (let i = 0; i < totalCells; i++) {
      let coords: number[] = [];
      let tempIndex = i;
      for (let d = 0; d < numDimensions; d++) {
        coords.push(tempIndex % dimensions[d]);
        tempIndex = Math.floor(tempIndex / dimensions[d]);
      }
      cells.push({
        coordinates: coords,
        is_revealed: Math.random() > 0.9,
        is_mine: Math.random() < 0.1,
        is_flagged: false,
        adjacent_mines: Math.floor(Math.random() * 4),
      });
    }
  }
  return { dimensions, mines: mineCount, cells, game_over: false, game_won: false, total_revealed: 0, total_clicks: 0 };
};

const App: React.FC = () => {
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    useNDimensions: false,
    dimensionCount: 3,
    dimensions: [3, 3, 3],
    width: 9,
    height: 9,
    mines: 10,
  });

  const [wasm, setWasm] = useState<any>(null); // 실제 WASM 모듈 저장용
  const [simulator, setSimulator] = useState<any>(null); // 시뮬레이터 인스턴스
  const [boardState, setBoardState] = useState<any>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmType>(AlgorithmType.Greedy);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  useEffect(() => {
    handleCreateBoard();
  }, []);
  // 통계 결과 상태
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [comparisonResults, setComparisonResults] = useState<GameStats[]>([]);
  const [allDetailedRecords, setAllDetailedRecords] = useState<GameRecord[]>([]);

  // WASM 로딩 (백엔드 연결용)
  useEffect(() => {
    const initWasm = async () => {
      try {
        const wasmModule = await import('./wasm_pkg/engine') as any;
        if (wasmModule.default) await wasmModule.default();
        setWasm(wasmModule);
        console.log("WASM Initialized");
      } catch (e) {
        console.warn("WASM not found, using dummy mode");
      }
    };
    initWasm();
  }, []);

  const handleCreateBoard = () => {
    let finalDimensions: number[];
    if (gameConfig.useNDimensions && Number(gameConfig.dimensionCount) === 3) {
      const size = gameConfig.dimensions[0] || 3;
      finalDimensions = [6, size, size];
    } else if (gameConfig.useNDimensions) {
      finalDimensions = gameConfig.dimensions;
    } else {
      finalDimensions = [gameConfig.width, gameConfig.height];
    }

    if (wasm) {
        try {
            const newSim = new wasm.Simulator(finalDimensions, gameConfig.mines, selectedAlgorithm);
            setSimulator(newSim);
            setBoardState(newSim.getState());
        } catch (e) {
            setBoardState(createDummyBoard(finalDimensions, gameConfig.mines));
        }
    } else {
        setBoardState(createDummyBoard(finalDimensions, gameConfig.mines));
    }
  };

  const handleAlgorithmChange = (algoType: AlgorithmType) => {
    setSelectedAlgorithm(algoType);
    handleCreateBoard();
  };

  // --- 시뮬레이션 핸들러 (ControlPanel에 넘겨줄 함수들) ---
  const handleStep = () => {
    if (!simulator) return;
    const result = simulator.runStep();
    setBoardState({ ...result });
  };

  const handleRunFull = async () => {
    if (!simulator) return;
    setIsRunning(true);
    const result = simulator.runFullGame();
    setBoardState({ ...result });
    setIsRunning(false);
  };

  // 기존에 있던 Batch/Compare 로직들 (App.tsx에 포함)
  const handleRunBatch = async () => {
    if (!wasm) return alert("WASM이 필요합니다.");
    setIsRunning(true);
    // ... (기존 batch 로직 수행 후 setBatchResults)
    setIsRunning(false);
  };

  const handleCompare = async () => {
    if (!wasm) return alert("WASM이 필요합니다.");
    setIsRunning(true);
    // ... (기존 compare 로직 수행 후 setComparisonResults, setAllDetailedRecords)
    setIsRunning(false);
  };

  return (
    <div className="App">
      <Header useNDimensions={gameConfig.useNDimensions} />
      <Menu 
        config={gameConfig} setConfig={setGameConfig}
        presets={defaultPresets} wasm={!!wasm}
        simulator={!!boardState} onCreateBoard={handleCreateBoard}
      />

      <AlgorithmSelector
        selectedAlgorithm={selectedAlgorithm}
        onAlgorithmChange={handleAlgorithmChange}
        disabled={isRunning}
      />

      <main>        
                {/* 새 컴포넌트 1: 컨트롤 버튼들 */}
      <ControlPanel 
          onStep={handleStep}
          onRunFull={handleRunFull}
          onRunBatch={handleRunBatch}
          onCompare={handleCompare}
          isRunning={isRunning}
          hasSimulator={!!simulator}
          onReset={handleCreateBoard}
        />
        <BoardView 
          board={boardState} 
          onCellClick={(coords) => console.log('Clicked:', coords)}
        />

        {/* 새 컴포넌트 2: 결과 리포트 */}
        <ResultPanel 
          batchResults={batchResults}
          comparisonResults={comparisonResults}
          allDetailedRecords={allDetailedRecords}
          gameConfig={gameConfig}
        />
      </main>
    </div>
  );
};

export default App;