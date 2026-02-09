// frontend/src/types/simulation.ts

export interface Cell {
  coordinates: number[]; // [z, y, x] 등
  is_mine: boolean;
  is_revealed: boolean;
  is_flagged: boolean;
  adjacent_mines: number;
}

export interface Board {
  cells: Cell[];
  dimensions: number[];
  total_cells: number;      // 💡 추가
  mines: number;
  total_revealed: number;
  game_over: boolean;
  game_won: boolean;
  algorithm: string;        // 💡 추가
  total_clicks: number;     // 💡 추가
  total_guesses: number;
  time_ms: number;
  completion: number;
}

export enum AlgorithmType {
  Greedy = 0,
  ExactSolver = 1,
  SatSolver = 2,
  PartitionedSat = 3,   
  SatSolver4D = 4,      
}

export enum TspObjective {
  MinDistance = 0,
  MinRotation = 1,
  MaxInformation = 2,
}

// 💡 implemented: true를 명시하여 "준비 중" 상태를 해제합니다.
export const AlgorithmInfo = [
  { value: AlgorithmType.Greedy, label: 'Greedy Solver', description: 'Local constraints logic.', implemented: true },
  { value: AlgorithmType.ExactSolver, label: 'Exact Solver', description: 'ILP based optimized solver.', implemented: true },
  { value: AlgorithmType.SatSolver, label: 'SAT Solver', description: 'Boolean satisfiability logic.', implemented: true },
  
];
export interface SimulationResult {
  success: boolean;
  total_clicks: number;
  steps: number;
  algorithm_stats: {
    computation_time_ms: number;
    nodes_explored: number;
  };
}


export const TspInfo = [
  { value: TspObjective.MinDistance, label: 'Shortest Path' },
  { value: TspObjective.MinRotation, label: 'Min Rotation' },
  { value: TspObjective.MaxInformation, label: 'Max Information' },
];