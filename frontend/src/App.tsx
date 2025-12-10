// // src/App.tsx
// import React, { useEffect, useState } from 'react';
// import './App.css';
// import AlgorithmSelector from './components/AlgorithmSelector';
// import { AlgorithmType, AlgorithmInfo } from './types/simulation';

// // TypeScript 인터페이스 정의 - WASM 타입 정의 파일 대신 여기에 정의
// interface WasmModule {
//   default?: () => Promise<void>;
//   hello_world: () => string;
//   test_add: (a: number, b: number) => number;
//   create_simple_board: () => any;
//   Simulator: new (width: number, height: number, mines: number, algorithm: number) => Simulator;
//   WasmAlgorithmType: {
//     Greedy: number;
//     ExactSolver: number;
//   };
//   compare_algorithms: (width: number, height: number, mines: number, games: number) => any;
// }

// interface Simulator {
//   getState: () => any;
//   runStep: () => any;
//   runFullGame: () => any;
//   runBatch: (games: number) => any;
//   reset: () => void;
//   setAlgorithm: (algorithm: number) => void;
//   getAlgorithm: () => string;
// }

// interface GameConfig {
//   width: number;
//   height: number;
//   mines: number;
// }

// interface GameStats {
//   algorithm: string;
//   total_games: number;
//   wins: number;
//   win_rate: number;
//   avg_steps_wins: number;
//   avg_clicks_wins: number;
// }

// function App() {
//   const [wasm, setWasm] = useState<WasmModule | null>(null);
//   const [simulator, setSimulator] = useState<Simulator | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [logs, setLogs] = useState<string[]>([]);
//   const [boardState, setBoardState] = useState<any>(null);
//   const [selectedAlgorithm, setSelectedAlgorithm] = useState<AlgorithmType>(AlgorithmType.Greedy);
//   const [isRunning, setIsRunning] = useState<boolean>(false);
//   const [batchResults, setBatchResults] = useState<any[]>([]);
//   const [gameConfig, setGameConfig] = useState<GameConfig>({
//     width: 9,
//     height: 9,
//     mines: 10
//   });
//   const [comparisonResults, setComparisonResults] = useState<GameStats[]>([]);

//   const gamePresets = [
//     { name: "Map size : 9x9", width: 9, height: 9, mines: 10 },
//     { name: "Map size : 16x16", width: 16, height: 16, mines: 40 },
//     { name: "Map size : 16x30", width: 30, height: 16, mines: 99 },
//   ];

//   const addLog = (msg: string) => {
//     console.log(msg);
//     setLogs(prev => [...prev.slice(-50), `${new Date().toLocaleTimeString()}: ${msg}`]);
//   };

//   const loadWasm = async () => {
//     try {
//       addLog('Loading WASM...');
      
//       const wasmModule = await import('./wasm_pkg/engine') as any as WasmModule;
//       addLog('WASM module loaded');
      
//       if (wasmModule.default) {
//         await wasmModule.default();
//         addLog('WASM initialized');
//       }
      
//       setWasm(wasmModule);
//       return wasmModule;
      
//     } catch (err) {
//       const errorMsg = err instanceof Error ? err.message : String(err);
//       addLog(`ERROR loading WASM: ${errorMsg}`);
//       setError(errorMsg);
//       console.error('WASM loading error:', err);
//       return null;
//     }
//   };

//   const handleCreateNewBoard = () => {
//     if (!wasm) {
//       addLog('WASM not ready');
//       return;
//     }
    
//     addLog(`Creating new ${gameConfig.width}x${gameConfig.height} board with ${gameConfig.mines} mines...`);
    
//     try {
//       const newSim = new wasm.Simulator(
//         gameConfig.width,
//         gameConfig.height,
//         gameConfig.mines,
//         selectedAlgorithm
//       );
      
//       setSimulator(newSim);
      
//       const initialState = newSim.getState();
//       setBoardState(initialState);
      
//       addLog(`✅ New board created!`);
//       addLog(`Board size: ${gameConfig.width}x${gameConfig.height}, Mines: ${gameConfig.mines}`);
      
//       // 배치 결과 초기화
//       setBatchResults([]);
//       setComparisonResults([]);
      
//     } catch (err) {
//       addLog(`❌ Failed to create new board: ${err}`);
//       console.error('Create board error:', err);
//     }
//   };

//   const createSimulator = (wasmModule: WasmModule, algoType: AlgorithmType = selectedAlgorithm) => {
//     try {
//       const algo = AlgorithmInfo.find(a => a.value === algoType);
//       if (!algo) {
//         addLog(`Algorithm ${algoType} not found`);
//         return null;
//       }

