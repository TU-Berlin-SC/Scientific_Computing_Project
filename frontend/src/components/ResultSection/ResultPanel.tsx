import React from 'react';
import { GameRecord, GameConfig } from '../../types';
import '../../styles/ResultView.css';
import { TspObjective } from '../../types/simulation';

const TspInfo = [
  { value: TspObjective.MinDistance, label: 'Shortest Path' },
  { value: TspObjective.MinRotation, label: 'Min Rotation' },
  { value: TspObjective.MaxInformation, label: 'Max Information' },
];

interface ResultPanelProps {
  batchResults: any[];
  comparisonResults: any[];
  allDetailedRecords: GameRecord[];
  gameConfig: GameConfig;
  tspObjective: TspObjective;
}

const ResultPanel: React.FC<ResultPanelProps> = ({ 
  batchResults, 
  comparisonResults, 
  allDetailedRecords, 
  gameConfig,
  tspObjective
}) => {

//util
const getTspLabel = (objective: TspObjective) => {
  const found = TspInfo.find(t => t.value === objective);
  return found ? found.label : objective;
};

// CSV Export
const downloadCSV = (gameRecords: GameRecord[], filename: string) => {
  if (!gameRecords?.length) {
    alert("NO DATA TO EXPORT");
    return;
  }

  const headers = ["algorithm", "objective", "dims", "win", "clicks", "time_ms", "guesses", "completion"];
  const rows = gameRecords.map(r => [
    r.algorithm,
    getTspLabel(tspObjective),
    gameConfig.dimensions && gameConfig.dimensions.length > 0
      ? gameConfig.dimensions.join("x")
      : `${gameConfig.height}x${gameConfig.width}`,
    r.win,
    r.clicks,
    r.time_ms,
    r.total_guesses,
    r.completion
  ]);

  const titleHeader = `--- Benchmark Results (${gameConfig.dimensions?.join('×')}, Mines: ${gameConfig.mines}) ---`;
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
                    <td style={{ fontWeight: 'bold', color: '#e74c3c' }}>
                      {result.avg_guesses_wins?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. Batch result (CSS: .batch-results) */}
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
              <div className="stat highlight">
                <span className="stat-label">Avg Guesses</span>
                <span className="stat-value">
                  {batchResults.length > 0 
                    ? (batchResults.reduce((sum: number, r: any) => sum + (r.total_guesses || 0), 0) / batchResults.length).toFixed(2)
                    : '0.00'
                  }
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
                  <div style={{ fontWeight: 'bold', color: '#3498db' }}>
                      Guesses: {result.total_guesses ?? 0}
                  </div>
                  <div>
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