import React, { useEffect, useState } from 'react';
import './App.css';
import AlgorithmSelector from './components/AlgorithmSelector';
import { AlgorithmType, AlgorithmInfo } from './types/simulation';
import InteractiveNDBoard from './components/InteractiveNDBoard';

// TypeScript 인터페이스 정의
interface WasmModule {
  default?: () => Promise<void>;
  hello_world: () => string;
  test_add: (a: number, b: number) => number;
  create_simple_board: () => any;
  
  // N차원 생성자
  Simulator: new (dimensions: any, mines: number, algorithm: number) => Simulator;
  
  // 2D 호환성 메서드
  Simulator: {
    new2D?: (width: number, height: number, mines: number, algorithm: number) => Simulator;
  };
  
  WasmAlgorithmType: {
    Greedy: number;
    ExactSolver: number;
    SATSolver: number;
  };
  compare_algorithms: (dimensions: any, mines: number, games: number) => any;
}

interface Simulator {
  getState: () => any;
  runStep: () => any;
  runFullGame: () => any;
  runBatch: (games: number) => any;
  reset: () => void;
  setAlgorithm: (algorithm: number) => void;
  getAlgorithm: () => string;
}

interface GameConfig {
  // 2D 설정
  width: number;
  height: number;
  mines: number;
  
  // N차원 설정
  dimensions?: number[];
  dimensionCount?: number;
  useNDimensions: boolean;
}

interface GameStats { // 요약용
  algorithm: string;
  total_games: number;
  wins: number;
  win_rate: number;
  avg_steps_wins: number;
  avg_clicks_wins: number;
  avg_time_wins: number;
  avg_guesses_wins: number;
}

interface GameRecord { // 상세
  algorithm: string;
  mines: number;
  dims: string | number[];
  win: "TRUE" | "FALSE";
  clicks: number;
  time_ms: number;
  guesses: number;
  completion: string | number;
  objective?: string; 
}

