# Minesweeper Simulation

### Evaluating Algorithm Performance and Movement Prioritisation in 3D/4D Minesweeper

Evaluating Algorithm Performance and Movement Prioritization in 3D/4D Environments
This project explores the extension of classical 2D Minesweeper into 3D (Cube) and 4D (Hyperplane) dimensions.

It serves as a benchmarking platform to analyze how various computational solvers—ranging from simple heuristics to complex SAT and ILP models—handle increased logical density and topological complexity.

## Live Demo

url : 🔗 [https://tuberlin-sc-project.pages.dev/](https://tuberlin-sc-project.pages.dev/)

- Step-by-step execution (Test Step)
- Run full game automatically (Test Full Game)
- Batch test (100 games)
- Compare all algorithms & save csv
- Reset current run
  More details can be found in [here](./frontend/).

# Project Architecture

The system follows a decoupled, high-performance architecture to ensure heavy computations don't freeze the UI.

- `engine` **(Rust Core)**: The "brain" containing game logic, Cube map, N-dimensional adjacency maps, and solver implementations.
- `frontend` **(React + TS)**: An interactive dashboard for visualization, step-by-step inspection, and real-time benchmarking.
- **WASM Bridge**: Compiles the Rust engine into WebAssembly for near-native performance directly in the browser.
- `runner` **(Native CLI)**: A specialized tool for heavy-duty batch processing and ILP (SCIP) solvers that cannot run in a browser environment.
  ![](./assets/d-architecture.png)

## Solvers and Algorithms

We implement and compare three distinct families of solving strategies:

| Category         | Algorithm  | Description                                                    | Strength                 |
| ---------------- | ---------- | -------------------------------------------------------------- | ------------------------ |
| **Heuristic**    | Greedy     | Local neighbor reasoning mimicking human play.                 | Lightning fast.          |
| **Logic-Based**  | SAT Solver | Converts the board to CNF constraints; proves safety via DPLL. | Balanced speed/accuracy. |
| **Optimization** | ILP (SCIP) | Integer Linear Programming for global board optimization.      | Highest win rate.        |

Detailed information about the algorithms can be found in [here](./engine/).

---

## Scientific Observations

### The Dimensionality Gap

As dimensions increase, the number of neighbors per cell grows exponentially (). This leads to a "combinatorial explosion" in constraints.

- **2D:** 8 Neighbors
- **3D:** 26 Neighbors
- **4D:** 80 Neighbors

### Benchmark Results (100 Board Sample)

| Dimension                                                                                                             | Greedy Win Rate | SAT Win Rate | ILP Win Rate |
| --------------------------------------------------------------------------------------------------------------------- | --------------- | ------------ | ------------ |
| **2D**                                                                                                                | 36%             | 95%          | 41%\*        |
| **3D**                                                                                                                | 20%             | 97%          | 14%\*        |
| **4D**                                                                                                                | 4%              | 50%          | 9%\*         |
| \*_Note: ILP performance varies significantly based on timeout constraints and global vs. local optimization passes._ |                 |              |              |

Evaluated date : 06/02/2026.

## Getting Started

### Prerequisites

- **Rust:** `rustup` (latest stable)
- **Wasm-pack:** `cargo install wasm-pack`
- **Node.js:** v18+ and `npm`

### 1. Test Benchmarks

```
Cargo run
```

### 2. With Visuals

#### Build the WASM Engine

The frontend relies on the compiled Rust logic. You must build this first:

```bash
cd engine
wasm-pack build --target web --out-dir ../frontend/src/wasm_pkg

```

#### Launch with React

```bash
cd frontend
npm install
npm run dev

```

## Repository Structure

```text
.
├── engine/                # Core Rust Logic
│   ├── src/algorithms/    # Solver implementations (SAT, Greedy, ILP)
│   └── src/board.rs       # N-D Adjacency and Game State
├── frontend/              # React Visualization App
│   └── src/components/    # 3D/4D Renderers & Control Panels
└── runner/                # Native CLI for Research Benchmarking

```

---

## Future Roadmap

- **Parallel SAT Solving:** Implementing partitioned SAT solving to handle 4D boards faster.
- **Advanced Topology:** Moving beyond grids to spherical and toroidal manifolds.
