// // Batch 결과 및 Algorithm Comparison 표

// const [batchResults, setBatchResults] = useState<any[]>([]);
// const [gameConfig, setGameConfig] = useState<GameConfig>({
//   width: 9,
//   height: 9,
//   mines: 10,
//   dimensions: [9, 9],
//   dimensionCount: 2,
//   useNDimensions: false
// });
// const [comparisonResults, setComparisonResults] = useState<GameStats[]>([]);
// const [allDetailedRecords, setAllDetailedRecords] = useState<GameRecord[]>([]); /


// interface GameRecord { // 상세
//     algorithm: string;
//     mines: number;
//     dims: string | number[];
//     win: "TRUE" | "FALSE";
//     clicks: number;
//     time_ms: number;
//     guesses: number;
//     completion: string | number;
//     objective?: string; 
//   }

//  // for summary stats for comparison report
//  const getSummaryStats = (gameRecords: any[]) => {
//     const totalGames = gameRecords.length;
//     // win이 문자열 "TRUE"인지 확인 (데이터 형식에 맞춤)
//     const winRecords = gameRecords.filter(r => r.win === "TRUE" || r.win === true);
//     const wins = winRecords.length;
//     const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
  
//     // 평균 계산 공통 함수 (가독성 및 재사용성)
//     const getAverage = (records: any[], key: string) => {
//       if (records.length === 0) return 0;
//       const sum = records.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
//       return sum / records.length;
//     };
  
//     return {
//       total_games: totalGames,
//       wins,
//       win_rate: winRate,
//       // 승리한 게임 기준 평균들
//       avg_steps_wins: getAverage(winRecords, 'steps'), // 데이터에 steps가 없다면 다른 키로 대체 가능
//       avg_clicks_wins: getAverage(winRecords, 'clicks'),
//       avg_time_wins: getAverage(winRecords, 'time_ms'),
//       avg_guesses_wins: getAverage(winRecords, 'guesses'),
//     };
//   };
  
//   // save csv and show summary on page
  
//   const handleCompareAlgorithms = async () => {
//     if (!wasm) return addLog("WASM not ready");
  
//     setIsRunning(true);
//     const allGameRecords: any[] = []; 
//     const summaryResults: any[] = []; 
  
//     for (const algo of AlgorithmInfo) {
//       if (!algo.implemented) continue;
  
//       addLog(`Testing ${algo.label}...`);
//       const gameRecords = runGamesForAlgorithm(algo, 100); 
      
//       // 🔍 디버깅 로그: 개별 알고리즘 테스트 결과 확인
//       console.log(`[Debug] ${algo.label} 테스트 완료. 생성된 레코드 수:`, gameRecords.length);
//       if(gameRecords.length > 0) console.log(`[Debug] 첫 번째 레코드 샘플:`, gameRecords[0]);
  
//       allGameRecords.push(...gameRecords);
  
//       const summary = getSummaryStats(gameRecords);
//       summaryResults.push({ algorithm: algo.label, ...summary });
//     }
  
//     setComparisonResults(summaryResults); 
//     setAllDetailedRecords(allGameRecords); // 상세 기록을 반드시 여기에 저장!
    
//     setIsRunning(false);
//     console.log("[Debug] 전체 상세 레코드 수:", allGameRecords.length);
//     addLog("🎉 All algorithms tested!");
//   };

//   const downloadCSV = (gameRecords: any[], filename: string) => {
//     if (!gameRecords?.length) {
//       alert("❌ 데이터 없음");
//       return;
//     }
  
//     const headers = ["algorithm", "objective", "dims", "win", "clicks", "time_ms", "guesses", "completion"];
  
//     const rows = gameRecords.map(r => [
//       r.algorithm,
//       r.objective ?? "N/A",
//       Array.isArray(r.dims) ? r.dims.join("x") : r.dims,
//       r.win,
//       r.clicks,
//       r.time_ms,
//       r.guesses,
//       r.completion
//     ]);
  
//     // 요청하신 형식의 헤더 추가
//     const titleHeader = `--- benchmark results ---`;
//     const csvContent = [
//       titleHeader,
//       headers.join(","), // 탭 대신 쉼표 사용 권장
//       ...rows.map(r => r.join(","))
//     ].join("\n");
  
//     const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
//     const link = document.createElement("a");
//     link.href = URL.createObjectURL(blob);
//     link.download = `${filename}.csv`;
//     link.click();
//   };

//   // 게임 리셋
//   const handleReset = () => {
//     if (!simulator) {
//       addLog('Simulator not ready');
//       return;
//     }
    
//     addLog('Resetting game...');
//     try {
//       simulator.reset();
//       const newState = simulator.getState();
//       setBoardState(newState);
//       addLog('Game reset successfully');
//     } catch (err) {
//       addLog(`Reset error: ${err}`);
//     }
//   };

