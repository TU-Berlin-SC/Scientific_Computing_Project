use crate::board::Board;
use std::collections::{HashSet};
use itertools::Itertools;

/// represents a logical clause in conjunctive normal form (cnf)
/// e.g. mine count of 2 and 3 hidden neighbors a,b,c: creates a clause
/// (a or b) and (a or c) and (b or c) -> at least two are mines and 
// not a or not b or not c -> not all three are mines
/// positive integers represent a mine at (index - 1), negative represent safe
#[derive(Clone, Debug, PartialEq, Eq, Hash)]
pub struct Clause(pub Vec<isize>); 

/// dpll algorithm
/// decides satisfiability of cnf clauses
pub fn dpll(clauses: Vec<Clause>, mut assignments: HashSet<isize>) -> bool {
    // if all clauses are removed, the formula is satisfied
    if clauses.is_empty() { return true; }
    
    // if any clause is empty, it means we found a contradiction
    if clauses.iter().any(|c| c.0.is_empty()) { return false; }

    // if a clause has only one literal, that literal must be true
    if let Some(unit) = clauses.iter().find(|c| c.0.len() == 1).map(|c| c.0[0]) {
        assignments.insert(unit);
        return dpll(simplify(clauses, unit), assignments);
    }

    // pick a literal and try assigning it true -> mine
    let literal = clauses[0].0[0];
    
    // try assuming the literal is true
    let mut with_lit = assignments.clone();
    with_lit.insert(literal);
    if dpll(simplify(clauses.clone(), literal), with_lit) {
        return true;
    }

    // if true failed, try assuming it is false -> safe
    let mut without_lit = assignments.clone();
    without_lit.insert(-literal);
    dpll(simplify(clauses, -literal), without_lit)
}

/// simplifies the clause set based on a new literal assignment
pub fn simplify(clauses: Vec<Clause>, literal: isize) -> Vec<Clause> {
    clauses.into_iter()
        .filter(|c| !c.0.contains(&literal)) // remove clauses satisfied by this assignment
        .map(|mut c| {
            c.0.retain(|&l| l != -literal); // remove the contradiction of the literal from other clauses
            c
        })
        .collect()
}

/// converts 'exactly k mines' into cnf clauses
pub fn add_exactly_k_clauses(clauses: &mut Vec<Clause>, vars: &[usize], k: usize) {
    let n = vars.len();

    // at least k - in any subset of size n - k + 1 at least one must be a mine
    for combo in vars.iter().combinations(n - k + 1) {
        clauses.push(Clause(combo.into_iter().map(|&v| (v as isize) + 1).collect()));
    }

    // at most k - in any subset of size k + 1 at least one must be safe
    for combo in vars.iter().combinations(k + 1) {
        clauses.push(Clause(combo.into_iter().map(|&v| -((v as isize) + 1)).collect()));
    }
}

/// identifies all hidden cells that touch a revealed number
pub fn get_frontier(board: &Board) -> Vec<usize> {
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
pub fn get_probabilistic_fallback(board: &Board, _width: usize, _height: usize, mines: usize) -> Vec<usize> {
    let flag_count = board.cells.iter().filter(|c| c.is_flagged).count();
    let remaining_cells = board.cells.len().saturating_sub(board.total_revealed);
    let remaining_mines = mines.saturating_sub(flag_count);
    
    // standard density = mines / total_cells
    let _prob = if remaining_cells > 0 { remaining_mines as f64 / remaining_cells as f64 } else { 1.0 };

    board.cells.iter().enumerate()
        .filter(|(_, c)| !c.is_revealed && !c.is_flagged)
        .map(|(i, _)| i)
        .take(1) 
        .collect()
}