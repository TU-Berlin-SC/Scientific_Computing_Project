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
  // board.dimensions가 [3, 3, 3]으로 온다면, size는 3입니다.
  // 하지만 우리는 6개의 면(0~5)을 순회하며 렌더링합니다.
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
            {/* 코어 정육면체 */}
            <mesh>
              <boxGeometry args={[size - 0.1, size - 0.1, size - 0.1]} />
              <meshStandardMaterial color="#050505" />
            </mesh>

            {/* 6개의 면을 강제로 렌더링 (0~5번 Face) */}
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

  // 6개 면의 위치와 회전값 (표준 주사위 배치)
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
        // [face, y, x] 구조에서 y, x 추출
        const y = cell.coordinates[1];
        const x = cell.coordinates[2];
        const shouldShowMine = cell.is_mine && (cell.is_revealed || isLost);
        return (
          <group key={i} position={[x - offset, -(y - offset), 0.02]}>

        <mesh onClick={(e) => { e.stopPropagation(); onCellClick?.(cell.coordinates); }}>
          <boxGeometry args={[0.9, 0.9, 0.05]} />
          <meshStandardMaterial 
            color={shouldShowMine ? "#ef4444" : (cell.is_revealed ? "#111" : FACE_COLORS[faceIdx])} 
            /* 💡 졌을 때 겉면을 반투명하게 만들어 내부 지뢰가 보이게 함 */
            transparent={true}
            opacity={isLost && !shouldShowMine ? 0.3 : 1} 
          />
        </mesh>
        {/* 💣 지뢰 아이콘: 겹침 방지를 위해 position z를 0.06으로 살짝 띄웁니다 */}
        {shouldShowMine && (
          <Text 
            position={[0, 0, 0.06]} 
            fontSize={0.6} 
            color="#ffffff" // 검정 배경이니까 하얀색(또는 이모지 그대로)으로 쨍하게!
            anchorX="center" 
            anchorY="middle"
          >
            💣
          </Text>
        )}

        {/* 숫자 표시: 이것도 원래대로! */}
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