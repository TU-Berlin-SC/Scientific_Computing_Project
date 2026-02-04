use crate::board::Board;
use crate::algorithms::{Algorithm, SolverResult};
use std::collections::HashSet;

/// greedy algorithm
/// uses heuristics (information about neighbors) to make locally optimal choices
pub struct GreedyAlgorithm {
    width: usize,
    height: usize,
    mines: usize,
    // first_move is now handled by the agent struct so we dont need it here
}

impl GreedyAlgorithm {
    pub fn new(width: usize, height: usize, mines: usize) -> Self {
        Self {
            width,
            height,
            mines,
        }
    }

    /// if we cannot find a safe cell, we calculate the proability of a hidden cell containing a mine
    fn calculate_mine_probability(&self, board: &Board, idx: usize) -> f64 {
        let cell = &board.cells[idx];
    
        if cell.is_revealed || cell.is_flagged {
            return 1.0; 
        }
        // formula: p(mine) = (adjacent mines-flagged neighbors)/hidden neighbors
        let mut revealed_neighbors = 0;
        let mut neighbor_mine_count = 0;
        let mut neighbor_flagged_count = 0;
        
        // we use the pre-calculated 3d neighbors
        let neighbors = &board.adjacency_map[idx];
        let total_neighbors = neighbors.len();

        for &n_idx in neighbors {
            let neighbor = &board.cells[n_idx];
            if neighbor.is_revealed {
                revealed_neighbors += 1;
                neighbor_mine_count += neighbor.adjacent_mines as usize;
            }
            if neighbor.is_flagged {
                neighbor_flagged_count += 1;
            }
        }

        if revealed_neighbors > 0 && neighbor_mine_count > 0 {
            let hidden_neighbors = total_neighbors.saturating_sub(revealed_neighbors).saturating_sub(neighbor_flagged_count);
            if hidden_neighbors > 0 {
                let remaining_mines = neighbor_mine_count as f64 - neighbor_flagged_count as f64;
                return remaining_mines.max(0.0) / hidden_neighbors as f64;
            }
        }
        
        // global probability baseline 
        // p(mine) = (total mines in game - total flags placed)/total unrevealed cells on the cube
        let flag_count = board.cells.iter().filter(|c| c.is_flagged).count();
        let remaining_cells = (6 * self.width * self.height).saturating_sub(board.total_revealed);
        let remaining_mines = self.mines.saturating_sub(flag_count);
        
        if remaining_cells > 0 {
            remaining_mines as f64 / remaining_cells as f64
        } else {
            1.0
        }
    }

    /// finding all the safe cells on the board
    /// so that we can use this as input for tsp
    pub fn find_safe_cells(&self, board: &Board) -> SolverResult {
        let mut safe_candidates = HashSet::new();
        let mut virtual_mines = HashSet::new();

        // first pass: find hidden cells that must be mines (virtual flagging)
        // this is necessary because the board might not have physical flags yet
        for idx in 0..board.cells.len() {
            let cell = &board.cells[idx];
            if cell.is_revealed && cell.adjacent_mines > 0 {
                let neighbors = &board.adjacency_map[idx];
                
                let hidden_unflagged: Vec<usize> = neighbors.iter()
                    .filter(|&&n| !board.cells[n].is_revealed && !board.cells[n].is_flagged)
                    .cloned().collect();

                let flagged_count = neighbors.iter()
                    .filter(|&&n| board.cells[n].is_flagged)
                    .count();
                
                let needed_mines = (cell.adjacent_mines as usize).saturating_sub(flagged_count);
                
                // if total hidden neighbors == clue value, they are all mines
                if !hidden_unflagged.is_empty() && hidden_unflagged.len() == needed_mines {
                    for m_idx in hidden_unflagged {
                        virtual_mines.insert(m_idx);
                    }
                }
            }
        }
        
        // second pass: look for definitely safe cells using virtual mines
        for idx in 0..board.cells.len() {
            let cell = &board.cells[idx];
            if cell.is_revealed && cell.adjacent_mines > 0 {
                let mut hidden_unflagged = Vec::new();
                let mut flagged_count = 0;

                for &n_idx in &board.adjacency_map[idx] {
                    let neighbor = &board.cells[n_idx];
                    if neighbor.is_flagged || virtual_mines.contains(&n_idx) {
                        flagged_count += 1;
                    } else if !neighbor.is_revealed {
                        hidden_unflagged.push(n_idx);
                    }
                }

                // if flags match the number, all other hidden neighbors are safe
                if flagged_count == cell.adjacent_mines as usize && !hidden_unflagged.is_empty() {
                    for s_idx in hidden_unflagged {
                        safe_candidates.insert(s_idx);
                    }
                }
            }
        }
        
        let final_candidates: Vec<usize> = safe_candidates.into_iter().collect();

        // if logic found safe cells, it is not a guess
        if !final_candidates.is_empty() {
            return SolverResult {
                candidates: final_candidates,
                is_guess: false,
            };
        }

        // if no safe cells then findest the cells with lowest mine probability
        let mut best_prob = 1.0;
        let mut best_indices = Vec::new();

        for idx in 0..board.cells.len() {
            let cell = &board.cells[idx];
            if !cell.is_revealed && !cell.is_flagged {
                // uses the function from above to calculate probabilities
                let prob = self.calculate_mine_probability(board, idx);
                
                // precision handling for floating point comparison
                if prob < best_prob - 1e-6 { 
                    best_prob = prob;
                    best_indices = vec![idx];
                } else if (prob - best_prob).abs() < 1e-6 {
                    best_indices.push(idx);
                }
            }
        }
        
        // if we are here, we are using probability, so it is a guess
        SolverResult {
            candidates: best_indices,
            is_guess: true,
        }
    }
}

impl Algorithm for GreedyAlgorithm {
    fn find_candidates(&mut self, board: &Board) -> SolverResult {
        // agent handles the first move so we just call the algo to find the safe cells
        self.find_safe_cells(board)
    }
}