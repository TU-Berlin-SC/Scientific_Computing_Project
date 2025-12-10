// src/types/wasm.d.ts
declare module '../wasm_pkg/engine' {
    export enum WasmAlgorithmType {
      Greedy = 0,
      ExactSolver = 1,
    }
  
    export class Simulator {
      constructor(
        width: number,
        height: number,
        mines: number,
        algorithm_type: WasmAlgorithmType
      );
      
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
      width: number,
      height: number,
      mines: number,
      games: number
    ): any;
    
    export default function init(): Promise<void>;
  }