// //   frontend
//  {/* 1. 알고리즘 비교 결과 섹션 */}
//  {comparisonResults.length > 0 && (
//     <div className="comparison-results">
//       <h3>Algorithm Comparison Results</h3>
//       <div className="section-header">
//         <button 
//           className="download-btn"
//           onClick={() => downloadCSV(allDetailedRecords, 'algorithm_comparison_summary')}
//         >
//           Export Detailed Results (CSV)
//         </button>
//       </div>
//       <table>
//         <thead>
//           <tr>
//             <th>Algorithm</th>
//             <th>Wins</th>
//             <th>Win Rate</th>
//             <th>Avg Clicks (Wins)</th>
//             <th>Avg Time (ms)</th>
//             <th>Avg Guesses</th>
//           </tr>
//         </thead>
//         <tbody>
//           {comparisonResults.map((result, index) => {
//             const isBest = result.win_rate === Math.max(...comparisonResults.map(r => r.win_rate));
//             return (
//               <tr key={index} className={isBest ? 'best' : ''}>
//                 <td>{result.algorithm}</td>
//                 <td>{result.wins}/{result.total_games}</td>
//                 <td>{result.win_rate.toFixed(1)}%</td>
//                 <td>{result.avg_clicks_wins.toFixed(2)}</td>
//                 <td>{result.avg_time_wins.toFixed(0)}ms</td>
//                 <td>{result.avg_guesses_wins.toFixed(2)}</td>
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>
//     </div>
//   )}
  
//   {batchResults.length > 0 && (
//     <div className="batch-results">
//       <h3>Batch Results ({batchResults.length} games)</h3>
//       <div className="batch-summary">
//         <div className="summary-stats">
//           <div className="stat">
//             <span className="stat-label">Total Games</span>
//             <span className="stat-value">{batchResults.length}</span>
//           </div>
//           <div className="stat">
//             <span className="stat-label">Wins</span>
//             <span className="stat-value success">
//               {batchResults.filter((r: any) => r.success).length}
//             </span>
//           </div>
//           <div className="stat">
//             <span className="stat-label">Win Rate</span>
//             <span className="stat-value">
//               {((batchResults.filter((r: any) => r.success).length / batchResults.length) * 100).toFixed(1)}%
//             </span>
//           </div>
//           <div className="stat">
//             <span className="stat-label">Avg Clicks (Wins)</span>
//             <span className="stat-value">
//               {batchResults.filter((r: any) => r.success).length > 0 
//                 ? (batchResults.filter((r: any) => r.success)
//                     .reduce((sum: number, r: any) => sum + (r.clicks || 0), 0) / 
//                    batchResults.filter((r: any) => r.success).length).toFixed(2)
//                 : '0.00'}
//             </span>
//           </div>
//         </div>
//       </div>
//       <div className="batch-grid">
//         {batchResults.slice(0, 20).map((result: any, index: number) => (
//           <div key={index} className={`batch-result ${result.success ? 'success' : 'failure'}`}>
//             <div className="game-header">
//               <strong>Game {index + 1}</strong>
//               <span className={`result-badge ${result.success ? 'win' : 'lose'}`}>
//                 {result.success ? '✅ WON' : '❌ LOST'}
//               </span>
//             </div>
//             <div className="game-details">
//               <div>Clicks: {result.clicks || 0}</div>
//               <div>Mines: {result.mines || 0}</div>
//               <div>Size: {gameConfig.useNDimensions ? 
//                 `[${result.dimensions?.join('×') || 'N/A'}]` : 
//                 `${result.width || 0}×${result.height || 0}`
//               }</div>
//             </div>
//           </div>
//         ))}
//       </div>
//       {batchResults.length > 20 && (
//         <p className="batch-note">Showing first 20 of {batchResults.length} games</p>
//       )}
//     </div>
//   )}
import React from 'react';
import { GameRecord, GameStats, GameConfig } from '../../types';

interface ResultPanelProps {
  batchResults: any[];
  comparisonResults: any[];
  allDetailedRecords: GameRecord[];
  gameConfig: GameConfig;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ 
  batchResults, 
  comparisonResults, 
  allDetailedRecords, 
  gameConfig 
}) => {

  // CSV 다운로드 함수 (유저님의 헤더 형식 반영)
  const downloadCSV = (gameRecords: GameRecord[], filename: string) => {
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

    const titleHeader = `--- benchmark results ---`;
    const csvContent = [
      titleHeader,
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  return (
    <div className="results-container">
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

      {/* 2. 배치 결과 섹션 */}
      {batchResults.length > 0 && (
        <div className="batch-results">
          <hr />
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
    </div>
  );
};

export default ResultPanel;