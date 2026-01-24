/**
* A WebAssembly module for simulating Minesweeper games with various algorithms.
* It provides functionality to run single steps, full games, and batch simulations,
* as well as to compare different algorithms over multiple games.
* so it's like an interface between frontend and backend engine
*/

use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::to_value;

mod board;
mod algorithms;

use board::Board;
use algorithms::{Algorithm, AlgorithmFactory, WasmAlgorithmType};

// Simulator struct
#[wasm_bindgen]
pub struct Simulator {
    board: Board,
    algorithm: Box<dyn Algorithm>,
    algorithm_type: WasmAlgorithmType,
    steps: usize,
}

// Simulator methods
#[wasm_bindgen]
impl Simulator {
    #[wasm_bindgen(constructor)]
    pub fn new(n: usize, mines: usize, algorithm_type: WasmAlgorithmType) -> Self {
        let board = Board::new(n, mines);
        let algorithm = AlgorithmFactory::create_algorithm(
            algorithm_type,
            n, mines // DEV: was width, height
        );
        
        Self { 
            board, 
            algorithm,
            algorithm_type,
            steps: 0 
        }
    }
    // Get the current state of the board
    #[wasm_bindgen(js_name = getState)]
    pub fn get_state(&self) -> JsValue {
        to_value(&self.board).unwrap()
    }

    // Run a single step of the algorithm
    #[wasm_bindgen(js_name = runStep)]
    pub fn run_step(&mut self) -> JsValue {
        if self.board.game_over || self.board.game_won { 
            return self.get_state(); 
        }
        
        if let Some((face, u, v)) = self.algorithm.next_move(&self.board) {
            self.board.reveal_cell(face, u, v);
            self.steps += 1;
        }
        
        self.get_state()
    }

    // Run the full game until completion
    #[wasm_bindgen(js_name = runFullGame)]
    pub fn run_full_game(&mut self) -> JsValue {
        while !self.board.game_over && !self.board.game_won {
            if let Some((face, u, v)) = self.algorithm.next_move(&self.board) { // DEV: was x, y
                self.board.reveal_cell(face, u, v);
                self.steps += 1;
            } else {
                break;
            }
        }
        
        self.get_state()
    }
    // Run multiple games in batch and return aggregated results
    #[wasm_bindgen(js_name = runBatch)]
    pub fn run_batch(&self, games: usize) -> JsValue {
        let n = self.board.n;
        let mines = self.board.mines;
        
        let mut results = Vec::new();
        
        for game_idx in 0..games {  // 0부터 games-1까지
            let mut board = Board::new(n, mines);
            let mut algorithm = AlgorithmFactory::create_algorithm(
                self.algorithm_type.into(),
                n, mines // DEV: was width, height
            );
            let mut steps = 0;
            let mut clicks = 0;
            // 게임 진행
            while !board.game_over && !board.game_won {
                if let Some((face, u, v)) = algorithm.next_move(&board) {    // 다음 수를 얻음
                    board.reveal_cell(face, u, v);                            // 셀을 공개
                    steps += 1;                                         // 단계 증가
                    clicks = board.total_clicks;                      // 클릭 수 갱신
                } else {
                    break;
                }
            }
            
            results.push(serde_json::json!({
                "game": game_idx + 1,
                "success": board.game_won,
                "steps": steps,
                "clicks": clicks,
                "mines": mines,
                "n": n, // DEV: was width, height
                "total_revealed": board.total_revealed,
                "total_cells": n * n * 6,
                "game_over": board.game_over,
                "algorithm": self.algorithm_type.as_str(),
            }));
        }
        
        to_value(&results).unwrap()
    }

    // Reset the simulator to initial state
    #[wasm_bindgen(js_name = reset)]
    pub fn reset(&mut self) {
        let n = self.board.n;
        let mines = self.board.mines;
        
        self.board = Board::new(n, mines);
        self.algorithm = AlgorithmFactory::create_algorithm(
            self.algorithm_type.into(),
            n, mines // DEV: was width, height
        );
        self.steps = 0;
    }

    // Set a new algorithm for the simulator
    #[wasm_bindgen(js_name = setAlgorithm)]
    pub fn set_algorithm(&mut self, algorithm_type: WasmAlgorithmType) {
        let n = self.board.n;
        let mines = self.board.mines;
        
        self.algorithm_type = algorithm_type;
        self.algorithm = AlgorithmFactory::create_algorithm(
            algorithm_type.into(),
            n, mines // DEV: was width, height
        );
    }

    // Get the current algorithm type as a string
    #[wasm_bindgen(js_name = getAlgorithm)]
    pub fn get_algorithm(&self) -> String {
        self.algorithm_type.as_str().to_string()
    }
}

// ONLY FOR TESTING PURPOSES
// trying to see if wasm is working with our web deployment and dev setup
#[wasm_bindgen]
pub fn hello_world() -> String {
    "Hello from WASM Minesweeper!".to_string()
}

#[wasm_bindgen]
pub fn test_add(a: i32, b: i32) -> i32 {
    a + b
}

// Create a simple board for testing. maybe i should remove this later
#[wasm_bindgen]
pub fn create_simple_board() -> JsValue {
    let board = Board::new(8, 10);
    to_value(&board).unwrap()
}

// Compare different algorithms over multiple games
#[wasm_bindgen]
pub fn compare_algorithms(n: usize, mines: usize, games: usize) -> JsValue { // DEV: was width, height
    let mut results = Vec::new();
    
    // 매크로에서 생성된 all() 메서드 사용
    for &algo_type in WasmAlgorithmType::all().iter() {
        let mut wins = 0;
        let mut total_steps = 0;
        let mut total_clicks = 0;
        
        for _ in 0..games {
            let mut board = Board::new(n, mines);
            let mut algorithm = AlgorithmFactory::create_algorithm(
                algo_type.into(),
                n, mines // DEV: was width, height
            );
            let mut steps = 0;
            
            while !board.game_over && !board.game_won {
                if let Some((face, u, v)) = algorithm.next_move(&board) {
                    board.reveal_cell(face, u, v);
                    steps += 1;
                } else {
                    break;
                }
            }
            
            if board.game_won {
                wins += 1;
                total_steps += steps;
                total_clicks += board.total_clicks;
            }
        }
        
        results.push(serde_json::json!({
            "algorithm": algo_type.as_str(),
            "total_games": games,
            "wins": wins,
            "win_rate": (wins as f64 / games as f64) * 100.0,
            "avg_steps_wins": if wins > 0 { total_steps as f64 / wins as f64 } else { 0.0 },
            "avg_clicks_wins": if wins > 0 { total_clicks as f64 / wins as f64 } else { 0.0 },
        }));
    }
    
    to_value(&results).unwrap()
}