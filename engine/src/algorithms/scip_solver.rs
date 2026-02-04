// src/algorithms/scip_solver.rs
use crate::board::Board;
use crate::algorithms::{Algorithm, SolverResult};
use std::collections::{HashMap, HashSet};

use russcip::model::{ProblemCreated, Model};
use russcip::prelude::*;
use russcip::variable::Variable;

pub struct SCIPSolver {
    width: usize,
    height: usize,
    mines: usize,
}

impl SCIPSolver {
    pub fn new(width: usize, height: usize, mines: usize) -> Self {
        Self { width, height, mines }
    }

    fn solve_exact(&self, board: &Board) -> SolverResult {
        let mut constraints: Vec<Constraint> = Vec::new();
        let mut frontier: HashSet<usize> = HashSet::new();

        // 1) collect constraints from revealed numbered cells
        for idx in 0..board.cells.len() {
            let cell = &board.cells[idx];

            if cell.is_revealed && cell.adjacent_mines > 0 {
                let c = self.build_constraint(board, idx);
                if !c.hidden_cells.is_empty() {
                    frontier.extend(c.hidden_cells.iter().copied());
                    constraints.push(c);
                }
            }
        }

        // if nothing constrained, fall back to global-best candidates (flagged as guess)
        if constraints.is_empty() {
            return SolverResult {
                candidates: self.get_best_probability_candidates(board),
                is_guess: true,
            };
        }

        // 2) ilp-based "definitely safe"
        let safe = self.find_all_definitely_safe_via_scip(&constraints, board);
        if !safe.is_empty() {
            return SolverResult {
                candidates: safe,
                is_guess: false,
            };
        }

        // 3) fallback to probabilistic if no logic applies
        SolverResult {
            candidates: self.get_best_probability_candidates(board),
            is_guess: true,
        }
    }

    /// build a constraint from a revealed numbered cell:
    /// sum_{hidden neighbors} x_j == (adjacent_mines - flagged_neighbors)
    fn build_constraint(&self, board: &Board, idx: usize) -> Constraint {
        let cell = &board.cells[idx];
        let mut hidden = Vec::new();
        let mut flags = 0usize;

        for &n_idx in &board.adjacency_map[idx] {
            let nb = &board.cells[n_idx];
            if nb.is_flagged {
                flags += 1;
            } else if !nb.is_revealed {
                hidden.push(n_idx);
            }
        }

        Constraint {
            total_mines: cell.adjacent_mines as usize,
            flagged: flags,
            hidden_cells: hidden,
        }
    }

    /// base ilp model for current frontier:
    /// - binary var x_i for each hidden frontier cell i
    /// - for each constraint: sum x_i == remaining_mines
    fn build_base_model(
        &self,
        constraints: &[Constraint],
    ) -> (Model<ProblemCreated>, HashMap<usize, Variable>) {
        let mut frontier: HashSet<usize> = HashSet::new();
        for c in constraints {
            frontier.extend(c.hidden_cells.iter().copied());
        }

        let mut model = Model::default().minimize();

        // vars: x_idx in {0,1}
        let mut xvars: HashMap<usize, Variable> = HashMap::new();
        for idx in frontier {
            let name = format!("x_{}", idx);
            let v = model.add(var().bin().obj(0.0).name(&name));
            xvars.insert(idx, v);
        }

        // constraints: sum x == remaining
        for (i, c) in constraints.iter().enumerate() {
            let rhs = c.remaining_mines() as f64;
            let cname = format!("c_{}", i);

            let mut lin = cons().name(&cname).eq(rhs);
            for &hid in &c.hidden_cells {
                if let Some(v) = xvars.get(&hid) {
                    lin = lin.coef(v, 1.0);
                }
            }
            model.add(lin);
        }

        (model, xvars)
    }

    /// check feasibility when x_cell is fixed to value (0 or 1)
    fn feasible_with_fix(&self, constraints: &[Constraint], cell_idx: usize, value: i32) -> bool {
        let (mut model, xvars) = self.build_base_model(constraints);

        // if not in frontier, it's unconstrained by current knowledge → feasible
        let Some(v) = xvars.get(&cell_idx) else {
            return true;
        };

        model.add(cons().name("fix").coef(v, 1.0).eq(value as f64));

        // quiet output
        model = model.set_param("display/verblevel", 0);

        let solved = model.solve();
        !matches!(solved.status(), Status::Infeasible)
    }

    /// return all indices that are guaranteed safe (x=1 infeasible)
    fn find_all_definitely_safe_via_scip(
        &self,
        constraints: &[Constraint],
        board: &Board,
    ) -> Vec<usize> {
        let mut frontier: HashSet<usize> = HashSet::new();
        for c in constraints {
            frontier.extend(c.hidden_cells.iter().copied());
        }

        let mut safe = Vec::new();

        for idx in frontier {
            let cell = &board.cells[idx];
            if cell.is_revealed || cell.is_flagged {
                continue;
            }

            // if "idx is a mine" is impossible → idx is definitely safe
            let feasible_if_mine = self.feasible_with_fix(constraints, idx, 1);
            if !feasible_if_mine {
                safe.push(idx);
            }
        }

        safe
    }

    /// same fallback you already use in 3d: global baseline probability
    fn get_best_probability_candidates(&self, board: &Board) -> Vec<usize> {
        let flag_count = board.cells.iter().filter(|c| c.is_flagged).count();
        let remaining_cells =
            (6 * self.width * self.height).saturating_sub(board.total_revealed);
        let remaining_mines = self.mines.saturating_sub(flag_count);

        let global_prob = if remaining_cells > 0 {
            remaining_mines as f64 / remaining_cells as f64
        } else {
            1.0
        };

        let mut best = Vec::new();
        let mut min_prob = 1.1;

        for idx in 0..board.cells.len() {
            let c = &board.cells[idx];
            if !c.is_revealed && !c.is_flagged {
                let prob = global_prob;
                if prob < min_prob - 1e-9 {
                    min_prob = prob;
                    best = vec![idx];
                } else if (prob - min_prob).abs() < 1e-9 {
                    best.push(idx);
                }
            }
        }
        best
    }
}

#[derive(Clone)]
struct Constraint {
    total_mines: usize,
    flagged: usize,
    hidden_cells: Vec<usize>,
}

impl Constraint {
    fn remaining_mines(&self) -> usize {
        self.total_mines.saturating_sub(self.flagged)
    }
}

impl Algorithm for SCIPSolver {
    fn find_candidates(&mut self, board: &Board) -> SolverResult {
        self.solve_exact(board)
    }
}