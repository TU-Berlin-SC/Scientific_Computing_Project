import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/InputSection/Header';
import Menu from './components/InputSection/Menu';
import BoardView from './components/BoardView';
import AlgorithmSelector from './components/InputSection/AlgorithmSelector';
import ControlPanel from './components/InputSection/ControlPanel'; 
import ResultPanel from './components/ResultSection/ResultPanel';

// 타입 정의
import { AlgorithmType } from './types/simulation';
import type { GameConfig, Preset, GameRecord, GameStats } from './types';

// WASM 패키지 임포트
import initWasmEngine, { Simulator } from './wasm_pkg/engine';

const defaultPresets: Preset[] = [
  { id: 'preset1', name: 'Easy (9x9)', width: 9, height: 9, mines: 10 },
  { id: 'preset2', name: 'Medium (16x16)', width: 16, height: 16, mines: 40 },
  { id: 'preset3', name: 'Hard (30x16)', width: 30, height: 16, mines: 99 },
];

const App: React.FC = () => {
  // --- 1. 상태 관리 ---
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    useNDimensions: false,
    dimensionCount: 3,
    dimensions: [3, 3, 3],
    width: 9,
    height: 9,
    mines: 10,
  });

  const [wasmReady, setWasmReady] = useState<boolean>(false);
  const [simulator, setSimulator] = useState<Simulator | null>(null);
  const [boardState, setBoardState] = useState<any>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmType>(AlgorithmType.Greedy);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [comparisonResults, setComparisonResults] = useState<GameStats[]>([]);
  const [allDetailedRecords, setAllDetailedRecords] = useState<GameRecord[]>([]);

  // --- 2. WASM 초기화 ---
  useEffect(() => {
    const init = async () => {
      try {
        await initWasmEngine(); 
        setWasmReady(true);
        console.log("🎊 WASM 로딩 완료!");
      } catch (e) {
        console.error("💀 WASM 초기화 실패:", e);
      }
    };
    init();
  }, []);

  // --- 3. 보드 생성 로직 (WASM 인터페이스 맞춤) ---
