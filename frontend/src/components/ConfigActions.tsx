import React from 'react';
import type { GameConfig } from '../types';
import '../styles/ConfigActions.css';
interface ConfigActionsProps {
  config: GameConfig;
  wasm: boolean;
  onCreateBoard: () => void;
}

const ConfigActions: React.FC<ConfigActionsProps> = ({ config, wasm, onCreateBoard }) => (
  <div className="config-actions">
    <button 
      onClick={onCreateBoard}
      disabled={!wasm}
      className="create-board-btn"
    >
      {config.useNDimensions ? "Create N-Dimensional Board" : "Create 2D Board"}
    </button>
  </div>
);

export default ConfigActions;
