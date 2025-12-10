// Main threaed will communicate with this Web Worker(new Worker(new URL('./worker/simulatorWorker.ts', import.meta.url))
// to run the simulation in the background.
import init, { Simulator, Algorithm } from "../wasm_pkg/engine";

let sim: Simulator;

onmessage = async (event: MessageEvent) => {
  const msg = event.data;

  if (msg.type === "init") {
    await init();
    sim = new Simulator(msg.width, msg.height, Algorithm[msg.algorithm]);
    postMessage({ type: "state", state: sim.get_state() });
  }

  if (msg.type === "runStep") {
    const state = sim.step();
    postMessage({ type: "state", state });
  }
};
