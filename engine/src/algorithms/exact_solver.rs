// src/algorithms/exact_solver.rs
use crate::board::Board;
use crate::algorithms::Algorithm;
use std::collections::{HashSet, VecDeque};

pub struct ExactSolver {
    dimensions: Vec<usize>,
    mines: usize,
    first_move: bool,
}

#[derive(Clone, Debug)]
struct Constraint {
    center: Vec<usize>,
    total_mines: usize,
    flagged: usize,
    hidden_cells: Vec<Vec<usize>>,
}

impl Constraint {
    fn remaining_mines(&self) -> usize {
        self.total_mines.saturating_sub(self.flagged)
    }
}

impl ExactSolver {
    pub fn new(dimensions: Vec<usize>, mines: usize) -> Self {
        Self { dimensions, mines, first_move: true }
    }

    fn first_click_position(&self) -> Vec<usize> {
        self.dimensions.iter().map(|&d| d / 2).collect()
    }

    fn build_constraint(&self, board: &Board, coords: &[usize]) -> Option<Constraint> {
        let idx = board.coords_to_index(coords);
        if idx >= board.cells.len() { return None; }
        let cell = &board.cells[idx];
        if !cell.is_revealed || cell.adjacent_mines == 0 { return None; }

        let mut hidden = Vec::new();
        let mut flags = 0;
        for neighbor in board.generate_neighbors(coords) {
            let nidx = board.coords_to_index(&neighbor);
            if nidx >= board.cells.len() { continue; }
            let n = &board.cells[nidx];
            if n.is_flagged { flags += 1; } 
            else if !n.is_revealed { hidden.push(neighbor); }
        }
        if hidden.is_empty() { return None; }
        Some(Constraint { 
            center: coords.to_vec(), 
            total_mines: cell.adjacent_mines as usize, 
            flagged: flags, 
            hidden_cells: hidden 
        })
    }

    fn collect_constraints(&self, board: &Board) -> Vec<Constraint> {
        board.cells.iter().enumerate().filter_map(|(i, c)| {
            if c.is_revealed && c.adjacent_mines > 0 {
                self.build_constraint(board, &board.index_to_coords(i))
            } else { None }
        }).collect()
    }

    /// Set Difference Logic: If Constraint A is a subset of Constraint B, 
    /// and they have the same remaining mines, the difference cells are safe.
    fn find_set_difference_safe(&self, constraints: &[Constraint]) -> Option<Vec<usize>> {
        for i in 0..constraints.len() {
            for j in 0..constraints.len() {
                if i == j { continue; }
                let c1 = &constraints[i];
                let c2 = &constraints[j];

                let set1: HashSet<&Vec<usize>> = c1.hidden_cells.iter().collect();
                let set2: HashSet<&Vec<usize>> = c2.hidden_cells.iter().collect();

                // If c1 is a subset of c2 and mine counts match
                if set1.is_subset(&set2) && c1.remaining_mines() == c2.remaining_mines() {
                    let diff: Vec<Vec<usize>> = set2.difference(&set1)
                        .map(|&v| v.clone())
                        .collect();
                    
                    if !diff.is_empty() {
                        return Some(diff[0].clone()); // Return the first guaranteed safe cell
                    }
                }
            }
        }
        None
    }

    fn make_educated_guess(&self, board: &Board) -> Option<Vec<usize>> {
        let total_hidden: Vec<_> = board.cells.iter().enumerate()
            .filter(|(_, c)| !c.is_revealed && !c.is_flagged)
            .map(|(i, _)| board.index_to_coords(i))
            .collect();

        if total_hidden.is_empty() { return None; }

        let constraints = self.collect_constraints(board);
        let mut best_cell = None;
        let mut best_prob = 1.1;

        for cell in total_hidden {
            let mut prob = 0.0;
            let mut count = 0;
            for constraint in &constraints {
                if constraint.hidden_cells.contains(&cell) {
                    prob += constraint.remaining_mines() as f64 / constraint.hidden_cells.len() as f64;
                    count += 1;
                }
            }
            
            let final_prob = if count > 0 { 
                prob / count as f64 
            } else { 
                self.global_mine_probability(board) 
            };

            if final_prob < best_prob {
                best_prob = final_prob;
                best_cell = Some(cell);
            }
        }
        best_cell
    }

    fn global_mine_probability(&self, board: &Board) -> f64 {
        let total_hidden = board.cells.iter().filter(|c| !c.is_revealed && !c.is_flagged).count();
        let flagged = board.cells.iter().filter(|c| c.is_flagged).count();
        if total_hidden == 0 { return 0.0; }
        (self.mines.saturating_sub(flagged)) as f64 / total_hidden as f64
    }
}

impl Algorithm for ExactSolver {
    fn next_move(&mut self, board: &mut Board) -> Option<Vec<usize>> {
        if board.total_clicks == 0 {
            return Some(self.first_click_position());
        }

        // 1. Basic Constraint Analysis (Direct safe clicks)
        let constraints = self.collect_constraints(board);
        for c in &constraints {
            if c.remaining_mines() == 0 {
                for cell in &c.hidden_cells {
                    let idx = board.coords_to_index(cell);
                    if !board.cells[idx].is_revealed && !board.cells[idx].is_flagged {
                        return Some(cell.clone());
                    }
                }
            }
        }

        // 2. Advanced Analysis: Set Difference (The "Human Expert" part)
        if let Some(safe_coords) = self.find_set_difference_safe(&constraints) {
            return Some(safe_coords);
        }

        // 3. Last resort: Educated Guess
        board.record_guess(); // Important: call before returning a probabilistic move
        self.make_educated_guess(board)
    }
}