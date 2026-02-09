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
      // 프리셋의 실제 차원 배열 (4,4,4 등)
      const newDimensions = preset.dimensions 
        ? [...preset.dimensions] 
        : [preset.height || 9, preset.width || 9];
  
      const isND = newDimensions.length > 2;
      
      // 💡 핵심: 3D일 때도 엔진이 width/height를 참조하므로 
      // dimensions의 값을 width, height에 강제로 주입해야 합니다.
      const actualHeight = isND ? newDimensions[1] : (preset.height || 9);
      const actualWidth = isND ? newDimensions[2] : (preset.width || 9);
  
      return {
        ...prev,
        dimensions: newDimensions,
        dimensionCount: newDimensions.length,
        mines: preset.mines,
        useNDimensions: isND,
        width: actualWidth,  // 여기서 9가 아닌 4가 들어가야 함
        height: actualHeight // 여기서 9가 아닌 4가 들어가야 함
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

  // 1. 사용 가능한 차원 목록 (2, 3, 4...)
  const availableDimensions = [2, 3, 4];

  // 2. 현재 선택된 차원에 해당하는 프리셋들만 필터링 (Level 목록 추출용)
  const currentDimPresets = presets.filter(p => {
    const dim = p.dimensions?.length || 2;
    return dim === config.dimensionCount;
  });

  const handleSelectDimension = (d: number) => {
    // 차원 변경 시 해당 차원의 첫 번째 프리셋으로 자동 설정 (선택 사항)
    const firstPresetOfDim = presets.find(p => (p.dimensions?.length || 2) === d);
    if (firstPresetOfDim) {
      handleSelectPreset(firstPresetOfDim);
    } else {
      // 프리셋이 없으면 기본 수동 설정
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
            
            {/* 차원 선택 */}
            <select 
              className="styled-select"
              value={config.dimensionCount}
              onChange={(e) => handleSelectDimension(Number(e.target.value))}
            >
              {[2, 3, 4].map(d => <option key={d} value={d}>{d}D</option>)}
            </select>

            {/* 레벨 선택 */}
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

            {/* 메인 생성 버튼 */}
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
            {/* ConfigActions는 이제 버튼이 중복되므로 필요시 정보만 표시하거나 제거 */}
          </div>
        )}
      </div>
    </div>
  );
};
export default Menu;
