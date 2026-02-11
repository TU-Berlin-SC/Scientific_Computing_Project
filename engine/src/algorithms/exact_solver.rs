// src/algorithms/exact_solver.rs
use crate::board::Board;
use crate::algorithms::{Algorithm, SolverResult};
use std::collections::{HashSet, HashMap};

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
        let mut all_safe = HashSet::new();
        let mut all_mines = HashSet::new();
        let mut last_valid_constraints = Vec::new();
    
        // repeatedly apply logical deduction until no new safe cells appear
        loop {
            let mut constraints = Vec::new();
    
            // rebuild constraints each iteration (new info may exist)
            for idx in 0..board.cells.len() {
                let cell = &board.cells[idx];
    
                if cell.is_revealed && cell.adjacent_mines > 0 {
                    let mut constraint = self.build_constraint(board, idx);
                    
                    // remove cells already identified as mines in this loop
                    constraint.hidden_cells.retain(|c_idx| {
                        if all_mines.contains(c_idx) {
                            constraint.flagged += 1;
                            false
                        } else {
                            true
                        }
                    });

                    if !constraint.hidden_cells.is_empty() {
                        constraints.push(constraint);
                    }
                }
            }

            // store for fallback probability calculation
            last_valid_constraints = constraints.clone();
    
            let (safe_found, mines_found) = self.find_deterministic_cells(&constraints);
    
            let mut new_info = false;
            for s in safe_found {
                if all_safe.insert(s) { new_info = true; }
            }
            for m in mines_found {
                if all_mines.insert(m) { new_info = true; }
            }
    
            // stop when no more deductions
            if !new_info {
                break;
            }
        }
    
        // if we found any safe moves → deterministic
        // filter out any cell that might have been flagged as mine
        all_safe.retain(|idx| !all_mines.contains(idx));
        
        if !all_safe.is_empty() {
            return SolverResult {
                candidates: all_safe.into_iter().collect(),
                is_guess: false,
            };
        }
    
        // otherwise fallback to probability using the best available constraints
        SolverResult {
            candidates: self.get_best_probability_candidates(&last_valid_constraints, board, &all_mines),
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

    /// performs set-based reasoning to find guaranteed safe or mine cells
    fn find_deterministic_cells(&self, constraints: &[Constraint]) -> (HashSet<usize>, HashSet<usize>) {
        let mut safe_indices = HashSet::new();
        let mut mine_indices = HashSet::new();

        // 1. apply basic rules (all-safe or all-mines)
        for c in constraints {
            let remaining = c.remaining_mines();
            if remaining == 0 {
                for &idx in &c.hidden_cells { safe_indices.insert(idx); }
            } else if remaining == c.hidden_cells.len() {
                for &idx in &c.hidden_cells { mine_indices.insert(idx); }
            }
        }

        // 2. apply subset reduction (set difference)
        // human experts often look at two overlapping numbers
        if safe_indices.is_empty() && mine_indices.is_empty() {
            for i in 0..constraints.len() {
                for j in 0..constraints.len() {
                    if i == j { continue; }
                    let c1 = &constraints[i];
                    let c2 = &constraints[j];

                    let s1: HashSet<usize> = c1.hidden_cells.iter().cloned().collect();
                    let s2: HashSet<usize> = c2.hidden_cells.iter().cloned().collect();

                    if s1.is_subset(&s2) {
                        let diff_cells: Vec<usize> = s2.difference(&s1).cloned().collect();
                        let m_diff = c2.remaining_mines() as i32 - c1.remaining_mines() as i32;

                        if m_diff == 0 {
                            for idx in diff_cells { safe_indices.insert(idx); }
                        } else if m_diff == diff_cells.len() as i32 {
                            for idx in diff_cells { mine_indices.insert(idx); }
                        }
                    }
                }
            }
        }

        (safe_indices, mine_indices)
    }

    /// selects best candidates when logic fails, prioritizing lower local probability
    fn get_best_probability_candidates(&self, constraints: &[Constraint], board: &Board, known_mines: &HashSet<usize>) -> Vec<usize> {
        let mut prob_map: HashMap<usize, Vec<f64>> = HashMap::new();
        
        // collect all local probabilities from constraints
        for c in constraints {
            let p = c.remaining_mines() as f64 / c.hidden_cells.len() as f64;
            for &idx in &c.hidden_cells {
                prob_map.entry(idx).or_insert_with(Vec::new).push(p);
            }
        }

        let flag_count = board.cells.iter().filter(|c| c.is_flagged).count() + known_mines.len();
        let remaining_cells = board.cells.len()
            .saturating_sub(board.total_revealed)
            .saturating_sub(flag_count);
        let remaining_mines = self.mines.saturating_sub(flag_count);

        let global_prob = if remaining_cells > 0 {
            remaining_mines as f64 / remaining_cells as f64
        } else {
            1.0
        };

        let mut best_indices = Vec::new();
        let mut min_prob = 1.1;

        for idx in 0..board.cells.len() {
            let cell = &board.cells[idx];
            if cell.is_revealed || cell.is_flagged || known_mines.contains(&idx) {
                continue;
            }

            // use the maximum local probability (most conservative) or global if isolated
            let prob = if let Some(probs) = prob_map.get(&idx) {
                // human intuition: if multiple numbers hint at a mine, believe the highest risk
                *probs.iter().max_by(|a, b| a.partial_cmp(b).unwrap()).unwrap_or(&global_prob)
            } else {
                global_prob
            };

            if prob < min_prob - 1e-6 {
                min_prob = prob;
                best_indices = vec![idx];
            } else if (prob - min_prob).abs() < 1e-6 {
                best_indices.push(idx);
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