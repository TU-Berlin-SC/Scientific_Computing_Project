pub mod greedy;
pub mod exact_solver;

use crate::board::Board;
use wasm_bindgen::prelude::*;

pub trait Algorithm {
    fn next_move(&mut self, board: &Board) -> Option<(usize, usize)>;
}

// Algorithm types enum
#[wasm_bindgen]
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub enum WasmAlgorithmType {
    Greedy,
    ExactSolver,
}

impl WasmAlgorithmType {
    pub fn as_str(&self) -> &'static str {
        match self {
            WasmAlgorithmType::Greedy => "greedy",
            WasmAlgorithmType::ExactSolver => "exact_solver",
        }
    }
    
    pub fn all() -> Vec<WasmAlgorithmType> {
        vec![
            WasmAlgorithmType::Greedy,
            WasmAlgorithmType::ExactSolver,
        ]
    }
}

// Factory for creating algorithms
pub struct AlgorithmFactory;

impl AlgorithmFactory {
    pub fn create_algorithm(
        algo_type: WasmAlgorithmType,
        width: usize,
        height: usize,
        mines: usize,
    ) -> Box<dyn Algorithm> {
        match algo_type {
            WasmAlgorithmType::Greedy => {
                Box::new(greedy::GreedyAlgorithm::new(width, height, mines))
            }
            WasmAlgorithmType::ExactSolver => {
                Box::new(exact_solver::ExactSolver::new(width, height, mines))
            }
        }
    }
}

// directly export the type.
pub use greedy::GreedyAlgorithm;
pub use exact_solver::ExactSolver;