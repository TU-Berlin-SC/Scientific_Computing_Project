import init, { 
  Simulator, 
  WasmAlgorithmType, 
  TspObjective as WasmTspObjective 
} from './wasm_pkg/engine';
import type { Board, SimulationResult } from './types/simulation';
import { AlgorithmType, TspObjective } from './types/simulation';

export class MinesweeperGame {
  private simulator: Simulator | null = null;
  private isBusy = false; 

  async initialize(width: number, height: number, mines: number, algo: AlgorithmType) {
    await init();
    const totalCells = 6 * width * height;
    const maxSafeMines = Math.floor(totalCells * 0.9);
    const safeMines = Math.min(mines, maxSafeMines);

    try {
      this.isBusy = true;
      this.simulator = new Simulator(width, height, safeMines, algo as unknown as WasmAlgorithmType);
    } finally {
      this.isBusy = false;
    }
  }

  getState(): Board | null {
    if (!this.simulator) return null;
    try { return this.simulator.getState() as Board; } catch (e) { return null; }
  }

  runStep(): Board | null {
    if (!this.simulator || this.isBusy) return null;
    try {
      this.isBusy = true;
      this.simulator.run_step();
      return this.getState();
    } finally { this.isBusy = false; }
  }

  runFullGame(): Board | null {
    if (!this.simulator || this.isBusy) return null;
    try {
      this.isBusy = true;
      this.simulator.runFullGame();
      return this.getState();
    } finally { this.isBusy = false; }
  }

  // Restored missing Batch functionality
  runBatch(iterations: number): SimulationResult[] {
    if (!this.simulator || this.isBusy) return [];
    try {
      this.isBusy = true;
      return this.simulator.runBatch(iterations) as SimulationResult[];
    } finally { this.isBusy = false; }
  }

  setAlgorithm(algo: AlgorithmType) {
    if (!this.simulator || this.isBusy) return;
    try {
      this.isBusy = true;
      this.simulator.setAlgorithm(algo as unknown as WasmAlgorithmType);
    } finally { this.isBusy = false; }
  }

  setTspObjective(objective: TspObjective) {
    if (!this.simulator || this.isBusy) return;
    try {
      this.isBusy = true;
      this.simulator.setTspObjective(objective as unknown as WasmTspObjective);
    } finally { this.isBusy = false; }
  }

  reset() {
    if (!this.simulator || this.isBusy) return;
    try {
      this.isBusy = true;
      this.simulator.reset();
    } finally { this.isBusy = false; }
  }
}