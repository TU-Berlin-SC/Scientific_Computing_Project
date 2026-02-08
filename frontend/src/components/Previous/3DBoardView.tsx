import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Float } from '@react-three/drei';
import type { Board } from '../types/simulation';

const FACE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const ThreeDBoardView: React.FC<ThreeDBoardViewProps> = ({ board, onCellClick }) => {
  // 로그 추가: 실제 렌더링 시 size가 몇인지 확인
  const size = board.dimensions[1]; 
  console.log("📺 Rendering Board - Size:", size, "Dimensions:", board.dimensions);

  const cameraDist = size * 3;

  return (
    <div className="three-d-board-wrapper" style={{ height: '600px', width: '100%' }}>
      <Canvas camera={{ position: [cameraDist, cameraDist, cameraDist], fov: 45 }}>
        <color attach="background" args={['#020617']} />
        <OrbitControls enableDamping />
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />

        <Float speed={1.2} rotationIntensity={0.5}>
          <group>
            {/* 코어 메쉬가 정육면체인지 확인 */}
            <mesh>
              <boxGeometry args={[size, size, size]} />
              <meshStandardMaterial color="#050505" />
            </mesh>

            {[0, 1, 2, 3, 4, 5].map(f => (
              <CubeFace key={f} faceIdx={f} board={board} size={size} onCellClick={onCellClick} />
            ))}
          </group>
        </Float>
      </Canvas>
    </div>
  );
};

const CubeFace: React.FC<{ faceIdx: number; board: Board; size: number; onCellClick?: any }> = ({ faceIdx, board, size, onCellClick }) => {
  const faceCells = useMemo(() => {
    const filtered = board.cells.filter(c => c.coordinates[0] === faceIdx);
    // 로그 추가: 각 면당 셀이 9개(3x3)인지 확인
    console.log(`Face ${faceIdx} cells count:`, filtered.length);
    return filtered;
  }, [board.cells, faceIdx]);

  const offset = (size - 1) / 2;
  const d = size / 2;

  const positions: [number, number, number][] = [
    [0, 0, d], [0, 0, -d], [0, d, 0], [0, -d, 0], [-d, 0, 0], [d, 0, 0]
  ];
  const rotations: [number, number, number][] = [
    [0, 0, 0], [0, Math.PI, 0], [-Math.PI/2, 0, 0], [Math.PI/2, 0, 0], [0, -Math.PI/2, 0], [0, Math.PI/2, 0]
  ];

  return (
    <group position={positions[faceIdx]} rotation={rotations[faceIdx]}>
      {faceCells.map((cell, i) => {
        // 좌표 확인 로그 (첫 번째 면의 첫 번째 셀만 찍기)
        if (i === 0 && faceIdx === 0) console.log("Sample Cell Coords:", cell.coordinates);

        const y = cell.coordinates[1]; 
        const x = cell.coordinates[2];

        return (
          <group key={i} position={[x - offset, -(y - offset), 0.01]}>
            <mesh onClick={(e) => { e.stopPropagation(); onCellClick?.(cell.coordinates); }}>
              <boxGeometry args={[0.95, 0.95, 0.05]} />
              <meshStandardMaterial color={cell.is_revealed ? "#111" : FACE_COLORS[faceIdx]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

export default ThreeDBoardView;