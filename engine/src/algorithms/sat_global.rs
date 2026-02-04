use crate::board::Board;
use crate::algorithms::{Algorithm, SolverResult};
use crate::algorithms::sat_utils::*;
use std::collections::HashSet;

/// global sat solver algorithm
pub struct GlobalSatSolver {
    _width: usize,
    _height: usize,
    mines: usize,
}

impl GlobalSatSolver {
    pub fn new(width: usize, height: usize, mines: usize) -> Self {
        Self { _width: width, _height: height, mines }
    }
}

impl Algorithm for GlobalSatSolver {
    fn find_candidates(&mut self, board: &Board) -> SolverResult {
        let mut safe_cells = Vec::new();
        let frontier = get_frontier(board);

        // if no cells are currently revealed, we must use probability to guess
        if frontier.is_empty() {
            return SolverResult {
                candidates: get_probabilistic_fallback(board, self._width, self._height, self.mines),
                is_guess: true,
            };
        }

        // build the base cnf from revealed cells
        let mut base_clauses = Vec::new();
        for (idx, cell) in board.cells.iter().enumerate() {
            if cell.is_revealed && cell.adjacent_mines > 0 {
                let neighbors: Vec<usize> = board.adjacency_map[idx].iter()
                    .filter(|&&n| !board.cells[n].is_revealed && !board.cells[n].is_flagged)
                    .cloned().collect();
                
                let flags = board.adjacency_map[idx].iter().filter(|&&n| board.cells[n].is_flagged).count();
                let k = (cell.adjacent_mines as usize).saturating_sub(flags);
                
                if !neighbors.is_empty() {
                    add_exactly_k_clauses(&mut base_clauses, &neighbors, k);
                }
            }
        }

        // proof by contradiction logic
        for &idx in &frontier {
            let mut test_clauses = base_clauses.clone();
            
            // add a clause forcing this specific cell to be a mine
            test_clauses.push(Clause(vec![(idx as isize) + 1]));

            // algo checks if this assumption is possible
            if !dpll(test_clauses, HashSet::new()) {
                safe_cells.push(idx);
            }
        }

        // if logic finds no guaranteed safe spots, we fall back to probability
        if safe_cells.is_empty() {
            SolverResult {
                candidates: get_probabilistic_fallback(board, self._width, self._height, self.mines),
                is_guess: true,
            }
        } else {
            // logical certainty found
            SolverResult {
                candidates: safe_cells,
                is_guess: false,
            }
        }
    }
}