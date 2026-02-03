// src/components/BoardView.tsx
import React, { useState, useEffect } from 'react';
import './BoardView.css';
import { Board, Cell, is2DBoard, getBoardSizeLabel } from '../types/simulation';

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

  if (!board) {
    return (
      <div className="board-container empty">
        <div className="empty-message">
          <p>No board data available.</p>
          <p>Start a simulation to see the board.</p>
        </div>
      </div>
    );
  }

  const dimensionCount = board.dimensions.length;
  const is2D = is2DBoard(board.dimensions);

  return (
    <div className="board-container">
      <div className="board-header">
        <h3>{dimensionCount}D Minesweeper</h3>
        <div className="board-info">
          <span className="size-label">
            Size: {getBoardSizeLabel(board.dimensions)}
          </span>
          <span className="mines-label">
            Mines: {board.mines}
          </span>
          <span className="cells-label">
            Cells: {board.cells.length}
          </span>
        </div>
      </div>

      {is2D ? (
        <TwoDBoard 
          board={board}
          onCellClick={onCellClick}
          onCellRightClick={onCellRightClick}
        />
      ) : (
        <NDBoard 
          board={board}
          sliceIndex={sliceIndex}
          sliceDimension={sliceDimension}
          onSliceChange={setSliceIndex}
          onSliceDimensionChange={setSliceDimension}
          onCellClick={onCellClick}
          onCellRightClick={onCellRightClick}
        />
      )}

      <div className="board-status">
        <div className={`status-indicator ${board.game_over ? 'game-over' : board.game_won ? 'game-won' : 'in-progress'}`}>
          {board.game_over ? '💥 Game Over' : board.game_won ? '🎉 You Win!' : '🎮 In Progress'}
        </div>
        <div className="stats">
          <span>Revealed: {board.total_revealed}</span>
          <span>Clicks: {board.total_clicks}</span>
        </div>
      </div>
    </div>
  );
};

// 2D 보드 렌더링 컴포넌트
interface TwoDBoardProps {
  board: Board;
  onCellClick?: (coordinates: number[]) => void;
  onCellRightClick?: (coordinates: number[]) => void;
}

