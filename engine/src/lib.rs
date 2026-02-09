/**
 * a webassembly module for simulating minesweeper games with various algorithms.
 * includes full 3d cube adjacency logic for scientific simulation of manifolds.
 * this serves as the primary interface between the frontend and the backend engine.
 */
 use wasm_bindgen::prelude::*;
 use serde_wasm_bindgen::Serializer;
 use serde::{Serialize, Deserialize};
 
 pub mod board;
 pub mod algorithms;
 
 use board::Board;
 use crate::algorithms::{
     MinesweeperAgent, AlgorithmFactory, WasmAlgorithmType, 
     TspObjective, SolverResult
 };
 
 #[cfg(target_arch = "wasm32")]
 use js_sys::Date;
 #[cfg(not(target_arch = "wasm32"))]
 use std::time::Instant;
 
 // State structure for the Native Runner (not exposed to WASM)
 #[derive(Serialize, Deserialize, Clone, Debug)]
 pub struct BoardState {
     pub game_over: bool,
     pub game_won: bool,
     pub total_revealed: usize,
     pub total_cells: usize,
     pub mines: usize,
 }
 
 #[wasm_bindgen]
 pub struct Simulator {
     pub(crate) board: Board,
     pub(crate) agent: MinesweeperAgent,
     pub(crate) algorithm_type: WasmAlgorithmType,
     pub(crate) steps: usize,
     pub(crate) time_ms: f64,
 }
 
 // ==========================================
 // 1. WASM-only interface (for wasm-pack)
 // ==========================================
 #[wasm_bindgen]
 impl Simulator {
     #[wasm_bindgen(constructor)]
     pub fn new(dims: Vec<usize>, mines: usize, algorithm_type: WasmAlgorithmType) -> Self {
         // 1. Compute actual dimensions
         let actual_dims = if dims.len() == 3 && dims[0] != 6 {
             vec![6, dims[1], dims[2]]
         } else {
             dims.clone() // Important: clone() allows reuse of dims later
         };
 
         // 2. Compute total cells and safe number of mines
         let total_cells: usize = if actual_dims.len() == 3 && actual_dims[0] == 6 {
             6 * actual_dims[1] * actual_dims[2]
         } else {
             actual_dims.iter().product()
         };
         
         // Apply safe_mines to avoid creating more mines than possible
         let safe_mines = mines.min(total_cells - 1);
 
         // 3. Generate adjacency map
         let adj_map = if actual_dims.len() == 3 && actual_dims[0] == 6 {
             Self::generate_cube_adjacency(actual_dims[2], actual_dims[1])
         } else {
             Self::generate_nd_adjacency(&actual_dims)
         };
         
         // 4. Create board and agent
         let board = Board::new(actual_dims.clone(), safe_mines, adj_map);
         
         let h = if actual_dims.len() >= 2 { actual_dims[actual_dims.len()-2] } else { actual_dims[0] };
         let w = if actual_dims.len() >= 1 { actual_dims[actual_dims.len()-1] } else { 1 };
 
         let agent = AlgorithmFactory::create_agent(
             algorithm_type,
             TspObjective::MinDistance,
             w, h, safe_mines
         );
 
         Simulator {
             board,
             agent,
             algorithm_type,
             steps: 0,
             time_ms: 0.0,
         }
     }
 
     #[wasm_bindgen(js_name = getState)]
     pub fn get_state(&self) -> JsValue {
         let total_cells = self.board.cells.len();
         let total_mines = self.board.mines;
         
         let completion = if total_cells > total_mines {
             (self.board.total_revealed as f64) / ((total_cells - total_mines) as f64) * 100.0
         } else { 0.0 };
     
         let state_json = serde_json::json!({
             "game_won": self.board.game_won,
             "game_over": self.board.game_over,
             "total_revealed": self.board.total_revealed,
             "total_cells": total_cells,
             "mines": total_mines,
             "cells": self.board.cells,
             "dimensions": self.board.dimensions,
             "time_ms": self.time_ms,
             "completion": completion,
             "algorithm": self.algorithm_type.as_str(),
             "total_clicks": self.steps,
             "total_guesses": self.board.total_guesses
         });
     
         state_json.serialize(&Serializer::json_compatible()).unwrap()
     }
 
     #[wasm_bindgen(js_name = runBatch)]
     pub fn run_batch(&mut self, games: usize) -> JsValue {
         let mut results = Vec::new();
         let mines = self.board.mines;
         let total_cells = self.board.cells.len();
 
         for game_idx in 0..games {
             self.reset(); 
             
             #[cfg(target_arch = "wasm32")]
             let start = Date::now();
             
             while !self.board.game_over && !self.board.game_won {
                 self.run_step();
             }
             let current_guesses = self.board.total_guesses;
 
             #[cfg(target_arch = "wasm32")]
             let duration = Date::now() - start;
             #[cfg(not(target_arch = "wasm32"))]
             let duration = 0.0;
 
             results.push(serde_json::json!({
                 "game": game_idx + 1,
                 "success": self.board.game_won,
                 "total_guesses": current_guesses,
                 "steps": self.steps,
                 "total_revealed": self.board.total_revealed,
                 "total_cells": total_cells,
                 "time_ms": duration,
                 "algorithm": self.algorithm_type.as_str(),
                 "completion": (self.board.total_revealed as f64 / (total_cells - mines) as f64) * 100.0
             }));
         }
 
         serde_wasm_bindgen::to_value(&results).unwrap()
     }
 
     #[wasm_bindgen(js_name = runStep)]
     pub fn run_step(&mut self) -> bool {
         if self.board.game_over || self.board.game_won { return false; }
 
         if let Some(result) = self.agent.next_move(&self.board) {
             if result.candidates.is_empty() {
                 self.board.game_over = true; // No moves possible
                 return false;
             }
            
             if result.is_guess {
                 self.board.record_guess();
             }
             
             let choice = self.agent.pick_best_from_candidates(&self.board, result);
             self.board.reveal_cell(choice);
             self.steps += 1;
             true
         } else {
             self.board.game_over = true;
             false
         }
     }
 
     #[wasm_bindgen(js_name = runFullGame)]
     pub fn run_full_game(&mut self) -> JsValue {
         #[cfg(target_arch = "wasm32")]
         let start = Date::now();
         #[cfg(not(target_arch = "wasm32"))]
         let start_inst = Instant::now();
 
         while !self.board.game_over && !self.board.game_won {
             if !self.run_step() { break; }
         }
 
         #[cfg(target_arch = "wasm32")]
         { self.time_ms = Date::now() - start; }
         #[cfg(not(target_arch = "wasm32"))]
         { self.time_ms = start_inst.elapsed().as_secs_f64() * 1000.0; }
 
         self.get_state()
     }
 
     #[wasm_bindgen(js_name = reset)]
     pub fn reset(&mut self) {
         self.board.reset();
         self.agent.first_move = true; 
         self.steps = 0;
         self.time_ms = 0.0;
     }
 
     #[wasm_bindgen(js_name = setAlgorithm)]
     pub fn set_algorithm(&mut self, algorithm_type: WasmAlgorithmType) {
         self.algorithm_type = algorithm_type;
         let dims = &self.board.dimensions;
         let h = if dims.len() >= 2 { dims[dims.len()-2] } else { dims[0] };
         let w = if dims.len() >= 1 { dims[dims.len()-1] } else { 1 };
         self.agent = AlgorithmFactory::create_agent(algorithm_type, self.agent.objective, w, h, self.board.mines);
     }
 
     #[wasm_bindgen(js_name = setSeed)]
     pub fn wasm_set_seed(&mut self, seed: u64) { self.board.seed = Some(seed); }
 
     #[wasm_bindgen(js_name = setTspObjective)]
     pub fn wasm_set_tsp_objective(&mut self, objective: TspObjective) { self.agent.objective = objective; }
 
     #[wasm_bindgen(js_name = getSteps)]
     pub fn wasm_get_steps(&self) -> usize { self.steps }
 }
 
 // ==========================================
 // 2. Native Runner interface (for cargo run)
 // No #[wasm_bindgen] to prevent errors
 // ==========================================
 impl Simulator {
     pub fn set_seed(&mut self, seed: u64) {
         self.board.seed = Some(seed);
     }
 
     pub fn set_tsp_objective(&mut self, objective: TspObjective) {
         self.agent.objective = objective;
     }
 
     pub fn get_steps(&self) -> usize {
         self.steps
     }
 
     pub fn get_state_internal(&self) -> BoardState {
         BoardState {
             game_over: self.board.game_over,
             game_won: self.board.game_won,
             total_revealed: self.board.total_revealed,
             total_cells: self.board.cells.len(),
             mines: self.board.mines,
         }
     }
 
     pub fn get_next_move_metadata(&mut self) -> Option<SolverResult> {
         self.agent.next_move(&self.board)
     }
 
     // --- Internal helpers (shared) ---
     fn generate_nd_adjacency(dims: &[usize]) -> Vec<Vec<usize>> {
         let total_cells: usize = dims.iter().product();
         let mut adj = vec![Vec::new(); total_cells];
         for i in 0..total_cells {
             let coords = Self::index_to_coords(i, dims);
             let mut neighbors = Vec::new();
             Self::find_nd_neighbors(0, &coords, &mut Vec::new(), dims, &mut neighbors);
             adj[i] = neighbors.into_iter().filter(|&n_idx| n_idx != i).collect();
         }
         adj
     }
 
     fn find_nd_neighbors(dim_idx: usize, current_coords: &[usize], neighbor_coords: &mut Vec<usize>, dims: &[usize], results: &mut Vec<usize>) {
         if dim_idx == dims.len() {
             results.push(Self::coords_to_index(neighbor_coords, dims));
             return;
         }
         let current_val = current_coords[dim_idx] as isize;
         for delta in -1..=1 {
             let next_val = current_val + delta;
             if next_val >= 0 && next_val < dims[dim_idx] as isize {
                 neighbor_coords.push(next_val as usize);
                 Self::find_nd_neighbors(dim_idx + 1, current_coords, neighbor_coords, dims, results);
                 neighbor_coords.pop();
             }
         }
     }
 
     fn coords_to_index(coords: &[usize], dims: &[usize]) -> usize {
         let mut index = 0;
         let mut stride = 1;
         for i in (0..dims.len()).rev() {
             index += coords[i] * stride;
             stride *= dims[i];
         }
         index
     }
 
     fn index_to_coords(mut index: usize, dims: &[usize]) -> Vec<usize> {
         let mut coords = vec![0; dims.len()];
         for i in (0..dims.len()).rev() {
             coords[i] = index % dims[i];
             index /= dims[i];
         }
         coords
     }
 
     fn generate_cube_adjacency(w: usize, h: usize) -> Vec<Vec<usize>> {
         let face_size = w * h;
         let mut adj = vec![Vec::new(); 6 * face_size];
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
                             if nx >= 0 && nx < w as isize && ny >= 0 && ny < h as isize {
                                 neighbors.push(face * face_size + (ny as usize) * w + (nx as usize));
                             } else {
                                 neighbors.push(Self::map_edge_neighbor(face, x, y, dx, dy, w, h));
                             }
                         }
                     }
                     neighbors.sort(); neighbors.dedup();
                     adj[idx] = neighbors;
                 }
             }
         }
         adj
     }
 
     fn map_edge_neighbor(f: usize, x: usize, y: usize, dx: isize, dy: isize, w: usize, h: usize) -> usize {
         let face_size = w * h;
         let (target_face, tx, ty);
         match f {
             0 => { if y == 0 && dy < 0 { target_face = 3; tx = x; ty = 0; } else if y == h-1 && dy > 0 { target_face = 2; tx = x; ty = 0; } else if x == 0 && dx < 0 { target_face = 4; tx = y; ty = 0; } else { target_face = 5; tx = h - 1 - y; ty = 0; } },
             1 => { if y == 0 && dy < 0 { target_face = 2; tx = x; ty = h - 1; } else if y == h-1 && dy > 0 { target_face = 3; tx = x; ty = h - 1; } else if x == 0 && dx < 0 { target_face = 4; tx = h - 1 - y; ty = h - 1; } else { target_face = 5; tx = y; ty = h - 1; } },
             2 => { if y == 0 && dy < 0 { target_face = 0; tx = x; ty = h - 1; } else if y == h-1 && dy > 0 { target_face = 1; tx = x; ty = 0; } else if x == 0 && dx < 0 { target_face = 4; tx = w - 1; ty = y; } else { target_face = 5; tx = 0; ty = y; } },
             3 => { if y == 0 && dy < 0 { target_face = 0; tx = x; ty = 0; } else if y == h-1 && dy > 0 { target_face = 1; tx = x; ty = h - 1; } else if x == 0 && dx < 0 { target_face = 5; tx = w - 1; ty = y; } else { target_face = 4; tx = 0; ty = y; } },
             4 => { if y == 0 && dy < 0 { target_face = 0; tx = 0; ty = x; } else if y == h-1 && dy > 0 { target_face = 1; tx = 0; ty = h - 1 - x; } else if x == 0 && dx < 0 { target_face = 3; tx = w - 1; ty = y; } else { target_face = 2; tx = 0; ty = y; } },
             5 => { if y == 0 && dy < 0 { target_face = 0; tx = w - 1; ty = h - 1 - x; } else if y == h-1 && dy > 0 { target_face = 1; tx = w - 1; ty = x; } else if x == 0 && dx < 0 { target_face = 2; tx = w - 1; ty = y; } else { target_face = 3; tx = 0; ty = y; } },
             _ => unreachable!(),
         }
         target_face * face_size + (ty * w) + tx
     }
 }
 