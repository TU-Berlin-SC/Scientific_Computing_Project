/**
* Module for different algorithms to solve the Minesweeper game.
* Each algorithm should implement the Algorithm trait.
* I have added 0 ~ 5 comments to guide you when adding a new algorithm! (~ ˘∇˘ )~
*/

// [0] when adding a new algorithm, create a new module here
pub mod greedy;
pub mod exact_solver;
pub mod sat_solver;

use crate::board::Board;
use wasm_bindgen::prelude::*;

pub trait Algorithm {
    fn next_move(&mut self, board: &Board) -> Option<Vec<usize>>;
}

// Algorithm types enum
#[wasm_bindgen]
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
// [1] when adding a new algorithm, add it here
pub enum WasmAlgorithmType {
    Greedy,
    ExactSolver,
    SATSolver
}

impl WasmAlgorithmType {
    pub fn as_str(&self) -> &'static str {
        // [2] when adding a new algorithm, add it here
        match self {
            WasmAlgorithmType::Greedy => "greedy",
            WasmAlgorithmType::ExactSolver => "exact_solver",
            WasmAlgorithmType::SATSolver => "sat_solver",
        }
    }
    
    pub fn all() -> Vec<WasmAlgorithmType> {
        // [3] when adding a new algorithm, add it here
        vec![
            WasmAlgorithmType::Greedy,
            WasmAlgorithmType::ExactSolver,
            WasmAlgorithmType::SATSolver,
        ]
    }
}

// Factory for creating algorithms
pub struct AlgorithmFactory;

impl AlgorithmFactory {
    pub fn create_algorithm(
        algo_type: WasmAlgorithmType,
        dimensions: Vec<usize>,
        mines: usize,
    ) -> Box<dyn Algorithm> {
        match algo_type {
            WasmAlgorithmType::Greedy => {
                Box::new(greedy::GreedySolver::new(dimensions, mines))
            }
            WasmAlgorithmType::ExactSolver => {
                Box::new(exact_solver::ExactSolver::new(dimensions, mines))
            }
            WasmAlgorithmType::SATSolver => {
                Box::new(sat_solver::SATSolver::new(dimensions, mines))
            }
        }
    }
}

//[5] when adding a new algorithm, add it here
// pub use greedy::GreedySolver;
// pub use exact_solver::ExactSolver;
// pub use sat_solver::SATSolver;