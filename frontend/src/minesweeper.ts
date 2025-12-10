// frontend/src/minesweeper.ts
// TypeScript WASM import wrapper

import * as wasm from "./wasm_pkg/engine";

export async function wasmInit() {
  // wasm-pack bundler target은 대부분 자동 초기화
  // await wasm.default?.();
}

export function createSimulator(width: number, height: number, algo: wasm.Algorithm) {
  return new wasm.Simulator(width, height, algo);
}

export function step(sim: wasm.Simulator) {
  return sim.step();
}
