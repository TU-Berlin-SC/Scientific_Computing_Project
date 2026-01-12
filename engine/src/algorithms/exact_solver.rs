// src/algorithms/exact_solver.rs
use crate::board::Board;
use crate::algorithms::Algorithm;
use std::collections::HashSet;

/// Human Expert Algorithm
/// uses set difference rules to mimic how a human expert would play the game
pub struct ExactSolver {
    width: usize,
    height: usize,
    mines: usize,
    // first move is handled by the agent now
}

impl ExactSolver {
    pub fn new(width: usize, height: usize, mines: usize) -> Self {
        Self { width, height, mines}
    }

    /// primary solver logic to find all safe cells using constraint analysis
    fn solve_exact(&self, board: &Board) -> Vec<usize> {
        let mut constraints = Vec::new();
        
        // collect constraints using the 3D adjacency map
        for idx in 0..board.cells.len() {
            let cell = &board.cells[idx];
            
            if cell.is_revealed && cell.adjacent_mines > 0 {
                let constraint = self.build_constraint(board, idx);
                if !constraint.hidden_cells.is_empty() {
                    constraints.push(constraint);
                }
            }
        }
        
        // look for definitely safe cells through constraint analysis
        let safe_cells = self.find_all_definitely_safe(&constraints, board);
        if !safe_cells.is_empty() {
            return safe_cells;
        }
        
        // if no definitely safe cells, return probabilistic candidates
        self.get_best_probability_candidates(&constraints, board)
    }
    
    /// converts a revealed numbered cell into a mathematical constraint
    /// sum of mines in [hidden_cells] = (adjacent_mines - flagged_neighbors)
    /// solver uses this to compare constraints across neighbors to deduce stuff
    fn build_constraint(&self, board: &Board, idx: usize) -> Constraint {
        let cell = &board.cells[idx];
        let mut hidden = Vec::new();
        let mut flags = 0;
        
        // use 3D adjacency map
        for &n_idx in &board.adjacency_map[idx] {
            let neighbor = &board.cells[n_idx];
            if neighbor.is_flagged {
                flags += 1;
            } else if !neighbor.is_revealed {
                hidden.push(n_idx);
            }
        }
        
        Constraint {
            total_mines: cell.adjacent_mines as usize,
            flagged: flags,
            hidden_cells: hidden,
        }
    }
    
    fn find_all_definitely_safe(&self, constraints: &[Constraint], _board: &Board) -> Vec<usize> {
        let mut safe_indices = HashSet::new();

        // if remaining mines == 0, all hidden neighbors are safe
        for constraint in constraints {
            if constraint.remaining_mines() == 0 {
                for &idx in &constraint.hidden_cells {
                    safe_indices.insert(idx);
                }
            }
        }

        // set difference analysis - comparing pairs of constraints
        if safe_indices.is_empty() {
            for i in 0..constraints.len() {
                for j in i + 1..constraints.len() {
                    // two cells c1 and c2
                    let c1 = &constraints[i];
                    let c2 = &constraints[j];
                    
                    let set1: HashSet<usize> = c1.hidden_cells.iter().cloned().collect();
                    let set2: HashSet<usize> = c2.hidden_cells.iter().cloned().collect();
                    
                    let intersection: HashSet<_> = set1.intersection(&set2).cloned().collect();
                    
                    if !intersection.is_empty() {
                        let only_in_c1: Vec<usize> = set1.difference(&set2).cloned().collect();
                        let only_in_c2: Vec<usize> = set2.difference(&set1).cloned().collect();
                        
                        // subset reduction logic: if mine difference equals cell difference
                        let m_diff = c1.remaining_mines() as isize - c2.remaining_mines() as isize;
                        
                        if m_diff == only_in_c1.len() as isize {
                            // all cells only in C2 must be safe
                            for &idx in &only_in_c2 { safe_indices.insert(idx); }
                        }
                        if -m_diff == only_in_c2.len() as isize {
                            // all cells only in C1 must be safe
                            for &idx in &only_in_c1 { safe_indices.insert(idx); }
                        }
                    }
                }
            }
        }
        
        safe_indices.into_iter().collect()
    }
    
    fn get_best_probability_candidates(&self, _constraints: &[Constraint], board: &Board) -> Vec<usize> {
        let mut best_indices = Vec::new();
        let mut min_prob = 1.1;

        // Optimized probability baseline calculation
        let flag_count = board.cells.iter().filter(|c| c.is_flagged).count();
        let remaining_cells = (6 * self.width * self.height) - board.total_revealed;
        let remaining_mines = self.mines.saturating_sub(flag_count);
        
        let global_prob = if remaining_cells > 0 {
            remaining_mines as f64 / remaining_cells as f64
        } else {
            1.0
        };

        // Iterate through all hidden cells to find those matching the best probability
        for idx in 0..board.cells.len() {
            if !board.cells[idx].is_revealed && !board.cells[idx].is_flagged {
                let prob = global_prob; // In this version, we use global baseline

                if prob < min_prob - 1e-6 {
                    min_prob = prob;
                    best_indices = vec![idx];
                } else if (prob - min_prob).abs() < 1e-6 {
                    best_indices.push(idx);
                }
            }
        }
        best_indices
    }
}

/// represents a numbered cell and its hidden neighbors
#[derive(Clone)]
struct Constraint {
    total_mines: usize,
    flagged: usize,
    hidden_cells: Vec<usize>,
}

impl Constraint {
    fn remaining_mines(&self) -> usize {
        // calculating remaining mines: total - flagged
        // stops at 0 to prevent panic
        self.total_mines.saturating_sub(self.flagged)
    }
}

/// implementation of the shared Algorithm trait
impl Algorithm for ExactSolver {
    fn find_candidates(&mut self, board: &Board) -> Vec<usize> {
        // agent handles first move and tsp, solver only provides candidates
        self.solve_exact(board)
    }
}