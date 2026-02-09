// src/types/index.ts
export interface GameConfig {
  useNDimensions: boolean;
  dimensionCount?: number;
  dimensions?: number[];
  width: number;
  height: number;
  mines: number;
}

export interface Preset {
  id: string;
  name: string;
  width?: number;
  height?: number;
  dimensions?: number[];
  mines: number;
}

// Write Details of a Game Record (For Game Summary Section)
export interface GameRecord {
  algorithm: string;
  mines: number;
  dims: string | number[];
  win: "TRUE" | "FALSE" | boolean;
  clicks: number;
  time_ms: number;
  guesses: number;
  completion: string | number;
  objective?: string;
  steps?: number;
}

// Summary of Game Records for Each Algorithm (For Overall Stats Section)
export interface GameStats {
  algorithm: string;
  total_games: number;
  wins: number;
  win_rate: number;
  avg_steps_wins: number;
  avg_clicks_wins: number;
  avg_time_wins: number;
  avg_guesses_wins: number;
}