import React, { useState, useRef, useMemo } from 'react';
import '../styles/HyperplaneView.css';

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
  const dimensionCount = board.dimensions.length;
  const [viewW, setViewW] = useState(0);
  const [isHologram, setIsHologram] = useState(false);
  const [rotation, setRotation] = useState({ x: 30, y: 45 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1.0); // 줌 상태값
  const wDimension = board.dimensions[3] || 1;
  const zDimension = board.dimensions[2] || 1;
  const width = board.dimensions[0];
  const height = board.dimensions[1];
  

// 줌 핸들러: 한 번 클릭 시 20%씩 증감
const handleZoom = (type: 'in' | 'out' | 'reset') => {
  setZoom(prev => {
    if (type === 'in') return Math.min(prev + 0.2, 3.5); // 최대 3.5배
    if (type === 'out') return Math.max(prev - 0.2, 0.3); // 최소 0.3배
    return 1.0;
  });
};
  // 셀 상태 클래스 (기존 로직 유지)
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

  // 현재 W축 데이터 필터링
  const currentWCells = useMemo(() => 
    board.cells.filter(cell => cell.coordinates[3] === viewW),
    [board.cells, viewW]
  );

  return (
    <div className="hyperplane-nd-view">
      {/* 4D 이동 컨트롤러 */}
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
        {/* 우측 상단 줌 컨트롤 버튼 (사용자 요청 반영) */}
        <div className="top-zoom-bar">
          <button onClick={() => handleZoom('out')} className="zoom-btn" title="zoomout">🔍 -</button>
          <button onClick={() => handleZoom('reset')} className="zoom-btn reset" title="default">{Math.round(zoom * 100)}%</button>

          <button onClick={() => handleZoom('in')} className="zoom-btn" title="zoomin">🔍 +</button>

        </div>
        {isHologram ? (
            /* 기존 3D 큐브 렌더링 로직 (드래그 포함) */
            <div 
              className="cube-canvas"
              ref={containerRef}
              style={{ 
                /* ⭐ 여기에 scale(${zoom}) 추가! */
                transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${zoom})` 
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
                const [x, y, z] = cell.coordinates;
                return (
                  <div
                    key={`cell-3d-${idx}`}
                    className={`cell-3d ${getCellClassName(cell)}`}
                    style={{
                      left: `${(x / width) * 100}%`,
                      top: `${(y / height) * 100}%`,
                      transform: `translate3d(-50%, -50%, ${(z - zDimension/2) * 40}px)`,
                    }}
                    onClick={() => onCellClick?.(cell.coordinates)}
                  >
                    {getCellContent(cell)}
                  </div>
                );
              })}
            </div>
        ) : (
          /* 입체적인 Z-Layers (원하시던 계단식 뷰) */
          <div 
          className="perspective-stack"
          style={{ 
            transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${zoom})`,
            transformStyle: 'preserve-3d' // 3D 효과 유지
          }}
          /* ⭐ 아래 드래그 이벤트를 이 태그에도 넣어줘야 합니다! */
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
                style={{ transform: `translateZ(${z * 70}px) translateY(${z * -35}px)` }}
              >
                <div className="layer-label">Z = {z}</div>
                <div 
                  className="layer-grid"
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: `repeat(${width}, 25px)`,
                  }}
                >
                  {currentWCells.filter(c => c.coordinates[2] === z).map((cell, idx) => (
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