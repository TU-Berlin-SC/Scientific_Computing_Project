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