//       addLog(`Creating ${algo.label} simulator (${gameConfig.width}x${gameConfig.height} with ${gameConfig.mines} mines)...`);
      
//       const sim = new wasmModule.Simulator(
//         gameConfig.width, 
//         gameConfig.height, 
//         gameConfig.mines,
//         algoType  // 숫자 타입 사용
//       );
//       addLog(`${algo.label} simulator created`);
      
//       const initialState = sim.getState();
//       setBoardState(initialState);
//       addLog('Initial board state loaded');
      
//       setSimulator(sim);
//       return sim;
//     } catch (err) {
//       const errorMsg = err instanceof Error ? err.message : String(err);
//       addLog(`ERROR creating simulator: ${errorMsg}`);
//       console.error('Simulator error:', err);
//       return null;
//     }
//   };

//   const handleAlgorithmChange = (algoType: AlgorithmType) => {
//     setSelectedAlgorithm(algoType);
//     if (wasm) {
//       createSimulator(wasm, algoType);
//     }
//   };

//   // 설정 변경 시에도 새 보드 생성
//   const handleConfigChange = (field: keyof GameConfig, value: number) => {
//     const newConfig = {
//       ...gameConfig,
//       [field]: value
//     };
//     setGameConfig(newConfig);
    
//     // 마이너 수 제한 (전체 셀 수보다 적게)
//     if (field === 'mines' && value >= newConfig.width * newConfig.height) {
//       addLog(`Warning: Mines cannot exceed total cells - 1`);
//       return;
//     }
//   };

//   // 프리셋 선택 시 자동으로 새 보드 생성
//   const handlePresetSelect = (preset: typeof gamePresets[0]) => {
//     setGameConfig({
//       width: preset.width,
//       height: preset.height,
//       mines: preset.mines
//     });
//     addLog(`Selected preset: ${preset.name}`);
    
//     // 즉시 새 보드 생성
//     if (wasm) {
//       handleCreateNewBoard();
//     }
// };

//   useEffect(() => {
//     const init = async () => {
//       const wasmModule = await loadWasm();
//       if (wasmModule) {
//         createSimulator(wasmModule);
//       }
//     };
//     init();
//   }, []);

//   const handleStep = () => {
//     if (!simulator) {
//       addLog('Simulator not ready');
//       return;
//     }
    
//     addLog('Running step...');
//     try {
//       const result = simulator.runStep();
//       setBoardState(result);
      
//       const revealed = result.cells.filter((cell: any) => cell.is_revealed).length;
//       const total = result.width * result.height;
      
//       addLog(`Step completed: Revealed ${revealed}/${total} cells`);
//       addLog(`Game status: ${result.game_over ? 'GAME OVER' : result.game_won ? 'WON!' : 'IN PROGRESS'}`);
//     } catch (err) {
//       addLog(`Step error: ${err}`);
//       console.error('Step error:', err);
//     }
//   };

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
//       const total = result.width * result.height;
      
//       addLog(`Game completed: Revealed ${revealed}/${total} cells`);
//       addLog(`Game ${result.game_won ? 'WON' : 'LOST'} in ${result.total_clicks} clicks`);
//     } catch (err) {
//       addLog(`Game error: ${err}`);
//       console.error('Game error:', err);
//     } finally {
//       setIsRunning(false);
//     }
//   };

//   const handleRunBatch = async () => {  // 이름은 그대로 유지하되 내용을 Manual로
//     if (!wasm) {
//       addLog('WASM not ready');
//       return;
//     }
    
//     const batchSize = 100;
//     const algoInfo = AlgorithmInfo.find(a => a.value === selectedAlgorithm);
//     addLog(`Running batch of ${batchSize} ${gameConfig.width}x${gameConfig.height} games with ${algoInfo?.label} (${gameConfig.mines} mines)...`);
    
//     setIsRunning(true);
//     const results = [];
    
//     for (let i = 0; i < batchSize; i++) {
//       try {
//         // 매번 새로운 시뮬레이터 생성 (현재 설정 반영)
//         const newSim = new wasm.Simulator(
//           gameConfig.width, 
//           gameConfig.height, 
//           gameConfig.mines,
//           selectedAlgorithm
//         );
        
//         // 게임 실행
//         const finalState = newSim.runFullGame();
        
//         // Map 객체 처리
//         let processedState;
//         if (finalState instanceof Map || (finalState && finalState.entries)) {
//           processedState = {};
//           for (const [key, value] of finalState.entries()) {
//             processedState[key] = value;
//           }
//         } else if (typeof finalState === 'object' && finalState !== null) {
//           processedState = { ...finalState };
//         } else {
//           processedState = {};
//         }
        
