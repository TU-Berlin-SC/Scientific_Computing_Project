// A React component to display simulation results and statistics.
// src/components/ResultView.tsx
import React from 'react';
import { SimulationResult } from '../types/simulation';
import './ResultView.css';

interface ResultViewProps {
  results: SimulationResult[];
}

const ResultView: React.FC<ResultViewProps> = ({ results }) => {
  const calculateStatistics = () => {
    if (results.length === 0) return null;

    const successfulGames = results.filter(r => r.success);
    const successRate = (successfulGames.length / results.length) * 100;
    
    const avgClicks = results.reduce((sum, r) => sum + r.total_clicks, 0) / results.length;
    const avgSteps = results.reduce((sum, r) => sum + r.steps, 0) / results.length;
    const avgTime = results.reduce((sum, r) => sum + r.algorithm_stats.computation_time_ms, 0) / results.length;

    return {
      totalGames: results.length,
      successRate,
      avgClicks,
      avgSteps,
      avgTime,
    };
  };

  const stats = calculateStatistics();

  return (
    <div className="results-view">
      <h2>시뮬레이션 결과</h2>
      
      {stats && (
        <div className="statistics">
          <h3>통계</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">총 게임 수:</span>
              <span className="stat-value">{stats.totalGames}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">성공률:</span>
              <span className="stat-value">{stats.successRate.toFixed(2)}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">평균 클릭 수:</span>
              <span className="stat-value">{stats.avgClicks.toFixed(2)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">평균 탐색 노드:</span>
              <span className="stat-value">{stats.avgSteps.toFixed(2)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">평균 계산 시간:</span>
              <span className="stat-value">{stats.avgTime.toFixed(2)}ms</span>
            </div>
          </div>
        </div>
      )}

      <div className="results-list">
        <h3>상세 결과</h3>
        <div className="results-table-container">
          <table className="results-table">
            <thead>
              <tr>
                <th>게임</th>
                <th>결과</th>
                <th>클릭 수</th>
                <th>단계</th>
                <th>계산 시간</th>
                <th>탐색 노드</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index} className={result.success ? 'success' : 'failure'}>
                  <td>#{index + 1}</td>
                  <td>{result.success ? '성공' : '실패'}</td>
                  <td>{result.total_clicks}</td>
                  <td>{result.steps}</td>
                  <td>{result.algorithm_stats.computation_time_ms}ms</td>
                  <td>{result.algorithm_stats.nodes_explored}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResultView;