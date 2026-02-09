# Engine

## Minesweeper Simulation Core (Rust + WASM)

Minesweeper simulation engine written in Rust, designed for:

- algorithm benchmarking
- solver research (SAT / MILP / heuristics)
- WebAssembly frontend integration
- N-dimensional boards (2D, 3D cube, 4D, …)

This crate acts as the **core backend engine** that powers both:

- Web frontend (via WebAssembly)
- Native runners (via cargo)

It cleanly separates **game logic**, **adjacency modeling**, and **AI/solver algorithms** for maximum extensibility.

Please refer to our [Native runners for benchmarking ](../runner/) to run the tests.

---

# Features

### Board types

- 2D classic grid
- 3D cube (6 faces with wrapped edge adjacency)
- arbitrary N-dimensional boards
- configurable dimensions

### Engine

- flood fill reveal
- adjacency precomputation
- deterministic seed support
- fast BFS distance maps

### Simulation

- single step execution
- full game execution
- batch benchmarking
- timing metrics
- guess counting

### Solvers / Agents

- greedy heuristics
- SAT solvers
- partitioned SAT
- SCIP (MILP) solver (native only)
- TSP-based objectives for path optimization

### Targets

- WebAssembly (`wasm-pack`)
- Native (`cargo run`)

---

# Installation

## WASM (frontend usage)

```bash
wasm-pack build --target web --out-dir ../frontend/src/wasm_pkg # WASM Build
```

## Native runner (with SCIP)

```bash
cargo build --features native
```

# Architecture Overview

The engine is intentionally layered:

```
Frontend (React / JS)
        ↓
WASM Interface (Simulator)
        ↓
Game Engine (Board)
        ↓
Algorithms / Agents
        ↓
Optional native solvers (SCIP / SAT)
```

---

# Core Modules

### 1. Simulator (WASM Boundary)

**File:** `lib.rs`

This is the main public interface exposed to JavaScript via `wasm-bindgen`.

Responsibilities:

- lifecycle control
- step execution
- batch runs
- timing
- state serialization
- algorithm switching

#### Exposed methods

| Method                   | Description          |
| ------------------------ | -------------------- |
| `new(dims, mines, algo)` | create simulator     |
| `runStep()`              | run one agent move   |
| `runFullGame()`          | play until finish    |
| `runBatch(n)`            | benchmark many games |
| `reset()`                | reset board          |
| `getState()`             | JSON game state      |
| `setAlgorithm()`         | switch solver        |
| `setSeed()`              | deterministic board  |

---

### Board (Game Engine)

**File:** `board.rs`

Pure game logic — no WASM, no algorithms.

This layer is completely deterministic and solver-agnostic.

#### Responsibilities

- mine placement
- adjacency handling
- reveal logic (flood fill)
- win/loss detection
- metrics (clicks, guesses)
- BFS utilities

#### Key design choices

### Precomputed adjacency

All neighbor relations are built once for:

- O(1) neighbor lookup
- faster solver logic

### N-dimensional support

Indices are mapped:

```
coords ↔ index
```

allowing generic ND boards.

---

### 3. Algorithms

**Folder:** `algorithms/`

Implements the `MinesweeperAgent` trait.

Each solver decides:

```
Board → next move candidates
```

### Structure

```
algorithms/
├── greedy.rs
├── exact_solver.rs
├── sat_global.rs
├── sat_partitioned.rs
├── sat_solver_4d.rs
├── scip_solver.rs
└── utils/macros
```

### Agent abstraction

All solvers share:

```rust
trait MinesweeperAgent {
    fn next_move(&self, board: &Board) -> Option<SolverResult>;
}
```

This makes solvers fully pluggable.

---

### 4. Native-only Solvers

Enabled via:

```
--features native
```

Adds:

- russcip
- scip-sys

These allow:

- MILP optimization
- exact solving strategies

Not available in WASM due to binary size and linking constraints.

---

# Adjacency Models

## Standard N-D

Generic neighbor generation:

```
3^N - 1 neighbors
```

Used for:

- 2D
- 4D
- arbitrary boards

---

## 3D Cube Mode

Special case:

```
dims = [6, H, W]
```

Represents 6 connected faces.

Features:

- edge wrapping
- face mapping
- manifold-like topology

Useful for:

- scientific experiments
- non-planar boards

---

# Example Usage

### WASM

```javascript
import init, { Simulator, WasmAlgorithmType } from "./engine.js";

await init();

const sim = new Simulator([9, 9], 10, WasmAlgorithmType.Greedy);

sim.runFullGame();

console.log(sim.getState());
```

---

### Native

```rust
let mut sim = Simulator::new(vec![9,9], 10, WasmAlgorithmType::Greedy);

while sim.run_step() {}

println!("{:?}", sim.get_state_internal());
```

---

# Batch Benchmarking

```javascript
sim.runBatch(1000);
```

Returns:

```json
[
  {
    "game": 1,
    "success": true,
    "steps": 35,
    "time_ms": 1.2,
    "completion": 100
  }
]
```

Perfect for:

- win rate testing
- solver comparison
- research experiments

---

# Feature Flags

## default

Minimal WASM build

## native

Adds:

- russcip
- scip-sys
- MILP solvers

```bash
cargo build --features native
```

---

# Deterministic Runs

```javascript
sim.setSeed(12345);
```

Ensures:

- same mine layout
- reproducible experiments

---

# Extending the Engine

## Add a new solver

1. implement `MinesweeperAgent`
2. add to `AlgorithmFactory`
3. expose in `WasmAlgorithmType`

Done.

No changes required in Board or Simulator.

---

### Add new board topology

1. implement adjacency generator
2. pass map to `Board::new`

The board logic remains unchanged.

---

# DPerformance Notes

Rust + adjacency precompute gives:

- O(1) neighbor access
- minimal allocations
- WASM friendly
- fast batch simulations

LTO + opt-level "s" keeps wasm size small.

---

# Design Philosophy

The engine intentionally:

- separates logic from UI
- separates board from algorithms
- supports both research and production
- prioritizes reproducibility
- stays generic (N-dimensional first)

# Dependencies

- wasm-bindgen
- serde / serde_json
- rand
- itertools
- optional russcip / scip-sys
