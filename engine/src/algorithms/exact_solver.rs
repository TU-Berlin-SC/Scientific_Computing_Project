use crate::board::Board;
use crate::algorithms::{Algorithm, SolverResult};
use std::collections::HashSet;

/// human expert algorithm
/// uses set difference rules to mimic how a human expert would play the game
#[allow(dead_code)]
pub struct ExactSolver {
    width: usize,
    height: usize,
    mines: usize,
    // first move is handled by the agent 
}

impl ExactSolver {
    pub fn new(width: usize, height: usize, mines: usize) -> Self {
        Self { width, height, mines }
    }

    /// primary solver logic to find all safe cells using constraint analysis
    fn solve_exact(&self, board: &Board) -> SolverResult {
        // [2026-02-09] Added: Tracking logically deduced mines to enable 1-step chain reaction
        let mut definitely_mines = HashSet::new();
        let mut constraints = Vec::new();

        // collect constraints using the 3d adjacency map
        for idx in 0..board.cells.len() {
            let cell = &board.cells[idx];

            if cell.is_revealed && cell.adjacent_mines > 0 {
                let constraint = self.build_constraint(board, idx);
                if !constraint.hidden_cells.is_empty() {
                    // [2026-02-09] Added: Basic logical deduction (RemMines == HiddenCells)
                    // This allows the solver to find mines first, then use that info for safe cells
                    if constraint.remaining_mines() == constraint.hidden_cells.len() {
                        for &m_idx in &constraint.hidden_cells {
                            definitely_mines.insert(m_idx);
                        }
                    }
                    constraints.push(constraint);
                }
            }
        }

        // look for definitely safe cells through constraint analysis
        // [2026-02-09] Updated: Now passes found mines to the safety checker
        let safe_cells = self.find_all_definitely_safe_optimized(&constraints, board, &definitely_mines);
        
        // if logic finds safe cells, it is not a guess
        if !safe_cells.is_empty() {
            return SolverResult {
                candidates: safe_cells,
                is_guess: false,
            };
        }

        // if no definitely safe cells, return probabilistic candidates and mark as guess
        SolverResult {
            candidates: self.get_best_probability_candidates(&constraints, board),
            is_guess: true,
        }
    }

    /// converts a revealed numbered cell into a mathematical constraint
    /// sum of mines in [hidden_cells] = (adjacent_mines - flagged_neighbors)
    /// solver uses this to compare constraints across neighbors to deduce stuff
    fn build_constraint(&self, board: &Board, idx: usize) -> Constraint {
        let cell = &board.cells[idx];
        let mut hidden = Vec::new();
        let mut flags = 0;

        // use 3d adjacency map
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

    // [2026-02-09] Renamed/Updated: Added 'virtual_mines' to handle 1-step inference chain
    fn find_all_definitely_safe_optimized(&self, constraints: &[Constraint], _board: &Board, virtual_mines: &HashSet<usize>) -> Vec<usize> {
        let mut safe_indices = HashSet::new();

        // if remaining mines == 0, all hidden neighbors are safe
        for constraint in constraints {
            // [2026-02-09] Modified: Consider logically found mines when checking if a constraint is satisfied
            let extra_f = constraint.hidden_cells.iter().filter(|i| virtual_mines.contains(i)).count();
            if constraint.remaining_mines().saturating_sub(extra_f) == 0 {
                for &idx in &constraint.hidden_cells {
                    if !virtual_mines.contains(&idx) {
                        safe_indices.insert(idx);
                    }
                }
            }
        }

        // set difference analysis - comparing pairs of constraints
        if safe_indices.is_empty() {
            // we iterate through all pairs (i, j) to find subset relationships
            for i in 0..constraints.len() {
                for j in 0..constraints.len() {
                    if i == j { continue; }

                    let c1 = &constraints[i];
                    let c2 = &constraints[j];

                    let set1: HashSet<usize> = c1.hidden_cells.iter().cloned().collect();
                    let set2: HashSet<usize> = c2.hidden_cells.iter().cloned().collect();

                    // subset reduction logic: if c1's cells are all inside c2's cells
                    if set1.is_subset(&set2) {
                        let m_diff = c2.remaining_mines() as isize - c1.remaining_mines() as isize;
                        let only_in_c2: Vec<usize> = set2.difference(&set1).cloned().collect();

                        // if the number of mines in both constraints is the same,
                        // then all cells that are only in the larger set must be safe.
                        if m_diff == 0 {
                            for &idx in &only_in_c2 {
                                safe_indices.insert(idx);
                            }
                        }
                    }
                }
            }
        }

        safe_indices.into_iter().collect()
    }

    fn get_best_probability_candidates(&self, constraints: &[Constraint], board: &Board) -> Vec<usize> {
        let mut best_indices = Vec::new();
        let mut min_prob = 1.1;

        // optimized probability baseline calculation
        let flag_count = board.cells.iter().filter(|c| c.is_flagged).count();
        // ensure we subtract flags from the hidden count for a more accurate guess
        let remaining_cells = board.cells.len().saturating_sub(board.total_revealed).saturating_sub(flag_count);
        let remaining_mines = self.mines.saturating_sub(flag_count);

        let global_prob = if remaining_cells > 0 {
            remaining_mines as f64 / remaining_cells as f64
        } else {
            1.0
        };

        // iterate through all hidden cells to find those matching the best probability
        for idx in 0..board.cells.len() {
            if !board.cells[idx].is_revealed && !board.cells[idx].is_flagged {
                // [2026-02-09] Updated: Local probability check.
                // In 4D, using only global baseline causes 0% win rate.
                // We pick the most conservative (highest risk) local probability to avoid obvious mines.
                let mut prob = global_prob;
                for c in constraints {
                    if c.hidden_cells.contains(&idx) {
                        let local = c.remaining_mines() as f64 / c.hidden_cells.len() as f64;
                        if local > prob { prob = local; }
                    }
                }

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

/// implementation of the shared algorithm trait
impl Algorithm for ExactSolver {
    fn find_candidates(&mut self, board: &Board) -> SolverResult {
        // agent handles first move and tsp, solver only provides candidates
        self.solve_exact(board)
    }
}