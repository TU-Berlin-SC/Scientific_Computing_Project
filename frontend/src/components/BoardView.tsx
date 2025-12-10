// A React component to render the Minesweeper board.
// src/components/BoardView.tsx
import React from 'react';
import { Board, Cell } from '../types/simulation';
import './BoardView.css';

interface BoardViewProps {
  board: Board;
  onCellClick?: (x: number, y: number) => void;
  onCellRightClick?: (x: number, y: number) => void;
}

const BoardView: React.FC<BoardViewProps> = ({ board, onCellClick, onCellRightClick }) => {
  const handleContextMenu = (e: React.MouseEvent, x: number, y: number) => {
    e.preventDefault();
    onCellRightClick?.(x, y);
  };

  const getCellContent = (cell: Cell) => {
    if (cell.is_flagged) return '🚩';
    if (!cell.is_revealed) return '';
    if (cell.is_mine) return '💣';
    if (cell.adjacent_mines > 0) return cell.adjacent_mines;
    return '';
  };

  const getCellClassName = (cell: Cell) => {
    let className = 'cell';
    if (!cell.is_revealed) className += ' hidden';
    if (cell.is_mine && cell.is_revealed) className += ' mine';
    if (cell.is_flagged) className += ' flagged';
    if (cell.adjacent_mines > 0) className += ` number-${cell.adjacent_mines}`;
    return className;
  };

  return (
    <div className="board" style={{ gridTemplateColumns: `repeat(${board.width}, 30px)` }}>
      {board.cells.map((cell, index) => (
        <div
          key={index}
          className={getCellClassName(cell)}
          onClick={() => onCellClick?.(cell.x, cell.y)}
          onContextMenu={(e) => handleContextMenu(e, cell.x, cell.y)}
        >
          {getCellContent(cell)}
        </div>
      ))}
    </div>
  );
};

export default BoardView;