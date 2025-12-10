Deployed at : https://tuberlin-sc-project.pages.dev/
maybe let's make a branch for each algorithms and then make pull requests

# How to setup the Environment

```bash
# clone this repo
git clone https://github.com/TU-Berlin-SC/Scientific_Computing_Project.git

# Make sure you have Rust (I'm sure we all do)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install wasm-pack
cargo install wasm-pack

# Check your Node.js (v18 or higher)
node -v
npm -v

# and do you perhaps have npm installed?
npm install -g npm@latest
```

## How to Build for the first time

```bash
cd engine # Backend route
cargo check # check dependencies
cargo update # Update dependencies
wasm-pack build --target web --out-dir ../frontend/src/wasm_pkg # WASM Build

cd ../frontend # frontend
npm i # only install for first time
npm run build
npm run dev
```

After building for first time,
(Also, I recommend to use separate bash to run front and backend)

## Backend

```bash
cd engine
cargo update # Update dependencies
wasm-pack build --target web --out-dir ../frontend/src/wasm_pkg # WASM Build
```

## Frontend

```bash
cd frontend
npm run dev # this allows to show your changes in real time with the url it gives you
```

---

# Architecture

```bash
.
├── Readme.md
├── engine
│   ├── Cargo.toml # add library dependencies
│   ├── Readme.md
│   ├── src
│   │   ├── algorithms          # <- this is where we put our algorithms!
│   │   │   ├── exact_solver.rs # exact solver using ilp
│   │   │   ├── greedy.rs       # greedy (but it's not so good right now)
│   │   │   ├── local_search.rs # for later
│   │   │   ├── macros.rs       # macro tool to make my life easier
                                #(so we dont have to call 239048 times of our new algorithm)
│   │   │   ├── metaheuristic.rs # for later
│   │   │   └── mod.rs # [IMPORTANT] you need to add your algorithm here as well!
│   └─── board.rs               # common module for our board logic
│     ├── lib.rs                # WebAssembly module for simulation
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

took me forever but..this is only for my reference. it's already all setup .

```
Build configuration
Build command:
if ! command -v rustc &> /dev/null; then curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y; . "$HOME/.cargo/env"; fi && if ! command -v wasm-pack &> /dev/null; then curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh; fi && cd ../engine && wasm-pack build --target web --out-dir ../frontend/src/wasm_pkg && cd ../frontend && npm run build
Build output:
dist
Root directory:
frontend
Build comments:
Enabled
```

and vite.config.ts, package.json, and \_headers had to be modified as well

### How to add to our codes?

still working on writing this.

```bash
# create branch
# git add <files>
# git commit -m "something"
# git push
# pull requst & merge
# if we merge it, let's update our tag as well
```
