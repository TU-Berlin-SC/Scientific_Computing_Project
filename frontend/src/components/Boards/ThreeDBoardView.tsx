import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Float } from '@react-three/drei';
import type { Board } from '../types/simulation';

interface ThreeDBoardViewProps {
  board: Board;
  onCellClick?: (coordinates: number[]) => void;
}

const FACE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
const ThreeDBoardView: React.FC<ThreeDBoardViewProps> = ({ board, onCellClick }) => {
  // board.dimensions가 [3, 3, 3] =? size = 3
  // but we have 6 faces, so we will use the second dimension as the size of each face.
  const size = board.dimensions[1] || 3; 
  const cameraDist = size * 4;

  return (
    <div className="three-d-board-wrapper" style={{ height: '600px', width: '100%' }}>
      <Canvas camera={{ position: [cameraDist, cameraDist, cameraDist], fov: 45 }}>
        <color attach="background" args={['#020617']} />
        <OrbitControls enableDamping />
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />

        <Float speed={1.2} rotationIntensity={0.5}>
          <group>
            {/* CUBE */}
            <mesh>
              <boxGeometry args={[size - 0.1, size - 0.1, size - 0.1]} />
              <meshStandardMaterial color="#050505" />
            </mesh>

            {/* Render 6 faces */}
            {[0, 1, 2, 3, 4, 5].map(f => (
              <CubeFace 
                key={f} 
                faceIdx={f} 
                board={board} 
                size={size} 
                onCellClick={onCellClick} 
              />
            ))}
          </group>
        </Float>
      </Canvas>
    </div>
  );
};

const CubeFace: React.FC<{ faceIdx: number; board: Board; size: number; onCellClick?: any }> = ({ faceIdx, board, size, onCellClick }) => {  // 💡 핵심: coordinates[0]이 face 번호인 셀들만 정확히 필터링
  const faceCells = useMemo(() => {
    return board.cells.filter(c => c.coordinates[0] === faceIdx);
  }, [board.cells, faceIdx]);
  const isLost = board.game_over && !board.game_won;
  const offset = (size - 1) / 2;
  const d = size / 2;

  // 6 faces location and rotation setup
  const positions: [number, number, number][] = [
    [0, 0, d],    // Front (Face 0)
    [0, 0, -d],   // Back (Face 1)
    [0, d, 0],    // Top (Face 2)
    [0, -d, 0],   // Bottom (Face 3)
    [-d, 0, 0],   // Left (Face 4)
    [d, 0, 0]     // Right (Face 5)
  ];
  
  const rotations: [number, number, number][] = [
    [0, 0, 0],
    [0, Math.PI, 0],
    [-Math.PI / 2, 0, 0],
    [Math.PI / 2, 0, 0],
    [0, -Math.PI / 2, 0],
    [0, Math.PI / 2, 0]
  ];

  return (
    <group position={positions[faceIdx]} rotation={rotations[faceIdx]}>
      {faceCells.map((cell, i) => {
        // Extract y,x from [face, y, x]
        const y = cell.coordinates[1];
        const x = cell.coordinates[2];
        const shouldShowMine = cell.is_mine && (cell.is_revealed || isLost);
        return (
          <group key={i} position={[x - offset, -(y - offset), 0.02]}>

        <mesh onClick={(e) => { e.stopPropagation(); onCellClick?.(cell.coordinates); }}>
          <boxGeometry args={[0.9, 0.9, 0.05]} />
          <meshStandardMaterial 
            color={shouldShowMine ? "#ef4444" : (cell.is_revealed ? "#111" : FACE_COLORS[faceIdx])} 
            // Trying to make it transparent when lost but not showing mine, to give a "ghostly" effect to unrevealed cells on lost game
            transparent={true}
            opacity={isLost && !shouldShowMine ? 0.3 : 1} 
          />
        </mesh>
        {shouldShowMine && (
          <Text 
            position={[0, 0, 0.06]} 
            fontSize={0.6} 
            color="#ffffff"
            anchorX="center" 
            anchorY="middle"
          >
            💣
          </Text>
        )}

        {cell.is_revealed && !cell.is_mine && cell.adjacent_mines > 0 && (
          <Text 
            position={[0, 0, 0.06]} 
            fontSize={0.4} 
            color="white" 
            anchorX="center" 
            anchorY="middle"
          >
            {cell.adjacent_mines}
          </Text>
        )}
          </group>
        );
      })}
    </group>
  );
};

export default ThreeDBoardView;