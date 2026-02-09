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
// pub mod metaheuristic; 
pub mod sat_solver_4d;

#[cfg(feature = "native")]
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

        if self.first_move {
            self.first_move = false;
            
            let w = board.get_width();
            let h = board.get_height();
            let _face_size = w * h;

            // 첫 클릭: 0번 면(Front/Top)의 정중앙 인덱스 계산
            // 공식: (y_mid * width) + x_mid + (face_offset)
            let center_idx = (h / 2) * w + (w / 2); 
            
            return Some(SolverResult {
                candidates: vec![center_idx],
                is_guess: true,
            });
        }

        let result = self.solver.find_candidates(board);
        if result.candidates.is_empty() { return None; }
        
        Some(result)
    }

    pub fn pick_best_from_candidates(&self, board: &Board, mut result: SolverResult) -> usize {
        let last_idx = board.last_click_idx;
        let distance_map = board.get_distance_map(last_idx);
        let candidates = &mut result.candidates;

        match self.objective {
            TspObjective::MaxInformation => {
                candidates.sort_by(|&a, &b| {
                    let hidden_a = board.get_hidden_neighbor_count(a);
                    let hidden_b = board.get_hidden_neighbor_count(b);
                    if hidden_a != hidden_b {
                        hidden_b.cmp(&hidden_a)
                    } else {
                        distance_map[a].cmp(&distance_map[b])
                    }
                });
            }
            TspObjective::MinDistance => {
                candidates.sort_by(|&a, &b| {
                    distance_map[a].cmp(&distance_map[b])
                        .then_with(|| board.get_hidden_neighbor_count(b).cmp(&board.get_hidden_neighbor_count(a)))
                });
            }
            TspObjective::MinRotation => {
                // cell.face -> cell.coordinates[0] (차원의 첫 번째 요소가 면 번호)
                let current_face = board.cells[last_idx].coordinates[0];
                candidates.sort_by(|&a, &b| {
                    let face_a = board.cells[a].coordinates[0];
                    let face_b = board.cells[b].coordinates[0];
                    let cost_a = if face_a == current_face { 0 } else { 1 };
                    let cost_b = if face_b == current_face { 0 } else { 1 };
                    
                    cost_a.cmp(&cost_b)
                        .then_with(|| distance_map[a].cmp(&distance_map[b]))
                });
            }
        }
        candidates[0]
    }
}

// 1. WASM Purpose (Exclude SCIP - NOT SUPPORTED!)
#[cfg(not(feature = "native"))]
register_algorithms!(
    Greedy => "greedy", crate::algorithms::greedy::GreedyAlgorithm,
    ExactSolver => "exact_solver", crate::algorithms::exact_solver::ExactSolver,
    GlobalSat => "global_sat", crate::algorithms::sat_global::GlobalSatSolver,
    PartitionedSat => "partitioned_sat", crate::algorithms::sat_partitioned::PartitionedSatSolver,
    SATSolver4D => "sat_solver_4d", crate::algorithms::sat_solver_4d::SatSolver4D,
);

// 2. Runner Purpose
#[cfg(feature = "native")]
register_algorithms!(
    Greedy => "greedy", crate::algorithms::greedy::GreedyAlgorithm,
    ExactSolver => "exact_solver", crate::algorithms::exact_solver::ExactSolver,
    GlobalSat => "global_sat", crate::algorithms::sat_global::GlobalSatSolver,
    PartitionedSat => "partitioned_sat", crate::algorithms::sat_partitioned::PartitionedSatSolver,
    SCIPSolver => "scip_solver", crate::algorithms::scip_solver::SCIPSolver,
);