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
  // [width, height] = board.dimensions to handle cases where dimensions might be [1, width, height] or just [width, height]
  const dims = board.dimensions;
  const width = dims[dims.length - 1]; // last value is width
  const height = dims[dims.length - 2] || 1; // prev value is height, default to 1 if not present

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