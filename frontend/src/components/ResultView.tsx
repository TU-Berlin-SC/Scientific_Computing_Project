import React from 'react';
import type { SimulationResult } from '../types/simulation';

interface ResultViewProps {
  results: SimulationResult[];
}

const ResultView: React.FC<ResultViewProps> = ({ results }) => {
  if (!results || results.length === 0) return null;

  const wins = results.filter(r => r.success).length;
  const winRate = ((wins / results.length) * 100).toFixed(1);
  const avgNodes = (results.reduce((acc, curr) => acc + curr.algorithm_stats.nodes_explored, 0) / results.length).toFixed(0);

  return (
    <div className="stats-overlay">
      <div className="stat-card">
        <label>Win Rate</label>
        <div className={`value ${Number(winRate) > 50 ? 'pos' : 'neg'}`}>{winRate}%</div>
      </div>
      <div className="stat-card">
        <label>Total Games</label>
        <div className="value">{results.length}</div>
      </div>
      <div className="stat-card">
        <label>Avg Complexity</label>
        <div className="value">{avgNodes} nodes</div>
      </div>
    </div>
  );
};

export default ResultView;