//         // 결과 수집
//         results.push({
//           game: i + 1,
//           success: processedState.game_won || false,
//           clicks: processedState.total_clicks || 0,
//           steps: processedState.total_clicks || 0,
//           mines: processedState.mines || gameConfig.mines,
//           width: processedState.width || gameConfig.width,
//           height: processedState.height || gameConfig.height,
//           total_revealed: processedState.total_revealed || 0,
//           total_cells: (processedState.width || gameConfig.width) * (processedState.height || gameConfig.height),
//           game_over: processedState.game_over || false,
//           algorithm: algoInfo?.label || selectedAlgorithm.toString()
//         });
        
//         if ((i + 1) % 25 === 0) {  // 25게임마다 로그
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
//           width: gameConfig.width,
//           height: gameConfig.height,
//           total_revealed: 0,
//           total_cells: gameConfig.width * gameConfig.height,
//           game_over: true,
//           algorithm: 'Error'
//         });
//       }
//     }
    
//     setIsRunning(false);
    
//     // 통계 계산
//     const wins = results.filter(r => r.success).length;
//     const winRate = (wins / batchSize * 100).toFixed(1);
//     const avgClicks = wins > 0 
//       ? (results.filter(r => r.success).reduce((sum, r) => sum + r.clicks, 0) / wins).toFixed(2)
//       : '0.00';
    
//     addLog(`✅ Batch completed: ${wins}/${batchSize} games won (${winRate}%)`);
//     addLog(`📊 Average clicks for wins: ${avgClicks}`);
    
//     setBatchResults(results);
//   };

//   // 2. Compare Algorithms도 같은 문제가 있을 수 있으니 수정
//   const handleCompareAlgorithms = async () => {
//     if (!wasm) {
//       addLog('WASM not ready');
//       return;
//     }
    
//     addLog(`Comparing algorithms on ${gameConfig.width}x${gameConfig.height} with ${gameConfig.mines} mines...`);
//     setIsRunning(true);
    
//     try {
//       // WASM의 compare_algorithms는 현재 설정을 사용하지 않을 수 있음
//       // 대신 수동으로 비교 구현
//       const allResults = [];
      
//       for (const algo of AlgorithmInfo) {
//         if (!algo.implemented) continue;
        
//         addLog(`Testing ${algo.label}...`);
//         let wins = 0;
//         let totalSteps = 0;
//         let totalClicks = 0;
//         const testGames = 50;
        
//         for (let i = 0; i < testGames; i++) {
//           const sim = new wasm.Simulator(
//             gameConfig.width,
//             gameConfig.height,
//             gameConfig.mines,
//             algo.value
//           );
          
//           const finalState = sim.runFullGame();
//           let processedState;
//           if (finalState instanceof Map || (finalState && finalState.entries)) {
//             processedState = {};
//             for (const [key, value] of finalState.entries()) {
//               processedState[key] = value;
//             }
//           } else {
//             processedState = finalState;
//           }
          
//           if (processedState.game_won) {
//             wins++;
//             totalSteps += processedState.total_clicks || 0;
//             totalClicks += processedState.total_clicks || 0;
//           }
//         }
        
//         allResults.push({
//           algorithm: algo.label,
//           total_games: testGames,
//           wins: wins,
//           win_rate: (wins / testGames * 100),
//           avg_steps_wins: wins > 0 ? totalSteps / wins : 0,
//           avg_clicks_wins: wins > 0 ? totalClicks / wins : 0,
//         });
        
//         addLog(`${algo.label}: ${wins}/${testGames} wins (${(wins / testGames * 100).toFixed(1)}%)`);
//       }
      
//       setComparisonResults(allResults);
      
//       // 최고 성능 알고리즘
//       const best = allResults.reduce((prev, current) => 
//         prev.win_rate > current.win_rate ? prev : current
//       );
      
//       addLog(`🏆 Best algorithm: ${best.algorithm} (${best.win_rate.toFixed(1)}% win rate)`);
//     } catch (err) {
//       addLog(`Comparison error: ${err}`);
//       console.error('Comparison error:', err);
//     } finally {
//       setIsRunning(false);
//     }
//   };
//   // handleReset
//   const handleReset = () => {
//     if (!simulator) {
//       addLog('Simulator not ready');
//       return;
//     }
    
//     addLog('Resetting simulator...');
//     try {
//       simulator.reset();
//       const newState = simulator.getState();
//       setBoardState(newState);
//       addLog('Simulator reset successfully');
//     } catch (err) {
//       addLog(`Reset error: ${err}`);
//     }
//   };

//   const handleReloadWasm = async () => {
//     addLog('Reloading WASM...');
//     const wasmModule = await loadWasm();
//     if (wasmModule) {
//       createSimulator(wasmModule);
//     }
//   };

//   // 보드 렌더링 함수
//   const renderBoard = () => {
//     if (!boardState) return null;
    
//     const cellSize = Math.min(500 / boardState.width, 500 / boardState.height, 30);
    
//     return (
//       <div className="board-preview">
//         <h3>Current Board ({boardState.width}x{boardState.height}, {boardState.mines} mines)</h3>
//         <div className="board-grid" style={{ 
//           gridTemplateColumns: `repeat(${boardState.width}, ${cellSize}px)`,
//           gridTemplateRows: `repeat(${boardState.height}, ${cellSize}px)`
//         }}>
//           {boardState.cells.map((cell: any, index: number) => (
//             <div 
//               key={index}
//               className={`cell ${cell.is_revealed ? 'revealed' : 'hidden'} 
//                          ${cell.is_mine && cell.is_revealed ? 'mine' : ''} 
//                          ${cell.is_flagged ? 'flagged' : ''}`}
//               title={`(${cell.x},${cell.y}) - Mines nearby: ${cell.adjacent_mines}`}
//             >
//               {cell.is_flagged ? '🚩' : 
//                cell.is_revealed && cell.is_mine ? '💣' :
//                cell.is_revealed && cell.adjacent_mines > 0 ? cell.adjacent_mines : ''}
//             </div>
//           ))}
//         </div>
//         <div className="board-info">
//           <p>Revealed: {boardState.cells.filter((c: any) => c.is_revealed).length} / {boardState.width * boardState.height}</p>
//           <p>Flags: {boardState.cells.filter((c: any) => c.is_flagged).length}</p>
//           <p>Total clicks: {boardState.total_clicks}</p>
//           <p>Status: {boardState.game_over ? '💀 GAME OVER' : boardState.game_won ? '🎉 WON!' : '▶️ Playing'}</p>
//           <p>Algorithm: {AlgorithmInfo.find(a => a.value === selectedAlgorithm)?.label || selectedAlgorithm}</p>
//         </div>
//       </div>
//     );
//   };

//   // 로딩 화면
//   if (!wasm && !error) {
//     return (
//       <div className="loading-screen">
//         <div className="spinner"></div>
//         <h2>Loading WASM Module...</h2>
//         <p>Please wait while the WebAssembly module is loading.</p>
//       </div>
//     );
//   }

//   // 에러 화면
//   if (error) {
//     return (
//       <div className="error-screen">
//         <h2>⚠️ Error Loading WASM</h2>
//         <p>{error}</p>
//         <button onClick={handleReloadWasm}>Retry</button>
//         <div className="error-tips">
//           <h4>Troubleshooting Tips:</h4>
//           <ul>
//             <li>Make sure WASM is built: run <code>wasm-pack build</code></li>
//             <li>Check browser console for detailed errors</li>
//             <li>Try reloading the page</li>
//           </ul>
//         </div>
//       </div>
//     );
//   }

//   const handleApplyConfig = () => {
//     if (!wasm) return;
    
//     // 마이너 수 유효성 검사
//     const maxMines = gameConfig.width * gameConfig.height - 1;
//     if (gameConfig.mines > maxMines) {
//       addLog(`❌ Error: Mines (${gameConfig.mines}) cannot exceed total cells - 1 (${maxMines})`);
//       setGameConfig(prev => ({ ...prev, mines: maxMines }));
//       return;
//     }
    
//     handleCreateNewBoard();
//   };
  

//   return (
//     <div className="App">
//       <h1>Minesweeper Simulator</h1>
//       {/* This part could be moved out. i added cuz i first had issue with wasm that connect rust and react */}
//       <div className="status">
//         <div className={`status-indicator ${wasm ? 'ready' : 'loading'}`}>
//           {wasm ? '✅ WASM Loaded' : '⏳ Loading WASM...'}
//         </div>
//         <div className={`status-indicator ${simulator ? 'ready' : 'loading'}`}>
//           {simulator ? '✅ Simulator Ready' : '⏳ Simulator Not Ready'}
//         </div>
//         {error && (
//           <div className="status-indicator error">
//             ❌ Error: {error}
//           </div>
//         )}
//       </div>
      

