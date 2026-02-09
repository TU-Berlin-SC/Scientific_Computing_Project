import React from 'react';
import type { Preset } from '../../types';
import '../../styles/PresetSelector.css';
interface PresetSelectorProps {
  presets: Preset[];
  selectedPreset: string;
  onSelectPreset: (preset: Preset) => void;
}
// PresetSelector.tsx
// PresetSelector.tsx

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
          // 이름에 이미 '3D'나 '4D'가 포함되어 있다면 중복 방지를 위해 처리하거나,
          // 그냥 preset.name만 깔끔하게 출력합니다.
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className={`preset-btn ${selectedPreset === preset.id ? 'selected' : ''}`}
            >
              {/* 중복된 3D/4D 텍스트가 안 나오도록 name만 출력 */}
              {preset.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default PresetSelector;
