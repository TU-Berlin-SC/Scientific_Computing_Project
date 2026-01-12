/**
* Module for different algorithms to solve the Minesweeper game.
* Each algorithm should implement the Algorithm trait.
* I have added 0 ~ 5 comments to guide you when adding a new algorithm! (~ ˘∇˘ )~
*/

pub mod greedy;
pub mod exact_solver;
pub mod sat_solver;
/// [0] when adding a new algorithm, create a new module here

use crate::board::Board;
use wasm_bindgen::prelude::*;

/// returns a list of candidate indices that are logically safe to click.
pub trait Algorithm {
    fn find_candidates(&mut self, board: &Board) -> Vec<usize>;
}

/// Algorithm types enum
#[wasm_bindgen]
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
// [1] when adding a new algorithm, add it here
pub enum WasmAlgorithmType {
    Greedy,
    ExactSolver,
    SatSolver,
}

impl WasmAlgorithmType {
    pub fn as_str(&self) -> &'static str {
        // [2] when adding a new algorithm, add it here
        match self {
            WasmAlgorithmType::Greedy => "greedy",
            WasmAlgorithmType::ExactSolver => "exact_solver",
            WasmAlgorithmType::SatSolver => "sat_solver",
        }
    }
    
    pub fn all() -> Vec<WasmAlgorithmType> {
        // [3] when adding a new algorithm, add it here
        vec![
            WasmAlgorithmType::Greedy,
            WasmAlgorithmType::ExactSolver,
            WasmAlgorithmType::SatSolver,
        ]
    }
}

#[wasm_bindgen]
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub enum TspObjective {
    MinDistance,
    MinRotation,
    MaxInformation,
}

pub struct MinesweeperAgent {
    pub solver: Box<dyn Algorithm>,
    pub objective: TspObjective,
    pub first_move: bool,
}

impl MinesweeperAgent {
    pub fn next_move(&mut self, board: &Board) -> Option<usize> {
        let total_cells = board.cells.len();
        if total_cells == 0 { return None; }

        if self.first_move {
            self.first_move = false;
            let face_offset = (board.width * board.height) * 2;
            let center_in_face = (board.width * board.height) / 2;
            return Some((face_offset + center_in_face) % total_cells);
        }

        let mut candidates = self.solver.find_candidates(board);
        if candidates.is_empty() { return None; }

        let current_idx = board.last_click_idx % total_cells;

        match self.objective {
            TspObjective::MinDistance => {
                candidates.sort_by(|&a, &b| {
                    board.get_3d_dist(current_idx, a)
                        .partial_cmp(&board.get_3d_dist(current_idx, b))
                        .unwrap_or(std::cmp::Ordering::Equal)
                });
            }
            TspObjective::MaxInformation => {
                candidates.sort_by_key(|&idx| std::cmp::Reverse(board.get_hidden_neighbor_count(idx)));
            }
            TspObjective::MinRotation => {
                let current_face = board.cells[current_idx].face;
                candidates.sort_by(|&a, &b| { 
                    let face_a = board.cells[a].face;
                    let face_b = board.cells[b].face;
                    let cost_a = if face_a == current_face { 0 } else { 1 };
                    let cost_b = if face_b == current_face { 0 } else { 1 };
                    if cost_a != cost_b { cost_a.cmp(&cost_b) }
                    else {
                        board.get_3d_dist(current_idx, a)
                            .partial_cmp(&board.get_3d_dist(current_idx, b))
                            .unwrap_or(std::cmp::Ordering::Equal)
                    }
                });
            }
        }
        
        Some(candidates[0])
    }
}

pub struct AlgorithmFactory;

impl AlgorithmFactory {
    pub fn create_agent(
        algo_type: WasmAlgorithmType,
        objective: TspObjective,
        width: usize,
        height: usize,
        mines: usize,
    ) -> MinesweeperAgent {
        let solver: Box<dyn Algorithm> = match algo_type {
            WasmAlgorithmType::Greedy => {
                Box::new(greedy::GreedyAlgorithm::new(width, height, mines))
            }
            WasmAlgorithmType::ExactSolver => {
                Box::new(exact_solver::ExactSolver::new(width, height, mines))
            }
            WasmAlgorithmType::SatSolver => {
                Box::new(sat_solver::SatSolver::new(width, height, mines))
            }
            // [4] when adding a new algorithm, add it here
        };

        MinesweeperAgent {
            solver,
            objective,
            first_move: true,
        }
    }
}

// [5] when adding a new algorithm, add its pub use or module reference here