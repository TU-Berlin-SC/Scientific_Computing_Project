// // Step, Full Game, Batch 실행 버튼들
// // components/ControlPanel.tsx
// interface Props {
//     onStep: () => void;
//     onRunFull: () => void;
//     onRunBatch: () => void;
//     onCompare: () => void;
//     isRunning: boolean;
//     hasSimulator: boolean;
//   }
  
//   const ControlPanel = ({ onStep, onRunFull, onRunBatch, onCompare, isRunning, hasSimulator }: Props) => (
//     <div className="controls">
//       <button onClick={onStep} disabled={!hasSimulator || isRunning}>Step</button>
//       <button onClick={onRunFull} disabled={!hasSimulator || isRunning}>Full Game</button>
//       <button onClick={onRunBatch} disabled={isRunning}>Batch (100)</button>
//       <button onClick={onCompare} disabled={isRunning}>Compare All</button>
//     </div>
//   );
  
// // 초기화
//   useEffect(() => {
//     const init = async () => {
//       const wasmModule = await loadWasm();
//       if (wasmModule) {
//         // 초기 보드 생성
//         const initSim = new wasmModule.Simulator(
//           [9, 9],
//           10,
//           selectedAlgorithm
//         );
//         setSimulator(initSim);
//         setBoardState(initSim.getState());
//         addLog('Initial board created');
//       }
//     };
//     init();
//   }, []);
// // 단계 실행
// const handleStep = () => {
//     if (!simulator) {
//       addLog('Simulator not ready');
//       return;
//     }
    
//     addLog('Running step...');
//     try {
//       const result = simulator.runStep();
//       setBoardState(result);
      
//       const revealed = result.cells.filter((cell: any) => cell.is_revealed).length;
//       const total = result.dimensions ? result.dimensions.reduce((a: number, b: number) => a * b, 1) : result.width * result.height;
      
//       addLog(`Step completed: Revealed ${revealed}/${total} cells`);
//       addLog(`Game status: ${result.game_over ? 'GAME OVER' : result.game_won ? 'WON!' : 'IN PROGRESS'}`);
//     } catch (err) {
//       addLog(`Step error: ${err}`);
//       console.error('Step error:', err);
//     }
//   };

//   // 전체 게임 실행
//   const handleRunGame = async () => {
//     if (!simulator) {
//       addLog('Simulator not ready');
//       return;
//     }
    
//     setIsRunning(true);
//     addLog('Running full game...');
    
//     try {
//       const result = simulator.runFullGame();
//       setBoardState(result);
      
//       const revealed = result.cells.filter((cell: any) => cell.is_revealed).length;
//       const total = result.dimensions ? result.dimensions.reduce((a: number, b: number) => a * b, 1) : result.width * result.height;
      
//       addLog(`Game completed: Revealed ${revealed}/${total} cells`);
//       addLog(`Game ${result.game_won ? 'WON' : 'LOST'} in ${result.total_clicks} clicks`);
//     } catch (err) {
//       addLog(`Game error: ${err}`);
//       console.error('Game error:', err);
//     } finally {
//       setIsRunning(false);
//     }
//   };

//   // 배치 실행
//   const handleRunBatch = async () => {
//     if (!wasm) {
//       addLog('WASM not ready');
//       return;
//     }
    
//     const batchSize = 100;
//     const algoInfo = AlgorithmInfo.find(a => a.value === selectedAlgorithm);
    
//     addLog(`Running batch of ${batchSize} games with ${algoInfo?.label}...`);
    
//     setIsRunning(true);
//     const results = [];
    
//     for (let i = 0; i < batchSize; i++) {
//       try {
//         let newSim;
        
//         if (gameConfig.useNDimensions && gameConfig.dimensions) {
//           // N차원 배치
//           newSim = new wasm.Simulator(
//             gameConfig.dimensions,
//             gameConfig.mines,
//             selectedAlgorithm
//           );
//         } else {
//           // 2D 배치
//           if (wasm.Simulator.new2D) {
//             newSim = wasm.Simulator.new2D(
//               gameConfig.width,
//               gameConfig.height,
//               gameConfig.mines,
//               selectedAlgorithm
//             );
//           } else {
//             newSim = new wasm.Simulator(
//               [gameConfig.width, gameConfig.height],
//               gameConfig.mines,
//               selectedAlgorithm
//             );
//           }
//         }
        
//         const finalState = newSim.runFullGame();
        
//         // 결과 처리
//         const processedState = finalState instanceof Map ? 
//           Object.fromEntries(finalState.entries()) : 
//           finalState;
        
//         const totalCells = gameConfig.useNDimensions && gameConfig.dimensions ?
//           gameConfig.dimensions.reduce((a, b) => a * b, 1) :
//           gameConfig.width * gameConfig.height;
        
//         results.push({
//           game: i + 1,
//           success: processedState.game_won || false,
//           clicks: processedState.total_clicks || 0,
//           steps: processedState.total_clicks || 0,
//           mines: processedState.mines || gameConfig.mines,
//           width: gameConfig.useNDimensions ? 'N/A' : gameConfig.width,
//           height: gameConfig.useNDimensions ? 'N/A' : gameConfig.height,
//           dimensions: gameConfig.dimensions || [gameConfig.width, gameConfig.height],
//           total_revealed: processedState.total_revealed || 0,
//           total_cells: totalCells,
//           game_over: processedState.game_over || false,
//           algorithm: algoInfo?.label || selectedAlgorithm.toString()
//         });
        
