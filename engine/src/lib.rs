// src/lib.rs
use wasm_bindgen::prelude::*;
use serde_wasm_bindgen::to_value;

mod board;
mod algorithms;

use board::Board;
use algorithms::{Algorithm, AlgorithmFactory, WasmAlgorithmType};

#[wasm_bindgen]
pub struct Simulator {
    board: Board,
    algorithm: Box<dyn Algorithm>,
    algorithm_type: WasmAlgorithmType,
    steps: usize,
}

#[wasm_bindgen]
impl Simulator {
    #[wasm_bindgen(constructor)]
    pub fn new(width: usize, height: usize, mines: usize, algorithm_type: WasmAlgorithmType) -> Self {
        let board = Board::new(width, height, mines);
        let algorithm = AlgorithmFactory::create_algorithm(
            algorithm_type,
            width, height, mines
        );
        
        Self { 
            board, 
            algorithm,
            algorithm_type,
            steps: 0 
        }
    }

    #[wasm_bindgen(js_name = getState)]
    pub fn get_state(&self) -> JsValue {
        to_value(&self.board).unwrap()
    }

    #[wasm_bindgen(js_name = runStep)]
    pub fn run_step(&mut self) -> JsValue {
        if self.board.game_over || self.board.game_won { 
            return self.get_state(); 
        }
        
        if let Some((x, y)) = self.algorithm.next_move(&self.board) {
            self.board.reveal_cell(x, y);
            self.steps += 1;
        }
        
        self.get_state()
    }

    #[wasm_bindgen(js_name = runFullGame)]
    pub fn run_full_game(&mut self) -> JsValue {
        while !self.board.game_over && !self.board.game_won {
            if let Some((x, y)) = self.algorithm.next_move(&self.board) {
                self.board.reveal_cell(x, y);
                self.steps += 1;
            } else {
                break;
            }
        }
        
        self.get_state()
    }

    #[wasm_bindgen(js_name = runBatch)]
    pub fn run_batch(&self, games: usize) -> JsValue {
        let width = self.board.width;
        let height = self.board.height;
        let mines = self.board.mines;
        
        let mut results = Vec::new();
        
        for game_idx in 0..games {
            let mut board = Board::new(width, height, mines);
            let mut algorithm = AlgorithmFactory::create_algorithm(
                self.algorithm_type.into(),
                width, height, mines
            );
            let mut steps = 0;
            let mut clicks = 0;
            
            while !board.game_over && !board.game_won {
                if let Some((x, y)) = algorithm.next_move(&board) {
                    board.reveal_cell(x, y);
                    steps += 1;
                    clicks = board.total_clicks;
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
                "width": width,
                "height": height,
                "total_revealed": board.total_revealed,
                "total_cells": width * height,
                "game_over": board.game_over,
                "algorithm": self.algorithm_type.as_str(),
            }));
        }
        
        to_value(&results).unwrap()
    }

    #[wasm_bindgen(js_name = reset)]
    pub fn reset(&mut self) {
        let width = self.board.width;
        let height = self.board.height;
        let mines = self.board.mines;
        
        self.board = Board::new(width, height, mines);
        self.algorithm = AlgorithmFactory::create_algorithm(
            self.algorithm_type.into(),
            width, height, mines
        );
        self.steps = 0;
    }

    #[wasm_bindgen(js_name = setAlgorithm)]
    pub fn set_algorithm(&mut self, algorithm_type: WasmAlgorithmType) {
        let width = self.board.width;
        let height = self.board.height;
        let mines = self.board.mines;
        
        self.algorithm_type = algorithm_type;
        self.algorithm = AlgorithmFactory::create_algorithm(
            algorithm_type.into(),
            width, height, mines
        );
    }

    #[wasm_bindgen(js_name = getAlgorithm)]
    pub fn get_algorithm(&self) -> String {
        self.algorithm_type.as_str().to_string()
    }
}

// 간단한 테스트 함수들
#[wasm_bindgen]
pub fn hello_world() -> String {
    "Hello from WASM Minesweeper!".to_string()
}

#[wasm_bindgen]
pub fn test_add(a: i32, b: i32) -> i32 {
    a + b
}

#[wasm_bindgen]
pub fn create_simple_board() -> JsValue {
    let board = Board::new(8, 8, 10);
    to_value(&board).unwrap()
}

#[wasm_bindgen]
pub fn compare_algorithms(width: usize, height: usize, mines: usize, games: usize) -> JsValue {
    let mut results = Vec::new();
    
    // 매크로에서 생성된 all() 메서드 사용
    for &algo_type in WasmAlgorithmType::all().iter() {
        let mut wins = 0;
        let mut total_steps = 0;
        let mut total_clicks = 0;
        
        for _ in 0..games {
            let mut board = Board::new(width, height, mines);
            let mut algorithm = AlgorithmFactory::create_algorithm(
                algo_type.into(),
                width, height, mines
            );
            let mut steps = 0;
            
            while !board.game_over && !board.game_won {
                if let Some((x, y)) = algorithm.next_move(&board) {
                    board.reveal_cell(x, y);
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