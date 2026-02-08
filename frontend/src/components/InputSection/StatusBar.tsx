import React from 'react';
import '../../styles/StatusBar.css';

interface StatusBarProps {
  wasm: boolean;
  simulator: boolean;
  useNDimensions: boolean;
  onToggleDimensions: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({
  wasm,
  simulator,
  useNDimensions,
  onToggleDimensions
}) => (
  <div className="status">
    <div className="status-indicator ready">✅ WASM Loaded</div>
    <div className={`status-indicator ${simulator ? 'ready' : 'loading'}`}>
      {simulator ? '✅ Simulator Ready' : '⏳ Simulator Not Ready'}
    </div>
    <button 
      className="dimension-toggle"
      onClick={onToggleDimensions}
      title={useNDimensions ? "Switch to 2D Mode" : "Switch to N Dimension Mode"}
    >
      {useNDimensions ? "⬅ 2D Mode" : "N Dimension Mode ➡"}
    </button>
  </div>
);

export default StatusBar;
