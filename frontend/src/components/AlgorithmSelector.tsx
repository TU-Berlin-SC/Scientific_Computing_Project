// src/components/AlgorithmSelector.tsx
import React from 'react';
import { AlgorithmType, AlgorithmInfo } from '../types/simulation';
import './AlgorithmSelector.css';

interface AlgorithmSelectorProps {
  selectedAlgorithm: AlgorithmType;
  onAlgorithmChange: (algo: AlgorithmType) => void;
  disabled?: boolean;
}

// AlgorithmSelector.tsx
const AlgorithmSelector: React.FC<AlgorithmSelectorProps> = ({
  selectedAlgorithm,
  onAlgorithmChange,
  disabled = false,
}) => {
  return (
    <div className="algorithm-selector">
      <h3>Select Algorithm</h3>
      <div className="algorithm-grid">
        {AlgorithmInfo.map((algo) => (
          <div 
            key={algo.value}
            className={`algorithm-card 
              ${selectedAlgorithm === algo.value ? 'selected' : ''} 
              ${disabled ? 'disabled' : ''}
              ${!algo.implemented ? 'not-implemented' : ''}`}
            onClick={() => !disabled && algo.implemented && onAlgorithmChange(algo.value)}
            title={!algo.implemented ? 'Coming Soon' : algo.description}
          >
            <h4>{algo.label}</h4>
            <p>{algo.description}</p>
            {!algo.implemented && <span className="coming-soon">준비 중</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
export default AlgorithmSelector;