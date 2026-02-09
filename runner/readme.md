# Runner

## Metaheuristic Benchmark Tool for the Minesweeper Engine

A native benchmarking runner built on top of the **engine crate**.

This crate is designed for:

- solver comparison
- metaheuristic experiments
- research benchmarking
- performance evaluation
- reproducible simulations

It **does NOT target WebAssembly**.

Instead, it runs purely in **native Rust** and supports heavy solvers such as:

- SAT
- exact solvers
- SCIP (MILP)

---

# Purpose

The `engine` crate focuses on:

> core logic + board + algorithms + WASM compatibility

The `runner` crate focuses on:

> experiments + benchmarking + research-only solvers

This separation keeps:

- engine lightweight
- wasm build clean
- no SCIP linking issues
- better architecture boundaries

---

# Architecture

```
runner (this crate)
        ↓
engine (simulation core)
        ↓
Board + Algorithms
```

### Responsibilities

## engine

- game logic
- adjacency
- solvers
- wasm interface

## runner

- benchmarking loops
- seed control
- statistics
- CSV export
- heavy native solvers (SCIP)

---

# Features

- multiple board sizes
- multiple algorithms
- multiple objectives
- deterministic seeds
- batch simulation
- timing metrics
- win rate analysis
- CSV output for research

---

# Requirements

Because this runner may use **SCIP**, you must build natively.

## macOS (recommended)

```
brew install scip
```

## Build

```
cargo run --features native
```

Without `native` feature, SCIP solver will not be available.

---

# How It Works

The runner performs a **full experiment matrix**:

```
board sizes × algorithms × objectives × seeds
```

Default configuration:

```
4 board sizes
5 algorithms
3 objectives
N iterations
```

Example:

```
configurations: 4 board sizes x 5 algorithms x 3 tsp objectives
```

For each combination:

1. create Simulator
2. set seed
3. run until finish
4. collect metrics
5. store result

---

# Tested Parameters

## Board sizes

Cube boards:

```
6 × H × W
```

Default:

```
(3×3)
(5×5)
(8×8)
(10×10)
```

---

## Algorithms

- greedy
- exact_solver
- global_sat
- partitioned_sat
- scip_solver (native only)

---

## Objectives

TSP-style optimization goals:

- MinDistance
- MinRotation
- MaxInformation

---

# Output Example

Console:

```
Completed: greedy on 3x3x6 board (Seed: 0)
Completed: exact_solver on 3x3x6 board (Seed: 0)
Completed: global_sat on 3x3x6 board (Seed: 0)
Completed: partitioned_sat on 3x3x6 board (Seed: 0)
Completed: scip_solver on 3x3x6 board (Seed: 0)
```

---

## CSV Output

Automatically generated:

```
algorithm,objective,dims,seed,win,clicks,time_ms,guesses,completion
greedy,MinDistance,3x3,0,true,24,1,0,100.00
scip_solver,MaxInformation,3x3,0,true,19,12,0,100.00
...
```

# Metrics Collected

Each simulation records:

| Field      | Description        |
| ---------- | ------------------ |
| algorithm  | solver name        |
| objective  | TSP objective      |
| dims       | board size         |
| seed       | deterministic seed |
| win        | success or fail    |
| clicks     | total actions      |
| time_ms    | runtime            |
| guesses    | guess count        |
| completion | revealed %         |

---

# ▶ Running

## Basic

```
cargo run --features native
```

---

## Change iterations

```rust
let runner = MetaHeuristicRunner::new(30);
```

---

## Change board sizes

```rust
board_sizes: vec![(3,3), (5,5), (8,8), (10,10)]
```

---

# 🧪 Reproducibility

Every game uses:

```
sim.set_seed(seed)
```

This guarantees:

- identical boards
- fair solver comparison
- repeatable experiments

# Extending

## Add a new algorithm

1. implement agent in engine
2. register in `WasmAlgorithmType`
3. runner picks it up automatically

## Add new metric

Modify:

```
SimulationResult
```

# Notes

### Why separate crate?

Because:

- SCIP cannot compile to wasm
- heavy dependencies slow engine build
- benchmarking logic shouldn't pollute engine

So runner is **intentionally native-only**.
