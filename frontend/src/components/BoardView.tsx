// // frontend/src/components/BoardView.tsx
// import React, { useState, useEffect, useMemo } from 'react';
// import '../styles/BoardView.css';
// import { Board } from '../types/simulation';
// import TwoDBoard from './Boards/TwoDBoard';
// import ThreeDBoardView from './Boards/ThreeDBoardView';
// import HyperplaneView from './Boards/HyperplaneView';

// interface BoardViewProps {
//   board: Board | null;
//   onCellClick?: (coordinates: number[]) => void;
//   onCellRightClick?: (coordinates: number[]) => void;
// }

// const BoardView: React.FC<BoardViewProps> = ({ 
//   board, 
//   onCellClick, 
//   onCellRightClick 
// }) => {
//   useEffect(() => {
//     if (!board) return;
    
//     // 🔍 디버깅 로그: 엔진에서 넘어온 실제 데이터 확인
//     console.group("🧩 Board View Diagnostics");
//     console.log("Full Dimensions Array:", board.dimensions);
//     console.log("Dimension Count:", board.dimensions.length);
//     console.log("Total Cells:", board.cells.length);
    
//     // 판정 로직 디버깅
//     const dims = board.dimensions;
//     const is2D = dims.length === 2 || (dims.length === 3 && dims[0] === 1);
//     const is3D = dims.length === 3 && dims[0] !== 1;
//     const is4DPlus = dims.length >= 4;
    
//     console.log("Determined Type:", is2D ? "2D" : is3D ? "3D Cube/Stack" : is4DPlus ? "ND Hyperplane" : "Unknown");
//     console.groupEnd();
//   }, [board]);

//   if (!board) {
//     return (
//       <div className="board-container empty">
//         <div className="empty-message">🎮 No board data available.</div>
//       </div>
//     );
//   }

//   const dims = board.dimensions;
//   const dimensionCount = dims.length;

//   // --- 💡 보드 타입 판정 로직 수정 ---
  
//   // 1. 2D 판정: [x, y] 이거나 [1, x, y] 처럼 깊이가 1인 경우
//   const isActually2D = dimensionCount === 2 || (dimensionCount === 3 && dims[0] === 1);
  
//   // 2. 3D 큐브 판정: 차원이 정확히 3개이고, 2D가 아닐 때 (예: [3, 3, 3])
//   // 기존의 dims[0] === 6 조건은 주사위 지뢰찾기 전용이므로, 일반 3D를 위해 수정합니다.
//   const isCube3D = dimensionCount === 3 && !isActually2D;
  
//   // 3. 4D 이상 판정
//   const isND = dimensionCount >= 4;

//   return (
//     <div className="board-view-wrapper">
//       <header className="board-header">
//         <div className="header-main">
//           <h2>{dimensionCount}D Minesweeper</h2>
//           <span className={`status-badge ${board.game_over ? 'over' : board.game_won ? 'won' : 'playing'}`}>
//             {board.game_over ? '💥 Over' : board.game_won ? '🎉 Won' : '🎮 Playing'}
//           </span>
//         </div>
//         <div className="board-info">
//           <span>📏 Size: <strong>{dims.join(' × ')}</strong></span>
//         </div>
//       </header>

//       <main className={`board-content ${isCube3D ? 'is-3d' : isND ? 'hyperplane' : ''}`}>
//         {isActually2D ? (
//             <TwoDBoard board={board} onCellClick={onCellClick} onCellRightClick={onCellRightClick} />
//         ) : isCube3D ? (
//             /* 💡 [3,3,3] 등 모든 3D 배열은 여기서 처리됩니다 */
//             <ThreeDBoardView board={board} onCellClick={onCellClick} />
//         ) : (
//             /* 💡 4D([3,3,3,3]) 등은 하이퍼플레인 뷰로 이동합니다 */
//             <HyperplaneView board={board} onCellClick={onCellClick} onCellRightClick={onCellRightClick} />
//         )}
//       </main>

//       <footer className="board-footer">
//         <div className="stat-item">Revealed: {board.total_revealed}</div>
//         <div className="stat-item">Clicks: {board.total_clicks}</div>
//       </footer>
//     </div>
//   );
// };
import React, { useEffect } from 'react';
import '../styles/BoardView.css';
import { Board } from '../types/simulation';
import TwoDBoard from './Boards/TwoDBoard';
import ThreeDBoardView from './Boards/ThreeDBoardView';
import HyperplaneView from './Boards/HyperplaneView';

interface BoardViewProps {
  board: Board | null;
  onCellClick?: (coordinates: number[]) => void;
  onCellRightClick?: (coordinates: number[]) => void;
}

const BoardView: React.FC<BoardViewProps> = ({ board, onCellClick, onCellRightClick }) => {
  
  useEffect(() => {
    if (!board) return;

    const dims = board.dimensions;
    const dimensionCount = dims.length;
    
    // ✅ 변수 정의 누락 해결
    const isActually2D = dimensionCount === 2 || (dimensionCount === 3 && dims[0] === 1);
    const isDice3D = dimensionCount === 3 && dims[0] === 6;
    const is4DPlus = dimensionCount >= 4;
    const isGeneral3D = dimensionCount === 3 && !isActually2D && !isDice3D;

    console.group("🔍 [DEBUG] Board Logic Trace");
    console.log("Dimensions:", dims);
    console.table({
      "Is 2D?": isActually2D,
      "Is Dice 3D?": isDice3D,
      "Is General 3D?": isGeneral3D,
      "Is 4D+?": is4DPlus
    });
    console.groupEnd();
  }, [board]);

  if (!board) return (
    <div className="board-container empty">
      <div className="empty-message">🎮 No board data available.</div>
    </div>
  );

  const dims = board.dimensions;
  const dimensionCount = dims.length;

  // 렌더링 분기 로직
  const isActually2D = dimensionCount === 2 || (dimensionCount === 3 && dims[0] === 1);
  const isDice3D = dimensionCount === 3 && dims[0] === 6;

  return (
    <div className="board-view-wrapper">
      <header className="board-header">
        <div className="header-main">
          <h2>{dimensionCount}D Minesweeper</h2>
          <span className={`status-badge ${board.game_over ? 'over' : board.game_won ? 'won' : 'playing'}`}>
            {board.game_over ? '💥 Over' : board.game_won ? '🎉 Won' : '🎮 Playing'}
          </span>
        </div>
        <div className="board-info">
          <span>📏 Size: <strong>{dims.join(' × ')}</strong></span>
        </div>
      </header>

      <main className="board-content">
        {isActually2D ? (
          <TwoDBoard board={board} onCellClick={onCellClick} onCellRightClick={onCellRightClick} />
        ) : isDice3D ? (
          <ThreeDBoardView board={board} onCellClick={onCellClick} />
        ) : (
          /* [3,3,3] 또는 [3,3,3,3] 등 고차원은 HyperplaneView에서 슬라이스로 렌더링 */
          <HyperplaneView board={board} onCellClick={onCellClick} onCellRightClick={onCellRightClick} />
        )}
      </main>

      <footer className="board-footer">
        <div className="stat-item">Revealed: {board.total_revealed} / {board.total_cells - board.mines}</div>
        <div className="stat-item">Clicks: {board.total_clicks}</div>
      </footer>
    </div>
  );
};

export default BoardView;