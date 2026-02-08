import React, { useState, useEffect } from 'react';
import '../styles/BoardView.css';
import { Board } from '../types/simulation';
import TwoDBoard from './TwoDBoard';
import ThreeDBoardView from './ThreeDBoardView';
// import NDBoard from './NDBoard'; // NDBoard도 분리되어 있다고 가정
// 프론트엔드 뷰어(View)에서 필요한 부분만 "필터링"해서 보여주는 것이 important

interface BoardViewProps {
  board: Board | null;
  onCellClick?: (coordinates: number[]) => void;
  onCellRightClick?: (coordinates: number[]) => void;
}

const BoardView: React.FC<BoardViewProps> = ({ 
  board, 
  onCellClick, 
  onCellRightClick 
}) => {
  const [sliceIndex, setSliceIndex] = useState(0);
  const [sliceDimension, setSliceDimension] = useState(2);

  // 보드가 변경될 때(예: 2D -> 3D) 슬라이스 설정 초기화
  useEffect(() => {
    if (board && board.dimensions.length > 2) {
      setSliceIndex(0);
      setSliceDimension(2); // 3번째 차원(Z축)을 기본 슬라이스로 설정
    }
  }, [board?.dimensions.length]);

  if (!board) {
    return (
      <div className="board-container empty">
        <div className="empty-message">
          <p>🎮 No board data available.</p>
          <p>Start a simulation to see the board.</p>
        </div>
      </div>
    );
  }

  const dimensionCount = board.dimensions.length;
  const is2D = dimensionCount === 2;
  const is3D = dimensionCount === 3; // 3D check

  return (
    <div className="board-view-wrapper">
      <header className="board-header">
        <div className="header-main">
          <h2>{dimensionCount}D Minesweeper</h2>
          <span className={`status-badge ${board.game_over ? 'over' : board.game_won ? 'won' : 'playing'}`}>
            {board.game_over ? '💥 Game Over' : board.game_won ? '🎉 You Win!' : '🎮 Playing'}
          </span>
        </div>
        <div className="board-info">
          <span>📏 Size: <strong>{board.dimensions.join(' × ')}</strong></span>
          <span>💣 Mines: <strong>{board.mines}</strong></span>
        </div>
      </header>

      <main className={`board-content ${is3D ? 'is-3d' : ''}`}>
        {is2D ? (
            <TwoDBoard board={board} onCellClick={onCellClick} />
        ) : is3D ? (
            <ThreeDBoardView board={board} onCellClick={onCellClick} />
        ) : (
            <div style={{ padding: '2rem', color: 'white' }}>
      <h3>{dimensionCount}D Mode Enabled</h3>
      <p>Slice Dimension: {sliceDimension}</p>
      <p>Slice Index: {sliceIndex}</p>
      <p>(NDBoard 컴포넌트를 연결해주세요)</p>
    </div>
        //   <NDBoard 
        //     board={board}
        //     sliceIndex={sliceIndex}
        //     sliceDimension={sliceDimension}
        //     onSliceChange={setSliceIndex}
        //     onSliceDimensionChange={setSliceDimension}
        //     onCellClick={onCellClick}
        //     onCellRightClick={onCellRightClick}
        //   />
        )}
      </main>

      <footer className="board-footer">
        <div className="stat-item">Revealed: {board.total_revealed}</div>
        <div className="stat-item">Clicks: {board.total_clicks}</div>
      </footer>
    </div>
  );
};

export default BoardView;