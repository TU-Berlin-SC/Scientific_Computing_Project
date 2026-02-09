import React from 'react';
import type { Preset } from '../../types';
import '../../styles/PresetSelector.css';
interface PresetSelectorProps {
  presets: Preset[];
  selectedPreset: string;
  onSelectPreset: (preset: Preset) => void;
}

const PresetSelector: React.FC<PresetSelectorProps> = ({
  presets,
  selectedPreset,
  onSelectPreset
}) => {
  return (
    <div className="preset-section">
      <h4>Preset Selection</h4>
      <div className="preset-buttons">
        {presets.map(preset => {
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className={`preset-btn ${selectedPreset === preset.id ? 'selected' : ''}`}
            >
              {preset.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default PresetSelector;
