// TwoDBoard.tsx
import React, { useMemo } from 'react';
import type { Board } from '../../types/simulation';
import CellComponent from '../CellComponent';
import '../../styles/TwoDBoard.css';

interface TwoDBoardProps {
  board: Board;
  onCellClick?: (coordinates: number[]) => void;
  onCellRightClick?: (coordinates: number[]) => void;
}

const TwoDBoard: React.FC<TwoDBoardProps> = ({ board, onCellClick, onCellRightClick }) => {
  // 💡 기존 [width, height] = board.dimensions 를 아래와 같이 수정하여 3D 배열 데이터 대응
  const dims = board.dimensions;
  const width = dims[dims.length - 1]; // 마지막 값이 가로
  const height = dims[dims.length - 2] || 1; // 그 앞의 값이 세로

  const cellSize = Math.max(20, Math.min(45, 500 / Math.max(width, height)));

  return (
    <div className="two-d-view">
      <div 
        className="grid-container"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
          gap: '2px'
        }}
      >
  
      {board.cells.map((cell, index) => (
        <CellComponent
          key={`2d-${index}`}
          cell={cell}
          board={board}
          // coordinates={cell.coordinates} <-- 이 줄을 삭제하세요! (에러의 원인)
          onClick={onCellClick}
          onRightClick={onCellRightClick}
          cellSize={cellSize}
        />
      ))}
      </div>
    </div>
  );
};

export default TwoDBoard;