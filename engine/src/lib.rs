/**
 * A WebAssembly module for simulating Minesweeper games with various algorithms.
 * Includes full 3D Cube adjacency logic for scientific simulation of manifolds.
 * This serves as the primary interface between the frontend and the backend engine.
 */

use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::to_value;

mod board;
mod algorithms;

use board::Board;
// added agent and TSP
use algorithms::{MinesweeperAgent, AlgorithmFactory, WasmAlgorithmType, TspObjective};

/// simulator struct: manages the lifecycle of a 3D Minesweeper session
#[wasm_bindgen]
pub struct Simulator {
    board: Board,
    agent: MinesweeperAgent,
    algorithm_type: WasmAlgorithmType,
    steps: usize,
}

#[wasm_bindgen]
impl Simulator {
    /// creates a new 3D simulation.
    /// generates a stitched cube adjacency map before initializing the board.
    #[wasm_bindgen(constructor)]
    pub fn new(width: usize, height: usize, mines: usize, algorithm_type: WasmAlgorithmType) -> Self {
        // generate the topological map for the 6-faced cube
        let adj_map = Self::generate_cube_adjacency(width, height); 
        
        // initialize the physical board state
        let board = Board::new(width, height, mines, adj_map);
        
        // setup the agent with a default TSP objective (MinDistance)
        let agent = AlgorithmFactory::create_agent(
            algorithm_type,
            TspObjective::MinDistance, // we can change default
            width, height, mines
        );

        Simulator {
            board,
            agent,
            algorithm_type,
            steps: 0,
        }
    }

    /// generates a adjacency map for a 6-faced cube manifold
    /// faces are indexed 0-5. logic handles "stitching" edges across 3D space.
    fn generate_cube_adjacency(w: usize, h: usize) -> Vec<Vec<usize>> {
        let face_size = w * h;
        let total_cells = 6 * face_size;
        let mut adj = vec![Vec::new(); total_cells];

        for face in 0..6 {
            for y in 0..h {
                for x in 0..w {
                    let idx = face * face_size + y * w + x;
                    let mut neighbors = Vec::new();

                    for dy in -1..=1 {
                        for dx in -1..=1 {
                            if dx == 0 && dy == 0 { continue; }
                            
                            let nx = x as isize + dx;
                            let ny = y as isize + dy;

                            // if within the same face, add normally
                            if nx >= 0 && nx < w as isize && ny >= 0 && ny < h as isize {
                                neighbors.push(face * face_size + (ny as usize) * w + (nx as usize));
                            } else {
                                // cross-face stitching logic
                                let neighbor = Self::map_edge_neighbor(face, x, y, dx, dy, w, h);
                                if !neighbors.contains(&neighbor) {
                                    neighbors.push(neighbor);
                                }
                            }
                        }
                    }
                    adj[idx] = neighbors;
                }
            }
        }
        adj
    }

    /// helper to map coordinates that fall off one face onto the adjacent face
    fn map_edge_neighbor(f: usize, x: usize, y: usize, dx: isize, dy: isize, w: usize, h: usize) -> usize {
        let face_size = w * h;
        // simplified cube folding logic for the manifold
        match f {
            0 => { // top face
                if dy < 0 { 3 * face_size + (h-1) * w + x }
                else if dy > 0 { 2 * face_size + 0 * w + x }
                else if dx < 0 { 4 * face_size + y * w + (w-1) }
                else { 5 * face_size + y * w + 0 }
            },
            1 => { // bottom face
                if dy < 0 { 2 * face_size + (h-1) * w + x }
                else if dy > 0 { 3 * face_size + 0 * w + x }
                else if dx < 0 { 4 * face_size + (h-1-y) * w + 0 }
                else { 5 * face_size + (h-1-y) * w + (w-1) }
            },
            // general wrapping for side faces
            _ => (f + 1) % 6 * face_size + y * w + x 
        }
    }

    /// executes a single move using the selected algorithm
    #[wasm_bindgen(js_name = run_step)]
    pub fn run_step(&mut self) -> bool {
        if self.board.game_over { return false; }
        
        // ask agent for the next logical move
        if let Some(idx) = self.agent.next_move(&self.board) {
            self.board.reveal(idx);
            self.steps += 1;
            true
        } else {
            // if no moves found, the game is stuck/over
            self.board.game_over = true;
            false
        }
    }

    /// runs the simulation until win or loss
    #[wasm_bindgen(js_name = runFullGame)]
    pub fn run_full_game(&mut self) -> JsValue {
        while !self.board.game_over {
            if !self.run_step() { break; }
        }
        self.get_state()
    }

    /// performs multiple game simulations for data collection
    #[wasm_bindgen(js_name = runBatch)]
    pub fn run_batch(&mut self, iterations: usize) -> JsValue {
        let mut results = Vec::new();

        for _ in 0..iterations {
            self.reset();
            let mut steps = 0;
            while !self.board.game_over {
                if !self.run_step() { break; }
                steps += 1;
            }
            
            results.push(serde_json::json!({
                "success": self.board.game_won,
                "total_clicks": self.board.total_clicks,
                "steps": steps,
                "algorithm": self.algorithm_type.as_str(),
            }));
        }
        to_value(&results).unwrap()
    }

    /// serializes the board state for the frontend
    #[wasm_bindgen(js_name = getState)]
    pub fn get_state(&self) -> JsValue {
        to_value(&self.board).unwrap()
    }

    /// resets the game state while maintaining dimensions
    #[wasm_bindgen(js_name = reset)]
    pub fn reset(&mut self) {
        self.board.reset();
        self.agent.first_move = true; // reset agent state for new game
        self.steps = 0;
    }

    /// dynamically switches the solver algorithm in real-time
    #[wasm_bindgen(js_name = setAlgorithm)]
    pub fn set_algorithm(&mut self, algorithm_type: WasmAlgorithmType) {
        self.algorithm_type = algorithm_type;
        // preserve current objective when swapping solvers
        self.agent = AlgorithmFactory::create_agent(
            self.algorithm_type,
            self.agent.objective,
            self.board.width, self.board.height, self.board.mines
        );
    }

    /// returns the active algorithm name for the frontend UI
    #[wasm_bindgen(js_name = getAlgorithm)]
    pub fn get_algorithm(&self) -> String {
        self.algorithm_type.as_str().to_string()
    }

    /// switches the TSP traversal strategy
    #[wasm_bindgen(js_name = setTspObjective)]
    pub fn set_tsp_objective(&mut self, objective: TspObjective) {
        self.agent.objective = objective;
    }

    /// returns the active TSP objective name for the frontend UI
    #[wasm_bindgen(js_name = getTspObjective)]
    pub fn get_tsp_objective(&self) -> String {
        format!("{:?}", self.agent.objective)
    }
}