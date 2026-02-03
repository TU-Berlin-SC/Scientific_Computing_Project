// src/components/Controls.tsx
// import React from 'react';
// import { AlgorithmType, AlgorithmInfo } from '../types/simulation';
// import './Controls.css';

// interface ControlsProps {
//   onStep: () => void;
//   onRunFullGame: () => void;
//   onRunBatch: () => void;
//   onReset: () => void;
//   isRunning: boolean;
//   config: {
//     width: number;
//     height: number;
//     mines: number;
//     games: number;
//   };
//   onConfigChange: (key: keyof ControlsProps['config'], value: number) => void;
//   algorithm: AlgorithmType;
//   onAlgorithmChange: (algo: AlgorithmType) => void;
// }

// const Controls: React.FC<ControlsProps> = ({
//   onStep,
//   onRunFullGame,
//   onRunBatch,
//   onReset,
//   isRunning,
//   config,
//   onConfigChange,
//   algorithm,
//   onAlgorithmChange,
// }) => {
//   const handleNumberInput = (key: keyof typeof config, value: string) => {
//     const numValue = parseInt(value, 10);
//     if (!isNaN(numValue) && numValue > 0) {
//       onConfigChange(key, numValue);
//     }
//   };

//   return (
//     <div className="controls">
//       <h3>컨트롤 패널</h3>
      
//       <div className="button-group">
//         <button
//           className="control-button"
//           onClick={onStep}
//           disabled={isRunning}
//         >
//           한 단계 실행
//         </button>
//         <button
//           className="control-button run"
//           onClick={onRunFullGame}
//           disabled={isRunning}
//         >
//           한 게임 실행
//         </button>
//         <button
//           className="control-button run"
//           onClick={onRunBatch}
//           disabled={isRunning}
//         >
//           배치 실행 ({config.games}게임)
//         </button>
//         <button
//           className="control-button reset"
//           onClick={onReset}
//           disabled={isRunning}
//         >
//           초기화
//         </button>
//       </div>

//       <div className="config-section">
//         <h4>게임 설정</h4>
//         <div className="config-grid">
//           <div className="config-item">
//             <label htmlFor="width">너비:</label>
//             <input
//               id="width"
//               type="number"
//               min="5"
//               max="50"
//               value={config.width}
//               onChange={(e) => handleNumberInput('width', e.target.value)}
//               disabled={isRunning}
//             />
//           </div>
//           <div className="config-item">
//             <label htmlFor="height">높이:</label>
//             <input
//               id="height"
//               type="number"
//               min="5"
//               max="50"
//               value={config.height}
//               onChange={(e) => handleNumberInput('height', e.target.value)}
//               disabled={isRunning}
//             />
//           </div>
//           <div className="config-item">
//             <label htmlFor="mines">지뢰 수:</label>
//             <input
//               id="mines"
//               type="number"
//               min="1"
//               max={config.width * config.height - 1}
//               value={config.mines}
//               onChange={(e) => handleNumberInput('mines', e.target.value)}
//               disabled={isRunning}
//             />
//           </div>
//           <div className="config-item">
//             <label htmlFor="games">배치 게임 수:</label>
//             <input
//               id="games"
//               type="number"
//               min="1"
//               max="100"
//               value={config.games}
//               onChange={(e) => handleNumberInput('games', e.target.value)}
//               disabled={isRunning}
//             />
//           </div>
//         </div>
//       </div>

//       <div className="config-section">
//         <h4>알고리즘 선택</h4>
//         <div className="algorithm-selector">
//           <div className="algorithm-options">
//             {AlgorithmInfo.map((algo) => (
//               <button
//                 key={algo.value}
//                 className={`algorithm-option ${algorithm === algo.value ? 'selected' : ''}`}
//                 onClick={() => onAlgorithmChange(algo.value)}
//                 disabled={isRunning || !algo.implemented}
//                 title={!algo.implemented ? '아직 구현되지 않음' : algo.description}
//               >
//                 {algo.label}
//               </button>
//             ))}
//           </div>
//           <div className="algorithm-info">
//             <small>
//               현재 선택: <strong>{AlgorithmInfo.find(a => a.value === algorithm)?.label}</strong>
//               {AlgorithmInfo.find(a => a.value === algorithm)?.description && 
//                 ` - ${AlgorithmInfo.find(a => a.value === algorithm)?.description}`}
//             </small>
//           </div>
//         </div>
//       </div>

