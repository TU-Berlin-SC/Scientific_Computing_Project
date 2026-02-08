import React from 'react';
import type { Preset } from '../../types';
import '../../styles/PresetSelector.css';
interface PresetSelectorProps {
  presets: Preset[];
  selectedPreset: string;
  useNDimensions: boolean;
  onSelectPreset: (preset: Preset) => void;
}

const PresetSelector: React.FC<PresetSelectorProps> = ({
  presets,
  selectedPreset,
  useNDimensions,
  onSelectPreset
}) => (
  <div className="preset-section">
    <h4>Preset Selection</h4>
    <div className="preset-buttons">
      {presets.map(preset => (
        <button
          key={preset.id}
          onClick={() => onSelectPreset(preset)}
          className={`preset-btn ${selectedPreset === preset.id ? 'selected' : ''}`}
          title={useNDimensions ? 
            `${preset.dimensions?.length || 2}D [${preset.dimensions?.join('×')}]` :
            `${preset.width}×${preset.height}, ${preset.mines} mines`
          }
        >
          {preset.name}
        </button>
      ))}
    </div>
  </div>
);

export default PresetSelector;
