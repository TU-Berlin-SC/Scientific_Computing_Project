import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/InputSection/Header';
import Menu from './components/InputSection/Menu';
import BoardView from './components/BoardView';
import AlgorithmSelector from './components/InputSection/AlgorithmSelector';
import ControlPanel from './components/InputSection/ControlPanel'; 
import ResultPanel from './components/ResultSection/ResultPanel';

import { AlgorithmType , TspObjective} from './types/simulation';
import type { GameConfig, Preset, GameRecord, GameStats } from './types';

import initWasmEngine, { Simulator } from './wasm_pkg/engine';

const gamePresets: Preset[] = [
  { id: "2d-beginner", name: "2D Beginner", width: 9, height: 9, mines: 10, dimensions: [9, 9] },
  { id: "2d-intermediate", name: "2D Intermediate", width: 16, height: 16, mines: 40, dimensions: [16, 16] },
  { id: "2d-expert", name: "2D Expert", width: 30, height: 16, mines: 99, dimensions: [30, 16] },

  { id: "3d-beginner", name: "3D Beginner", dimensions: [4, 4, 4], mines: 12 },  // 4x4x4 = 64. 12 (18.7%)
  { id: "3d-intermediate", name: "3D Intermediate", dimensions: [6, 6, 6], mines: 45 },  // 6x6x6 = 216,45개 (20.8%)
  { id: "3d-expert", name: "3D Expert", dimensions: [8, 8, 8], mines: 100 },  // 8x8x8 = 512칸, 100개 (19.5%)

  { id: "4d-beginner", name: "4D Beginner", dimensions: [3, 3, 3, 3], mines: 16 },  // 3x3x3x3 = 81, 16개 (19.7%) 
  { id: "4d-intermediate", name: "4D Intermediate", dimensions: [4, 4, 4, 4], mines: 55 },// 4x4x4x4 = 256, 55 (21.4%)
  { id: "4d-expert", name: "4D Expert", dimensions: [5, 5, 5, 5], mines: 130 }, // 5x5x5x5 = 625칸, 130 (20.8%)
];
const App: React.FC = () => {
  // --- 1. 상태 관리 ---
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    useNDimensions: true,
    dimensionCount: 3,
    dimensions: [4, 4, 4],
    width: 4,
    height: 4,
    mines: 12,
  });
  

  const [wasmReady, setWasmReady] = useState<boolean>(false);
  const [simulator, setSimulator] = useState<Simulator | null>(null);
  const [boardState, setBoardState] = useState<any>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmType>(AlgorithmType.Greedy);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [comparisonResults, setComparisonResults] = useState<GameStats[]>([]);
  const [allDetailedRecords, setAllDetailedRecords] = useState<GameRecord[]>([]);

  // Initialize WASM Engine : On component mount, we need to initialize the WASM engine. This involves calling the init function from the WASM package, which loads the WebAssembly module and prepares it for use. We also need to handle any potential errors during this process, such as failed loading or initialization issues, and set a state variable to indicate when the WASM engine is ready for interaction.
  useEffect(() => {
    const init = async () => {
      try {
        await initWasmEngine(); 
        setWasmReady(true);
        console.log("Loaded WASM engine successfully.");
      } catch (e) {
        console.error("Failed to load WASM:", e);
      }
    };
    init();
  }, []);

  // WASM Interface - Board Creation : When user clicks "Create Board" or when WASM becomes ready with no existing simulator, we need to create a new board based on the current gameConfig. This involves translating the gameConfig into the appropriate format for the Simulator constructor, handling both 2D and N-D configurations, and then initializing the Simulator instance. We also need to handle any potential errors during this process, such as invalid configurations or WASM memory issues.
  const handleCreateBoard = useCallback(() => {
    if (!wasmReady) return;
  
    try {
      const { width, height, mines, useNDimensions, dimensionCount, dimensions } = gameConfig;
      let rawDims: number[];
  
      if (useNDimensions) {
        if (dimensionCount === 3) { // 3D Beginner [4,4,4] -> [6,4,4]
          rawDims = [6, dimensions[1], dimensions[2]];
        } else { // 4D or custom N-D
          rawDims = dimensions;
        }
      } else {
        rawDims = [height, width];
      }
  
      const finalDims = new Uint32Array(rawDims);
      const totalPossible = rawDims.reduce((a, b) => a * b, 1);
      console.log(`Expected total cells : ${totalPossible}, mines: ${mines}`);
  
      // Generate Simulator (typecasting to prevent err)
      const newSim = new Simulator(finalDims, mines, selectedAlgorithm as any);
      
      const initialState = newSim.getState();
      setSimulator(newSim);
      setBoardState(initialState);
      console.log("Successfully created new board with config", gameConfig);
    } catch (e) {
      console.error("WASM Setup error:", e);
    }
  }, [wasmReady, gameConfig, selectedAlgorithm]);


  // generate board on WASM ready or when simulator is reset/cleared (to ensure we always have a board when WASM is ready and no existing simulator)
  useEffect(() => {
    if (wasmReady && !simulator) {
      handleCreateBoard();
    }
  }, [wasmReady, simulator, handleCreateBoard]);

  // for 4D SAT Solver, we need to ensure that when the user selects SAT Solver, if it's 4D, we switch to the 4D-specific algorithm variant.
  const getEffectiveAlgorithm = (): AlgorithmType => {
    if (
      selectedAlgorithm === AlgorithmType.SatSolver &&
      gameConfig.useNDimensions &&
      gameConfig.dimensions.length === 4
    ) {
      return AlgorithmType.SatSolver4D; // 4D SAT
    }
    return selectedAlgorithm;
  };

  // Change Algorithm Handler : When user changes algorithm selection, we need to update the simulator's algorithm if the game is not currently running. If it is running, we can either ignore the change or reset the board with the new algorithm (here we choose to ignore to prevent mid-game changes).
  const handleAlgorithmChange = useCallback((algo: AlgorithmType) => {
    console.log("알고리즘 변경 요청:", algo);
    setSelectedAlgorithm(algo);
    if (simulator) {
      try {
        if (!isRunning) {
          simulator.setAlgorithm(algo);
          setBoardState({ ...simulator.getState() });
        }
      } catch (e) {
        console.error("WASM Memory Error:", e);
        handleCreateBoard(); 
      }
    }
  }, [simulator, isRunning, handleCreateBoard]);

  const analyzeBoardData = (state: any) => {
    if (!state || !state.cells) return;

    const totalCells = state.cells.length;
    const revealedCells = state.cells.filter((c: any) => c.is_revealed);
    const mineCells = state.cells.filter((c: any) => c.is_mine);
    const total = state.total_cells; 
    const mines = state.mines;      
    const goal = total - mines;     
    const current = state.total_revealed; 

  console.log(`📊 보드 상태: 전체 ${total}칸 중 ${current}칸 오픈 (지뢰 제외 남은 목표: ${goal - current}칸)`);
    // Check the FACE distribution (for 3D/4D) - how many cells are on each face, how many revealed, how many mines
    const faceStats = [0, 1, 2, 3, 4, 5].map(f => ({
      face: f,
      revealed: state.cells.filter((c: any) => c.coordinates[0] === f && c.is_revealed).length,
      mines: state.cells.filter((c: any) => c.coordinates[0] === f && c.is_mine).length,
      total: state.cells.filter((c: any) => c.coordinates[0] === f).length
    }));

    console.group("🧪 WASM Backend Data Analysis");
    console.log(`Dimensions: ${state.dimensions?.join('x')}`);
    console.log(`Total Cells: ${totalCells} | Mines: ${mineCells.length}`);
    console.log(`Revealed Cells: ${revealedCells.length}`);
    
    console.log("📍 Face-by-Face Distribution:");
    console.table(faceStats);

    // FOR TESTING 
    console.log("🧩 Sample Cells (First 5):", state.cells.slice(0, 5).map((c: any) => ({
      coords: c.coordinates,
      is_revealed: c.is_revealed,
      is_mine: c.is_mine,
      adj: c.adjacent_mines
    })));
    console.groupEnd();
  };

  const handleStep = () => {
    if (!simulator) return;
    console.log("🕹️ Step Execution");
    simulator.runStep(); 
    const newState = simulator.getState();
    setBoardState({ ...newState });
    analyzeBoardData(newState); // data analysis log after each step for debugging and insight into algorithm behavior
  };

  const handleRunFull = () => {
    if (!simulator) return;
    setIsRunning(true);
    console.log("🚀 Full Game Execution Started");
    
    // UI 렌더링 차단을 방지하기 위해 setTimeout 사용
    setTimeout(() => {
      try {
        const effectiveAlgo = getEffectiveAlgorithm();
        simulator.setAlgorithm(effectiveAlgo as any);
  
        simulator.runFullGame();
        const newState = simulator.getState();
        
        console.log("🏁 Full Game Finished");
        setBoardState({ ...newState });
        analyzeBoardData(newState); // 데이터 분석 로그 출력
        
      } catch (error) {
        console.error("❌ Full Game Error:", error);
      } finally {
        setIsRunning(false);
      }
    }, 10);
  };

  const handleReset = () => {
    if (simulator) {
      simulator.reset();
      setBoardState({ ...simulator.getState() });
    } else {
      handleCreateBoard();
    }
  };

  // Batch Testing : 100 games with current config and algorithm, collect results (win/loss, clicks, guesses, completion rate) for analysis
  const handleRunBatch = useCallback(async () => {
    if (!wasmReady) return;
    setIsRunning(true);
    
    // use setTimeout to allow UI to update before starting the batch process, preventing potential freezing
    setTimeout(() => {
      const results = [];
      const { width, height, mines, useNDimensions, dimensionCount, dimensions } = gameConfig;
      
      let finalDims = useNDimensions 
        ? (dimensionCount === 3 ? [6, height, width] : dimensions) 
        : [height, width];

      const effectiveAlgo = getEffectiveAlgorithm();
      for (let i = 0; i < 100; i++) {
        // New Seed for each game to ensure different board
        const sim = new Simulator(finalDims, mines, effectiveAlgo as any);
        // need to use set_seedd constructor or reset with new seed to ensure different board each time
        
        const finalStateJson = sim.runFullGame(); // WASM -> converts final state to JSON for easier JS handling
        
        results.push({
          success: finalStateJson.game_won,
          clicks: finalStateJson.total_clicks,
          total_guesses: finalStateJson.total_guesses,
          dimensions: finalStateJson.dimensions,
          completion: finalStateJson.completion
        });
     }
    setBatchResults(results);
    setIsRunning(false);
    console.log("Completed Batch Test :", results);
  }, 50);
}, [wasmReady, gameConfig, selectedAlgorithm]);

