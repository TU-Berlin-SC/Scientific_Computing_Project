import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Float } from '@react-three/drei';
import type { Board } from '../types/simulation';

const FACE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const BoardView: React.FC<{ board: Board; onCellClick: (i: number) => void }> = ({ board, onCellClick }) => {
  const cameraDist = board.width * 2.3;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas camera={{ position: [cameraDist, cameraDist, cameraDist], fov: 45 }}>
        <color attach="background" args={['#020617']} />
        <OrbitControls enableDamping dampingFactor={0.05} />
        <ambientLight intensity={0.5} />
        <pointLight position={[20, 20, 20]} intensity={1.5} />

        <Float speed={board.game_over && !board.game_won ? 15 : 1.2} rotationIntensity={0.5}>
          <group>
            <mesh>
              <boxGeometry args={[board.width - 0.1, board.width - 0.1, board.width - 0.1]} />
              <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
            </mesh>
            {[0, 1, 2, 3, 4, 5].map(f => (
              <CubeFace key={f} faceIdx={f} board={board} onCellClick={onCellClick} />
            ))}
          </group>
        </Float>
      </Canvas>

      {/* Your announcement-overlay logic */}
      {board.game_over && (
        <div className={`announcement-overlay ${board.game_won ? 'won' : 'lost'}`}>
          <div className="announcement-content">
            <h1>{board.game_won ? "CUBE SECURED" : "SYSTEM FAILURE"}</h1>
            <p>{board.game_won ? "ALL MINES NEUTRALIZED" : "DETONATION DETECTED"}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const CubeFace: React.FC<{ faceIdx: number; board: Board; onCellClick: (i: number) => void }> = ({ faceIdx, board, onCellClick }) => {
  const offset = (board.width - 1) / 2;
  const faceSize = board.width * board.width;
  const d = board.width / 2;

  const positions: [number, number, number][] = [[0,0,d], [0,0,-d], [0,d,0], [0,-d,0], [-d,0,0], [d,0,0]];
  const rotations: [number, number, number][] = [[0,0,0], [0,Math.PI,0], [-Math.PI/2,0,0], [Math.PI/2,0,0], [0,-Math.PI/2,0], [0,Math.PI/2,0]];

  return (
    <group position={positions[faceIdx]} rotation={rotations[faceIdx]}>
      {board.cells.slice(faceIdx * faceSize, (faceIdx + 1) * faceSize).map((cell, i) => {
        const globalIdx = faceIdx * faceSize + i;
        const isHitMine = board.game_over && !board.game_won && board.last_click_idx === globalIdx;
        
        let cellColor = FACE_COLORS[faceIdx];
        let emissive = "#000";
        let intensity = 0;

        if (cell.is_revealed) {
          cellColor = cell.is_mine ? "#ef4444" : "#1e293b";
        } else if (cell.is_flagged) {
          cellColor = "#fbbf24"; 
          emissive = "#fbbf24";
          intensity = 2;
        }

        if (isHitMine) {
          emissive = "#ff0000";
          intensity = 20;
          cellColor = "#ff0000";
        }

        return (
          <group key={globalIdx} position={[cell.x - offset, -(cell.y - offset), cell.is_revealed ? 0.01 : 0.08]}>
            <mesh onClick={() => onCellClick(globalIdx)}>
              <boxGeometry args={[0.94, 0.94, cell.is_revealed ? 0.05 : 0.18]} />
              <meshStandardMaterial color={cellColor} emissive={emissive} emissiveIntensity={intensity} />
            </mesh>
            {cell.is_revealed && !cell.is_mine && cell.adjacent_mines > 0 && (
              <Text position={[0, 0, 0.06]} fontSize={0.4} color="#60a5fa" fontWeight="bold">{cell.adjacent_mines}</Text>
            )}
            {((cell.is_revealed && cell.is_mine) || isHitMine) && (
               <Text position={[0, 0, 0.07]} fontSize={0.5} color="white">M</Text>
            )}
          </group>
        );
      })}
    </group>
  );
};

export default BoardView;