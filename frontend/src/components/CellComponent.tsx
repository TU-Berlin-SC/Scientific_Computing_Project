import React, { useMemo } from 'react';
import { Cell } from '../types/simulation';

interface CellComponentProps {
  cell: Cell;
  coordinates: number[];
  onClick?: (coordinates: number[]) => void;
  onRightClick?: (coordinates: number[]) => void;
  cellSize: number;
}

const CellComponent: React.FC<CellComponentProps> = ({
  cell,
  coordinates,
  onClick,
  onRightClick,
  cellSize
}) => {
  // 셀의 상태에 따른 클래스와 콘텐츠를 메모이제이션하여 성능 최적화
  const { className, content } = useMemo(() => {
    if (!cell.is_revealed) {
      return {
        className: cell.is_flagged ? 'cell-flagged' : 'cell-hidden',
        content: cell.is_flagged ? '🚩' : ''
      };
    }
    if (cell.is_mine) {
      return { className: 'cell-mine', content: '💣' };
    }
    return {
      className: cell.adjacent_mines > 0 ? `cell-number cell-number-${cell.adjacent_mines}` : 'cell-empty',
      content: cell.adjacent_mines > 0 ? cell.adjacent_mines.toString() : ''
    };
  }, [cell.is_revealed, cell.is_flagged, cell.is_mine, cell.adjacent_mines]);

  const title = `Coordinates: [${coordinates.join(', ')}]\nMines around: ${cell.adjacent_mines}`;

  return (
    <div
      className={`board-cell ${className}`}
      onClick={() => onClick?.(coordinates)}
      onContextMenu={(e) => {
        e.preventDefault();
        onRightClick?.(coordinates);
      }}
      title={title}
      style={{
        width: cellSize,
        height: cellSize,
        lineHeight: `${cellSize}px`, // 텍스트 중앙 정렬 도움
        fontSize: Math.max(12, cellSize * 0.6)
      }}
    >
      {content}
    </div>
  );
};

export default CellComponent;