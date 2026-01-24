// src/algorithms/exact_solver.rs
use crate::board::Board;
use crate::algorithms::Algorithm;
use std::collections::{HashMap, HashSet};

use russcip::model::{ProblemCreated, Model};
use russcip::prelude::*;
use russcip::variable::Variable;

pub struct SCIPSolver {
    width: usize,
    height: usize,
    mines: usize,
    first_move: bool,
}

impl SCIPSolver {
    pub fn new(width: usize, height: usize, mines: usize) -> Self {
        Self { width, height, mines, first_move: true }
    }

    fn first_click_position(&self) -> (usize, usize) {
        (self.width / 2, self.height / 2)
    }

    fn solve_exact(&self, board: &Board) -> Option<(usize, usize)> {
        let mut constraints = Vec::new();
        let mut all_hidden_cells = HashSet::new();
        
        for y in 0..self.height {
            for x in 0..self.width {
                let idx = y * self.width + x;
                let cell = &board.cells[idx];
                
                if cell.is_revealed && cell.adjacent_mines > 0 {
                    let constraint = self.build_constraint(board, x, y);
                    if !constraint.hidden_cells.is_empty() {
                        all_hidden_cells.extend(constraint.hidden_cells.iter().cloned());
                        constraints.push(constraint);
                    }
                }
            }
        }
        
        // If nothing constrained, fallback
        if constraints.is_empty() {
            return self.calculate_best_cell(&all_hidden_cells, board);
        }

        // 2) ILP-based "definitely safe" detection
        if let Some(safe) = self.find_definitely_safe_via_scip(&constraints, board) {
            return Some(safe);
        }
        
        self.calculate_best_cell(&all_hidden_cells, board)
    }
    
    fn build_constraint(&self, board: &Board, x: usize, y: usize) -> Constraint {
        let idx = y * self.width + x;
        let cell = &board.cells[idx];
        let mut hidden = Vec::new();
        let mut flags = 0;
        
        for dy in -1..=1 {
            for dx in -1..=1 {
                if dx == 0 && dy == 0 { continue; }
                
                let nx = x as isize + dx;
                let ny = y as isize + dy;
                
                if nx >= 0 && nx < self.width as isize && ny >= 0 && ny < self.height as isize {
                    let nidx = ny as usize * self.width + nx as usize;
                    let neighbor = &board.cells[nidx];
                    
                    if neighbor.is_flagged {
                        flags += 1;
                    } else if !neighbor.is_revealed {
                        hidden.push((nx as usize, ny as usize));
                    }
                }
            }
        }
        
        Constraint {
            center: (x, y),
            total_mines: cell.adjacent_mines as usize,
            flagged: flags,
            hidden_cells: hidden,
        }
    }
    
    /// Build the base ILP model for current frontier:
    /// - binary var x_(x,y) for each hidden cell that appears in constraints
    /// - for each revealed number constraint: sum neighbors == remaining_mines
    fn build_base_model(
        &self,
        constraints: &[Constraint],
    ) -> (Model<ProblemCreated>, HashMap<(usize, usize), Variable>) {
        let mut frontier: HashSet<(usize, usize)> = HashSet::new();
        for c in constraints {
            frontier.extend(c.hidden_cells.iter().cloned());
        }

        let mut model = Model::default().minimize();

        // vars
        let mut xvars: HashMap<(usize, usize), Variable> = HashMap::new();
        for &(x, y) in frontier.iter() {
            let name = format!("x_{}_{}", x, y);
            // objective 0.0 => pure feasibility (but SCIP still likes having an objective sense)
            let v = model.add(var().bin().obj(0.0).name(&name));
            xvars.insert((x, y), v);
        }

        // constraints
        for (i, c) in constraints.iter().enumerate() {
            let rhs = c.remaining_mines() as f64;

            let name = format!("c_{}_{}_{}", i, c.center.0, c.center.1);
            let mut lin = cons().name(&name).eq(rhs);
            for &cell in &c.hidden_cells {
                if let Some(v) = xvars.get(&cell) {
                    lin = lin.coef(v, 1.0);
                }
            }
            model.add(lin);
        }

        (model, xvars)
    }

    /// Check whether the constraints are feasible with x_cell fixed to `value` (0 or 1).
    fn feasible_with_fix(
        &self,
        constraints: &[Constraint],
        cell: (usize, usize),
        value: i32,
    ) -> bool {
        let (mut model, xvars) = self.build_base_model(constraints);

        let Some(v) = xvars.get(&cell) else {
            // cell not in frontier -> unconstrained by current knowledge, treat as feasible
            return true;
        };

        // Add fixing constraint: x == value
        // (linear equality is fine for binaries)
        model.add(cons().name("fix").coef(v, 1.0).eq(value as f64));
        
        model = model.set_param("display/verblevel", 0);
        let solved = model.solve();
        !matches!(solved.status(), Status::Infeasible)
    }

    /// A cell is "definitely safe" if fixing it to mine (x=1) makes the model infeasible.
    fn find_definitely_safe_via_scip(
        &self,
        constraints: &[Constraint],
        board: &Board,
    ) -> Option<(usize, usize)> {
        // Consider only hidden, unflagged frontier cells
        let mut frontier: HashSet<(usize, usize)> = HashSet::new();
        for c in constraints {
            frontier.extend(c.hidden_cells.iter().cloned());
        }

        for &cell in frontier.iter() {
            let idx = cell.1 * self.width + cell.0;
            if board.cells[idx].is_revealed || board.cells[idx].is_flagged {
                continue;
            }

            // If "cell is a mine" is impossible -> cell is guaranteed safe
            let feasible_if_mine = self.feasible_with_fix(constraints, cell, 1);
            if !feasible_if_mine {
                return Some(cell);
            }
        }

        None
    }
    
    fn calculate_best_cell(
        &self,
        all_hidden: &HashSet<(usize, usize)>,
        board: &Board,
    ) -> Option<(usize, usize)> {
        let mut best_cell = None;
        let mut best_probability = 1.0;

        let mut flag_count = 0usize;
        for c in &board.cells {
            if c.is_flagged {
                flag_count += 1;
            }
        }

        let remaining_cells = (self.width * self.height) - board.total_revealed;
        let remaining_mines = self.mines.saturating_sub(flag_count);

        let base_prob = if remaining_cells > 0 {
            remaining_mines as f64 / remaining_cells as f64
        } else {
            1.0
        };

        for &(x, y) in all_hidden {
            let idx = y * self.width + x;
            let cell = &board.cells[idx];

            if !cell.is_revealed && !cell.is_flagged {
                let probability = base_prob; // same simplified heuristic as before
                if probability < best_probability {
                    best_probability = probability;
                    best_cell = Some((x, y));
                }
            }
        }

        best_cell
    }
}

#[derive(Clone)]
struct Constraint {
    center: (usize, usize),
    total_mines: usize,
    flagged: usize,
    hidden_cells: Vec<(usize, usize)>,
}

impl Constraint {
    fn remaining_mines(&self) -> usize {
        self.total_mines.saturating_sub(self.flagged)
    }
}

impl Algorithm for SCIPSolver {
    fn next_move(&mut self, board: &Board) -> Option<(usize, usize)> {
        if self.first_move {
            self.first_move = false;
            return Some(self.first_click_position());
        }
        self.solve_exact(board)
    }
}