const TwoDBoard: React.FC<TwoDBoardProps> = ({ board, onCellClick, onCellRightClick }) => {
  const width = board.dimensions[0];
  const height = board.dimensions[1];
  
  const cellSize = Math.max(20, Math.min(40, 400 / Math.max(width, height)));

  return (
    <div className="two-d-board">
      <div 
        className="board-grid"
        style={{
          gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${height}, ${cellSize}px)`
        }}
      >
        {board.cells.map((cell, index) => {
          const x = cell.coordinates[0];
          const y = cell.coordinates[1];
          
          return (
            <CellComponent
              key={index}
              cell={cell}
              coordinates={[x, y]}
              onClick={onCellClick}
              onRightClick={onCellRightClick}
              cellSize={cellSize}
            />
          );
        })}
      </div>
    </div>
  );
};

// N차원 보드 렌더링 컴포넌트 (3D, 4D 등)
interface NDBoardProps {
  board: Board;
  sliceIndex: number;
  sliceDimension: number;
  onSliceChange: (index: number) => void;
  onSliceDimensionChange: (dimension: number) => void;
  onCellClick?: (coordinates: number[]) => void;
  onCellRightClick?: (coordinates: number[]) => void;
}

const NDBoard: React.FC<NDBoardProps> = ({
  board,
  sliceIndex,
  sliceDimension,
  onSliceChange,
  onSliceDimensionChange,
  onCellClick,
  onCellRightClick
}) => {
  const dimensionCount = board.dimensions.length;
  
  const sliceCells = board.cells.filter(cell => 
    cell.coordinates[sliceDimension] === sliceIndex
  );
  
  const remainingDims = board.dimensions.filter((_, idx) => idx !== sliceDimension);
  const width = remainingDims[0] || 1;
  const height = remainingDims[1] || 1;
  
  const cellSize = Math.max(15, Math.min(30, 300 / Math.max(width, height)));

  return (
    <div className="n-d-board">
      <div className="slice-controls">
        <div className="dimension-selector">
          <label>Slice Dimension: </label>
          <select 
            value={sliceDimension}
            onChange={(e) => onSliceDimensionChange(parseInt(e.target.value))}
          >
            {board.dimensions.map((size, idx) => (
              <option key={idx} value={idx}>
                Dimension {idx + 1} ({size} cells)
              </option>
            ))}
          </select>
        </div>
        
        <div className="slice-navigation">
          <button 
            onClick={() => onSliceChange(Math.max(0, sliceIndex - 1))}
            disabled={sliceIndex === 0}
          >
            ◀ Previous
          </button>
          
          <div className="slice-info">
            <span className="slice-position">
              Slice {sliceIndex + 1} of {board.dimensions[sliceDimension]}
            </span>
            <input
              type="range"
              min="0"
              max={board.dimensions[sliceDimension] - 1}
              value={sliceIndex}
              onChange={(e) => onSliceChange(parseInt(e.target.value))}
              className="slice-slider"
            />
          </div>
          
          <button 
            onClick={() => onSliceChange(Math.min(board.dimensions[sliceDimension] - 1, sliceIndex + 1))}
            disabled={sliceIndex === board.dimensions[sliceDimension] - 1}
          >
            Next ▶
          </button>
        </div>
      </div>

      <div className="slice-view">
        <div className="slice-header">
          <h4>
            {dimensionCount}D Board - Slice View
          </h4>
          <p className="slice-description">
            Showing slice where Dimension {sliceDimension + 1} = {sliceIndex}
          </p>
        </div>

        <div 
          className="board-grid"
          style={{
            gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${height}, ${cellSize}px)`
          }}
        >
          {Array.from({ length: width * height }).map((_, index) => {
            const x2d = index % width;
            const y2d = Math.floor(index / width);
            
            const originalCoords = new Array(dimensionCount).fill(0);
            let coordIdx = 0;
            for (let i = 0; i < dimensionCount; i++) {
              if (i === sliceDimension) {
                originalCoords[i] = sliceIndex;
              } else {
                originalCoords[i] = coordIdx === 0 ? x2d : y2d;
                coordIdx++;
              }
            }
            
            const cell = sliceCells.find(c => 
              c.coordinates.every((coord, idx) => coord === originalCoords[idx])
            );
            
            if (!cell) {
              return (
                <div 
                  key={index}
                  className="board-cell empty-slice"
                  style={{ width: cellSize, height: cellSize }}
                />
              );
            }
            
            return (
              <CellComponent
                key={index}
                cell={cell}
                coordinates={originalCoords}
                onClick={onCellClick}
                onRightClick={onCellRightClick}
                cellSize={cellSize}
              />
            );
          })}
        </div>
      </div>

      <div className="dimension-visualization">
        <h5>Dimension Visualization</h5>
        <div className="dimension-list">
          {board.dimensions.map((size, idx) => (
            <div 
              key={idx}
              className={`dimension-item ${idx === sliceDimension ? 'active' : ''}`}
              onClick={() => onSliceDimensionChange(idx)}
            >
              <span className="dimension-label">D{idx + 1}</span>
              <span className="dimension-size">{size}</span>
              {idx === sliceDimension && (
                <span className="slice-indicator">●</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 셀 컴포넌트 (공통)
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
  const handleClick = () => {
    onClick?.(coordinates);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onRightClick?.(coordinates);
  };

  const className = `board-cell ${getCellClassName(cell)}`;
  const content = getCellContent(cell);
  const title = `Coordinates: [${coordinates.join(', ')}]\nMines around: ${cell.adjacent_mines}`;

  return (
    <div
      className={className}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      title={title}
      style={{
        width: cellSize,
        height: cellSize,
        fontSize: Math.max(12, cellSize * 0.6)
      }}
    >
      {content}
    </div>
  );
};

// 셀 클래스 이름 결정
function getCellClassName(cell: Cell): string {
  if (cell.is_revealed) {
    if (cell.is_mine) return 'cell-mine';
    if (cell.adjacent_mines > 0) return `cell-number cell-number-${cell.adjacent_mines}`;
    return 'cell-empty';
  }
  if (cell.is_flagged) return 'cell-flagged';
  return 'cell-hidden';
}

// 셀 내용 결정
function getCellContent(cell: Cell): string {
  if (!cell.is_revealed) {
    return cell.is_flagged ? '🚩' : '';
  }
  if (cell.is_mine) return '💣';
  if (cell.adjacent_mines > 0) return cell.adjacent_mines.toString();
  return '';
}

export default BoardView;