//       {isRunning && (
//         <div className="running-indicator">
//           <div className="spinner"></div>
//           <span>시뮬레이션 실행 중...</span>
//         </div>
//       )}
//     </div>
//   );
// };

// export default Controls;
import React, { useState, useEffect } from 'react';
import './Controls.css';
import { 
  GameConfig, 
  BoardPreset, 
  BOARD_PRESETS,
  DIFFICULTY_COLORS,
  ALGORITHM_INFO,
  getTotalCells,
  getMinePercentage
} from '../types/simulation';

interface ControlsProps {
  onStartSimulation: (config: GameConfig) => void;
  onReset: () => void;
  onRunStep: () => void;
  onRunFull: () => void;
  onRunBatch: (games: number) => void;
  isRunning: boolean;
  currentAlgorithm: string;
}

const Controls: React.FC<ControlsProps> = ({
  onStartSimulation,
  onReset,
  onRunStep,
  onRunFull,
  onRunBatch,
  isRunning,
  currentAlgorithm
}) => {
  // 선택된 차원 수
  const [dimensionCount, setDimensionCount] = useState<number>(2);
  
  // 각 차원의 크기
  const [dimensionSizes, setDimensionSizes] = useState<number[]>([9, 9]);
  
  // 지뢰 수
  const [mines, setMines] = useState<number>(10);
  
  // 알고리즘
  const [algorithm, setAlgorithm] = useState<string>('greedy');
  
  // 배치 시뮬레이션 게임 수
  const [batchGames, setBatchGames] = useState<number>(10);
  
  // 선택된 프리셋
  const [selectedPreset, setSelectedPreset] = useState<string>('beginner-2d');

  // 프리셋 필터링 (선택된 차원 수에 맞는 프리셋만)
  const filteredPresets = BOARD_PRESETS.filter(preset => 
    preset.dimensionCount === dimensionCount
  );

  // 차원 수 변경 처리
  const handleDimensionChange = (count: number) => {
    setDimensionCount(count);
    
    // 새로운 차원 크기 배열 생성 (기본값 3)
    const newSizes = Array(count).fill(3);
    
    // 가능한 경우 기존 값 유지
    for (let i = 0; i < Math.min(count, dimensionSizes.length); i++) {
      newSizes[i] = dimensionSizes[i];
    }
    
    setDimensionSizes(newSizes);
    
    // 차원 수에 맞는 첫 번째 프리셋 선택
    const matchingPreset = filteredPresets[0];
    if (matchingPreset) {
      setSelectedPreset(matchingPreset.id);
      setDimensionSizes([...matchingPreset.dimensions]);
      setMines(matchingPreset.mines);
    }
  };

  // 프리셋 변경 처리
  const handlePresetChange = (presetId: string) => {
    const preset = BOARD_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      setDimensionCount(preset.dimensionCount);
      setDimensionSizes([...preset.dimensions]);
      setMines(preset.mines);
    }
  };

  // 차원 크기 변경 처리
  const handleSizeChange = (index: number, value: number) => {
    const newSizes = [...dimensionSizes];
    newSizes[index] = Math.max(2, Math.min(10, value)); // 2-10 사이 제한
    setDimensionSizes(newSizes);
    setSelectedPreset('custom');
  };

  // 지뢰 수 변경 처리
  const handleMinesChange = (value: number) => {
    const totalCells = getTotalCells(dimensionSizes);
    const maxMines = Math.max(1, totalCells - 1);
    const newMines = Math.max(1, Math.min(maxMines, value));
    setMines(newMines);
    if (selectedPreset !== 'custom') {
      setSelectedPreset('custom');
    }
  };

  // 시뮬레이션 시작
  const handleStart = () => {
    onStartSimulation({
      dimensions: dimensionSizes,
      mines,
      algorithm
    });
  };

  // 현재 차원 수에 지원되는 알고리즘 필터링
  const supportedAlgorithms = ALGORITHM_INFO.filter(algo => 
    algo.dimensionSupport.includes(dimensionCount)
  );

  const totalCells = getTotalCells(dimensionSizes);
  const minePercentage = getMinePercentage(dimensionSizes, mines);

  return (
    <div className="controls">
      <div className="control-group">
        <h3>📐 Board Configuration</h3>
        
        {/* 차원 선택 */}
        <div className="dimension-selector">
          <label>Dimensions:</label>
          <div className="dimension-buttons">
            {[2, 3, 4].map(dim => (
              <button
                key={dim}
                className={`dimension-btn ${dimensionCount === dim ? 'active' : ''}`}
                onClick={() => handleDimensionChange(dim)}
              >
                {dim}D
              </button>
            ))}
          </div>
        </div>

        {/* 프리셋 선택 */}
        <div className="preset-selector">
          <label>Preset:</label>
          <select 
            value={selectedPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="preset-select"
          >
            {filteredPresets.map(preset => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
            <option value="custom">Custom...</option>
          </select>
          
          {filteredPresets.map(preset => (
            selectedPreset === preset.id && (
              <div 
                key={preset.id}
                className="preset-info"
                style={{ borderLeftColor: DIFFICULTY_COLORS[preset.difficulty] }}
              >
                <span className="preset-difficulty" style={{ color: DIFFICULTY_COLORS[preset.difficulty] }}>
                  {preset.difficulty.toUpperCase()}
                </span>
                <p>{preset.description}</p>
              </div>
            )
          ))}
        </div>

        {/* 사용자 정의 설정 */}
        {selectedPreset === 'custom' && (
          <div className="custom-settings">
            <div className="dimension-sizes">
              <label>Dimension Sizes:</label>
              <div className="size-inputs">
                {dimensionSizes.map((size, index) => (
                  <div key={index} className="size-input">
                    <span className="dim-label">D{index + 1}:</span>
                    <input
                      type="number"
                      min="2"
                      max="10"
                      value={size}
                      onChange={(e) => handleSizeChange(index, parseInt(e.target.value))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mines-control">
              <label>Mines:</label>
              <div className="mines-slider-container">
                <input
                  type="range"
                  min="1"
                  max={totalCells - 1}
                  value={mines}
                  onChange={(e) => handleMinesChange(parseInt(e.target.value))}
                  className="mines-slider"
                />
                <div className="mines-info">
                  <input
                    type="number"
                    min="1"
                    max={totalCells - 1}
                    value={mines}
                    onChange={(e) => handleMinesChange(parseInt(e.target.value))}
                    className="mines-input"
                  />
                  <span className="mines-stats">
                    ({minePercentage.toFixed(1)}% of cells)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 알고리즘 선택 */}
        <div className="algorithm-selector">
          <label>Algorithm:</label>
          <select 
            value={algorithm} 
            onChange={(e) => setAlgorithm(e.target.value)}
            className="algorithm-select"
          >
            {supportedAlgorithms.map(algo => (
              <option key={algo.id} value={algo.id}>
                {algo.label}
              </option>
            ))}
          </select>
          
          {supportedAlgorithms.map(algo => (
            algorithm === algo.id && (
              <div key={algo.id} className="algorithm-info">
                <p className="algorithm-description">{algo.description}</p>
                <p className="algorithm-support">
                  Supports: {algo.dimensionSupport.join(', ')}D
                </p>
              </div>
            )
          ))}
        </div>
      </div>

      <div className="control-group">
        <h3>🎮 Simulation Controls</h3>
        <div className="button-group">
          <button 
            onClick={handleStart} 
            disabled={isRunning}
            className="btn-start"
          >
            ▶ Start Simulation
          </button>
          <button 
            onClick={onReset} 
            disabled={!isRunning}
            className="btn-reset"
          >
            🔄 Reset
          </button>
          <button 
            onClick={onRunStep} 
            disabled={!isRunning}
            className="btn-step"
          >
            ⏭️ Run Step
          </button>
          <button 
            onClick={onRunFull} 
            disabled={!isRunning}
            className="btn-full"
          >
            ⏩ Run Full
          </button>
        </div>
      </div>

      <div className="control-group">
        <h3>📊 Batch Simulation</h3>
        <div className="batch-control">
          <label>Number of Games:</label>
          <div className="batch-input">
            <input
              type="number"
              min="1"
              max="1000"
              value={batchGames}
              onChange={(e) => setBatchGames(parseInt(e.target.value))}
            />
            <button 
              onClick={() => onRunBatch(batchGames)}
              className="btn-batch"
            >
              Run Batch
            </button>
          </div>
        </div>
      </div>

      <div className="control-group stats">
        <h3>📈 Board Statistics</h3>
        <div className="stat-grid">
          <div className="stat-item">
            <span className="stat-label">Total Cells:</span>
            <span className="stat-value">{totalCells}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Mine Density:</span>
            <span className="stat-value">{minePercentage.toFixed(1)}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Safe Cells:</span>
            <span className="stat-value">{totalCells - mines}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Board Size:</span>
            <span className="stat-value">{dimensionSizes.join(' × ')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Controls;