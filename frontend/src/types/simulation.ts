// src/types/simulation.ts
export interface Cell {
  is_mine: boolean;
  is_revealed: boolean;
  is_flagged: boolean;
  adjacent_mines: number;
  x: number;
  y: number;
}

export interface Board {
  width: number;
  height: number;
  mines: number;
  cells: Cell[];
  game_over: boolean;
  game_won: boolean;
  total_revealed: number;
  total_clicks: number;
}

export interface SimulationResult {
  game: number;
  success: boolean;
  clicks: number;
  steps: number;
  mines: number;
  width: number;
  height: number;
  total_revealed: number;
  total_cells: number;
  game_over: boolean;
  algorithm: string;
}

// WASM과 일치하도록 수정
export enum AlgorithmType {
  Greedy = 0,
  ExactSolver = 1,
  SCIPSolver = 2,
}

// 알고리즘 정보
// simulation.ts
export interface AlgorithmInfoType {
  value: AlgorithmType;
  label: string;
  description: string;
  implemented: boolean;
  id?: string;  // App.tsx 호환성을 위해 추가
}

export const AlgorithmInfo: AlgorithmInfoType[] = [
  { 
    value: AlgorithmType.Greedy, 
    label: 'Greedy Algorithm',
    description: 'Uses simple greedy to select safe cells first',
    implemented: true,
    id: 'greedy'  // App.tsx 호환성
  },
  { 
    value: AlgorithmType.ExactSolver, 
    label: 'Exact Solver (ILP)',
    description: 'Uses exact integer linear programming to find optimal moves',
    implemented: true,
    id: 'exact'  // App.tsx 호환성
  },
  { 
    value: AlgorithmType.SCIPSolver, 
    label: 'SCIP Solver',
    description: 'Uses Constraint Integer Programming with russcip crate to find optimal moves',
    implemented: true,
    id: 'scip'
  },
];