// App.tsx 내부의 handleCreateBoard 수정
const handleCreateBoard = useCallback(() => {
  if (!wasmReady) {
    console.warn("WASM이 아직 준비되지 않았습니다.");
    return;
  }

  try {
    const { width, height, mines, useNDimensions, dimensionCount, dimensions } = gameConfig;
    
    let finalDims;
    if (useNDimensions) {
      if (dimensionCount === 3) {
        // 3D 주사위 모드: 백엔드 [face, y, x] 구조에 맞춰 [6, height, width] 전달
        finalDims = [6, height, width];
      } else {
        finalDims = dimensions; // 4D 이상
      }
    } else {
      finalDims = [height, width]; // 2D: [row, col]
    }

    console.log("🛠️ 시뮬레이터 생성 시도:", finalDims);
    const newSim = new Simulator(finalDims, mines, selectedAlgorithm);
    
    // 생성 직후 상태 확인
    const initialState = newSim.getState();
    if (!initialState || !initialState.cells) {
       throw new Error("WASM에서 유효한 보드 데이터를 받지 못했습니다.");
    }

    setSimulator(newSim);
    setBoardState(initialState);
    console.log("✅ 보드 생성 성공:", initialState);
  } catch (e) {
    console.error("💀 WASM 생성 오류:", e);
    alert("보드 생성 중 오류가 발생했습니다. 콘솔을 확인하세요.");
  }
}, [wasmReady, gameConfig, selectedAlgorithm]);
  // const handleCreateBoard = useCallback(() => {
  //   if (!wasmReady) return;
  
  //   try {
  //     const { width, height, mines, useNDimensions, dimensions } = gameConfig;
      
  //     let newSim;
  //     if (useNDimensions) {
  //       // 💡 dimensions 배열이 [z, y, x] 혹은 [w, z, y, x] 순서인지 확인
  //       console.log("Creating ND Simulator with:", dimensions);
  //       newSim = new Simulator(dimensions, mines, selectedAlgorithm);
  //     } else {
  //       // 💡 2D인 경우 확실하게 [height, width] 배열로 전달
  //       newSim = new Simulator([height, width], mines, selectedAlgorithm);
  //     }
      
  //     setSimulator(newSim);
  //     setBoardState(newSim.getState());
  //   } catch (e) {
  //     // 💡 여기서 에러가 나면 Rust 내부 panic입니다.
  //     console.error("WASM 엔진 내부 오류 (Panic):", e);
  //   }
  // }, [wasmReady, gameConfig, selectedAlgorithm]);



  // 초기 로드 시 생성
  useEffect(() => {
    if (wasmReady && !simulator) {
      handleCreateBoard();
    }
  }, [wasmReady, simulator, handleCreateBoard]);

  // --- 4. 알고리즘 변경 핸들러 (UI 리렌더링 및 엔진 동기화) ---
  const handleAlgorithmChange = useCallback((algo: AlgorithmType) => {
    console.log("알고리즘 변경 요청:", algo);
    setSelectedAlgorithm(algo);
    
    // 💡 simulator가 존재하는지, 그리고 유효한지 체크
    if (simulator) {
      try {
        // setTimeout을 제거하고 동기적으로 실행하거나, 
        // 실행 중(isRunning)일 때는 아예 막아야 합니다.
        if (!isRunning) {
          simulator.setAlgorithm(algo);
          setBoardState({ ...simulator.getState() });
        }
      } catch (e) {
        console.error("💀 WASM Memory Error:", e);
        // 메모리 에러가 나면 시뮬레이터를 새로 생성해주는 것이 가장 안전합니다.
        handleCreateBoard(); 
      }
    }
  }, [simulator, isRunning, handleCreateBoard]);

  // 🔍 [추가] 셀 데이터 분석 함수
  const analyzeBoardData = (state: any) => {
    if (!state || !state.cells) return;

    const totalCells = state.cells.length;
    const revealedCells = state.cells.filter((c: any) => c.is_revealed);
    const mineCells = state.cells.filter((c: any) => c.is_mine);
    
    // 면(Face)별 데이터 분포 확인
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

    // 첫 5개 셀의 좌표와 상태 샘플링 (구조 확인용)
    console.log("🧩 Sample Cells (First 5):", state.cells.slice(0, 5).map((c: any) => ({
      coords: c.coordinates,
      is_revealed: c.is_revealed,
      is_mine: c.is_mine,
      adj: c.adjacent_mines
    })));
    console.groupEnd();
  };

  // --- 5. 게임 컨트롤 핸들러 수정 ---
  const handleStep = () => {
    if (!simulator) return;
    console.log("🕹️ Step Execution");
    simulator.runStep(); 
    const newState = simulator.getState();
    setBoardState({ ...newState });
    analyzeBoardData(newState); // 데이터 분석 로그 출력
  };

  const handleRunFull = () => {
    if (!simulator) return;
    setIsRunning(true);
    console.log("🚀 Full Game Execution Started");
    
    // UI 렌더링 차단을 방지하기 위해 setTimeout 사용
    setTimeout(() => {
      try {
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
  // 1. Batch 실행 로직 (100판 연속 실행)
const handleRunBatch = useCallback(async () => {
  if (!wasmReady) return;
  setIsRunning(true);
  
  // 메인 스레드 차단을 방지하기 위해 setTimeout 사용
  setTimeout(() => {
    const results = [];
    const { width, height, mines, useNDimensions, dimensionCount, dimensions } = gameConfig;
    
    // 차원 설정 동일하게 적용
    let finalDims = useNDimensions 
      ? (dimensionCount === 3 ? [6, height, width] : dimensions) 
      : [height, width];

    for (let i = 0; i < 100; i++) {
      // 매 판마다 새로운 시뮬레이터 생성 (새로운 시드)
      const sim = new Simulator(finalDims, mines, selectedAlgorithm);
      // 시드를 판마다 다르게 주려면 Rust의 set_seed 사용 가능
      
      const finalStateJson = sim.runFullGame(); // WASM에서 최종 상태 반환
      
      results.push({
        success: finalStateJson.game_won,
        clicks: finalStateJson.total_clicks,
        mines: finalStateJson.mines,
        dimensions: finalStateJson.dimensions,
        completion: finalStateJson.completion
      });
    }

    setBatchResults(results); // 👈 여기서 상태가 업데이트되면 ResultPanel이 보입니다.
    setIsRunning(false);
    console.log("✅ Batch Test 완료:", results);
  }, 50);
}, [wasmReady, gameConfig, selectedAlgorithm]);

// 2. Algorithm Comparison 실행 로직
const handleCompareAlgorithms = useCallback(async () => {
  if (!wasmReady) return;
  setIsRunning(true);

  setTimeout(() => {
    const algorithms = [
      { type: AlgorithmType.Greedy, label: "Greedy" },
      { type: AlgorithmType.ExactSolver, label: "Exact Solver" },
      { type: AlgorithmType.SatSolver, label: "SAT Solver" }
    ];
    
    const records: GameRecord[] = [];
    const summaries: GameStats[] = [];
    const gamesPerAlgo = 10; // 비교를 위해 각 알고리즘당 10판씩 수행

    algorithms.forEach(algo => {
      const algoRecords: any[] = [];
      
      for (let i = 0; i < gamesPerAlgo; i++) {
        const sim = new Simulator(
          gameConfig.useNDimensions ? gameConfig.dimensions : [gameConfig.height, gameConfig.width],
          gameConfig.mines,
          algo.type
        );
        
        const res = sim.runFullGame();
        const record: GameRecord = {
          algorithm: algo.label,
          win: res.game_won ? "TRUE" : "FALSE",
          clicks: res.total_clicks,
          time_ms: res.time_ms,
          guesses: 0, // 엔진에서 구현 시 추가 가능
          completion: res.completion,
          dims: res.dimensions.join('x'),
          steps: res.total_clicks
        };
        algoRecords.push(record);
        records.push(record);
      }
      
      summaries.push(getSummaryStats(algoRecords, algo.label));
    });

    setAllDetailedRecords(records);
    setComparisonResults(summaries); // 👈 여기서 상태가 업데이트되면 결과 표가 나타납니다.
    setIsRunning(false);
  }, 50);
}, [wasmReady, gameConfig]);

// 1. 통계 계산 함수 (App 내부에 두거나 별도 유틸로 분리)
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

  return (
    <div className="App">
      <Header useNDimensions={gameConfig.useNDimensions} />
      
      <Menu 
        config={gameConfig} 
        setConfig={setGameConfig}
        presets={defaultPresets} 
        wasm={wasmReady}
        simulator={!!simulator} 
        onCreateBoard={handleCreateBoard}
      />

      {/* 알고리즘 선택 섹션 */}
      <AlgorithmSelector
        selectedAlgorithm={selectedAlgorithm}
        onAlgorithmChange={handleAlgorithmChange}
        disabled={isRunning}
      />

      <main>        
      <ControlPanel 
        onStep={handleStep}
        onRunFull={handleRunFull}
        onRunBatch={handleRunBatch}       // 👈 연결
        onCompare={handleCompareAlgorithms} // 👈 연결
        isRunning={isRunning}
        hasSimulator={!!simulator}
        onReset={handleReset}
      />

        {boardState ? (
          <BoardView 
            board={boardState} 
            onCellClick={(coords) => console.log('Click:', coords)}
          />
        ) : (
          <div className="placeholder">보드를 생성하는 중입니다...</div>
        )}

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