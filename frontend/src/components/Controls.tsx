// src/components/Controls.tsx
import React from 'react';
import { AlgorithmType, AlgorithmInfo } from '../types/simulation';
import './Controls.css';

interface ControlsProps {
  onStep: () => void;
  onRunFullGame: () => void;
  onRunBatch: () => void;
  onReset: () => void;
  isRunning: boolean;
  config: {
    width: number;
    height: number;
    mines: number;
    games: number;
  };
  onConfigChange: (key: keyof ControlsProps['config'], value: number) => void;
  algorithm: AlgorithmType;
  onAlgorithmChange: (algo: AlgorithmType) => void;
}

const Controls: React.FC<ControlsProps> = ({
  onStep,
  onRunFullGame,
  onRunBatch,
  onReset,
  isRunning,
  config,
  onConfigChange,
  algorithm,
  onAlgorithmChange,
}) => {
  const handleNumberInput = (key: keyof typeof config, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onConfigChange(key, numValue);
    }
  };

  return (
    <div className="controls">
      <h3>컨트롤 패널</h3>
      
      <div className="button-group">
        <button
          className="control-button"
          onClick={onStep}
          disabled={isRunning}
        >
          한 단계 실행
        </button>
        <button
          className="control-button run"
          onClick={onRunFullGame}
          disabled={isRunning}
        >
          한 게임 실행
        </button>
        <button
          className="control-button run"
          onClick={onRunBatch}
          disabled={isRunning}
        >
          배치 실행 ({config.games}게임)
        </button>
        <button
          className="control-button reset"
          onClick={onReset}
          disabled={isRunning}
        >
          초기화
        </button>
      </div>

      <div className="config-section">
        <h4>게임 설정</h4>
        <div className="config-grid">
          <div className="config-item">
            <label htmlFor="width">너비:</label>
            <input
              id="width"
              type="number"
              min="5"
              max="50"
              value={config.width}
              onChange={(e) => handleNumberInput('width', e.target.value)}
              disabled={isRunning}
            />
          </div>
          <div className="config-item">
            <label htmlFor="height">높이:</label>
            <input
              id="height"
              type="number"
              min="5"
              max="50"
              value={config.height}
              onChange={(e) => handleNumberInput('height', e.target.value)}
              disabled={isRunning}
            />
          </div>
          <div className="config-item">
            <label htmlFor="mines">지뢰 수:</label>
            <input
              id="mines"
              type="number"
              min="1"
              max={config.width * config.height - 1}
              value={config.mines}
              onChange={(e) => handleNumberInput('mines', e.target.value)}
              disabled={isRunning}
            />
          </div>
          <div className="config-item">
            <label htmlFor="games">배치 게임 수:</label>
            <input
              id="games"
              type="number"
              min="1"
              max="100"
              value={config.games}
              onChange={(e) => handleNumberInput('games', e.target.value)}
              disabled={isRunning}
            />
          </div>
        </div>
      </div>

      <div className="config-section">
        <h4>알고리즘 선택</h4>
        <div className="algorithm-selector">
          <div className="algorithm-options">
            {AlgorithmInfo.map((algo) => (
              <button
                key={algo.value}
                className={`algorithm-option ${algorithm === algo.value ? 'selected' : ''}`}
                onClick={() => onAlgorithmChange(algo.value)}
                disabled={isRunning || !algo.implemented}
                title={!algo.implemented ? '아직 구현되지 않음' : algo.description}
              >
                {algo.label}
              </button>
            ))}
          </div>
          <div className="algorithm-info">
            <small>
              현재 선택: <strong>{AlgorithmInfo.find(a => a.value === algorithm)?.label}</strong>
              {AlgorithmInfo.find(a => a.value === algorithm)?.description && 
                ` - ${AlgorithmInfo.find(a => a.value === algorithm)?.description}`}
            </small>
          </div>
        </div>
      </div>

      {isRunning && (
        <div className="running-indicator">
          <div className="spinner"></div>
          <span>시뮬레이션 실행 중...</span>
        </div>
      )}
    </div>
  );
};

export default Controls;