// Algorithm Comparison
const handleCompareAlgorithms = useCallback(async () => {
  if (!wasmReady) return;
  setIsRunning(true);

  setTimeout(() => {
    const algorithms = [
      { type: AlgorithmType.Greedy, label: "Greedy" },
      { type: AlgorithmType.ExactSolver, label: "Exact Solver" },
      { type: AlgorithmType.SatSolver, label: "SAT Solver" }
    ];

    const allRecords: GameRecord[] = [];
    const summaryStats: GameStats[] = [];
    const gamesPerAlgo = 100;

    algorithms.forEach(algo => {
      const algoRecords: GameRecord[] = [];

      // For 4D Algorithms, Select the effective algorithm variant 
      // (due to frontend crash when SAT Solver is selected for 4D, we need to ensure we use the 4D-specific SAT variant)
      const effectiveAlgo =
        algo.type === AlgorithmType.SatSolver &&
        gameConfig.useNDimensions &&
        gameConfig.dimensions.length === 4
          ? AlgorithmType.SatSolver4D
          : algo.type;

      for (let i = 0; i < gamesPerAlgo; i++) {
        const sim = new Simulator(
          gameConfig.useNDimensions ? gameConfig.dimensions : [gameConfig.height, gameConfig.width],
          gameConfig.mines,
          effectiveAlgo as any
        );

        const res = sim.runFullGame();

        const record: GameRecord = {
          algorithm: algo.label,
          win: res.game_won ? "TRUE" : "FALSE",
          clicks: res.total_clicks,
          guesses: res.total_guesses, 
          total_guesses: res.total_guesses, // ResultPanel is using this total_guesses (can be refactored later)
          completion: res.completion,
          dims: res.dimensions.join('x'),
          steps: res.total_clicks
        };

        algoRecords.push(record);
        allRecords.push(record);
      }

      summaryStats.push(getSummaryStats(algoRecords, algo.label));
    });

    setAllDetailedRecords(allRecords);
    setComparisonResults(summaryStats);
    setIsRunning(false);

    console.log("✅ Algorithm Comparison 완료:", summaryStats);
  }, 50);
}, [wasmReady, gameConfig]);



