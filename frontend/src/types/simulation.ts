// Interfaces (Pure Types)
export interface Cell {
  face: number;
  x: number;
  y: number;
  is_mine: boolean;
  is_revealed: boolean;
  is_flagged: boolean;
  adjacent_mines: number;
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
  last_click_idx: number;
}

export interface SimulationResult {
  success: boolean;
  total_clicks: number;
  steps: number;
  algorithm_stats: {
    computation_time_ms: number;
    nodes_explored: number;
  };
}

// Concrete Objects (Real JS Code)
export enum AlgorithmType {
  Greedy = 0,
  ExactSolver = 1,
  SatSolver = 2,
}

export enum TspObjective {
  MinDistance = 0,
  MinRotation = 1,
  MaxInformation = 2,
}

export const AlgorithmInfo = [
  { value: AlgorithmType.Greedy, label: 'Greedy Solver', description: 'Local constraints.' },
  { value: AlgorithmType.ExactSolver, label: 'Exact Solver', description: 'ILP Solver.' },
  { value: AlgorithmType.SatSolver, label: 'SAT Solver', description: 'Boolean Logic.' },
];

export const TspInfo = [
  { value: TspObjective.MinDistance, label: 'Shortest Path' },
  { value: TspObjective.MinRotation, label: 'Min Rotation' },
  { value: TspObjective.MaxInformation, label: 'Max Information' },
];