import React from 'react';
import { Cell, Board } from '../types/simulation';

interface CellComponentProps {
  cell: Cell;
  board: Board; // 전체 보드 상태
  cellSize: number;
  onClick?: (coords: number[]) => void;
  onRightClick?: (coords: number[]) => void;
}

const CellComponent: React.FC<CellComponentProps> = ({ 
  cell, 
  board, 
  cellSize, 
  onClick, 
  onRightClick 
}) => {
  const isLost = board.game_over && !board.game_won;
  
  // 지뢰 공개 조건: 파헤쳐졌거나, 게임에서 졌을 때 지뢰인 경우
  const shouldShowMine = cell.is_mine && (cell.is_revealed || isLost);
  
  // 숫자 색상 로직 (선택 사항)
  const getNumberColor = (num: number) => {
    const colors = ['', '#2196f3', '#4caf50', '#f44336', '#9c27b0', '#ff9800', '#00bcd4', '#3f51b5', '#212121'];
    return colors[num] || 'white';
  };

  return (
    <div 
      className={`board-cell ${cell.is_revealed ? 'revealed' : ''} ${shouldShowMine ? 'mine' : ''}`}
      style={{ 
        width: cellSize, 
        height: cellSize, 
        fontSize: cellSize * 0.6,
        backgroundColor: shouldShowMine && isLost ? '#ff5252' : undefined // 졌을 때 지뢰 배경 빨간색
      }}
      onClick={() => onClick?.(cell.coordinates)}
      onContextMenu={(e) => {
        e.preventDefault();
        onRightClick?.(cell.coordinates);
      }}
    >
      {shouldShowMine ? (
        '💣'
      ) : cell.is_revealed && cell.adjacent_mines > 0 ? (
        <span style={{ color: getNumberColor(cell.adjacent_mines) }}>
          {cell.adjacent_mines}
        </span>
      ) : null}
    </div>
  );
};

export default CellComponent;