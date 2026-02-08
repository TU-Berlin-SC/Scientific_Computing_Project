import React from 'react';
import { AlgorithmInfo, TspInfo } from '../../types/simulation';
import type { AlgorithmType, TspObjective } from '../../types/simulation';

const Controls: React.FC<any> = (props) => {
  const { config, isRunning, algorithm, tspObjective, board } = props;
  const isGameOver = board?.game_over;

  return (
    <div className="controls-inner">
      <div className="group">
        <h4 className="label">SIMULATION CONTROL</h4>
        <div className="btn-grid">
          <button 
            className="btn-p" 
            onClick={props.onStep} 
            disabled={isRunning || isGameOver}
          >
            Step Move
          </button>
          <button 
            className="btn-s" 
            onClick={props.onRunFullGame} 
            disabled={isRunning || isGameOver}
          >
            Run Game
          </button>
          <button 
            className="btn-b" 
            onClick={() => props.onRunBatch(10)} 
            disabled={isRunning}
          >
            Run Batch (10)
          </button>
          <button 
            className="btn-r" 
            onClick={props.onReset}
          >
            Reset Board
          </button>
        </div>
      </div>

      <div className="group">
        <h4 className="label">GRID PARAMETERS</h4>
        <div className="config-fields">
          <div className="input-item">
            <span>Size</span>
            <input type="number" value={config.width} onChange={e => props.onConfigChange('width', +e.target.value)} />
          </div>
          <div className="input-item">
            <span>Mines</span>
            <input type="number" value={config.mines} onChange={e => props.onConfigChange('mines', +e.target.value)} />
          </div>
        </div>
      </div>

      <div className="group">
        <h4 className="label">SOLVER ALGORITHM</h4>
        {AlgorithmInfo.map((a: any) => (
          <div 
            key={a.value} 
            className={`card ${algorithm === a.value ? 'active' : ''}`}
            onClick={() => !isRunning && props.onAlgorithmChange(a.value as AlgorithmType)}
          >
            <strong>{a.label}</strong>
            <p>{a.description}</p>
          </div>
        ))}
      </div>

      <div className="group">
        <h4 className="label">TSP STRATEGY</h4>
        <div className="tsp-stack">
          {TspInfo.map((t: any) => (
            <button 
              key={t.value} 
              className={`tsp-tab ${tspObjective === t.value ? 'active' : ''}`}
              onClick={() => !isRunning && props.onTspChange(t.value as TspObjective)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Controls;