// components/ControlPanel.tsx
import React from 'react';
import '../../styles/ControlPanel.css';
import { TspObjective } from '../../types/simulation';

const TspInfo = [
  { value: TspObjective.MinDistance, label: 'Shortest Path' },
  { value: TspObjective.MinRotation, label: 'Min Rotation' },
  { value: TspObjective.MaxInformation, label: 'Max Information' },
];

interface ControlPanelProps {
  isRunning: boolean;
  hasSimulator: boolean;
  onStep: () => void;
  onRunFull: () => void;
  onRunBatch: () => void;
  onCompare: () => void;
  onReset: () => void;
  tspObjective: TspObjective;
  onTspChange: (t: TspObjective) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  isRunning, 
  hasSimulator, 
  onStep, 
  onRunFull, 
  onRunBatch, 
  onCompare, 
  onReset,
  tspObjective,
  onTspChange
}) => {
  return (
    <div className="controls">
      <div className="control-buttons">
        {/* Next step*/}
        <button onClick={onStep} disabled={!hasSimulator || isRunning}>
          Test Step
        </button>

        {/* Full Game */}
        <button onClick={onRunFull} disabled={!hasSimulator || isRunning}>
          Test Full Game
        </button>

        {/* Batch button */}
        <button onClick={onRunBatch} disabled={isRunning}>
          Test Batch (100 games)
        </button>

        {/* Compare with all algorithms  */}
        <button onClick={onCompare} disabled={isRunning} className="compare-btn">
          Compare Algorithms
        </button>

        {/* Reset */}
        <button onClick={onReset} disabled={!hasSimulator || isRunning} className="reset-btn">
          Reset Current Game
        </button>
      </div>
      {/* TSP */}
      <div className="group tsp-group">
        <h4 className="label">TSP STRATEGY</h4>
        <div className="tsp-stack horizontal">
          {TspInfo.map(t => (
            <button
              key={t.value}
              className={`tsp-tab ${tspObjective === t.value ? 'active' : ''}`}
              onClick={() => !isRunning && onTspChange(t.value)}            
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>


      {/* 로딩 표시 (선택 사항) */}
      {isRunning && <div className="loading-spinner">Simulating... Please wait.</div>}
    </div>
  );
};

export default ControlPanel;