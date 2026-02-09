import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/InputSection/Header';
import Menu from './components/InputSection/Menu';
import BoardView from './components/BoardView';
import AlgorithmSelector from './components/InputSection/AlgorithmSelector';
import ControlPanel from './components/InputSection/ControlPanel'; 
import ResultPanel from './components/ResultSection/ResultPanel';

// 타입 정의
import { AlgorithmType , TspObjective} from './types/simulation';
import type { GameConfig, Preset, GameRecord, GameStats } from './types';
// WASM 패키지 임포트
import initWasmEngine, { Simulator } from './wasm_pkg/engine';

const gamePresets: Preset[] = [
  // 2D: 표준 규격 유지 (이미 검증된 난이도)
  { id: "2d-beginner", name: "2D Beginner", width: 9, height: 9, mines: 10, dimensions: [9, 9] },
  { id: "2d-intermediate", name: "2D Intermediate", width: 16, height: 16, mines: 40, dimensions: [16, 16] },
  { id: "2d-expert", name: "2D Expert", width: 30, height: 16, mines: 99, dimensions: [30, 16] },
  // 4x4x4 = 64칸. 지뢰 12개 (약 18.7%)
  { id: "3d-beginner", name: "3D Beginner", dimensions: [4, 4, 4], mines: 12 },
  // 6x6x6 = 216칸. 지뢰 45개 (약 20.8%)
  { id: "3d-intermediate", name: "3D Intermediate", dimensions: [6, 6, 6], mines: 45 },
  // 8x8x8 = 512칸. 지뢰 100개 (약 19.5%)
  { id: "3d-expert", name: "3D Expert", dimensions: [8, 8, 8], mines: 100 },
  // 3x3x3x3 = 81칸. 지뢰 16개 (약 19.7%) 
  { id: "4d-beginner", name: "4D Beginner", dimensions: [3, 3, 3, 3], mines: 16 },
  // 4x4x4x4 = 256칸. 지뢰 55개 (약 21.4%)
  { id: "4d-intermediate", name: "4D Intermediate", dimensions: [4, 4, 4, 4], mines: 55 },
  // [추가안] 5x5x5x5 = 625칸. 지뢰 130개 (약 20.8%)
  { id: "4d-expert", name: "4D Expert", dimensions: [5, 5, 5, 5], mines: 130 },
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

  // --- 2. WASM 초기화 ---
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

  // --- 3. 보드 생성 로직 (WASM 인터페이스 맞춤) ---
  const handleCreateBoard = useCallback(() => {
    if (!wasmReady) return;
  
    try {
      const { width, height, mines, useNDimensions, dimensionCount, dimensions } = gameConfig;
      let rawDims: number[];
  
      if (useNDimensions) {
        if (dimensionCount === 3) {
          // 3D Beginner [4,4,4] -> [6,4,4]
          rawDims = [6, dimensions[1], dimensions[2]];
        } else {
          // 4D 이상은 프리셋 값 그대로 전달
          rawDims = dimensions;
        }
      } else {
        rawDims = [height, width];
      }
  
      const finalDims = new Uint32Array(rawDims);
      
      // 지뢰 개수 체크 로그 추가
      const totalPossible = rawDims.reduce((a, b) => a * b, 1);
      console.log(`📊 예상 전체 셀 수: ${totalPossible}, 지뢰: ${mines}`);
  
      // Simulator 생성 (타입 캐스팅으로 에러 방지)
      const newSim = new Simulator(finalDims, mines, selectedAlgorithm as any);
      
      const initialState = newSim.getState();
      setSimulator(newSim);
      setBoardState(initialState);
      console.log("Successfully created new board with config", gameConfig);
    } catch (e) {
      console.error("WASM Setup error:", e);
    }
  }, [wasmReady, gameConfig, selectedAlgorithm]);


  // 초기 로드 시 생성
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
      return AlgorithmType.SatSolver4D; // 4D 전용 SAT
    }
    return selectedAlgorithm;
  };

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
    const total = state.total_cells; // 전체 칸 수
    const mines = state.mines;       // 지뢰 수
    const goal = total - mines;      // 파내야 할 칸 수
    const current = state.total_revealed; // 현재 판 칸 수

  console.log(`📊 보드 상태: 전체 ${total}칸 중 ${current}칸 오픈 (지뢰 제외 남은 목표: ${goal - current}칸)`);
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

    const effectiveAlgo = getEffectiveAlgorithm();
    for (let i = 0; i < 100; i++) {
      // 매 판마다 새로운 시뮬레이터 생성 (새로운 시드)
      const sim = new Simulator(finalDims, mines, effectiveAlgo as any);
      // 시드를 판마다 다르게 주려면 Rust의 set_seed 사용 가능
      
      const finalStateJson = sim.runFullGame(); // WASM에서 최종 상태 반환
      
      results.push({
        success: finalStateJson.game_won,
        clicks: finalStateJson.total_clicks,
        total_guesses: finalStateJson.total_guesses,
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
// --- 6. 알고리즘 비교 실행 ---
const handleCompareAlgorithms = useCallback(async () => {
  if (!wasmReady) return;
  setIsRunning(true);

  setTimeout(() => {
    const algorithms = [
      { type: AlgorithmType.Greedy, label: "Greedy" },
      { type: AlgorithmType.ExactSolver, label: "Exact Solver" },
      { type: AlgorithmType.SatSolver, label: "SAT Solver" } // 4D 전용일 때 자동 SatSolver4D로 변환
    ];

    const allRecords: GameRecord[] = [];
    const summaryStats: GameStats[] = [];
    const gamesPerAlgo = 100;

    algorithms.forEach(algo => {
      const algoRecords: GameRecord[] = [];

      // 자동으로 4D SAT 알고리즘 선택
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
          guesses: res.total_guesses, // 💡 0에서 res.total_guesses로 변경!
          total_guesses: res.total_guesses, // 💡 ResultPanel이 total_guesses를 쓴다면 이것도 추가
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
 const [tspObjective, setTspObjective] = useState<TspObjective>("min_clicks");
  return (
    <div className="App">
      <Header useNDimensions={gameConfig.useNDimensions} />
      
      <Menu 
        config={gameConfig} 
        setConfig={setGameConfig}
        presets={gamePresets}
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
        tspObjective={tspObjective}        // 💡 추가
        onTspChange={setTspObjective}      // 💡 추가
      />

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

        <ResultPanel 
          batchResults={batchResults}
          comparisonResults={comparisonResults}
          allDetailedRecords={allDetailedRecords}
          gameConfig={gameConfig}
          tspObjective={tspObjective}        // 💡 추가
        />
      </main>
    </div>
  );
};

export default App;