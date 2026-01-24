/**
* Module for different algorithms to solve the Minesweeper game.
* Each algorithm should implement the Algorithm trait.
* I have added 0 ~ 5 comments to guide you when adding a new algorithm! (~ ˘∇˘ )~
*/

pub mod greedy;
pub mod exact_solver;
pub mod scip_solver;
// [0] when adding a new algorithm, careate a new module here

use crate::board::Board;
use wasm_bindgen::prelude::*;

pub trait Algorithm {
    fn next_move(&mut self, board: &Board) -> Option<(usize, usize)>;
}

// Algorithm types enum
#[wasm_bindgen]
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
// [1] when adding a new algorithm, add it here
pub enum WasmAlgorithmType {
    Greedy,
    ExactSolver,
    SCIPSolver,
}

impl WasmAlgorithmType {
    pub fn as_str(&self) -> &'static str {
        // [2] when adding a new algorithm, add it here
        match self {
            WasmAlgorithmType::Greedy => "greedy",
            WasmAlgorithmType::ExactSolver => "exact_solver",
            WasmAlgorithmType::SCIPSolver => "scip_solver",
        }
    }
    
    pub fn all() -> Vec<WasmAlgorithmType> {
        // [3] when adding a new algorithm, add it here
        vec![
            WasmAlgorithmType::Greedy,
            WasmAlgorithmType::ExactSolver,
            WasmAlgorithmType::SCIPSolver,
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
            WasmAlgorithmType::SCIPSolver => {
                Box::new(scip_solver::SCIPSolver::new(width, height, mines))
            }
            // [4] when adding a new algorithm, add it here
        }
    }
}

//[5] when adding a new algorithm, add it here
pub use greedy::GreedyAlgorithm;
pub use exact_solver::ExactSolver;
pub use scip_solver::SCIPSolver;