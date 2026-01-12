// src/algorithms/sat_solver.rs
use crate::board::Board;
use crate::algorithms::Algorithm;
use std::collections::HashSet;

pub struct SatSolver {
    _width: usize,
    _height: usize,
    mines: usize,
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
struct Clause(Vec<isize>); // Positive for 'Mine', Negative for 'Safe'

impl SatSolver {
    pub fn new(width: usize, height: usize, mines: usize) -> Self {
        Self { _width: width, _height: height, mines }
    }

    fn solve_with_sat(&self, board: &Board) -> Vec<usize> {
        let mut safe_cells = Vec::new();
        let frontier = self.get_frontier(board);

        if frontier.is_empty() {
            return self.get_probabilistic_fallback(board);
        }

        // 1. Build the base CNF from revealed numbers
        let base_clauses = self.build_cnf_from_board(board);

        // 2. Proof by Contradiction: Test if each cell *could* be a mine
        for &idx in &frontier {
            let mut test_clauses = base_clauses.clone();
            // Add a clause that says: "This cell MUST be a mine" (index + 1 as literal)
            test_clauses.push(Clause(vec![(idx as isize) + 1]));

            if !self.dpll(test_clauses, HashSet::new()) {
                // If it's UNSATISFIABLE to be a mine, it is SAFE
                safe_cells.push(idx);
            }
        }

        if safe_cells.is_empty() {
            self.get_probabilistic_fallback(board)
        } else {
            safe_cells
        }
    }

    /// DPLL Algorithm: Checks if a set of clauses is satisfiable
    fn dpll(&self, clauses: Vec<Clause>, mut assignments: HashSet<isize>) -> bool {
        // 
        
        // Base case: All clauses satisfied
        if clauses.is_empty() { return true; }
        // Base case: Any clause empty (contradiction)
        if clauses.iter().any(|c| c.0.is_empty()) { return false; }

        // Unit Propagation
        if let Some(unit) = clauses.iter().find(|c| c.0.len() == 1).map(|c| c.0[0]) {
            assignments.insert(unit);
            return self.dpll(self.simplify(clauses, unit), assignments);
        }

        // Branching: Pick a literal from the first clause
        let literal = clauses[0].0[0];
        let mut with_lit = assignments.clone();
        with_lit.insert(literal);

        if self.dpll(self.simplify(clauses.clone(), literal), with_lit) {
            return true;
        }

        let mut without_lit = assignments.clone();
        without_lit.insert(-literal);
        self.dpll(self.simplify(clauses, -literal), without_lit)
    }

    fn simplify(&self, clauses: Vec<Clause>, literal: isize) -> Vec<Clause> {
        clauses.into_iter()
            .filter(|c| !c.0.contains(&literal)) // Remove clauses satisfied by literal
            .map(|mut c| {
                c.0.retain(|&l| l != -literal); // Remove literal's negation from other clauses
                c
            })
            .collect()
    }

    fn build_cnf_from_board(&self, board: &Board) -> Vec<Clause> {
        let mut clauses = Vec::new();
        for (idx, cell) in board.cells.iter().enumerate() {
            if cell.is_revealed && cell.adjacent_mines > 0 {
                let neighbors: Vec<usize> = board.adjacency_map[idx].iter()
                    .filter(|&&n| !board.cells[n].is_revealed && !board.cells[n].is_flagged)
                    .cloned().collect();
                
                let flags = board.adjacency_map[idx].iter()
                    .filter(|&&n| board.cells[n].is_flagged).count();
                
                let k = (cell.adjacent_mines as usize).saturating_sub(flags);
                
                if !neighbors.is_empty() {
                    // "Exactly k" logic converted to CNF:
                    // 1. At least k: combinations of (n - k + 1) must have one mine
                    // 2. At most k: combinations of (k + 1) cannot all be mines
                    self.add_exactly_k_clauses(&mut clauses, &neighbors, k);
                }
            }
        }
        clauses
    }

    fn add_exactly_k_clauses(&self, clauses: &mut Vec<Clause>, vars: &[usize], k: usize) {
        use itertools::Itertools;
        let n = vars.len();

        // At least k: In any subset of size (n - k + 1), at least one must be a mine
        for combo in vars.iter().combinations(n - k + 1) {
            clauses.push(Clause(combo.into_iter().map(|&v| (v as isize) + 1).collect()));
        }

        // At most k: In any subset of size (k + 1), at least one must be safe
        for combo in vars.iter().combinations(k + 1) {
            clauses.push(Clause(combo.into_iter().map(|&v| -((v as isize) + 1)).collect()));
        }
    }

    fn get_frontier(&self, board: &Board) -> Vec<usize> {
        let mut frontier = HashSet::new();
        for (idx, cell) in board.cells.iter().enumerate() {
            if cell.is_revealed && cell.adjacent_mines > 0 {
                for &n in &board.adjacency_map[idx] {
                    if !board.cells[n].is_revealed && !board.cells[n].is_flagged {
                        frontier.insert(n);
                    }
                }
            }
        }
        frontier.into_iter().collect()
    }

    fn get_probabilistic_fallback(&self, board: &Board) -> Vec<usize> {
        let flag_count = board.cells.iter().filter(|c| c.is_flagged).count();
        let remaining_cells = (6 * self._width * self._height).saturating_sub(board.total_revealed);
        let remaining_mines = self.mines.saturating_sub(flag_count);
        let prob = if remaining_cells > 0 { remaining_mines as f64 / remaining_cells as f64 } else { 1.0 };

        board.cells.iter().enumerate()
            .filter(|(_, c)| !c.is_revealed && !c.is_flagged)
            .map(|(i, _)| i)
            .take(1) // Just return one for the fallback
            .collect()
    }
}

impl Algorithm for SatSolver {
    fn find_candidates(&mut self, board: &Board) -> Vec<usize> {
        self.solve_with_sat(board)
    }
}