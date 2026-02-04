/**
* module for different algorithms to solve the minesweeper game.
* each algorithm should implement the algorithm trait.
* i have added 0 ~ 5 comments to guide you when adding a new algorithm! (~ ˘∇˘ )~
*/

#[macro_use] // add this so the macro is visible in this module
pub mod macros;

pub mod greedy;
pub mod exact_solver;
pub mod sat_utils;
pub mod sat_global;
pub mod sat_partitioned;
pub mod metaheuristic;
pub mod scip_solver;
/// [0] when adding a new algorithm, create a new module here

use crate::board::Board;
use wasm_bindgen::prelude::*;

/// result structure to track if a move is a logical deduction or a guess
pub struct SolverResult {
    pub candidates: Vec<usize>,
    pub is_guess: bool,
}

/// returns a solver result containing safe indices or probabilistic guesses
pub trait Algorithm {
    fn find_candidates(&mut self, board: &Board) -> SolverResult;
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
    pub fn next_move(&mut self, board: &Board) -> Option<SolverResult> {
        let total_cells = board.cells.len();
        if total_cells == 0 { return None; }

        // start at the center of a face for the first move 
        // will trigger place_mines_after_first_click inside the board
        if self.first_move {
            self.first_move = false;
            let face_size = board.width * board.height;
            let center_idx = (board.width / 2) + (board.height / 2) * board.width + (0 * face_size);
            
            return Some(SolverResult {
                candidates: vec![center_idx],
                is_guess: true, // first click is always a guess
            });
        }

        let result = self.solver.find_candidates(board);
        if result.candidates.is_empty() { return None; }
        
        Some(result)
    }

    /// chooses the specific cell from candidates based on tsp
    pub fn pick_best_from_candidates(&self, board: &Board, mut result: SolverResult) -> usize {
        let current_idx = board.last_click_idx;
        let distance_map = board.get_distance_map(current_idx);
        let candidates = &mut result.candidates;

        match self.objective {
            TspObjective::MaxInformation => {
                candidates.sort_by(|&a, &b| {
                    let hidden_a = board.get_hidden_neighbor_count(a);
                    let hidden_b = board.get_hidden_neighbor_count(b);
                    if hidden_a != hidden_b {
                        hidden_b.cmp(&hidden_a) // more neighbors first
                    } else {
                        distance_map[a].cmp(&distance_map[b])
                    }
                });
            }
            TspObjective::MinDistance => {
                candidates.sort_by(|&a, &b| {
                    let dist_a = distance_map[a];
                    let dist_b = distance_map[b];
                    if dist_a != dist_b {
                        dist_a.cmp(&dist_b)
                    } else {
                        board.get_hidden_neighbor_count(b).cmp(&board.get_hidden_neighbor_count(a))
                    }
                });
            }
            TspObjective::MinRotation => {
                let current_face = board.cells[current_idx].face;
                candidates.sort_by(|&a, &b| {
                    let face_a = board.cells[a].face;
                    let face_b = board.cells[b].face;
                    let cost_a = if face_a == current_face { 0 } else { 1 };
                    let cost_b = if face_b == current_face { 0 } else { 1 };
                    if cost_a != cost_b {
                        cost_a.cmp(&cost_b) 
                    } else {
                        distance_map[a].cmp(&distance_map[b])
                    }
                });
            }
        }
        candidates[0]
    }
}

register_algorithms!(
    Greedy => "greedy", crate::algorithms::greedy::GreedyAlgorithm,
    ExactSolver => "exact_solver", crate::algorithms::exact_solver::ExactSolver,
    GlobalSat => "global_sat", crate::algorithms::sat_global::GlobalSatSolver,
    PartitionedSat => "partitioned_sat", crate::algorithms::sat_partitioned::PartitionedSatSolver,
    SCIPSolver => "scip_solver", crate::algorithms::scip_solver::SCIPSolver,
);