//       <div className="config-section">
//         <h3>Game Configuration</h3>
//         <div className="preset-buttons">
//           {gamePresets.map((preset) => (
//             <button
//               key={preset.name}
//               onClick={() => handlePresetSelect(preset)}
//               className={gameConfig.width === preset.width ? 'active' : ''}
//             >
//               {preset.name}
//             </button>
//           ))}
//         </div>
//         <div className="config-inputs">
//           <div>
//             <label>Width: </label>
//             <input 
//               type="number" 
//               value={gameConfig.width}
//               onChange={(e) => handleConfigChange('width', parseInt(e.target.value) || 9)}
//               min="5"
//               max="30"
//             />
//           </div>
//           <div>
//             <label>Height: </label>
//             <input 
//               type="number" 
//               value={gameConfig.height}
//               onChange={(e) => handleConfigChange('height', parseInt(e.target.value) || 9)}
//               min="5"
//               max="30"
//             />
//           </div>
//           <div>
//             <label>Mines: </label>
//             <input 
//               type="number" 
//               value={gameConfig.mines}
//               onChange={(e) => handleConfigChange('mines', parseInt(e.target.value) || 10)}
//               min="1"
//               max={gameConfig.width * gameConfig.height - 1}
//             />
//           </div>
//         </div>
//         <div className="config-actions">
//           <button 
//             onClick={handleApplyConfig}
//             disabled={!wasm || isRunning}
//             className="apply-button"
//           >
//             🎯 Apply & Create New Board
//           </button>
//         </div>
//       </div>
      
//       <AlgorithmSelector
//         selectedAlgorithm={selectedAlgorithm}
//         onAlgorithmChange={handleAlgorithmChange}
//         disabled={isRunning}
//       />
      
//       <div className="controls">
//         <button onClick={handleStep} disabled={!simulator || isRunning}>
//           Test Step
//         </button>
//         <button onClick={handleRunGame} disabled={!simulator || isRunning}>
//           Test Full Game
//         </button>
//         <button onClick={handleRunBatch} disabled={!wasm || isRunning}>
//           Test Batch (100 games)
//         </button>
//         <button onClick={handleCompareAlgorithms} disabled={!wasm || isRunning}>
//           Compare Algorithms
//         </button>
//         <button onClick={handleReset} disabled={!simulator || isRunning}>
//           Reset Current Game
//         </button>
//         <button onClick={handleCreateNewBoard} disabled={!wasm || isRunning}>
//           🆕 Create New Board
//         </button>
//       </div>

      
//       {renderBoard()}
      
//       {comparisonResults.length > 0 && (
//         <div className="comparison-results">
//           <h3>Algorithm Comparison Results</h3>
//           <table>
//             <thead>
//               <tr>
//                 <th>Algorithm</th>
//                 <th>Wins</th>
//                 <th>Win Rate</th>
//                 <th>Avg Steps (Wins)</th>
//                 <th>Avg Clicks (Wins)</th>
//               </tr>
//             </thead>
//             <tbody>
//               {comparisonResults.map((result, index) => (
//                 <tr key={index} className={result.win_rate === Math.max(...comparisonResults.map(r => r.win_rate)) ? 'best' : ''}>
//                   <td>{result.algorithm}</td>
//                   <td>{result.wins}/{result.total_games}</td>
//                   <td>{result.win_rate.toFixed(1)}%</td>
//                   <td>{result.avg_steps_wins.toFixed(2)}</td>
//                   <td>{result.avg_clicks_wins.toFixed(2)}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
      
//       {batchResults.length > 0 && (
//         <div className="batch-results">
//           <h3>Batch Results ({batchResults.length} games)</h3>
//           <div className="batch-summary">
//             <div className="summary-stats">
//               <div className="stat">
//                 <span className="stat-label">Total Games</span>
//                 <span className="stat-value">{batchResults.length}</span>
//               </div>
//               <div className="stat">
//                 <span className="stat-label">Wins</span>
//                 <span className="stat-value success">
//                   {batchResults.filter((r: any) => r.success).length}
//                 </span>
//               </div>
//               <div className="stat">
//                 <span className="stat-label">Win Rate</span>
//                 <span className="stat-value">
//                   {((batchResults.filter((r: any) => r.success).length / batchResults.length) * 100).toFixed(1)}%
//                 </span>
//               </div>
//               <div className="stat">
//                 <span className="stat-label">Avg Clicks (Wins)</span>
//                 <span className="stat-value">
//                   {batchResults.filter((r: any) => r.success).length > 0 
//                     ? (batchResults.filter((r: any) => r.success)
//                         .reduce((sum: number, r: any) => sum + (r.clicks || 0), 0) / 
//                        batchResults.filter((r: any) => r.success).length).toFixed(2)
//                     : '0.00'}
//                 </span>
//               </div>
//             </div>
//           </div>
//           <div className="batch-grid">
//             {batchResults.map((result: any, index: number) => (
//               <div key={index} className={`batch-result ${result.success ? 'success' : 'failure'}`}>
//                 <div className="game-header">
//                   <strong>Game {index + 1}</strong>
//                   <span className={`result-badge ${result.success ? 'win' : 'lose'}`}>
//                     {result.success ? '✅ WON' : '❌ LOST'}
//                   </span>
//                 </div>
//                 <div className="game-details">
//                   <div>Clicks: {result.clicks || 0}</div>
//                   <div>Steps: {result.steps || 0}</div>
//                   <div>Mines: {result.mines || 0}</div>
//                   <div>Size: {result.width || 0}x{result.height || 0}</div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       )}
      
