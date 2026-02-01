/**
 * a webassembly module for simulating minesweeper games with various algorithms.
 * includes full 3d cube adjacency logic for scientific simulation of manifolds.
 * this serves as the primary interface between the frontend and the backend engine.
 */

use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::to_value;

pub mod board;
pub mod algorithms;

use board::Board;
use crate::algorithms::{MinesweeperAgent, AlgorithmFactory, WasmAlgorithmType, TspObjective};

/// simulator struct: manages the lifecycle of a 3d minesweeper session
#[wasm_bindgen]
pub struct Simulator {
    board: Board,
    agent: MinesweeperAgent,
    algorithm_type: WasmAlgorithmType,
    steps: usize,
}

#[wasm_bindgen]
impl Simulator {
    /// creates a new 3d simulation.
    /// generates a stitched cube adjacency map before initializing the board.
    #[wasm_bindgen(constructor)]
    pub fn new(width: usize, height: usize, mines: usize, algorithm_type: WasmAlgorithmType) -> Self {
        // generate the topological map for the 6-faced cube
        let adj_map = Self::generate_cube_adjacency(width, height); 
        
        // initialize the physical board state
        let board = Board::new(width, height, mines, adj_map);
        
        // setup the agent with a default tsp objective
        let agent = AlgorithmFactory::create_agent(
            algorithm_type,
            TspObjective::MinDistance,
            width, height, mines
        );

        Simulator {
            board,
            agent,
            algorithm_type,
            steps: 0,
        }
    }

    /// Set a seed for deterministic mine placement
    #[wasm_bindgen(js_name = setSeed)]
    pub fn set_seed(&mut self, seed: u64) {
        self.board.seed = Some(seed);
    }

    /// generates a adjacency map for a 6-faced cube manifold
    /// faces are indexed 0-5. logic handles "stitching" edges across 3d space.
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
        let (nx, ny) = (x as isize + dx, y as isize + dy);
        let target_face;
        let (tx, ty);

        // layout: 0:top, 1:bottom, 2:front, 3:back, 4:left, 5:right
        match f {
            0 => { // top
                if ny < 0 { target_face = 3; tx = x; ty = 0; }
                else if ny >= h as isize { target_face = 2; tx = x; ty = 0; }
                else if nx < 0 { target_face = 4; tx = y; ty = 0; }
                else { target_face = 5; tx = h - 1 - y; ty = 0; }
            },
            1 => { // bottom
                if ny < 0 { target_face = 2; tx = x; ty = h - 1; }
                else if ny >= h as isize { target_face = 3; tx = x; ty = h - 1; }
                else if nx < 0 { target_face = 4; tx = h - 1 - y; ty = h - 1; }
                else { target_face = 5; tx = y; ty = h - 1; }
            },
            2 => { // front
                if ny < 0 { target_face = 0; tx = x; ty = h - 1; }
                else if ny >= h as isize { target_face = 1; tx = x; ty = 0; }
                else if nx < 0 { target_face = 4; tx = w - 1; ty = y; }
                else { target_face = 5; tx = 0; ty = y; }
            },
            3 => { // back
                if ny < 0 { target_face = 0; tx = x; ty = 0; }
                else if ny >= h as isize { target_face = 1; tx = x; ty = h - 1; }
                else if nx < 0 { target_face = 5; tx = w - 1; ty = y; }
                else { target_face = 4; tx = 0; ty = y; }
            },
            4 => { // left
                if ny < 0 { target_face = 0; tx = 0; ty = x; }
                else if ny >= h as isize { target_face = 1; tx = 0; ty = h - 1 - x; }
                else if nx < 0 { target_face = 3; tx = w - 1; ty = y; }
                else { target_face = 2; tx = 0; ty = y; }
            },
            5 => { // right
                if ny < 0 { target_face = 0; tx = w - 1; ty = h - 1 - x; }
                else if ny >= h as isize { target_face = 1; tx = w - 1; ty = x; }
                else if nx < 0 { target_face = 2; tx = w - 1; ty = y; }
                else { target_face = 3; tx = 0; ty = y; }
            },
            _ => unreachable!(),
        }
        target_face * face_size + (ty * w) + tx
    }

    /// executes a single move using the selected algorithm
    #[wasm_bindgen(js_name = runStep)]
    pub fn run_step(&mut self) -> bool {
        if self.board.game_over { return false; }
        
        // ask agent for the next logical move
        if let Some(idx) = self.agent.next_move(&self.board) {
            self.board.reveal_cell(idx);
            self.steps += 1;
            true
        } else {
            // if no moves found, the game is stuck
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

    /// serializes the board state for the frontend
    #[wasm_bindgen(js_name = getState)]
    pub fn get_state(&self) -> JsValue {
        to_value(&self.board).unwrap()
    }

    /// resets the game state while maintaining dimensions
    #[wasm_bindgen(js_name = reset)]
    pub fn reset(&mut self) {
        self.board.reset();
        self.agent.first_move = true; 
        self.steps = 0;
    }

    /// dynamically switches the solver algorithm
    #[wasm_bindgen(js_name = setAlgorithm)]
    pub fn set_algorithm(&mut self, algorithm_type: WasmAlgorithmType) {
        self.algorithm_type = algorithm_type;
        self.agent = AlgorithmFactory::create_agent(
            self.algorithm_type,
            self.agent.objective,
            self.board.width, self.board.height, self.board.mines
        );
    }

    #[wasm_bindgen(js_name = getAlgorithm)]
    pub fn get_algorithm(&self) -> String {
        self.algorithm_type.as_str().to_string()
    }

    #[wasm_bindgen(js_name = setTspObjective)]
    pub fn set_tsp_objective(&mut self, objective: TspObjective) {
        self.agent.objective = objective;
    }
}

/// native rust implementation for non-wasm benchmarking
impl Simulator {
    /// returns a reference to the board for data collection
    pub fn get_state_internal(&self) -> &Board {
        &self.board
    }

    /// checks if the current solver is able to find a safe move without guessing
    /// this allows the metaheuristic to track how many times the agent relied on luck
    pub fn can_deduce_safely(&mut self) -> bool {
        let candidates = self.agent.solver.find_candidates(&self.board);
        !candidates.is_empty()
    }
}