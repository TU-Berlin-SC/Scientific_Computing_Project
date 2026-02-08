import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Float } from '@react-three/drei';
import type { Board } from '../types/simulation';
import '../styles/ThreeDBoard.css';

const FACE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

interface ThreeDBoardViewProps {
  board: Board;
  onCellClick?: (coordinates: number[]) => void;
}

const ThreeDBoardView: React.FC<ThreeDBoardViewProps> = ({ board, onCellClick }) => {
  // [6, 3, 3] 데이터에서 실제 한 면의 가로/세로 크기인 3을 가져옵니다.
  const size = board.dimensions[1]; 
  const cameraDist = size * 3;

  return (
    <div className="three-d-board-wrapper" style={{ height: '600px', width: '100%' }}>
      <Canvas camera={{ position: [cameraDist, cameraDist, cameraDist], fov: 45 }}>
        <color attach="background" args={['#020617']} />
        <OrbitControls enableDamping />
        
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#3b82f6" />

        <Float speed={1.2} rotationIntensity={0.5}>
          <group>
            {/* 1. 코어 메쉬: 실제 면 크기(size)에 딱 맞게 설정 */}
            <mesh>
              <boxGeometry args={[size, size, size]} />
              <meshStandardMaterial color="#050505" />
            </mesh>

            {/* 2. 6개 면 렌더링 */}
            {[0, 1, 2, 3, 4, 5].map(f => (
              <CubeFace key={f} faceIdx={f} board={board} size={size} onCellClick={onCellClick} />
            ))}
          </group>
        </Float>
      </Canvas>
    </div>
  );
};
const CubeFace: React.FC<{ 
  faceIdx: number; 
  board: Board; 
  size: number; 
  onCellClick?: (coords: number[]) => void 
}> = ({ faceIdx, board, size, onCellClick }) => {
  
  const faceCells = useMemo(() => 
    board.cells.filter(c => c.coordinates[0] === faceIdx),
    [board.cells, faceIdx]
  );

  const offset = (size - 1) / 2;
  const d = size / 2;

  const positions: [number, number, number][] = [
    [0, 0, d], [0, 0, -d], [0, d, 0], [0, -d, 0], [-d, 0, 0], [d, 0, 0]
  ];
  // 💡 회전 값을 미세하게 조정했습니다 (면들이 서로 겹치지 않게)
  const rotations: [number, number, number][] = [
    [0, 0, 0], [0, Math.PI, 0], [-Math.PI/2, 0, 0], [Math.PI/2, 0, 0], [0, -Math.PI/2, 0], [0, Math.PI/2, 0]
  ];

  return (
    <group position={positions[faceIdx]} rotation={rotations[faceIdx]}>
      {faceCells.map((cell, i) => {
        // 💡 핵심: coordinates[1]과 [2]가 각각 가로 세로 역할을 정확히 해야 합니다.
        // 만약 여전히 길쭉하다면 x와 y를 바꿔보세요: const x = cell.coordinates[1]; const y = cell.coordinates[2];
        const y = cell.coordinates[1]; 
        const x = cell.coordinates[2];

        let cellColor = FACE_COLORS[faceIdx];
        if (cell.is_revealed) {
          cellColor = cell.is_mine ? "#ff4444" : "#111111";
        }

        return (
          // 💡 z축 위치를 0.05에서 0으로 붙여보세요. 틈이 벌어지는 걸 막아줍니다.
          <group key={i} position={[x - offset, -(y - offset), 0.01]}>
            <mesh onClick={(e) => { e.stopPropagation(); onCellClick?.(cell.coordinates); }}>
              {/* 💡 args의 세 번째 값(두께)을 0.1에서 0.05로 줄여보세요 */}
              <boxGeometry args={[0.95, 0.95, 0.05]} />
              <meshStandardMaterial color={cellColor} />
            </mesh>
            
            {cell.is_revealed && !cell.is_mine && cell.adjacent_mines > 0 && (
              <Text position={[0, 0, 0.03]} fontSize={0.4} color="white">
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