// getSummary Stats : calculate total games, wins, win rate, average steps/clicks/time/guesses for wins
const getSummaryStats = (gameRecords: GameRecord[], algorithmLabel: string): GameStats => {
  const totalGames = gameRecords.length;
  const winRecords = gameRecords.filter(r => r.win === "TRUE" || r.win === true);
  const wins = winRecords.length;
  
  const getAverage = (records: any[], key: keyof GameRecord) => {
    if (records.length === 0) return 0;
    const sum = records.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    return sum / records.length;
  };

  return {
    algorithm: algorithmLabel,
    total_games: totalGames,
    wins,
    win_rate: totalGames > 0 ? (wins / totalGames) * 100 : 0,
    avg_steps_wins: getAverage(winRecords, 'steps'),
    avg_clicks_wins: getAverage(winRecords, 'clicks'),
    avg_time_wins: getAverage(winRecords, 'time_ms'),
    avg_guesses_wins: getAverage(winRecords, 'guesses'),
  };
};
 const [tspObjective, setTspObjective] = useState<TspObjective>("min_clicks");

  return (
    <div className="App">
      <Header useNDimensions={gameConfig.useNDimensions} />
      {/* Game Configuration */}
      <Menu 
        config={gameConfig} 
        setConfig={setGameConfig}
        presets={gamePresets}
        wasm={wasmReady}
        simulator={!!simulator} 
        onCreateBoard={handleCreateBoard}
    />

      {/* Select Algorithms */}
      <AlgorithmSelector
        selectedAlgorithm={selectedAlgorithm}
        onAlgorithmChange={handleAlgorithmChange}
        disabled={isRunning}
      />

      <main>
        {/* Select : Next, Run Full, Compare Algo...  */}
      <ControlPanel 
        onStep={handleStep}
        onRunFull={handleRunFull}
        onRunBatch={handleRunBatch}
        onCompare={handleCompareAlgorithms} 
        isRunning={isRunning}
        hasSimulator={!!simulator}
        onReset={handleReset}
        tspObjective={tspObjective}
        onTspChange={setTspObjective}
      />
        {/* Render */}
        {boardState ? (
          <BoardView 
            board={boardState} 
            onCellClick={(coords) => console.log('Click:', coords)}
            onCellRightClick={(coords) => console.log('Right Click:', coords)}
            gameConfig={gameConfig}
          />
        ) : (
          <div className="placeholder">보드를 생성하는 중입니다...</div>
        )}
        {/* Result Panel */}
        <ResultPanel 
          batchResults={batchResults}
          comparisonResults={comparisonResults}
          allDetailedRecords={allDetailedRecords}
          gameConfig={gameConfig}
          tspObjective={tspObjective} 
        />
      </main>
    </div>
  );
};

export default App;