//         if ((i + 1) % 25 === 0) {
//           addLog(`Progress: ${i + 1}/${batchSize} games completed`);
//         }
//       } catch (err) {
//         console.error(`Game ${i + 1} error:`, err);
//         results.push({
//           game: i + 1,
//           success: false,
//           clicks: 0,
//           steps: 0,
//           mines: gameConfig.mines,
//           width: gameConfig.useNDimensions ? 'N/A' : gameConfig.width,
//           height: gameConfig.useNDimensions ? 'N/A' : gameConfig.height,
//           dimensions: gameConfig.dimensions || [gameConfig.width, gameConfig.height],
//           total_revealed: 0,
//           total_cells: gameConfig.useNDimensions && gameConfig.dimensions ?
//             gameConfig.dimensions.reduce((a, b) => a * b, 1) :
//             gameConfig.width * gameConfig.height,
//           game_over: true,
//           algorithm: 'Error'
//         });
//       }
//     }
    
//     setIsRunning(false);
    
//     const wins = results.filter(r => r.success).length;
//     const winRate = (wins / batchSize * 100).toFixed(1);
//     const avgClicks = wins > 0 
//       ? (results.filter(r => r.success).reduce((sum, r) => sum + r.clicks, 0) / wins).toFixed(2)
//       : '0.00';
    
//     addLog(`✅ Batch completed: ${wins}/${batchSize} games won (${winRate}%)`);
//     addLog(`📊 Average clicks for wins: ${avgClicks}`);
    
//     setBatchResults(results);
//   };

//   // run single game and save
// const runSingleGame = (algoValue: any): any => {
//     let sim;
//     if (gameConfig.useNDimensions && gameConfig.dimensions) {
//       sim = new wasm.Simulator(
//         gameConfig.dimensions,
//         gameConfig.mines,
//         algoValue
//       );
//     } else {
//       sim = wasm.Simulator.new2D
//         ? wasm.Simulator.new2D(
//             gameConfig.width,
//             gameConfig.height,
//             gameConfig.mines,
//             algoValue
//           )
//         : new wasm.Simulator(
//             [gameConfig.width, gameConfig.height],
//             gameConfig.mines,
//             algoValue
//           );
//     }

//     const finalState = sim.runFullGame();

//     const processedState =
//       finalState instanceof Map ? Object.fromEntries(finalState.entries()) : finalState;

//     return processedState;
//   };

//   // 게임 여러 번 실행 후 모든 게임 기록 반환
//   const runGamesForAlgorithm = (algo: any, testGames: number) => {
//     const gameRecords = [];
  
//     for (let i = 0; i < testGames; i++) {
//       const state = runSingleGame(algo.value);
  
//       gameRecords.push({
//         algorithm: algo.label,
//         mines: gameConfig.mines,
//         dims:
//           state?.dims ||
//           (gameConfig.useNDimensions
//             ? gameConfig.dimensions
//             : [gameConfig.width, gameConfig.height]),
//         win: state.game_won ? "TRUE" : "FALSE",
//         clicks: state.total_clicks || 0,
//         time_ms: state.time_ms || 0,
//         guesses: state.total_guesses || 0,
//         completion:
//           state.completion ??
//           (state.total_revealed != null && state.total_cells != null
//             ? ((state.total_revealed / (state.total_cells - gameConfig.mines)) * 100).toFixed(2)
//             : 0),
//       });
//     }
  
//     return gameRecords; // 모든 게임 기록 반환 for csv files
//   };

// <div className="controls">
//     <button onClick={handleStep} disabled={!simulator || isRunning}>
//         Test Step
//     </button>
//     <button onClick={handleRunGame} disabled={!simulator || isRunning}>
//         Test Full Game
//     </button>
//     <button onClick={handleRunBatch} disabled={!wasm || isRunning}>
//         Test Batch (100 games)
//     </button>
//     <button onClick={handleCompareAlgorithms} disabled={!wasm || isRunning}>
//         Compare Algorithms
//     </button>
//     <button onClick={handleReset} disabled={!simulator || isRunning}>
//         Reset Current Game
//     </button>
// </div>
// components/ControlPanel.tsx
import React from 'react';
import '../../styles/ControlPanel.css';

interface ControlPanelProps {
  isRunning: boolean;
  hasSimulator: boolean;
  onStep: () => void;
  onRunFull: () => void;
  onRunBatch: () => void;
  onCompare: () => void;
  onReset: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  isRunning, 
  hasSimulator, 
  onStep, 
  onRunFull, 
  onRunBatch, 
  onCompare, 
  onReset 
}) => {
  return (
    <div className="controls">
      <div className="control-buttons">
        {/* Step 버튼: simulator가 있을 때만 활성화 */}
        <button onClick={onStep} disabled={!hasSimulator || isRunning}>
          Test Step
        </button>

        {/* Full Game 버튼: simulator가 있을 때만 활성화 */}
        <button onClick={onRunFull} disabled={!hasSimulator || isRunning}>
          Test Full Game
        </button>

        {/* Batch 버튼: 시뮬레이터 생성 전이라도 WASM만 로드되면 실행 가능 */}
        <button onClick={onRunBatch} disabled={isRunning}>
          Test Batch (100 games)
        </button>

        {/* Compare 버튼: 모든 알고리즘 성능 비교 */}
        <button onClick={onCompare} disabled={isRunning} className="compare-btn">
          Compare Algorithms
        </button>

        {/* Reset 버튼 */}
        <button onClick={onReset} disabled={!hasSimulator || isRunning} className="reset-btn">
          Reset Current Game
        </button>
      </div>

      {/* 로딩 표시 (선택 사항) */}
      {isRunning && <div className="loading-spinner">Simulating... Please wait.</div>}
    </div>
  );
};

export default ControlPanel;