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
(base) ➜  Scientific_Computing_Project git:(main) ✗ tree -L 4
.
├── Readme.md
├── engine
│   ├── Cargo.toml # add library dependencies
│   ├── Readme.md
│   ├── src
│   │   ├── algorithms
│   │   │   ├── exact_solver.rs
│   │   │   ├── greedy.rs
│   │   │   ├── local_search.rs # maybe something like this
│   │   │   ├── macros.rs # macro tool to make my life easier
│   │   │   ├── metaheuristic.rs
│   │   │   └── mod.rs # you need to add your algorithm here as well
│   └─── board.rs
│     ├── lib.rs
│     └──├simulator.rs
└── frontend
    ├── src
    │   ├── App.css
    │   ├── App.tsx
    │   ├── assets
    │   │   └── react.svg
    │   ├── components
    │   │   ├── AlgorithmSelector.css
    │   │   ├── AlgorithmSelector.tsx
    │   │   ├── BoardView.css
    │   │   ├── BoardView.tsx
    │   │   ├── Controls.css
    │   │   ├── Controls.tsx
    │   │   ├── ResultView.css
    │   │   └── ResultView.tsx
    │   ├── index.css
    │   ├── main.tsx
    │   ├── types
    │   │   ├── simulation.ts
    │   │   └── wasm.d.ts
    │   └── utils
    │       └── visualization.ts
    ├── tsconfig.app.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    └── vite.config.ts

```

will use Cloudflare Pages for Hosting

### Setting up Cloudflare pages

debugging

- modify root folder to /frontend

setup
Project name: minesweeper-simulator
Root directory: frontend
Build Command

```
# took me an hour to debug
if ! command -v rustc &> /dev/null; then curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y; source $HOME/.cargo/env; fi && if ! command -v wasm-pack &> /dev/null; then curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh; fi && cd ../engine && wasm-pack build --target web --out-dir ../frontend/src/wasm_pkg
```

Deploy command: cd ../frontend && /opt/buildhome/.cargo/bin/wasm-pack --version > /dev/null 2>&1 && echo "WASM already built, skipping..." || (cd ../engine && /opt/buildhome/.cargo/bin/wasm-pack build --target web --out-dir ../frontend/src/wasm_pkg) && npm run build

and for the package.json

```json
{
  "scripts": {
    "prebuild": "if [ -n \"$CF_PAGES\" ]; then cd ../engine && /opt/buildhome/.cargo/bin/wasm-pack build --target web --out-dir ../frontend/src/wasm_pkg; else cd ../engine && wasm-pack build --target web --out-dir ../frontend/src/wasm_pkg; fi",
    "build": "tsc --noEmit && vite build",
    "dev": "vite",
    "lint": "eslint .",
    "preview": "vite preview"
  }
}
```