//       <div className="logs">
//         <h3>Logs (last 50):</h3>
//         <div className="log-container">
//           {logs.map((log, index) => (
//             <div key={index} className="log-entry">
//               {log}
//             </div>
//           ))}
//         </div>
//         <button 
//           className="clear-logs" 
//           onClick={() => setLogs([])}
//           disabled={logs.length === 0}
//         >
//           Clear Logs
//         </button>
//       </div>
//     </div>
//   );
// }

// export default App;
// src/App.tsx
import React, { useEffect, useState } from 'react';
import './App.css';
import AlgorithmSelector from './components/AlgorithmSelector';
import { AlgorithmType, AlgorithmInfo } from './types/simulation';

// TypeScript 인터페이스 정의
interface WasmModule {
  default?: () => Promise<void>;
  hello_world: () => string;
  test_add: (a: number, b: number) => number;
  create_simple_board: () => any;
  Simulator: new (width: number, height: number, mines: number, algorithm: number) => Simulator;
  WasmAlgorithmType: {
    Greedy: number;
    ExactSolver: number;
  };
  compare_algorithms: (width: number, height: number, mines: number, games: number) => any;
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
  width: number;
  height: number;
  mines: number;
}

interface GameStats {
  algorithm: string;
  total_games: number;
  wins: number;
  win_rate: number;
  avg_steps_wins: number;
  avg_clicks_wins: number;
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
    mines: 10
  });
  const [comparisonResults, setComparisonResults] = useState<GameStats[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("9x9");

  const gamePresets = [
    { name: "9x9", width: 9, height: 9, mines: 10 },
    { name: "16x16", width: 16, height: 16, mines: 40 },
    { name: "16x30", width: 30, height: 16, mines: 99 },
  ];

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
    if (!wasm) {
      addLog('WASM not ready');
      return;
    }
    
    const maxMines = gameConfig.width * gameConfig.height - 1;
    if (gameConfig.mines > maxMines) {
      addLog(`❌ Error: Mines (${gameConfig.mines}) cannot exceed total cells - 1 (${maxMines})`);
      setGameConfig(prev => ({ ...prev, mines: maxMines }));
      return;
    }
    
    addLog(`Creating new ${gameConfig.width}x${gameConfig.height} board with ${gameConfig.mines} mines...`);
    
    try {
      const newSim = new wasm.Simulator(
        gameConfig.width,
        gameConfig.height,
        gameConfig.mines,
        selectedAlgorithm
      );
      
      setSimulator(newSim);
      const initialState = newSim.getState();
      setBoardState(initialState);
      
      addLog(`✅ New board created!`);
      addLog(`Board size: ${gameConfig.width}x${gameConfig.height}, Mines: ${gameConfig.mines}`);
      
      // 결과 초기화
      setBatchResults([]);
      setComparisonResults([]);
      
    } catch (err) {
      addLog(`❌ Failed to create new board: ${err}`);
      console.error('Create board error:', err);
    }
  };

  // 알고리즘 변경
  const handleAlgorithmChange = (algoType: AlgorithmType) => {
    setSelectedAlgorithm(algoType);
    addLog(`Algorithm changed to: ${AlgorithmInfo.find(a => a.value === algoType)?.label}`);
    
    if (wasm) {
      const newSim = new wasm.Simulator(
        gameConfig.width,
        gameConfig.height,
        gameConfig.mines,
        algoType
      );
      setSimulator(newSim);
      setBoardState(newSim.getState());
    }
  };

  // 설정 변경
  const handleConfigChange = (field: keyof GameConfig, value: number) => {
    setGameConfig(prev => ({ ...prev, [field]: value }));
  };

  // 프리셋 선택
  const handlePresetSelect = (preset: typeof gamePresets[0]) => {
    setSelectedPreset(preset.name);
    setGameConfig({
      width: preset.width,
      height: preset.height,
      mines: preset.mines
    });
    addLog(`Selected preset: ${preset.name} (${preset.width}x${preset.height}, ${preset.mines} mines)`);
  };

  // 초기화
  useEffect(() => {
    const init = async () => {
      const wasmModule = await loadWasm();
      if (wasmModule) {
        const sim = new wasmModule.Simulator(
          gameConfig.width,
          gameConfig.height,
          gameConfig.mines,
          selectedAlgorithm
        );
        setSimulator(sim);
        setBoardState(sim.getState());
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
      const total = result.width * result.height;
      
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
      const total = result.width * result.height;
      
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
    addLog(`Running batch of ${batchSize} ${gameConfig.width}x${gameConfig.height} games with ${algoInfo?.label} (${gameConfig.mines} mines)...`);
    
    setIsRunning(true);
    const results = [];
    
    for (let i = 0; i < batchSize; i++) {
      try {
        const newSim = new wasm.Simulator(
          gameConfig.width, 
          gameConfig.height, 
          gameConfig.mines,
          selectedAlgorithm
        );
        
        const finalState = newSim.runFullGame();
        
        // Map 객체 처리
        let processedState;
        if (finalState instanceof Map || (finalState && finalState.entries)) {
          processedState = {};
          for (const [key, value] of finalState.entries()) {
            processedState[key] = value;
          }
        } else if (typeof finalState === 'object' && finalState !== null) {
          processedState = { ...finalState };
        } else {
          processedState = {};
        }
        
        results.push({
          game: i + 1,
          success: processedState.game_won || false,
          clicks: processedState.total_clicks || 0,
          steps: processedState.total_clicks || 0,
          mines: processedState.mines || gameConfig.mines,
          width: processedState.width || gameConfig.width,
          height: processedState.height || gameConfig.height,
          total_revealed: processedState.total_revealed || 0,
          total_cells: (processedState.width || gameConfig.width) * (processedState.height || gameConfig.height),
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
          width: gameConfig.width,
          height: gameConfig.height,
          total_revealed: 0,
          total_cells: gameConfig.width * gameConfig.height,
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

  // 알고리즘 비교
  const handleCompareAlgorithms = async () => {
    if (!wasm) {
      addLog('WASM not ready');
      return;
    }
    
    addLog(`Comparing algorithms on ${gameConfig.width}x${gameConfig.height} with ${gameConfig.mines} mines...`);
    setIsRunning(true);
    
    try {
      const allResults = [];
      const testGames = 50;
      
      for (const algo of AlgorithmInfo) {
        if (!algo.implemented) continue;
        
        addLog(`Testing ${algo.label}...`);
        let wins = 0;
        let totalSteps = 0;
        let totalClicks = 0;
        
        for (let i = 0; i < testGames; i++) {
          const sim = new wasm.Simulator(
            gameConfig.width,
            gameConfig.height,
            gameConfig.mines,
            algo.value
          );
          
          const finalState = sim.runFullGame();
          let processedState;
          if (finalState instanceof Map || (finalState && finalState.entries)) {
            processedState = {};
            for (const [key, value] of finalState.entries()) {
              processedState[key] = value;
            }
          } else {
            processedState = finalState;
          }
          
          if (processedState.game_won) {
            wins++;
            totalSteps += processedState.total_clicks || 0;
            totalClicks += processedState.total_clicks || 0;
          }
        }
        
        allResults.push({
          algorithm: algo.label,
          total_games: testGames,
          wins: wins,
          win_rate: (wins / testGames * 100),
          avg_steps_wins: wins > 0 ? totalSteps / wins : 0,
          avg_clicks_wins: wins > 0 ? totalClicks / wins : 0,
        });
        
        addLog(`${algo.label}: ${wins}/${testGames} wins (${(wins / testGames * 100).toFixed(1)}%)`);
      }
      
      setComparisonResults(allResults);
      
      const best = allResults.reduce((prev, current) => 
        prev.win_rate > current.win_rate ? prev : current
      );
      
      addLog(`🏆 Best algorithm: ${best.algorithm} (${best.win_rate.toFixed(1)}% win rate)`);
    } catch (err) {
      addLog(`Comparison error: ${err}`);
      console.error('Comparison error:', err);
    } finally {
      setIsRunning(false);
    }
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
  const renderBoard = () => {
    if (!boardState) return null;
    
    const cellSize = Math.min(500 / boardState.width, 500 / boardState.height, 30);
    
    return (
      <div className="board-preview">
        <h3>Current Board ({boardState.width}x{boardState.height}, {boardState.mines} mines)</h3>
        <div className="board-grid" style={{ 
          gridTemplateColumns: `repeat(${boardState.width}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${boardState.height}, ${cellSize}px)`
        }}>
          {boardState.cells.map((cell: any, index: number) => (
            <div 
              key={index}
              className={`cell ${cell.is_revealed ? 'revealed' : 'hidden'} 
                         ${cell.is_mine && cell.is_revealed ? 'mine' : ''} 
                         ${cell.is_flagged ? 'flagged' : ''}`}
              title={`(${cell.x},${cell.y}) - Mines nearby: ${cell.adjacent_mines}`}
            >
              {cell.is_flagged ? '🚩' : 
               cell.is_revealed && cell.is_mine ? '💣' :
               cell.is_revealed && cell.adjacent_mines > 0 ? cell.adjacent_mines : ''}
            </div>
          ))}
        </div>
        <div className="board-info">
          <p>Revealed: {boardState.cells.filter((c: any) => c.is_revealed).length} / {boardState.width * boardState.height}</p>
          <p>Flags: {boardState.cells.filter((c: any) => c.is_flagged).length}</p>
          <p>Total clicks: {boardState.total_clicks}</p>
          <p>Status: {boardState.game_over ? '💀 GAME OVER' : boardState.game_won ? '🎉 WON!' : '▶️ Playing'}</p>
          <p>Algorithm: {AlgorithmInfo.find(a => a.value === selectedAlgorithm)?.label || selectedAlgorithm}</p>
        </div>
      </div>
    );
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
      <h1>Minesweeper Simulator</h1>
      
      <div className="status">
        <div className="status-indicator ready">✅ WASM Loaded</div>
        <div className={`status-indicator ${simulator ? 'ready' : 'loading'}`}>
          {simulator ? '✅ Simulator Ready' : '⏳ Simulator Not Ready'}
        </div>
      </div>
      
      <div className="config-section">
        <h3>Game Configuration</h3>
        
        <div className="preset-section">
          <div className="preset-buttons">
            {gamePresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handlePresetSelect(preset)}
                className={`preset-btn ${selectedPreset === preset.name ? 'selected' : ''}`}
                title={`${preset.width}x${preset.height}, ${preset.mines} mines`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
        
        <div className="custom-config">
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
            <div className="config-group">
              <label htmlFor="mines">Mines</label>
              <input 
                id="mines"
                type="number" 
                value={gameConfig.mines}
                onChange={(e) => handleConfigChange('mines', parseInt(e.target.value) || 10)}
                min="1"
                max={gameConfig.width * gameConfig.height - 1}
              />
            </div>
          </div>
          
          <div className="config-actions">
            <button 
              onClick={handleCreateNewBoard}
              disabled={!wasm || isRunning}
              className="create-board-btn"
            >
              Create New Board
            </button>
          </div>
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
      
      {renderBoard()}
      
      {comparisonResults.length > 0 && (
        <div className="comparison-results">
          <h3>Algorithm Comparison Results</h3>
          <table>
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Wins</th>
                <th>Win Rate</th>
                <th>Avg Steps (Wins)</th>
                <th>Avg Clicks (Wins)</th>
              </tr>
            </thead>
            <tbody>
              {comparisonResults.map((result, index) => (
                <tr key={index} className={result.win_rate === Math.max(...comparisonResults.map(r => r.win_rate)) ? 'best' : ''}>
                  <td>{result.algorithm}</td>
                  <td>{result.wins}/{result.total_games}</td>
                  <td>{result.win_rate.toFixed(1)}%</td>
                  <td>{result.avg_steps_wins.toFixed(2)}</td>
                  <td>{result.avg_clicks_wins.toFixed(2)}</td>
                </tr>
              ))}
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
            {batchResults.map((result: any, index: number) => (
              <div key={index} className={`batch-result ${result.success ? 'success' : 'failure'}`}>
                <div className="game-header">
                  <strong>Game {index + 1}</strong>
                  <span className={`result-badge ${result.success ? 'win' : 'lose'}`}>
                    {result.success ? '✅ WON' : '❌ LOST'}
                  </span>
                </div>
                <div className="game-details">
                  <div>Clicks: {result.clicks || 0}</div>
                  <div>Steps: {result.steps || 0}</div>
                  <div>Mines: {result.mines || 0}</div>
                  <div>Size: {result.width || 0}x{result.height || 0}</div>
                </div>
              </div>
            ))}
          </div>
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