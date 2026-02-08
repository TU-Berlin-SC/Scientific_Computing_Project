import React, { useMemo } from 'react'; // 👈 useMemo 추가 확인!
import { Board } from '../types/simulation';
import CellComponent from './CellComponent';
import '../styles/TwoDBoard.css'; // 2D 전용 CSS 임포트

interface TwoDBoardProps {
  board: Board;
  onCellClick?: (coordinates: number[]) => void;
  onCellRightClick?: (coordinates: number[]) => void;
}

const TwoDBoard: React.FC<TwoDBoardProps> = ({ board, onCellClick, onCellRightClick }) => {
  const [width, height] = board.dimensions;
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
            coordinates={cell.coordinates}
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