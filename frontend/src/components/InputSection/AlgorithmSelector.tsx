import React from 'react';
import { AlgorithmType, AlgorithmInfo } from '../../types/simulation';
import './AlgorithmSelector.css';

interface AlgorithmSelectorProps {
  selectedAlgorithm: AlgorithmType;
  onAlgorithmChange: (algo: AlgorithmType) => void;
  disabled?: boolean;
}

const AlgorithmSelector: React.FC<AlgorithmSelectorProps> = ({
  selectedAlgorithm,
  onAlgorithmChange,
  disabled = false,
}) => {
  return (
    <div className="algorithm-selector-container">
      <h3>Select Strategy</h3>
      <div className="algorithm-grid">
        {AlgorithmInfo.map((algo) => {
          // Compare selectedAlgorithm and algo.value as numbers to ensure correct comparison regardless of type (string or number)
          const isSelected = Number(selectedAlgorithm) === Number(algo.value);
          
          return (
            <div
              key={algo.value}
              className={`algorithm-card 
                ${isSelected ? 'selected' : ''} 
                ${disabled ? 'disabled' : ''} 
                ${!algo.implemented ? 'not-implemented' : ''}`}
              onClick={() => {
                if (!disabled && algo.implemented) {
                  onAlgorithmChange(algo.value);
                }
              }}
            >
              <div className="card-header">
                <h4>{algo.label}</h4>
                {isSelected && <span className="active-badge">Active</span>}
              </div>
              <p>{algo.description}</p>
              {!algo.implemented && <span className="coming-soon">준비 중</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlgorithmSelector;