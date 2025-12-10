## How to Build

```bash
# 1. Rust 엔진 수정 후 빌드
cd engine
# 의존성 확인
cargo check
# WASM 빌드
wasm-pack build --target web --out-dir ../frontend/src/wasm_pkg

# 2. 프론트엔드 정리
cd ../frontend
# 기존 파일 삭제 (선택사항)
rm -rf src/worker src/minesweeper.ts
# 새 파일들로 교체

# 3. 프론트엔드 실행
npm run dev
```

# Environment setup

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# install wasm-pack
cargo install wasm-pack

# Node.js (v18 or higher)
node -v
npm -v
```

### Frontend

```
npm install -g npm@latest
npm create vite@latest frontend
```

### WASM Build Path

```
cd engine
wasm-pack build --target bundler --out-dir ../frontend/src/wasm_pkg
```

so we can call the build. build with `frontend/src/wasm_pkg`

## Run

```bash

cd engine
wasm-pack build --target bundler --out-dir ../frontend/src/wasm_pkg

# 2. Vite frontend dev
cd ../frontend
npm install
npm run dev
```

## Architecture

```bash
.
├── engine/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs          # main library
│   │   ├── board.rs        # game board structure
│   │   ├── algorithms/     # Algorithms modules
│   │   │   ├── mod.rs
│   │   │   ├── exact.rs    # exact solution (ILP)
│   │   │   ├── greedy.rs   # greedy
│   │   │   ├── local_search.rs # greedy + local search
│   │   │   └── metaheuristic.rs # metahuristic
│   │   └── simulator.rs    # simulator
│   └── ...
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── SimulationView.tsx
    │   │   ├── ResultView.tsx
    │   │   ├── BoardView.tsx
    │   │   └── Controls.tsx
    │   ├── types/
    │   │   └── simulation.ts
    │   ├── utils/
    │   │   └── visualization.ts
    │   └── ...
    └── ...
```
