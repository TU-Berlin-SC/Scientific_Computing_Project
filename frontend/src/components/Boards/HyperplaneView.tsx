import React, { useState, useRef, useMemo } from 'react';
import '../../styles/HyperplaneView.css';

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

interface HyperplaneViewProps {
  board: BoardLocal;
  onCellClick?: (coordinates: number[]) => void;
  onCellRightClick?: (coordinates: number[]) => void;
}

const HyperplaneView: React.FC<HyperplaneViewProps> = ({ 
  board, 
  onCellClick, 
  onCellRightClick 
}) => {
  // 💡 [수정] 누락되었던 Ref 선언 추가
  const containerRef = useRef<HTMLDivElement>(null);
  
  const dims = board.dimensions;
  const dimensionCount = dims.length;
  
  const [viewW, setViewW] = useState(0);
  const [isHologram, setIsHologram] = useState(false);
  const [rotation, setRotation] = useState({ x: 30, y: 45 });
  const [zoom, setZoom] = useState(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 💡 [수정] 차원 수에 상관없이 항상 마지막 인덱스부터 역순으로 할당
  // [..., W, Z, Y, X] 순서입니다.
  const X_IDX = dimensionCount - 1;
  const Y_IDX = dimensionCount - 2;
  const Z_IDX = dimensionCount - 3;
  const W_IDX = dimensionCount - 4;

  const width = dims[X_IDX];
  const height = dims[Y_IDX];
  const zDimension = dims[Z_IDX] || 1;
  const wDimension = dims[W_IDX] || 1;

  const handleZoom = (type: 'in' | 'out' | 'reset') => {
    setZoom(prev => {
      if (type === 'in') return Math.min(prev + 0.2, 3.5);
      if (type === 'out') return Math.max(prev - 0.2, 0.3);
      return 1.0;
    });
  };

  // 💡 [수정] W 차원 필터링 인덱스를 W_IDX로 고정
  const currentWCells = useMemo(() => 
    board.cells.filter(cell => (dimensionCount >= 4 ? cell.coordinates[W_IDX] === viewW : true)),
    [board.cells, viewW, dimensionCount, W_IDX]
  );

  const getCellClassName = (cell: CellLocal): string => {
    if (cell.is_revealed) {
      if (cell.is_mine) return 'cell-mine';
      if (cell.adjacent_mines > 0) return `cell-number cell-number-${Math.min(cell.adjacent_mines, 8)}`;
      return 'cell-empty';
    }
    if (cell.is_flagged) return 'cell-flagged';
    return 'cell-hidden';
  };

  const getCellContent = (cell: CellLocal): string => {
    if (!cell.is_revealed) return cell.is_flagged ? '🚩' : '';
    if (cell.is_mine) return '💣';
    return cell.adjacent_mines > 0 ? cell.adjacent_mines.toString() : '';
  };

  return (
    <div className="hyperplane-nd-view">
      <div className="w-nav-container">
        <div className="w-info">Dimension W: <strong>{viewW}</strong> / {wDimension - 1}</div>
        <div className="w-btn-row">
          {Array.from({ length: wDimension }).map((_, w) => (
            <button 
              key={`w-select-${w}`} 
              className={`w-btn ${viewW === w ? 'active' : ''}`}
              onClick={() => setViewW(w)}
            >
              W={w}
            </button>
          ))}
          <button className="view-toggle" onClick={() => setIsHologram(!isHologram)}>
            {isHologram ? 'Planes' : '3D View'}
          </button>
        </div>
      </div>

      <div className="view-stage">
        <div className="top-zoom-bar">
          <button onClick={() => handleZoom('out')} className="zoom-btn">🔍 -</button>
          <button onClick={() => handleZoom('reset')} className="zoom-btn reset">{Math.round(zoom * 100)}%</button>
          <button onClick={() => handleZoom('in')} className="zoom-btn">🔍 +</button>
        </div>

        {isHologram ? (
            <div 
              className="cube-canvas"
              ref={containerRef}
              style={{ 
                transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${zoom})`,
                transformStyle: 'preserve-3d'
              }}              
              onMouseDown={(e) => { setIsDragging(true); setDragStart({ x: e.clientX, y: e.clientY }); }}
              onMouseMove={(e) => {
                if (isDragging) {
                  const dx = e.clientX - dragStart.x;
                  const dy = e.clientY - dragStart.y;
                  setRotation(r => ({ y: r.y + dx * 0.5, x: Math.max(-90, Math.min(90, r.x - dy * 0.5)) }));
                  setDragStart({ x: e.clientX, y: e.clientY });
                }
              }}
              onMouseUp={() => setIsDragging(false)}
            >
              {currentWCells.map((cell, idx) => {
                // 💡 [수정] 3D 큐브 모드에서도 동적 인덱스 사용
                const x = cell.coordinates[X_IDX];
                const y = cell.coordinates[Y_IDX];
                const z = cell.coordinates[Z_IDX] || 0;
                return (
                  <div
                    key={`cell-3d-${idx}`}
                    className={`cell-3d ${getCellClassName(cell)}`}
                    style={{
                      left: `${(x / width) * 100}%`,
                      top: `${(y / height) * 100}%`,
                      transform: `translate3d(-50%, -50%, ${(z - (zDimension-1)/2) * 50}px)`,
                    }}
                    onClick={() => onCellClick?.(cell.coordinates)}
                  >
                    {getCellContent(cell)}
                  </div>
                );
              })}
            </div>
        ) : (
          <div 
            className="perspective-stack"
            style={{ 
              transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${zoom})`,
              transformStyle: 'preserve-3d'
            }}
            onMouseDown={(e) => { 
              setIsDragging(true); 
              setDragStart({ x: e.clientX, y: e.clientY }); 
            }}
            onMouseMove={(e) => {
              if (isDragging) {
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
            {Array.from({ length: zDimension }).map((_, z) => (
              <div 
                key={`z-layer-group-${z}`} 
                className="layer-plane"
                style={{ transform: `translateZ(${(z - (zDimension-1)/2) * 80}px) translateY(${z * -20}px)` }}
              >
                <div className="layer-label">Z = {z}</div>
                <div 
                  className="layer-grid"
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: `repeat(${width}, 25px)`,
                  }}
                >
                  {/* 💡 [수정] Z_IDX를 사용하여 해당 층의 셀만 필터링 */}
                  {currentWCells
                    .filter(c => (dimensionCount >= 3 ? c.coordinates[Z_IDX] === z : true))
                    .map((cell, idx) => (
                      <div
                        key={`cell-2d-${z}-${idx}`}
                        className={`board-cell ${getCellClassName(cell)}`}
                        style={{ width: 25, height: 25 }}
                        onClick={() => onCellClick?.(cell.coordinates)}
                        onContextMenu={(e) => { e.preventDefault(); onCellRightClick?.(cell.coordinates); }}
                      >
                        {getCellContent(cell)}
                      </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HyperplaneView;