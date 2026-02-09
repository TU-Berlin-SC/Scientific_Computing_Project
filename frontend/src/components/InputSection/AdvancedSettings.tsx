import React from 'react';
import type { GameConfig } from '../../types';
import '../../styles/AdvancedSettings.css';
interface AdvancedSettingsProps {
  config: GameConfig;
  onChangeConfig: (key: 'width' | 'height' | 'mines', value: number) => void;
  onChangeDimensionCount: (count: number) => void;
  onChangeDimensionSize: (index: number, size: number) => void;
}

const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
  config,
  onChangeConfig,
  onChangeDimensionCount,
  onChangeDimensionSize
}) => {
  const maxMines = config.useNDimensions && config.dimensions 
    ? config.dimensions.reduce((a, b) => a * b, 1) - 1
    : config.width * config.height - 1;

  return (
    <div className="advanced-settings">
      <h4>Advanced Settings</h4>
        <div className="nd-advanced">
          <div className="dimension-control">
            <label>Number of Dimensions: </label>
            <div className="dimension-buttons">
              {[2, 3, 4].map(dim => (
                <button
                  key={dim}
                  className={config.dimensionCount === dim ? 'active' : ''}
                  onClick={() => onChangeDimensionCount(dim)}
                >
                  {dim}D
                </button>
              ))}
            </div>
          </div>
          <div className="dimension-sizes">
            <label>Dimension Sizes:</label>
            <div className="size-inputs">
              {config.dimensions?.map((size, idx) => (
                <div key={idx} className="size-input">
                  <label>D{idx + 1}:</label>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={size}
                    onChange={(e) => onChangeDimensionSize(idx, parseInt(e.target.value) || 2)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

      <div className="mines-control">
        <label>Mines:</label>
        <input type="number" value={config.mines} min={1} max={maxMines} onChange={e => onChangeConfig('mines', parseInt(e.target.value) || 10)} />
        <span>Max: {maxMines}</span>
      </div>
    </div>
  );
};

export default AdvancedSettings;
