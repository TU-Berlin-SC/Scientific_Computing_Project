# Frontend

## Minesweeper Solver Simulator & Visualization (React + WASM)

Interactive web interface for the **Rust-based Minesweeper Engine**.

This frontend is **NOT a playable Minesweeper game**.

Instead, it is a **solver simulation and benchmarking tool** designed for:

- algorithm visualization
- step-by-step solver inspection
- performance testing
- large-scale comparisons
- N-dimensional board rendering

The heavy computation runs in Rust and is compiled to **WebAssembly**, while this React app focuses purely on UI and visualization.

# Purpose

Project structure:

| Crate    | Role                                  |
| -------- | ------------------------------------- |
| engine   | core logic + solvers (Rust)           |
| runner   | offline benchmarking CLI              |
| frontend | interactive simulator + visualization |

The frontend is built for **experimentation and analysis**, not manual gameplay.

---

# Not Supported

- manual human play mode
- traditional Minesweeper interaction

All board actions are performed by **algorithms only**.

---

# Features

## ▶ Simulation Controls

- Step-by-step execution (`Test Step`)
- Run full game automatically (`Test Full Game`)
- Batch test (100 games)
- Compare all algorithms
- Reset current run

---

## Algorithm Testing

Select and test different solving strategies:

- Greedy Solver
- Exact (ILP-based) Solver
- SAT Solver
- Partitioned SAT
- 4D SAT Solver

You can:

- run a single game
- run 100-game batches
- compare algorithms side-by-side

---

## Benchmark & Analysis

After simulation:

- win rate
- average clicks
- average time (ms)
- average guesses
- per-game records
- CSV export

Designed for **research-style evaluation**, not gameplay scoring.

---

## Multi-Dimensional Rendering

Supports:

- 2D boards
- 3D cube boards
- 4D hyperplane view

---

## 3D TSP Path Optimization (3D only)

For 3D boards, solver traversal can use TSP-based ordering:

- Shortest Path
- Min Rotation
- Max Information

This improves solver efficiency by optimizing reveal order.

---

# Tech Stack

- React + TypeScript
- Rust → WebAssembly (wasm-bindgen)
- Vite
- CSS modules

# Getting Started

```bash
npm install
npm run dev
```

Make sure the Rust `engine` is built to WASM first:

```bash
wasm-pack build ../engine --target web
```

# Key Components

- ControlPanel → simulation controls
- ResultPanel → batch/comparison results + CSV export
- BoardRenderer → multi-dimensional visualization
- WASM bridge → Rust engine integration
