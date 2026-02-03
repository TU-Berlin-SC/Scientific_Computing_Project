export interface Cell {
  is_mine: boolean;
  is_revealed: boolean;
  is_flagged: boolean;
  adjacent_mines: number;
  coordinates: number[]; // N-dimensional coordinates
}

// Represents the entire game board
export interface Board {
  dimensions: number[]; // N-dimensional board size
  mines: number;
  cells: Cell[];
  game_over: boolean;
  game_won: boolean;
  total_revealed: number;
  total_clicks: number;
}

// Result of a single simulation run
export interface SimulationResult {
  game: number;
  success: boolean;
  clicks: number;
  steps: number;
  mines: number;
  dimensions: number[];
  total_revealed: number;
  total_cells: number;
  game_over: boolean;
  algorithm: string;
}

// Algorithm type (kept in sync with WASM)
export enum AlgorithmType {
  Greedy = 0,
  ExactSolver = 1,
  SATSolver = 2, // Added
}

// Algorithm metadata interface
export interface AlgorithmInfoType {
  value: AlgorithmType;
  label: string;
  description: string;
  implemented: boolean;
  id: string;
  dimensionSupport: number[];
}

// Algorithm metadata list (includes SATSolver)
export const AlgorithmInfo: AlgorithmInfoType[] = [
  {
    value: AlgorithmType.Greedy,
    label: 'Greedy Algorithm',
    description: 'Uses simple greedy logic to select safe cells first',
    implemented: true,
    id: 'greedy',
    dimensionSupport: [2, 3, 4]
  },
  {
    value: AlgorithmType.ExactSolver,
    label: 'Exact Solver',
    description: 'Uses exact integer linear programming to find optimal moves',
    implemented: true,
    id: 'exact_solver',
    dimensionSupport: [2, 3, 4]
  },
  {
    value: AlgorithmType.SATSolver,
    label: 'SAT Solver',
    description: 'Uses Boolean satisfiability for global board constraints',
    implemented: true,
    id: 'sat_solver',
    dimensionSupport: [2, 3, 4]
  },
];

// Board preset interface
export interface BoardPreset {
  id: string;
  name: string;
  description: string;
  dimensions: number[];
  mines: number;
  difficulty: 'beginner' | 'intermediate' | 'expert' | 'custom';
  dimensionCount: number;
}

// 2D board presets
export const BOARD_PRESETS_2D: BoardPreset[] = [
  {
    id: 'beginner-2d',
    name: 'Beginner (2D)',
    description: '9×9 board with 10 mines',
    dimensions: [9, 9],
    mines: 10,
    difficulty: 'beginner',
    dimensionCount: 2
  },
  {
    id: 'intermediate-2d',
    name: 'Intermediate (2D)',
    description: '16×16 board with 40 mines',
    dimensions: [16, 16],
    mines: 40,
    difficulty: 'intermediate',
    dimensionCount: 2
  },
  {
    id: 'expert-2d',
    name: 'Expert (2D)',
    description: '30×16 board with 99 mines',
    dimensions: [30, 16],
    mines: 99,
    difficulty: 'expert',
    dimensionCount: 2
  }
];

// 3D board presets
export const BOARD_PRESETS_3D: BoardPreset[] = [
  {
    id: 'beginner-3d',
    name: 'Beginner Cube (3D)',
    description: '4×4×4 cube with 8 mines',
    dimensions: [4, 4, 4],
    mines: 8,
    difficulty: 'beginner',
    dimensionCount: 3
  },
  {
    id: 'intermediate-3d',
    name: 'Intermediate Cube (3D)',
    description: '6×6×6 cube with 40 mines',
    dimensions: [6, 6, 6],
    mines: 40,
    difficulty: 'intermediate',
    dimensionCount: 3
  },
  {
    id: 'expert-3d',
    name: 'Expert Cube (3D)',
    description: '8×8×8 cube with 99 mines',
    dimensions: [8, 8, 8],
    mines: 99,
    difficulty: 'expert',
    dimensionCount: 3
  }
];

// 4D board presets
export const BOARD_PRESETS_4D: BoardPreset[] = [
  {
    id: 'beginner-4d',
    name: 'Beginner Hypercube (4D)',
    description: '3×3×3×3 hypercube with 10 mines',
    dimensions: [3, 3, 3, 3],
    mines: 10,
    difficulty: 'beginner',
    dimensionCount: 4
  },
  {
    id: 'intermediate-4d',
    name: 'Intermediate Hypercube (4D)',
    description: '4×4×4×4 hypercube with 40 mines',
    dimensions: [4, 4, 4, 4],
    mines: 40,
    difficulty: 'intermediate',
    dimensionCount: 4
  },
  {
    id: 'expert-4d',
    name: 'Expert Hypercube (4D)',
    description: '5×5×5×5 hypercube with 100 mines',
    dimensions: [5, 5, 5, 5],
    mines: 100,
    difficulty: 'expert',
    dimensionCount: 4
  }
];

// All board presets
export const BOARD_PRESETS = [
  ...BOARD_PRESETS_2D,
  ...BOARD_PRESETS_3D,
  ...BOARD_PRESETS_4D
];

// Difficulty color mapping
export const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#4caf50',
  intermediate: '#ff9800',
  expert: '#f44336',
  custom: '#9e9e9e'
};

// Game configuration interface
export interface GameConfig {
  dimensions: number[];
  mines: number;
  algorithm: AlgorithmType;
}

// Algorithm comparison result interface
export interface ComparisonResult {
  algorithm: string;
  total_games: number;
  wins: number;
  win_rate: number;
  avg_steps_wins: number;
  avg_clicks_wins: number;
}

// Board calculation utility functions
export function getTotalCells(dimensions: number[]): number {
  return dimensions.reduce((a, b) => a * b, 1);
}

export function getMinePercentage(dimensions: number[], mines: number): number {
  const total = getTotalCells(dimensions);
  return total > 0 ? (mines / total) * 100 : 0;
}

export function getBoardSizeLabel(dimensions: number[]): string {
  if (dimensions.length === 2) {
    return `${dimensions[0]}×${dimensions[1]}`;
  } else {
    return dimensions.join('×');
  }
}

export function is2DBoard(dimensions: number[]): boolean {
  return dimensions.length === 2;
}

export function is3DBoard(dimensions: number[]): boolean {
  return dimensions.length === 3;
}

export function is4DBoard(dimensions: number[]): boolean {
  return dimensions.length === 4;
}

// ALGORITHM_INFO is an alias for AlgorithmInfo
export const ALGORITHM_INFO = AlgorithmInfo;
