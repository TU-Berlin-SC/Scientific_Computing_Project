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

// 상세 게임 기록 (CSV 저장용)
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

// 요약 통계 (결과 표 출력용)
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