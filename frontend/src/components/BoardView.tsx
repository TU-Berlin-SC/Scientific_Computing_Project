// BoardView.tsx
import React, { useEffect } from 'react';
import '../styles/BoardView.css';
import { Board } from '../types/simulation';
import TwoDBoard from './Boards/TwoDBoard';
import ThreeDBoardView from './Boards/ThreeDBoardView';
import HyperplaneView from './Boards/HyperplaneView';
import { GameConfig } from '../types';

interface BoardViewProps {
  board: Board | null;
  onCellClick?: (coordinates: number[]) => void;
  onCellRightClick?: (coordinates: number[]) => void;
  gameConfig: GameConfig;
}

const BoardView: React.FC<BoardViewProps> = ({ board, onCellClick, onCellRightClick, gameConfig }) => {
  
  useEffect(() => {
    if (!board) return;

    const dims = board.dimensions;
    const dimensionCount = dims.length;
    const isActually2D = dimensionCount === 2 || (dimensionCount === 3 && dims[0] === 1);
    const isDice3D = dimensionCount === 3 && dims[0] === 6;
    const is4DPlus = dimensionCount >= 4;
    const isGeneral3D = dimensionCount === 3 && !isActually2D && !isDice3D;

    console.group("[DEBUG] Board Logic Trace");
    console.log("Dimensions:", dims);
    console.table({
      "Is 2D?": isActually2D,
      "Is Dice 3D?": isDice3D,
      "Is General 3D?": isGeneral3D,
      "Is 4D+?": is4DPlus
    });
    console.groupEnd();
  }, [board]);

  if (!board) return (
    <div className="board-container empty">
      <div className="empty-message">🎮 No board data available.</div>
    </div>
  );

  const dims = board.dimensions;
  const dimensionCount = dims.length;

  // IMPORTANT : Determines 3D rendering logic based on dimension count and specific configurations (like 6x9x9 for dice mode).
  const isActually2D = dimensionCount === 2 || (dimensionCount === 3 && dims[0] === 1);
  const isDice3D = dimensionCount === 3 && dims[0] === 6;

  return (
    <div className="board-view-wrapper">
      <header className="board-header">
        <div className="header-main">
          <h2>{dimensionCount}D Minesweeper</h2>
        </div>
        <div className="board-info">
          <span>  
            {/* ignore 6x9x9 (6 is face) and print game config settings*/}
                Size: {
                  gameConfig.dimensions && gameConfig.dimensions.length > 0
                    ? gameConfig.dimensions.join('×')
                    : `${gameConfig.height}×${gameConfig.width}`
                }
          </span>
     
        </div>
      </header>

      <main className="board-content">
        {isActually2D ? (
          <TwoDBoard board={board} onCellClick={onCellClick} onCellRightClick={onCellRightClick} />
        ) : isDice3D ? (
          <ThreeDBoardView board={board} onCellClick={onCellClick} />
        ) : (
          <HyperplaneView board={board} onCellClick={onCellClick} onCellRightClick={onCellRightClick} />
        )}
      </main>

      <footer className="board-footer">
        <div className="simulation-stats">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="label">Revealed:</span>
              <span className="value">{board.total_revealed} / {board.total_cells}</span>
              <span className="sub-value">(Mines: {board.mines})</span>
            </div>
            
            <div className="stat-item">
              <span className="label">Total Clicks:</span>
              <span className="value">{board.total_clicks}</span>
            </div>

            <div className="stat-item">
              <span className="label">Algorithm:</span>
              <span className="value-algo">{board.algorithm}</span>
            </div>

            <div className={`status-badge ${board.game_won ? 'won' : board.game_over ? 'lost' : 'running'}`}>
              {board.game_won ? "🎉 WON!" : board.game_over ? "💀 GAMEOVER" : "🔄 RUNNING"}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BoardView;