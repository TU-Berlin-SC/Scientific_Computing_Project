import React, { useState } from 'react';
import StatusBar from './StatusBar';
import PresetSelector from './PresetSelector';
import AdvancedSettings from './AdvancedSettings';
import ConfigActions from './ConfigActions';
import type { GameConfig, Preset } from '../types';
import '../styles/Menu.css';
interface MenuProps {
  config: GameConfig;
  setConfig: React.Dispatch<React.SetStateAction<GameConfig>>;
  presets: Preset[];
  wasm: boolean;
  simulator: boolean;
  onCreateBoard: () => void;
}

const Menu: React.FC<MenuProps> = ({ 
  config, setConfig, presets, wasm, simulator, onCreateBoard 
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('preset1');

  const handleToggleDimensions = () => 
    setConfig(prev => ({ ...prev, useNDimensions: !prev.useNDimensions }));

  const handleSelectPreset = (preset: Preset) => {
    setSelectedPreset(preset.id);
    setConfig(prev => ({
      ...prev,
      width: preset.width || prev.width,
      height: preset.height || prev.height,
      dimensions: preset.dimensions || prev.dimensions,
      mines: preset.mines,
    }));
  };

  const handleChangeConfig = (key: 'width'|'height'|'mines', value: number) => 
    setConfig(prev => ({ ...prev, [key]: value }));

  const handleChangeDimensionCount = (count: number) => 
    setConfig(prev => ({ ...prev, dimensionCount: count, dimensions: Array(count).fill(3) }));

  const handleChangeDimensionSize = (index: number, size: number) => {
    if (!config.dimensions) return;
    const newDims = [...config.dimensions];
    newDims[index] = size;
    setConfig(prev => ({ ...prev, dimensions: newDims }));
  };

  return (
    <div className="menu-wrapper">

      {/* 1. StatusBar */}
      <StatusBar 
        wasm={wasm}
        simulator={simulator}
        useNDimensions={config.useNDimensions}
        onToggleDimensions={handleToggleDimensions}
      />

      {/* 2. Current Configuration 표시 + AdvancedSettings 토글 */}
      <div className="config-section">
      <div className="mode-indicator-card">
  <div className="mode-info">
    <span className="mode-title">Game Configuration</span>
    <span className={`mode-badge ${config.useNDimensions ? 'mode-nd' : 'mode-2d'}`}>
      {config.useNDimensions 
        ? `${config.dimensionCount || 3}D Mode` 
        : '2D Mode'}
    </span>
    <span className="preset-label">Selected:</span>
    <span className="preset-badge">
      {presets.find(p => p.id === selectedPreset)?.name || selectedPreset}
    </span>
  </div>

  {/* 오른쪽 정렬 버튼 */}
  <div className="advanced-toggle-wrapper">
    <button 
      className="advanced-toggle"
      onClick={() => setShowAdvancedSettings(prev => !prev)}
    >
      {showAdvancedSettings ? "▲ Hide Settings" : "▼ Change Settings"}
    </button>
  </div>
</div>


        {/* 3. AdvancedSettings와 PresetSelector 표시 */}
        {showAdvancedSettings && (
          <>
            <PresetSelector 
              presets={presets} 
              selectedPreset={selectedPreset} 
              useNDimensions={config.useNDimensions}
              onSelectPreset={handleSelectPreset} 
            />

            <AdvancedSettings 
              config={config} 
              onChangeConfig={handleChangeConfig} 
              onChangeDimensionCount={handleChangeDimensionCount}
              onChangeDimensionSize={handleChangeDimensionSize}
            />

            <ConfigActions 
              config={config} 
              wasm={wasm} 
              onCreateBoard={onCreateBoard} 
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Menu;