function App() {
  const [wasm, setWasm] = useState<WasmModule | null>(null);
  const [simulator, setSimulator] = useState<Simulator | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [boardState, setBoardState] = useState<any>(null);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmType>(AlgorithmType.Greedy);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    width: 9,
    height: 9,
    mines: 10,
    dimensions: [9, 9],
    dimensionCount: 2,
    useNDimensions: false
  });
  const [comparisonResults, setComparisonResults] = useState<GameStats[]>([]);
  const [allDetailedRecords, setAllDetailedRecords] = useState<GameRecord[]>([]); // for data records
  const [selectedPreset, setSelectedPreset] = useState<string>("9x9");
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);

  // 2D 프리셋
  const gamePresets2D = [
    { id: "9x9", name: "9x9", width: 9, height: 9, mines: 10, dimensions: [9, 9] },
    { id: "16x16", name: "16x16", width: 16, height: 16, mines: 40, dimensions: [16, 16] },
    { id: "16x30", name: "16x30", width: 30, height: 16, mines: 99, dimensions: [30, 16] },
  ];

  // N차원 프리셋
  const gamePresetsND = [
    { id: "3d-beginner", name: "3D Beginner", dimensions: [4, 4, 4], mines: 8 },
    { id: "3d-intermediate", name: "3D Intermediate", dimensions: [6, 6, 6], mines: 40 },
    { id: "3d-expert", name: "3D Expert", dimensions: [8, 8, 8], mines: 99 },
    { id: "4d-beginner", name: "4D Beginner", dimensions: [3, 3, 3, 3], mines: 10 },
    { id: "4d-intermediate", name: "4D Intermediate", dimensions: [4, 4, 4, 4], mines: 40 },
  ];

  const currentPresets = gameConfig.useNDimensions ? gamePresetsND : gamePresets2D;

  const addLog = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev.slice(-50), `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  // WASM 로딩
  const loadWasm = async () => {
    try {
      addLog('Loading WASM...');
      const wasmModule = await import('./wasm_pkg/engine') as any as WasmModule;
      addLog('WASM module loaded');
      
      if (wasmModule.default) {
        await wasmModule.default();
        addLog('WASM initialized');
      }
      
      setWasm(wasmModule);
      return wasmModule;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`ERROR loading WASM: ${errorMsg}`);
      setError(errorMsg);
      console.error('WASM loading error:', err);
      return null;
    }
  };

  // 새 보드 생성
  const handleCreateNewBoard = () => {
    console.log("Raw Wasm State:", boardState)
    if (!wasm) {
      addLog('WASM not ready');
      return;
    }
    
    try {
      if (gameConfig.useNDimensions && gameConfig.dimensions) {
        // N차원 보드 생성
        const totalCells = gameConfig.dimensions.reduce((a, b) => a * b, 1);
        const maxMines = totalCells - 1;
        
        if (gameConfig.mines > maxMines) {
          addLog(`❌ Error: Mines (${gameConfig.mines}) cannot exceed total cells - 1 (${maxMines})`);
          setGameConfig(prev => ({ ...prev, mines: maxMines }));
          return;
        }
        
        addLog(`Creating ${gameConfig.dimensions.length}D board [${gameConfig.dimensions.join('×')}] with ${gameConfig.mines} mines...`);
        
        // N차원 생성자 사용
        const newSim = new wasm.Simulator(
          gameConfig.dimensions,
          gameConfig.mines,
          selectedAlgorithm
        );
        
        setSimulator(newSim);
        const initialState = newSim.getState();
        setBoardState(initialState);
        
        addLog(`✅ ${gameConfig.dimensions.length}D board created! Total cells: ${totalCells}`);
      } else {
        // 2D 보드 생성
        const totalCells = gameConfig.width * gameConfig.height;
        const maxMines = totalCells - 1;
        
        if (gameConfig.mines > maxMines) {
          addLog(`❌ Error: Mines (${gameConfig.mines}) cannot exceed total cells - 1 (${maxMines})`);
          setGameConfig(prev => ({ ...prev, mines: maxMines }));
          return;
        }
        
        addLog(`Creating 2D board ${gameConfig.width}×${gameConfig.height} with ${gameConfig.mines} mines...`);
        
        // 2D 생성자 사용
        let newSim;
        if (wasm.Simulator.new2D) {
          newSim = wasm.Simulator.new2D(
            gameConfig.width,
            gameConfig.height,
            gameConfig.mines,
            selectedAlgorithm
          );
        } else {
          // new2D가 없으면 일반 생성자에 배열 전달
          newSim = new wasm.Simulator(
            [gameConfig.width, gameConfig.height],
            gameConfig.mines,
            selectedAlgorithm
          );
        }
        
        setSimulator(newSim);
        const initialState = newSim.getState();
        setBoardState(initialState);
        
        addLog(`✅ 2D board created! Total cells: ${totalCells}`);
      }
      
      // 결과 초기화
      setBatchResults([]);
      setComparisonResults([]);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ Failed to create board: ${errorMsg}`);
      console.error('Create board error:', err);
    }
  };

  // N차원 모드 토글
  const handleToggleNDimensions = () => {
    const newUseNDimensions = !gameConfig.useNDimensions;
    
    if (newUseNDimensions) {
      // N차원으로 전환
      setGameConfig({
        ...gameConfig,
        useNDimensions: true,
        dimensionCount: 3,
        dimensions: [4, 4, 4],
        mines: 8
      });
      setSelectedPreset("3d-beginner");
      addLog("Switched to N-dimensional mode (3D)");
    } else {
      // 2D로 전환
      setGameConfig({
        ...gameConfig,
        useNDimensions: false,
        dimensionCount: 2,
        width: 9,
        height: 9,
        mines: 10,
        dimensions: [9, 9]
      });
      setSelectedPreset("9x9");
      addLog("Switched to 2D mode");
    }
  };

  // 프리셋 선택
  const handlePresetSelect = (preset: any) => {
    setSelectedPreset(preset.id);
    
    if (gameConfig.useNDimensions) {
      // N차원 프리셋
      setGameConfig({
        ...gameConfig,
        dimensions: preset.dimensions,
        mines: preset.mines
      });
      addLog(`Selected ${preset.dimensions.length}D preset: ${preset.name}`);
    } else {
      // 2D 프리셋
      setGameConfig({
        ...gameConfig,
        width: preset.width,
        height: preset.height,
        mines: preset.mines,
        dimensions: preset.dimensions
      });
      addLog(`Selected 2D preset: ${preset.name}`);
    }
  };

  // 알고리즘 변경
  const handleAlgorithmChange = (algoType: AlgorithmType) => {
    setSelectedAlgorithm(algoType);
    addLog(`Algorithm changed to: ${AlgorithmInfo.find(a => a.value === algoType)?.label}`);
    
    // 알고리즘이 변경되면 새 보드 생성
    if (wasm) {
      handleCreateNewBoard();
    }
  };

  // 설정 변경
  const handleConfigChange = (field: 'width' | 'height' | 'mines', value: number) => {
    setGameConfig(prev => {
      const newConfig = { ...prev, [field]: value };
      
      // dimensions 배열도 업데이트
      if (!gameConfig.useNDimensions && prev.dimensions) {
        if (field === 'width') {
          newConfig.dimensions = [value, prev.height];
        } else if (field === 'height') {
          newConfig.dimensions = [prev.width, value];
        }
      }
      
      return newConfig;
    });
    
    // 프리셋 해제
    if (selectedPreset !== 'custom') {
      setSelectedPreset('custom');
    }
  };

  // N차원 크기 변경
  const handleDimensionSizeChange = (index: number, value: number) => {
    if (!gameConfig.dimensions) return;
    
    const newDimensions = [...gameConfig.dimensions];
    newDimensions[index] = Math.max(2, Math.min(10, value));
    
    setGameConfig({
      ...gameConfig,
      dimensions: newDimensions
    });
    
    setSelectedPreset('custom');
  };

  // 차원 수 변경
  const handleDimensionCountChange = (count: number) => {
    const currentDimensions = gameConfig.dimensions || [4, 4, 4];
    let newDimensions;
    
    if (count > currentDimensions.length) {
      // 차원 추가
      newDimensions = [...currentDimensions, ...Array(count - currentDimensions.length).fill(4)];
    } else {
      // 차원 제거
      newDimensions = currentDimensions.slice(0, count);
    }
    
    setGameConfig({
      ...gameConfig,
      dimensionCount: count,
      dimensions: newDimensions
    });
    
    setSelectedPreset('custom');
    addLog(`Changed to ${count} dimensions`);
  };

  // 초기화
  useEffect(() => {
    const init = async () => {
      const wasmModule = await loadWasm();
      if (wasmModule) {
        // 초기 보드 생성
        const initSim = new wasmModule.Simulator(
          [9, 9],
          10,
          selectedAlgorithm
        );
        setSimulator(initSim);
        setBoardState(initSim.getState());
        addLog('Initial board created');
      }
    };
    init();
  }, []);

  // 단계 실행
  const handleStep = () => {
    if (!simulator) {
      addLog('Simulator not ready');
      return;
    }
    
    addLog('Running step...');
    try {
      const result = simulator.runStep();
      setBoardState(result);
      
      const revealed = result.cells.filter((cell: any) => cell.is_revealed).length;
      const total = result.dimensions ? result.dimensions.reduce((a: number, b: number) => a * b, 1) : result.width * result.height;
      
      addLog(`Step completed: Revealed ${revealed}/${total} cells`);
      addLog(`Game status: ${result.game_over ? 'GAME OVER' : result.game_won ? 'WON!' : 'IN PROGRESS'}`);
    } catch (err) {
      addLog(`Step error: ${err}`);
      console.error('Step error:', err);
    }
  };

  // 전체 게임 실행
  const handleRunGame = async () => {
    if (!simulator) {
      addLog('Simulator not ready');
      return;
    }
    
    setIsRunning(true);
    addLog('Running full game...');
    
    try {
      const result = simulator.runFullGame();
      setBoardState(result);
      
      const revealed = result.cells.filter((cell: any) => cell.is_revealed).length;
      const total = result.dimensions ? result.dimensions.reduce((a: number, b: number) => a * b, 1) : result.width * result.height;
      
      addLog(`Game completed: Revealed ${revealed}/${total} cells`);
      addLog(`Game ${result.game_won ? 'WON' : 'LOST'} in ${result.total_clicks} clicks`);
    } catch (err) {
      addLog(`Game error: ${err}`);
      console.error('Game error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  // 배치 실행
  const handleRunBatch = async () => {
    if (!wasm) {
      addLog('WASM not ready');
      return;
    }
    
    const batchSize = 100;
    const algoInfo = AlgorithmInfo.find(a => a.value === selectedAlgorithm);
    
    addLog(`Running batch of ${batchSize} games with ${algoInfo?.label}...`);
    
    setIsRunning(true);
    const results = [];
    
    for (let i = 0; i < batchSize; i++) {
      try {
        let newSim;
        
        if (gameConfig.useNDimensions && gameConfig.dimensions) {
          // N차원 배치
          newSim = new wasm.Simulator(
            gameConfig.dimensions,
            gameConfig.mines,
            selectedAlgorithm
          );
        } else {
          // 2D 배치
          if (wasm.Simulator.new2D) {
            newSim = wasm.Simulator.new2D(
              gameConfig.width,
              gameConfig.height,
              gameConfig.mines,
              selectedAlgorithm
            );
          } else {
            newSim = new wasm.Simulator(
              [gameConfig.width, gameConfig.height],
              gameConfig.mines,
              selectedAlgorithm
            );
          }
        }
        
        const finalState = newSim.runFullGame();
        
        // 결과 처리
        const processedState = finalState instanceof Map ? 
          Object.fromEntries(finalState.entries()) : 
          finalState;
        
        const totalCells = gameConfig.useNDimensions && gameConfig.dimensions ?
          gameConfig.dimensions.reduce((a, b) => a * b, 1) :
          gameConfig.width * gameConfig.height;
        
        results.push({
          game: i + 1,
          success: processedState.game_won || false,
          clicks: processedState.total_clicks || 0,
          steps: processedState.total_clicks || 0,
          mines: processedState.mines || gameConfig.mines,
          width: gameConfig.useNDimensions ? 'N/A' : gameConfig.width,
          height: gameConfig.useNDimensions ? 'N/A' : gameConfig.height,
          dimensions: gameConfig.dimensions || [gameConfig.width, gameConfig.height],
          total_revealed: processedState.total_revealed || 0,
          total_cells: totalCells,
          game_over: processedState.game_over || false,
          algorithm: algoInfo?.label || selectedAlgorithm.toString()
        });
        
        if ((i + 1) % 25 === 0) {
          addLog(`Progress: ${i + 1}/${batchSize} games completed`);
        }
      } catch (err) {
        console.error(`Game ${i + 1} error:`, err);
        results.push({
          game: i + 1,
          success: false,
          clicks: 0,
          steps: 0,
          mines: gameConfig.mines,
          width: gameConfig.useNDimensions ? 'N/A' : gameConfig.width,
          height: gameConfig.useNDimensions ? 'N/A' : gameConfig.height,
          dimensions: gameConfig.dimensions || [gameConfig.width, gameConfig.height],
          total_revealed: 0,
          total_cells: gameConfig.useNDimensions && gameConfig.dimensions ?
            gameConfig.dimensions.reduce((a, b) => a * b, 1) :
            gameConfig.width * gameConfig.height,
          game_over: true,
          algorithm: 'Error'
        });
      }
    }
    
    setIsRunning(false);
    
    const wins = results.filter(r => r.success).length;
    const winRate = (wins / batchSize * 100).toFixed(1);
    const avgClicks = wins > 0 
      ? (results.filter(r => r.success).reduce((sum, r) => sum + r.clicks, 0) / wins).toFixed(2)
      : '0.00';
    
    addLog(`✅ Batch completed: ${wins}/${batchSize} games won (${winRate}%)`);
    addLog(`📊 Average clicks for wins: ${avgClicks}`);
    
    setBatchResults(results);
  };

  // run single game and save
const runSingleGame = (algoValue: any): any => {
    let sim;
    if (gameConfig.useNDimensions && gameConfig.dimensions) {
      sim = new wasm.Simulator(
        gameConfig.dimensions,
        gameConfig.mines,
        algoValue
      );
    } else {
      sim = wasm.Simulator.new2D
        ? wasm.Simulator.new2D(
            gameConfig.width,
            gameConfig.height,
            gameConfig.mines,
            algoValue
          )
        : new wasm.Simulator(
            [gameConfig.width, gameConfig.height],
            gameConfig.mines,
            algoValue
          );
    }

    const finalState = sim.runFullGame();

    const processedState =
      finalState instanceof Map ? Object.fromEntries(finalState.entries()) : finalState;

    return processedState;
  };

  // 게임 여러 번 실행 후 모든 게임 기록 반환
  const runGamesForAlgorithm = (algo: any, testGames: number) => {
    const gameRecords = [];
  
    for (let i = 0; i < testGames; i++) {
      const state = runSingleGame(algo.value);
  
      gameRecords.push({
        algorithm: algo.label,
        mines: gameConfig.mines,
        dims:
          state?.dims ||
          (gameConfig.useNDimensions
            ? gameConfig.dimensions
            : [gameConfig.width, gameConfig.height]),
        win: state.game_won ? "TRUE" : "FALSE",
        clicks: state.total_clicks || 0,
        time_ms: state.time_ms || 0,
        guesses: state.total_guesses || 0,
        completion:
          state.completion ??
          (state.total_revealed != null && state.total_cells != null
            ? ((state.total_revealed / (state.total_cells - gameConfig.mines)) * 100).toFixed(2)
            : 0),
      });
    }
  
    return gameRecords; // 모든 게임 기록 반환 for csv files
  };

  // for summary stats for comparison report
  const getSummaryStats = (gameRecords: any[]) => {
    const totalGames = gameRecords.length;
    // win이 문자열 "TRUE"인지 확인 (데이터 형식에 맞춤)
    const winRecords = gameRecords.filter(r => r.win === "TRUE" || r.win === true);
    const wins = winRecords.length;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
  
    // 평균 계산 공통 함수 (가독성 및 재사용성)
    const getAverage = (records: any[], key: string) => {
      if (records.length === 0) return 0;
      const sum = records.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
      return sum / records.length;
    };
  
    return {
      total_games: totalGames,
      wins,
      win_rate: winRate,
      // 승리한 게임 기준 평균들
      avg_steps_wins: getAverage(winRecords, 'steps'), // 데이터에 steps가 없다면 다른 키로 대체 가능
      avg_clicks_wins: getAverage(winRecords, 'clicks'),
      avg_time_wins: getAverage(winRecords, 'time_ms'),
      avg_guesses_wins: getAverage(winRecords, 'guesses'),
    };
  };
  
  // save csv and show summary on page
  
  const handleCompareAlgorithms = async () => {
    if (!wasm) return addLog("WASM not ready");
  
    setIsRunning(true);
    const allGameRecords: any[] = []; 
    const summaryResults: any[] = []; 
  
    for (const algo of AlgorithmInfo) {
      if (!algo.implemented) continue;
  
      addLog(`Testing ${algo.label}...`);
      const gameRecords = runGamesForAlgorithm(algo, 100); 
      
      // 🔍 디버깅 로그: 개별 알고리즘 테스트 결과 확인
      console.log(`[Debug] ${algo.label} 테스트 완료. 생성된 레코드 수:`, gameRecords.length);
      if(gameRecords.length > 0) console.log(`[Debug] 첫 번째 레코드 샘플:`, gameRecords[0]);
  
      allGameRecords.push(...gameRecords);
  
      const summary = getSummaryStats(gameRecords);
      summaryResults.push({ algorithm: algo.label, ...summary });
    }
  
    setComparisonResults(summaryResults); 
    setAllDetailedRecords(allGameRecords); // 상세 기록을 반드시 여기에 저장!
    
    setIsRunning(false);
    console.log("[Debug] 전체 상세 레코드 수:", allGameRecords.length);
    addLog("🎉 All algorithms tested!");
  };

  const downloadCSV = (gameRecords: any[], filename: string) => {
    if (!gameRecords?.length) {
      alert("❌ 데이터 없음");
      return;
    }
  
    const headers = ["algorithm", "objective", "dims", "win", "clicks", "time_ms", "guesses", "completion"];
  
    const rows = gameRecords.map(r => [
      r.algorithm,
      r.objective ?? "N/A",
      Array.isArray(r.dims) ? r.dims.join("x") : r.dims,
      r.win,
      r.clicks,
      r.time_ms,
      r.guesses,
      r.completion
    ]);
  
    // 요청하신 형식의 헤더 추가
    const titleHeader = `--- benchmark results ---`;
    const csvContent = [
      titleHeader,
      headers.join(","), // 탭 대신 쉼표 사용 권장
      ...rows.map(r => r.join(","))
    ].join("\n");
  
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  // 게임 리셋
  const handleReset = () => {
    if (!simulator) {
      addLog('Simulator not ready');
      return;
    }
    
    addLog('Resetting game...');
    try {
      simulator.reset();
      const newState = simulator.getState();
      setBoardState(newState);
      addLog('Game reset successfully');
    } catch (err) {
      addLog(`Reset error: ${err}`);
    }
  };

  // 보드 렌더링
  // App.tsx 안에 renderBoard 함수 수정
const renderBoard = () => {
  if (!boardState) return null;
  
  // 1. 실제 차원 배열을 먼저 안전하게 가져옵니다. (dims 혹은 dimensions)
  const actualDimensions = boardState.dims || boardState.dimensions || [8, 8];
  
  // 2. 이 실제 배열의 길이를 기준으로 삼아야 합니다!
  const dimensionCount = actualDimensions.length;
  
  // 3. 보드 데이터 변환
  const boardData: Board = {
    dimensions: actualDimensions,
    mines: boardState.mines || 10,
    cells: boardState.cells || [],
    game_over: boardState.game_over || false,
    game_won: boardState.game_won || false,
    total_revealed: boardState.total_revealed || 0,
    total_clicks: boardState.total_clicks || 0,
    total_guesses: boardState.total_guesses || 0,
  };

  // 셀 데이터가 없는 경우 처리
  if (!boardData.cells || boardData.cells.length === 0) {
    return (
      <div className="board-preview empty">
        <h3>Board Preview</h3>
        <p>No board data available.</p>
        <p>Click "Create New Board" to start.</p>
      </div>
    );
  }
  // 차원 수에 따라 다른 컴포넌트 사용
  return (
    <div className="board-preview">
      <div className="board-header">
        <h3>
          {dimensionCount === 2 ? '2D' : `${dimensionCount}D`} Board 
          [{boardData.dimensions.join('×')}], {boardData.mines} mines
        </h3>
        <div className="board-mode-badge">
          {gameConfig.useNDimensions ? '🎲 N-Dimensional' : '🟦 2D Classic'}
        </div>
      </div>

      {dimensionCount === 2 ? (
        // 2D 보드 렌더링 (기존 방식)
        <div className="two-d-classic">
          <div 
            className="board-grid"
            style={{
              gridTemplateColumns: `repeat(${boardData.dimensions[0]}, 30px)`,
              gridTemplateRows: `repeat(${boardData.dimensions[1]}, 30px)`
            }}
          >
            {boardData.cells.map((cell: any, index: number) => {
              const x = cell.coordinates ? cell.coordinates[0] : cell.x || 0;
              const y = cell.coordinates ? cell.coordinates[1] : cell.y || 0;
              
              return (
                <div 
                  key={index}
                  className={`cell ${cell.is_revealed ? 'revealed' : 'hidden'} 
                             ${cell.is_mine && cell.is_revealed ? 'mine' : ''} 
                             ${cell.is_flagged ? 'flagged' : ''}`}
                  onClick={() => handleCellClick([x, y])}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleCellRightClick([x, y]);
                  }}
                  title={`(${x},${y}) - Mines nearby: ${cell.adjacent_mines}`}
                >
                  {cell.is_flagged ? '🚩' : 
                   cell.is_revealed && cell.is_mine ? '💣' :
                   cell.is_revealed && cell.adjacent_mines > 0 ? cell.adjacent_mines : ''}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // N차원 보드 - InteractiveNDBoard 사용
        <InteractiveNDBoard
          board={boardData}
          onCellClick={handleCellClick}
          onCellRightClick={handleCellRightClick}
        />
      )}

      <div className="board-info">
        <p><strong>Revealed:</strong> {boardData.total_revealed} / {boardData.dimensions.reduce((a, b) => a * b, 1) - boardData.mines}</p>
        <p><strong>Flags:</strong> {boardData.cells.filter((c: any) => c.is_flagged).length}</p>
        <p><strong>Total clicks:</strong> {boardData.total_clicks}</p>
        <p><strong>Status:</strong> {boardData.game_over ? '💀 GAME OVER' : boardData.game_won ? '🎉 WON!' : '▶️ Playing'}</p>
        <p><strong>Algorithm:</strong> {AlgorithmInfo.find(a => a.value === selectedAlgorithm)?.label}</p>
      </div>
    </div>
  );
};

// 셀 클릭 핸들러 추가
const handleCellClick = (coordinates: number[]) => {
  addLog(`Cell clicked at [${coordinates.join(', ')}]`);
  // 실제 게임 로직은 WASM에서 처리되므로, 여기서는 로그만
};

const handleCellRightClick = (coordinates: number[]) => {
  addLog(`Cell right-clicked at [${coordinates.join(', ')}] - Would toggle flag`);
  // 깃발 토글 로직
};

  // 로딩/에러 화면
  if (!wasm && !error) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <h2>Loading WASM Module...</h2>
        <p>Please wait while the WebAssembly module is loading.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>⚠️ Error Loading WASM</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Reload Page</button>
      </div>
    );
  }

  return (
    <div className="App">
      <h1>Minesweeper Simulator {gameConfig.useNDimensions ? "(N Dimension)" : "(2D)"}</h1>
      
      <div className="status">
        <div className="status-indicator ready">✅ WASM Loaded</div>
        <div className={`status-indicator ${simulator ? 'ready' : 'loading'}`}>
          {simulator ? '✅ Simulator Ready' : '⏳ Simulator Not Ready'}
        </div>
        <button 
          className="dimension-toggle"
          onClick={handleToggleNDimensions}
          title={gameConfig.useNDimensions ? "2D Mode" : "N Dimension Mode"}
        >
          {gameConfig.useNDimensions ? "⬅ 2D Mode" : "N Dimension Mode ➡"}
        </button>
        <button 
          className="advanced-toggle"
          onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
        >
          {showAdvancedSettings ? "▲ Hide Advanced Setting" : "▼ Open Advanced Setting"}
        </button>
      </div>
      
      <div className="config-section">
        <h3>Game Configuration</h3>
        
        <div className="mode-indicator">
        <span className={`mode-badge ${gameConfig.useNDimensions ? 'mode-nd' : 'mode-2d'}`}>
          {gameConfig.useNDimensions ? `${gameConfig.dimensionCount || 3}D Mode` : "🟦 2D Mode"}
        </span>
        </div>
        
        <div className="preset-section">
          <h4>Preset Selection</h4>
          <div className="preset-buttons">
            {currentPresets.map((preset: any) => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={`preset-btn ${selectedPreset === preset.id ? 'selected' : ''}`}
                title={gameConfig.useNDimensions ? 
                  `${preset.dimensions.length}D [${preset.dimensions.join('×')}], ${preset.mines} mines` :
                  `${preset.width}×${preset.height}, ${preset.mines} mines`
                }
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
        
        {showAdvancedSettings && (
          <div className="advanced-settings">
            <h4>Advanced Settings</h4>
            
            {gameConfig.useNDimensions ? (
              // N차원 고급 설정
              <div className="nd-advanced">
                <div className="dimension-control">
                  <label>Number of Dimensions: </label>
                  <div className="dimension-buttons">
                    {[2, 3, 4].map(dim => (
                      <button
                        key={dim}
                        className={`dim-btn ${gameConfig.dimensionCount === dim ? 'active' : ''}`}
                        onClick={() => handleDimensionCountChange(dim)}
                      >
                        {dim}D
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="dimension-sizes">
                  <label>Dimension Sizes:</label>
                  <div className="size-inputs">
                    {gameConfig.dimensions && gameConfig.dimensions.map((size, index) => (
                      <div key={index} className="size-input">
                        <label>D{index + 1}:</label>
                        <input
                          type="number"
                          min="2"
                          max="10"
                          value={size}
                          onChange={(e) => handleDimensionSizeChange(index, parseInt(e.target.value) || 2)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // 2D 고급 설정
              <div className="advanced-2d">
                <div className="config-row">
                  <div className="config-group">
                    <label htmlFor="width">Width</label>
                    <input 
                      id="width"
                      type="number" 
                      value={gameConfig.width}
                      onChange={(e) => handleConfigChange('width', parseInt(e.target.value) || 9)}
                      min="5"
                      max="30"
                    />
                  </div>
                  <div className="config-group">
                    <label htmlFor="height">Height</label>
                    <input 
                      id="height"
                      type="number" 
                      value={gameConfig.height}
                      onChange={(e) => handleConfigChange('height', parseInt(e.target.value) || 9)}
                      min="5"
                      max="30"
                    />
                  </div>
                </div>
              </div>
            )}
            
            <div className="mines-control">
              <label htmlFor="mines">Mines</label>
              <input 
                id="mines"
                type="number" 
                value={gameConfig.mines}
                onChange={(e) => handleConfigChange('mines', parseInt(e.target.value) || 10)}
                min="1"
                max={
                  gameConfig.useNDimensions && gameConfig.dimensions ?
                  gameConfig.dimensions.reduce((a, b) => a * b, 1) - 1 :
                  gameConfig.width * gameConfig.height - 1
                }
              />
              <span className="mines-hint">
                Max: {
                  gameConfig.useNDimensions && gameConfig.dimensions ?
                  gameConfig.dimensions.reduce((a, b) => a * b, 1) - 1 :
                  gameConfig.width * gameConfig.height - 1
                }
              </span>
            </div>
          </div>
        )}
        
        <div className="config-actions">
          <button 
            onClick={handleCreateNewBoard}
            disabled={!wasm || isRunning}
            className="create-board-btn"
          >
            {gameConfig.useNDimensions ? "Create N-Dimensional Board" : "🟦 Create 2D Board"}
          </button>
        </div>
      </div>
      
      <AlgorithmSelector
        selectedAlgorithm={selectedAlgorithm}
        onAlgorithmChange={handleAlgorithmChange}
        disabled={isRunning}
      />
      
      <div className="controls">
        <button onClick={handleStep} disabled={!simulator || isRunning}>
          Test Step
        </button>
        <button onClick={handleRunGame} disabled={!simulator || isRunning}>
          Test Full Game
        </button>
        <button onClick={handleRunBatch} disabled={!wasm || isRunning}>
          Test Batch (100 games)
        </button>
        <button onClick={handleCompareAlgorithms} disabled={!wasm || isRunning}>
          Compare Algorithms
        </button>
        <button onClick={handleReset} disabled={!simulator || isRunning}>
          Reset Current Game
        </button>
      </div>
      
      {/* N dimensional */}
      {renderBoard()}
      
      {/* 1. 알고리즘 비교 결과 섹션 */}
      {comparisonResults.length > 0 && (
        <div className="comparison-results">
          <h3>Algorithm Comparison Results</h3>
          <div className="section-header">
            <button 
              className="download-btn"
              onClick={() => downloadCSV(allDetailedRecords, 'algorithm_comparison_summary')}
            >
              Export Detailed Results (CSV)
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Wins</th>
                <th>Win Rate</th>
                <th>Avg Clicks (Wins)</th>
                <th>Avg Time (ms)</th>
                <th>Avg Guesses</th>
              </tr>
            </thead>
            <tbody>
              {comparisonResults.map((result, index) => {
                const isBest = result.win_rate === Math.max(...comparisonResults.map(r => r.win_rate));
                return (
                  <tr key={index} className={isBest ? 'best' : ''}>
                    <td>{result.algorithm}</td>
                    <td>{result.wins}/{result.total_games}</td>
                    <td>{result.win_rate.toFixed(1)}%</td>
                    <td>{result.avg_clicks_wins.toFixed(2)}</td>
                    <td>{result.avg_time_wins.toFixed(0)}ms</td>
                    <td>{result.avg_guesses_wins.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {batchResults.length > 0 && (
        <div className="batch-results">
          <h3>Batch Results ({batchResults.length} games)</h3>
          <div className="batch-summary">
            <div className="summary-stats">
              <div className="stat">
                <span className="stat-label">Total Games</span>
                <span className="stat-value">{batchResults.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Wins</span>
                <span className="stat-value success">
                  {batchResults.filter((r: any) => r.success).length}
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Win Rate</span>
                <span className="stat-value">
                  {((batchResults.filter((r: any) => r.success).length / batchResults.length) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Avg Clicks (Wins)</span>
                <span className="stat-value">
                  {batchResults.filter((r: any) => r.success).length > 0 
                    ? (batchResults.filter((r: any) => r.success)
                        .reduce((sum: number, r: any) => sum + (r.clicks || 0), 0) / 
                       batchResults.filter((r: any) => r.success).length).toFixed(2)
                    : '0.00'}
                </span>
              </div>
            </div>
          </div>
          <div className="batch-grid">
            {batchResults.slice(0, 20).map((result: any, index: number) => (
              <div key={index} className={`batch-result ${result.success ? 'success' : 'failure'}`}>
                <div className="game-header">
                  <strong>Game {index + 1}</strong>
                  <span className={`result-badge ${result.success ? 'win' : 'lose'}`}>
                    {result.success ? '✅ WON' : '❌ LOST'}
                  </span>
                </div>
                <div className="game-details">
                  <div>Clicks: {result.clicks || 0}</div>
                  <div>Mines: {result.mines || 0}</div>
                  <div>Size: {gameConfig.useNDimensions ? 
                    `[${result.dimensions?.join('×') || 'N/A'}]` : 
                    `${result.width || 0}×${result.height || 0}`
                  }</div>
                </div>
              </div>
            ))}
          </div>
          {batchResults.length > 20 && (
            <p className="batch-note">Showing first 20 of {batchResults.length} games</p>
          )}
        </div>
      )}
      
      <div className="logs">
        <h3>Logs (last 50):</h3>
        <div className="log-container">
          {logs.map((log, index) => (
            <div key={index} className="log-entry">{log}</div>
          ))}
        </div>
        <button 
          className="clear-logs" 
          onClick={() => setLogs([])}
          disabled={logs.length === 0}
        >
          Clear Logs
        </button>
      </div>
    </div>
  );
}

export default App;