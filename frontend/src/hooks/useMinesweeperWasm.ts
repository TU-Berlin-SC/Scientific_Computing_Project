// Manage the Minesweeper WASM module and simulator instance, along with logging functionality.
// hooks/useMinesweeperWasm.ts
import { useState } from 'react';
import type { AlgorithmType } from '../types/simulation';
export const useMinesweeperWasm = () => {
    const [wasm, setWasm] = useState<any>(null);
    const [simulator, setSimulator] = useState<any>(null);
    const [logs, setLogs] = useState<string[]>([]);
  
    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  
    const initSimulator = (dimensions: number[], mines: number, algo: AlgorithmType) => {
      if (!wasm) return;
      const newSim = new wasm.Simulator(dimensions, mines, algo);
      setSimulator(newSim);
      return newSim;
    };
  
    return { wasm, setWasm, simulator, initSimulator, addLog, logs };
  };