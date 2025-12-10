// App skeleton for testing the Minesweeper WASM module
// click button → WASM Simulator step → check status
import { useEffect, useState } from "react";
import { wasmInit, createSimulator } from "./minesweeper";
import { Algorithm } from "./wasm_pkg/engine";

function App() {
  const [sim, setSim] = useState<any>(null);
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    (async () => {
      await wasmInit();
      const s = createSimulator(5, 5, Algorithm.RuleBased);
      setSim(s);
      setState(s.get_state());
    })();
  }, []);

  const stepOnce = () => {
    if (!sim) return;
    const newState = sim.step();
    setState(newState);
  };

  return (
    <div>
      <h1>Minesweeper WASM Test</h1>
      <button onClick={stepOnce}>Step</button>
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
}

export default App;
