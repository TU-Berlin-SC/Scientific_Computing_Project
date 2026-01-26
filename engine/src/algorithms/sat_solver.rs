// src/algorithms/sat_solver.rs
use crate::board::Board;
use crate::algorithms::Algorithm;
use std::collections::HashSet;

/// sat solver algorithm
/// converts the minesweeper board into a boolean satisfiability problem
/// each hidden cell is treated as a boolean variable (true = mine, false = safe)
pub struct SatSolver {
    _width: usize,
    _height: usize,
    mines: usize,
}

/// represents a logical clause in conjunctive normal form (cnf)
/// positive integers represent a mine at (index - 1), negative represent safe
#[derive(Clone, Debug, PartialEq, Eq, Hash)]
struct Clause(Vec<isize>); 

impl SatSolver {  
    pub fn new(width: usize, height: usize, mines: usize) -> Self {
        Self { _width: width, _height: height, mines }
    }

    fn solve_with_sat(&self, board: &Board) -> Vec<usize> {
        let mut safe_cells = Vec::new();
        let frontier = self.get_frontier(board);

        // if no cells are currently revealed, we must use probability to guess
        // will not happen but just in case
        if frontier.is_empty() {
            return self.get_probabilistic_fallback(board);
        }

        // build the base cnf from revealed numbers on the board
        // these clauses define the rules the mines must follow
        let base_clauses = self.build_cnf_from_board(board);

        // proof by contradiction logic
        // test each cell on the frontier to see if it could possibly be a mine
        for &idx in &frontier {
            let mut test_clauses = base_clauses.clone();
            
            // add a clause forcing this specific cell to be a mine
            // literal = (index + 1) because sat variables usually start at 1
            test_clauses.push(Clause(vec![(idx as isize) + 1]));

            // dpll checks if this assumption is mathematically possible
            // if it is unsatisfiable (false), then the cell cannot be a mine
            // therefore, it is guaranteed to be safe
            if !self.dpll(test_clauses, HashSet::new()) {
                safe_cells.push(idx);
            }
        }

        // if logic finds no guaranteed safe spots, we fall back to probability
        if safe_cells.is_empty() {
            self.get_probabilistic_fallback(board)
        } else {
            safe_cells
        }
    }

    /// dpll algorithm
    /// for deciding the satisfiability of cnf formulas
    fn dpll(&self, clauses: Vec<Clause>, mut assignments: HashSet<isize>) -> bool {
        // if all clauses are removed, the formula is satisfied
        if clauses.is_empty() { return true; }
        
        // if any clause is empty, it means we found a contradiction
        if clauses.iter().any(|c| c.0.is_empty()) { return false; }

        // if a clause has only one literal, that literal must be true
        if let Some(unit) = clauses.iter().find(|c| c.0.len() == 1).map(|c| c.0[0]) {
            assignments.insert(unit);
            return self.dpll(self.simplify(clauses, unit), assignments);
        }

        // branching- pick a literal and try assigning it true, then false
        let literal = clauses[0].0[0];
        
        // try assuming the literal is true
        let mut with_lit = assignments.clone();
        with_lit.insert(literal);
        if self.dpll(self.simplify(clauses.clone(), literal), with_lit) {
            return true;
        }

        // if true failed, try assuming it is false (negated literal)
        let mut without_lit = assignments.clone();
        without_lit.insert(-literal);
        self.dpll(self.simplify(clauses, -literal), without_lit)
    }

    /// simplifies the clause set based on a new literal assignment
    fn simplify(&self, clauses: Vec<Clause>, literal: isize) -> Vec<Clause> {
        clauses.into_iter()
            .filter(|c| !c.0.contains(&literal)) // remove clauses satisfied by this assignment
            .map(|mut c| {
                c.0.retain(|&l| l != -literal); // remove the contradiction of the literal from other clauses
                c
            })
            .collect()
    }

    /// iterates over the board to generate the cnf clauses
    fn build_cnf_from_board(&self, board: &Board) -> Vec<Clause> {
        let mut clauses = Vec::new();
        for (idx, cell) in board.cells.iter().enumerate() {
            // only generate constraints for revealed numbers
            if cell.is_revealed && cell.adjacent_mines > 0 {
                // identify neighbors that are not yet revealed or flagged
                let neighbors: Vec<usize> = board.adjacency_map[idx].iter()
                    .filter(|&&n| !board.cells[n].is_revealed && !board.cells[n].is_flagged)
                    .cloned().collect();
                
                // subtract already flagged mines from the target count
                let flags = board.adjacency_map[idx].iter()
                    .filter(|&&n| board.cells[n].is_flagged).count();
                
                let k = (cell.adjacent_mines as usize).saturating_sub(flags);
                
                if !neighbors.is_empty() {
                    // "exactly k" mines among n neighbors is translated into two parts:
                    // 1) at least k mines
                    // 2) at most k mines
                    self.add_exactly_k_clauses(&mut clauses, &neighbors, k);
                }
            }
        }
        clauses
    }

    /// converts "exactly k mines" into cnf clauses
    fn add_exactly_k_clauses(&self, clauses: &mut Vec<Clause>, vars: &[usize], k: usize) {
        use itertools::Itertools;
        let n = vars.len();

        // at least k: in any subset of size (n - k + 1), at least one must be a mine
        for combo in vars.iter().combinations(n - k + 1) {
            clauses.push(Clause(combo.into_iter().map(|&v| (v as isize) + 1).collect()));
        }

        // at most k: in any subset of size (k + 1), at least one must be safe
        for combo in vars.iter().combinations(k + 1) {
            clauses.push(Clause(combo.into_iter().map(|&v| -((v as isize) + 1)).collect()));
        }
    }

    /// identifies all hidden cells that touch a revealed number
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

    /// provides a fallback choice when no logical certainty exists
    /// uses global mine density to pick a likely safe cell
    fn get_probabilistic_fallback(&self, board: &Board) -> Vec<usize> {
        let flag_count = board.cells.iter().filter(|c| c.is_flagged).count();
        let remaining_cells = (6 * self._width * self._height).saturating_sub(board.total_revealed);
        let remaining_mines = self.mines.saturating_sub(flag_count);
        
        // standard density = mines / total_cells
        let _prob = if remaining_cells > 0 { remaining_mines as f64 / remaining_cells as f64 } else { 1.0 };

        board.cells.iter().enumerate()
            .filter(|(_, c)| !c.is_revealed && !c.is_flagged)
            .map(|(i, _)| i)
            .take(1) 
            .collect()
    }
}

/// implements the algorithm trait so the agent can use this solver
impl Algorithm for SatSolver {
    fn find_candidates(&mut self, board: &Board) -> Vec<usize> {
        self.solve_with_sat(board)
    }
}