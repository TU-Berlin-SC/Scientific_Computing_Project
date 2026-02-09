import React from 'react';
import { GameRecord, GameStats, GameConfig } from '../../types';
import '../../styles/ResultView.css';
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

  // CSV Export (유저님의 헤더 형식 유지)
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
      {/* 1. 알고리즘 비교 결과 섹션 (CSS: .comparison-results 적용) */}
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
                // 가장 높은 승률을 가진 행에 .best 클래스 부여
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

      {/* 2. 배치 결과 섹션 (CSS: .batch-results 적용) */}
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
                  <div>
                    {/* 엔진이 뱉은 6x9x9를 무시하고, 유저가 설정한 값을 그대로 출력 */}
                    Size: {
                      gameConfig.dimensions && gameConfig.dimensions.length > 0
                        ? gameConfig.dimensions.join('×')
                        : `${gameConfig.height}×${gameConfig.width}`
                    }
                  </div>
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