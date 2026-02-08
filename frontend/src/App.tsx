import React, { useState } from 'react';
import Header from './components/Header';
import Menu from './components/Menu';
import type { GameConfig, Preset } from './types';

const defaultPresets: Preset[] = [
  { id: 'preset1', name: 'Easy', width: 9, height: 9, mines: 10 },
  { id: 'preset2', name: 'Medium', width: 16, height: 16, mines: 40 },
  { id: 'preset3', name: 'Hard', width: 30, height: 16, mines: 99 },
];

const App: React.FC = () => {
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    useNDimensions: false,
    dimensionCount: 3,
    dimensions: [3, 3, 3],
    width: 9,
    height: 9,
    mines: 10,
  });
  
  // 게임 실행 상태들
  const [wasm] = useState(true);
  const [simulator] = useState(false);

  // 로직 함수들
  const handleCreateBoard = () => {
    console.log("Creating Board with:", gameConfig);
    alert(gameConfig.useNDimensions ? "N-Dimensional board created!" : "2D board created!");
  };

  return (
    <div className="App">
      <Header useNDimensions={gameConfig.useNDimensions} />
      
      {/* 설정 메뉴 컨테이너 */}
      <Menu 
        config={gameConfig}
        setConfig={setGameConfig}
        presets={defaultPresets}
        wasm={wasm}
        simulator={simulator}
        onCreateBoard={handleCreateBoard}
      />

      {/* 여기에 나중에 RenderBoard 컴포넌트 등이 들어오겠죠? */}
    </div>
  );
};

export default App;