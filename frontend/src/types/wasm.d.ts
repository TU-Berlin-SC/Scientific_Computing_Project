// src/wasm.d.ts
declare module '../wasm_pkg/engine' {
  export enum WasmAlgorithmType {
    Greedy = 0,
    ExactSolver = 1,
    SATSolver = 2,  // added SATSolver
  }

  export enum WasmTSPObjective {
    MinSurfaceDistance = 0,
    MinRotation = 1,
    MaxInformation = 2,
  }

  // ND Simulator Class
  export class Simulator {
    constructor(
      dimensions: any,  // JsValue (number[])
      mines: number,
      algorithm_type: WasmAlgorithmType
    );
    
    // 2D compatibility constructor
    new2D(
      width: number,
      height: number,
      mines: number,
      algorithm_type: WasmAlgorithmType
    ): Simulator;
    
    getState(): any;
    runStep(): any;
    runFullGame(): any;
    runBatch(games: number): any;
    reset(): void;
    setAlgorithm(algorithm_type: WasmAlgorithmType): void;
    getAlgorithm(): string;
  }

  export function hello_world(): string;
  export function test_add(a: number, b: number): number;
  export function create_simple_board(): any;
  export function compare_algorithms(
    dimensions: any,  // JsValue
    mines: number,
    games: number
  ): any;
  
  export default function init(): Promise<void>;
}