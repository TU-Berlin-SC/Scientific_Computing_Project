// export default InteractiveNDBoard;
import React, { useState, useRef, useEffect } from 'react';
import './InteractiveNDBoard.css';

// Type Definition
interface CellLocal {
  is_mine: boolean;
  is_revealed: boolean;
  is_flagged: boolean;
  adjacent_mines: number;
  coordinates: number[];
}

interface BoardLocal {
  dimensions: number[];
  mines: number;
  cells: CellLocal[];
  game_over: boolean;
  game_won: boolean;
  total_revealed: number;
  total_clicks: number;
}

interface InteractiveNDBoardProps {
  board: BoardLocal;
  onCellClick?: (coordinates: number[]) => void;
  onCellRightClick?: (coordinates: number[]) => void;
}

const InteractiveNDBoard: React.FC<InteractiveNDBoardProps> = ({ 
  board, 
  onCellClick, 
  onCellRightClick 
}) => {
  const dimensionCount = board.dimensions.length;
  const [activeView, setActiveView] = useState<'2D' | '3D' | '4D'>(
    dimensionCount >= 4 ? '4D' : dimensionCount === 3 ? '3D' : '2D'
  );
  
  const [rotation, setRotation] = useState({ x: 30, y: 45 });
  const [currentW, setCurrentW] = useState(0);
  const [selectedCell, setSelectedCell] = useState<number[] | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewW, setViewW] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const wDimension = board.dimensions[3] || 1;

  // 셀 상태에 따른 클래스명
  const getCellClassName = (cell: CellLocal): string => {
    if (cell.is_revealed) {
      if (cell.is_mine) return 'cell-mine';
      if (cell.adjacent_mines > 0) return `cell-number cell-number-${Math.min(cell.adjacent_mines, 8)}`;
      return 'cell-empty';
    }
    if (cell.is_flagged) return 'cell-flagged';
    return 'cell-hidden';
  };

  // 셀 내용
  const getCellContent = (cell: CellLocal): string => {
    if (!cell.is_revealed) {
      return cell.is_flagged ? '🚩' : '';
    }
    if (cell.is_mine) return '💣';
    if (cell.adjacent_mines > 0) return cell.adjacent_mines.toString();
    return '';
  };

  // ========== 2D View ==========
  const render2DView = () => {
    // Always use the first two dimensions (X, Y) for 2D board display
    const width = board.dimensions[0];
    const height = board.dimensions[1];
    const cellSize = Math.max(25, Math.min(40, 500 / Math.max(width, height)));

    // Fix the current Z, W values for 3D and higher dimensions
    const cellsToShow = board.cells.filter(cell => {
      if (dimensionCount <= 2) return true;
      
      // Only show cells matching current Z and W when in 3D or higher
      for (let i = 2; i < dimensionCount; i++) {
        if (i === 2 && cell.coordinates[2] !== currentW) return false; // Z축
        if (i === 3 && cell.coordinates[3] !== viewW) return false; // W축
        if (i > 3 && cell.coordinates[i] !== 0) return false; // 그 이상 차원
      }
      return true;
    });

    return (
      <div className="two-d-view">
        <h4>2D View 
          {dimensionCount >= 3 && ` at Z=${currentW}`}
          {dimensionCount >= 4 && `, W=${viewW}`}
        </h4>
        <div 
          className="board-grid"
          style={{
            gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
            gridTemplateRows: `repeat(${height}, ${cellSize}px)`
          }}
        >
          {cellsToShow.map((cell, index) => {
            const x = cell.coordinates[0];
            const y = cell.coordinates[1];
            
            return (
              <div
                key={index}
                className={`board-cell ${getCellClassName(cell)}`}
                onClick={() => {
                  onCellClick?.(cell.coordinates);
                  setSelectedCell(cell.coordinates);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onCellRightClick?.(cell.coordinates);
                }}
                title={`(${cell.coordinates.join(', ')}) - 주변 지뢰: ${cell.adjacent_mines}`}
                style={{ width: cellSize, height: cellSize }}
              >
                {getCellContent(cell)}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ========== 3D View ==========
  const render3DView = () => {
    const [width, height, depth] = board.dimensions;
    
    // Fix current W value in 4 D
    const cellsToShow = board.cells.filter(cell => {
      if (dimensionCount <= 3) return true;
      return cell.coordinates[3] === viewW; // W값이 일치하는 셀만
    });

    return (
      <div className="three-d-view">
        <div className="view-header">
          <h4>3D View {dimensionCount >= 4 && `at W=${viewW}`}</h4>
          <div className="simple-controls">
            <button onClick={() => setRotation(r => ({ ...r, y: r.y + 15 }))}>
              ↪️ Rotate Right
            </button>
            <button onClick={() => setRotation(r => ({ ...r, y: r.y - 15 }))}>
              ↩️ Rotate Left
            </button>
          </div>
        </div>

        <div 
          className="cube-container"
          style={{
            transform: `
              perspective(1000px)
              rotateX(${rotation.x}deg)
              rotateY(${rotation.y}deg)
            `
          }}
          ref={containerRef}
          onMouseDown={(e) => {
            setIsDragging(true);
            setDragStart({ x: e.clientX, y: e.clientY });
          }}
          onMouseMove={(e) => {
            if (isDragging && containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;
              
              const dx = e.clientX - dragStart.x;
              const dy = e.clientY - dragStart.y;
              
              setRotation(r => ({
                y: r.y + dx * 0.5,
                x: Math.max(-90, Math.min(90, r.x - dy * 0.5))
              }));
              setDragStart({ x: e.clientX, y: e.clientY });
            }
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        >
          {/* 3D Grid Line */}
          <div className="grid-lines">
            {Array.from({ length: width + 1 }).map((_, i) => (
              <div 
                key={`x-${i}`}
                className="grid-line x-line"
                style={{ left: `${(i / width) * 100}%` }}
              />
            ))}
            {Array.from({ length: height + 1 }).map((_, i) => (
              <div 
                key={`y-${i}`}
                className="grid-line y-line"
                style={{ top: `${(i / height) * 100}%` }}
              />
            ))}
          </div>

          {/* 3D 셀들 */}
          {cellsToShow.map((cell, index) => {
            const [x, y, z] = cell.coordinates;
            const cellSize = 30;
            
            return (
              <div
                key={index}
                className={`cell-3d ${getCellClassName(cell)}`}
                style={{
                  left: `${(x / width) * 100}%`,
                  top: `${(y / height) * 100}%`,
                  transform: `translate3d(-50%, -50%, ${(z - depth/2) * 40}px)`,
                  width: cellSize,
                  height: cellSize,
                  fontSize: '12px'
                }}
                onClick={() => {
                  onCellClick?.(cell.coordinates);
                  setSelectedCell(cell.coordinates);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onCellRightClick?.(cell.coordinates);
                }}
                title={`(${cell.coordinates.join(', ')}) - 주변 지뢰: ${cell.adjacent_mines}`}
              >
                {getCellContent(cell)}
              </div>
            );
          })}
        </div>

        <div className="cube-help">
          <p>🎮 <strong>드래그</strong>로 3D 큐브를 회전하세요</p>
          <p>🖱️ <strong>클릭</strong>으로 셀을 열고, <strong>우클릭</strong>으로 깃발을 꽂으세요</p>
          {selectedCell && (
            <p className="selected-info">
              선택된 셀: [{selectedCell.join(', ')}]
            </p>
          )}
        </div>
      </div>
    );
  };

  // ========== 4D View ==========
  const render4DView = () => {
    // Show many 3D slices along W axis
    return (
      <div className="hypercube-view">
        <div className="hypercube-header">
          <h4>4D HyperCube View</h4>
          <p className="explanation">
            Shows many 4D slices as 3D views.
            Each cube represents a different W position.
          </p>
        </div>

        <div className="w-selector">
          <p>Current W value: <strong>{viewW}</strong></p>
          <div className="w-buttons">
            {Array.from({ length: wDimension }).map((_, w) => (
              <button
                key={w}
                className={`w-btn ${viewW === w ? 'active' : ''}`}
                onClick={() => setViewW(w)}
              >
                W={w}
              </button>
            ))}
          </div>
        </div>

        {/* Current Selected W Value's 3D View */}
        {render3DView()}

        {/* Preview W axis*/}
        <div className="w-preview">
          <h5>Preview overall W-axis (click to move)</h5>
          <div className="w-slices">
            {Array.from({ length: wDimension }).map((_, w) => {
              const cellsInW = board.cells.filter(cell => cell.coordinates[3] === w);
              const mineCount = cellsInW.filter(c => c.is_mine).length;
              const revealedCount = cellsInW.filter(c => c.is_revealed).length;
              
              return (
                <div 
                  key={w}
                  className={`w-slice ${viewW === w ? 'active' : ''}`}
                  onClick={() => setViewW(w)}
                  title={`W=${w} location\ntotal: ${cellsInW.length} cell:\n${mineCount} mines:\n${revealedCount} revealed`}
                >
                  <div className="slice-label">W={w}</div>
                  <div className="slice-stats">
                    <div>💣 {mineCount}</div>
                    <div>🚩 {cellsInW.filter(c => c.is_flagged).length}</div>
                    <div>✅ {revealedCount}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ========== Controls per Dimension ==========
  const renderDimensionControls = () => {
    if (dimensionCount <= 2) return null;

    return (
      <div className="dimension-controls">
        <h5>🧭 Dimension Controls</h5>
        
        {/* Z축 컨트롤 (3차원) */}
        {dimensionCount >= 3 && (
          <div className="dim-control">
            <label>Move Z-axis(3D):</label>
            <div className="slider-container">
              <input
                type="range"
                min="0"
                max={board.dimensions[2] - 1}
                value={currentW}
                onChange={(e) => setCurrentW(parseInt(e.target.value))}
                className="dim-slider"
              />
              <span className="slider-value">
                Z = {currentW} / {board.dimensions[2] - 1}
              </span>
            </div>
          </div>
        )}

        {/* W축 컨트롤 (4차원) */}
        {dimensionCount >= 4 && (
          <div className="dim-control">
            <label>Move W-axis(4D):</label>
            <div className="slider-container">
              <input
                type="range"
                min="0"
                max={wDimension - 1}
                value={viewW}
                onChange={(e) => setViewW(parseInt(e.target.value))}
                className="dim-slider"
              />
              <span className="slider-value">
                W = {viewW} / {wDimension - 1}
              </span>
            </div>
          </div>
        )}

        {/* Simple explanation */}
        <div className="dimension-help">
            <p>💡 <strong>What is dimension navigation?</strong></p>
            <p>Game boards with 3 or more dimensions are composed of multiple 2D/3D slices.</p>
            <p>Move the sliders to view different slices.</p>
        </div>
      </div>
    );
  };

// ========== Main Rendering ==========
return (
    <div className="interactive-nd-board">
      {/* Header */}
      <div className="nd-header">
        <h3>
          {dimensionCount === 2 ? '2D' : 
           dimensionCount === 3 ? '3D' : 
           `${dimensionCount}D`} Minesweeper
        </h3>
        <div className="nd-stats">
          <span>Size: [{board.dimensions.join('×')}]</span>
          <span>Total: {board.cells.length} cells</span>
          <span>💣 {board.mines} mines</span>
          <span>✅ {board.total_revealed} revealed</span>
        </div>
      </div>
  
      {/* View selection buttons */}
      <div className="view-selector">
        <div className="view-options">
          <button 
            className={activeView === '2D' ? 'active' : ''}
            onClick={() => setActiveView('2D')}
          >
            📐 2D View
          </button>
          {dimensionCount >= 3 && (
            <button 
              className={activeView === '3D' ? 'active' : ''}
              onClick={() => setActiveView('3D')}
            >
              🧊 3D View
            </button>
          )}
          {dimensionCount >= 4 && (
            <button 
              className={activeView === '4D' ? 'active' : ''}
              onClick={() => setActiveView('4D')}
            >
              🌌 4D View
            </button>
          )}
        </div>
      </div>
  
      {/* Current view display */}
      <div className="current-view">
        {activeView === '2D' && render2DView()}
        {activeView === '3D' && render3DView()}
        {activeView === '4D' && render4DView()}
      </div>
  
      {/* Dimension controls */}
      {renderDimensionControls()}
  
      {/* Help section */}
      <div className="simple-help">
        <h5>❓ How to Play</h5>
        <ul>
          <li><strong>🖱️ Left Click</strong>: Reveal cell</li>
          <li><strong>🖱️ Right Click</strong>: Place/remove flag</li>
          <li><strong>🎮 Drag</strong> (in 3D view): Rotate cube</li>
          {dimensionCount >= 3 && (
            <li><strong>🧭 Sliders</strong>: Navigate 3D+ dimensions</li>
          )}
          <li><strong>📊 Numbers</strong>: Adjacent mines (across all dimensions)</li>
        </ul>
        
        {dimensionCount >= 4 && (
          <div className="hypercube-help">
            <h6>🌌 What is a 4D Hypercube?</h6>
            <p>Think of 4D space as multiple 3D cubes.</p>
            <p>Each 3D cube is at a different position along the W-axis.</p>
            <p>Click W buttons to travel between different 3D spaces.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InteractiveNDBoard;