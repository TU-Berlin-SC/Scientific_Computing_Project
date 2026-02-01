/**
* Module for different algorithms to solve the Minesweeper game.
* Each algorithm should implement the Algorithm trait.
* I have added 0 ~ 5 comments to guide you when adding a new algorithm! (~ ˘∇˘ )~
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

/// returns a list of candidate indices that are logically safe to click.
pub trait Algorithm {
    fn find_candidates(&mut self, board: &Board) -> Vec<usize>;
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

        // start at the center of a face for the first move 
        // will trigger place_mines_after_first_click inside the board
        if self.first_move {
            self.first_move = false;
            let face_offset = (board.width * board.height) * 2;
            let center_in_face = (board.width * board.height) / 2;
            return Some((face_offset + center_in_face) % total_cells);
        }

        let mut candidates = self.solver.find_candidates(board);
        if candidates.is_empty() { return None; }

        let current_idx = board.last_click_idx % total_cells;
        
        // one bfs call for all distance lookups
        let distance_map = board.get_distance_map(current_idx);

        match self.objective {
            TspObjective::MinDistance => {
                candidates.sort_by_key(|&idx| distance_map[idx]);
            }
            TspObjective::MaxInformation => {
                candidates.sort_by(|&a, &b| {
                    let info_a = board.get_hidden_neighbor_count(a);
                    let info_b = board.get_hidden_neighbor_count(b);

                    if info_a != info_b {
                        info_b.cmp(&info_a) // descending
                    } else {
                        distance_map[a].cmp(&distance_map[b]) // closest tie breaker
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
        
        Some(candidates[0])
    }
}

// [1] [2] [3] [4] handled by the macro registration below
// to add a new algorithm, just add a line to this macro call
register_algorithms!(
    Greedy => "greedy", crate::algorithms::greedy::GreedyAlgorithm,
    ExactSolver => "exact_solver", crate::algorithms::exact_solver::ExactSolver,
    GlobalSat => "global_sat", crate::algorithms::sat_global::GlobalSatSolver,
    PartitionedSat => "partitioned_sat", crate::algorithms::sat_partitioned::PartitionedSatSolver,
    SCIPSolver => "scip_solver", crate::algorithms::scip_solver::SCIPSolver,
);

// [5] when adding a new algorithm, add its pub use or module reference here
