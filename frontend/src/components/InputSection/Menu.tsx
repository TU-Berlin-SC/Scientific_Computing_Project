import React, { useState } from 'react';
import AdvancedSettings from './AdvancedSettings';
import type { GameConfig, Preset } from '../../types';
import '../../styles/Menu.css';

interface MenuProps {
  config: GameConfig;
  setConfig: React.Dispatch<React.SetStateAction<GameConfig>>;
  presets: Preset[];
  wasm: boolean;
  simulator: boolean;
  onCreateBoard: () => void;
}

const Menu: React.FC<MenuProps> = ({
  config,
  setConfig,
  presets,
  wasm,
  onCreateBoard
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  /* ------------------ preset ------------------ */
  const handleSelectPreset = (preset: Preset) => {
    setSelectedPresetId(preset.id);
  
    setConfig(prev => {
      // Actual dimensions array to use for the game, derived from preset
      const newDimensions = preset.dimensions 
        ? [...preset.dimensions] 
        : [preset.height || 9, preset.width || 9];
  
      const isND = newDimensions.length > 2;
      
      // dimensions values-> width, height
      const actualHeight = isND ? newDimensions[1] : (preset.height || 9);
      const actualWidth = isND ? newDimensions[2] : (preset.width || 9);
  
      return {
        ...prev,
        dimensions: newDimensions,
        dimensionCount: newDimensions.length,
        mines: preset.mines,
        useNDimensions: isND,
        width: actualWidth,  
        height: actualHeight
      };
    });
  };
  const handleChangeConfig = (
    key: 'width' | 'height' | 'mines',
    value: number
  ) => setConfig(prev => ({ ...prev, [key]: value }));

  const handleChangeDimensionCount = (count: number) =>
    setConfig(prev => ({
      ...prev,
      dimensionCount: count,
      dimensions: Array(count).fill(3)
    }));

  const handleChangeDimensionSize = (index: number, size: number) => {
    const newDims = [...config.dimensions];
    newDims[index] = size;
    setConfig(prev => ({ ...prev, dimensions: newDims }));
  };

  const selectedPresetName =
    presets.find(p => p.id === selectedPresetId)?.name || 'Custom';

  // Available dimensions for the level selector dropdown (2D, 3D, 4D)
  const availableDimensions = [2, 3, 4];

  // Filter presets to only those matching the current dimension count for the level selector
  const currentDimPresets = presets.filter(p => {
    const dim = p.dimensions?.length || 2;
    return dim === config.dimensionCount;
  });

  const handleSelectDimension = (d: number) => {
    const firstPresetOfDim = presets.find(p => (p.dimensions?.length || 2) === d);
    if (firstPresetOfDim) {
      handleSelectPreset(firstPresetOfDim);
    } else {
      // Manually set to a default custom config for the new dimension if no preset exists
      handleSelectPreset({ id: 'custom', name: 'Custom', mines: 10, dimensions: d === 2 ? [9, 9] : Array(d).fill(4) } as any);
    }
  };
  /* ===================================================== */

  return (
    <div className="menu-wrapper">
      <div className="config-section">
        
        <div className="main-control-bar">
          <div className="selectors-group">
            <span className="control-label">Game:</span>
            
            {/* Select Dimension */}
            <select 
              className="styled-select"
              value={config.dimensionCount}
              onChange={(e) => handleSelectDimension(Number(e.target.value))}
            >
              {[2, 3, 4].map(d => <option key={d} value={d}>{d}D</option>)}
            </select>

            {/* Select Level*/}
            <select 
              className="styled-select"
              value={selectedPresetId}
              onChange={(e) => {
                const preset = presets.find(p => p.id === e.target.value);
                if (preset) handleSelectPreset(preset);
              }}
            >
              <option value="">Custom Level</option>
              {currentDimPresets.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name.replace(`${config.dimensionCount}D `, '')}
                </option>
              ))}
            </select>

            {/* Create Board */}
            <button className="create-btn-primary" onClick={onCreateBoard}>
              Create Board
            </button>
          </div>

          <button
            className="settings-toggle-btn"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
          >
            {showAdvancedSettings ? 'Close Settings' : 'Advanced Settings'}
          </button>
        </div>

        {showAdvancedSettings && (
          <div >
            <AdvancedSettings
              config={config}
              onChangeConfig={handleChangeConfig}
              onChangeDimensionCount={handleChangeDimensionCount}
              onChangeDimensionSize={handleChangeDimensionSize}
            />
          </div>
        )}
      </div>
    </div>
  );
};
export default Menu;
