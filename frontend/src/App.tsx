import React, { useState } from 'react';
import Header from './components/Header';
import Menu from './components/Menu';
import BoardView from './components/BoardView'; // 리팩토링한 보드 뷰
import type { GameConfig, Preset } from './types';

// 1. 여기에 defaultPresets를 정의해 줍니다! (함수 밖이나 안, 상관없지만 밖이 깔끔합니다)
const defaultPresets: Preset[] = [
  { id: 'preset1', name: 'Easy (9x9)', width: 9, height: 9, mines: 10 },
  { id: 'preset2', name: 'Medium (16x16)', width: 16, height: 16, mines: 40 },
  { id: 'preset3', name: 'Hard (30x16)', width: 30, height: 16, mines: 99 },
];
// TEST
const createDummyBoard = (dimensions: number[], mineCount: number) => {
  const numDimensions = dimensions.length;
  let cells = [];

  // 1. 3D 큐브 모드 전용 생성 (dimensions가 [6, size, size]인 경우)
  if (numDimensions === 3 && dimensions[0] === 6) {
    const [faces, rows, cols] = dimensions;
    for (let f = 0; f < faces; f++) {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          cells.push({
            coordinates: [f, y, x], // 3D 뷰어가 좋아하는 [면, 행, 열] 순서 고정
            is_revealed: Math.random() > 0.9,
            is_mine: Math.random() < 0.1,
            is_flagged: false,
            adjacent_mines: Math.floor(Math.random() * 4),
          });
        }
      }
    }
  } 
  // 2. 2D 또는 4D 이상 N차원 범용 생성
  else {
    const totalCells = dimensions.reduce((a, b) => a * b, 1);
    for (let i = 0; i < totalCells; i++) {
      let coords: number[] = [];
      let tempIndex = i;
      for (let d = 0; d < numDimensions; d++) {
        coords.push(tempIndex % dimensions[d]);
        tempIndex = Math.floor(tempIndex / dimensions[d]);
      }
      cells.push({
        coordinates: coords,
        is_revealed: Math.random() > 0.9,
        is_mine: Math.random() < 0.1,
        is_flagged: false,
        adjacent_mines: Math.floor(Math.random() * 4),
      });
    }
  }

  return { 
    dimensions, 
    mines: mineCount, 
    cells, 
    game_over: false, 
    game_won: false, 
    total_revealed: 0, 
    total_clicks: 0 
  };
};
// const createDummyBoard = (dimensions: number[], mineCount: number) => {
//   const [faces, rows, cols] = dimensions; // [6, 3, 3]
//   const totalCells = faces * rows * cols;
  
//   const cells = [];
//   // 3중 반복문으로 생성해야 좌표 혼동이 없습니다.
//   for (let f = 0; f < faces; f++) {
//     for (let y = 0; y < rows; y++) {
//       for (let x = 0; x < cols; x++) {
//         cells.push({
//           coordinates: [f, y, x],
//           is_revealed: Math.random() > 0.8,
//           is_mine: Math.random() < 0.1,
//           is_flagged: false,
//           adjacent_mines: Math.floor(Math.random() * 4),
//         });
//       }
//     }
//   }

//   return { 
//     dimensions, 
//     mines: mineCount, 
//     cells, 
//     game_over: false, 
//     game_won: false, 
//     total_revealed: 0, 
//     total_clicks: 0, 
//     last_click_idx: 0 
//   };
// };

const App: React.FC = () => {
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    useNDimensions: false,
    dimensionCount: 3,
    dimensions: [3, 3, 3],
    width: 9,
    height: 9,
    mines: 10,
  });
  
  const [wasm] = useState(true);
  const [boardState, setBoardState] = useState<any>(null); // 시뮬레이터 상태 저장
// TEST용 나중엔 백앤드에서 ㄱ
const handleCreateBoard = () => {
  let finalDimensions: number[];
  
  if (gameConfig.useNDimensions && Number(gameConfig.dimensionCount) === 3) {
    // 3D 큐브 모드: [6, size, size]
    const size = gameConfig.dimensions[0] || 3;
    finalDimensions = [6, size, size];
  } else if (gameConfig.useNDimensions) {
    // 4D 이상 N차원
    finalDimensions = gameConfig.dimensions;
  } else {
    // 일반 2D 모드: [width, height]
    finalDimensions = [gameConfig.width, gameConfig.height];
  }

  console.log("🛠️ 최종 생성 Dimensions:", finalDimensions);
  
  // 수정된 createDummyBoard 호출
  const dummyBoard = createDummyBoard(finalDimensions, gameConfig.mines);
  setBoardState(dummyBoard);
};
  // const handleCreateBoard = () => {
  //   // 실제 WASM 시뮬레이터 연동 전까지 테스트용 더미 데이터를 생성합니다.
  //   const dimensions = gameConfig.useNDimensions 
  //     ? gameConfig.dimensions 
  //     : [gameConfig.width, gameConfig.height];

  //   const dummyBoard = {
  //     dimensions: dimensions,
  //     mines: gameConfig.mines,
  //     cells: Array.from({ length: dimensions.reduce((a, b) => a * b, 1) }, (_, i) => ({
  //       coordinates: gameConfig.useNDimensions ? [] : [i % dimensions[0], Math.floor(i / dimensions[0])],
  //       is_revealed: false,
  //       is_mine: Math.random() < 0.1,
  //       is_flagged: false,
  //       adjacent_mines: 0
  //     })),
  //     game_over: false,
  //     game_won: false,
  //     total_revealed: 0,
  //     total_clicks: 0
  //   };

  //   setBoardState(dummyBoard);
  // };

  return (
    <div className="App">
      <Header useNDimensions={gameConfig.useNDimensions} />
      
      <Menu 
        config={gameConfig}
        setConfig={setGameConfig}
        presets={defaultPresets} // 이제 이 변수가 정의되어 에러가 사라집니다.
        wasm={wasm}
        simulator={!!boardState}
        onCreateBoard={handleCreateBoard}
      />

      <main>
        <BoardView 
          board={boardState} 
          onCellClick={(coords) => console.log('Clicked:', coords)}
        />
      </main>
    </div>
  );
};

export default App;