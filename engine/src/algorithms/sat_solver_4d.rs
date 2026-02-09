use crate::board::Board;
use crate::algorithms::{Algorithm, SolverResult};
use std::collections::{BTreeSet, HashMap, HashSet};

/// 4D-optimized logical SAT-lite solver
/// Uses constraint reduction without full DPLL for speed
pub struct SatSolver4D {
    mines: usize,
}

impl SatSolver4D {
    pub fn new(_w: usize, _h: usize, mines: usize) -> Self {
        Self { mines }
    }

    // [2026-02-09] Helper: Basic flag/mine based deduction
    // Ensures simple patterns are solved without heavy SAT logic (improves 2D/3D win rate)
    fn perform_simple_deduction(&self, board: &Board) -> Vec<usize> {
        let mut safe_indices = HashSet::new();
        for idx in 0..board.cells.len() {
            let cell = &board.cells[idx];
            if cell.is_revealed && cell.adjacent_mines > 0 {
                let neighbors = &board.adjacency_map[idx];
                let mut flags = 0;
                let mut hidden = Vec::new();

                for &n_idx in neighbors {
                    if board.cells[n_idx].is_flagged { flags += 1; }
                    else if !board.cells[n_idx].is_revealed { hidden.push(n_idx); }
                }

                if (cell.adjacent_mines as usize).saturating_sub(flags) == 0 {
                    for h_idx in hidden { safe_indices.insert(h_idx); }
                }
            }
        }
        safe_indices.into_iter().collect()
    }

    // [2026-02-09] Helper: Higher-level subset inference logic
    fn perform_subset_deduction(&self, board: &Board) -> Vec<usize> {
        let mut constraints = self.collect_constraints(board);
        self.reduce_constraints(&mut constraints);
        self.find_safe(&constraints)
    }

    // [2026-02-09] Helper: Core SAT-lite matrix/probabilistic logic
    fn run_complex_sat_probabilistic(&self, board: &Board) -> SolverResult {
        let mut constraints = self.collect_constraints(board);
        self.reduce_constraints(&mut constraints);

        let safe_cells = self.find_safe(&constraints);
        if !safe_cells.is_empty() {
            return SolverResult { candidates: safe_cells, is_guess: false };
        }

        SolverResult {
            candidates: self.guess(board, &constraints),
            is_guess: true,
        }
    }

    // Collect frontier constraints
    fn collect_constraints(&self, board: &Board) -> Vec<Constraint> {
        let mut constraints = Vec::new();

        for (idx, cell) in board.cells.iter().enumerate() {
            if !cell.is_revealed || cell.adjacent_mines == 0 {
                continue;
            }

            let mut hidden = BTreeSet::new();
            let mut flagged = 0;

            for &n in &board.adjacency_map[idx] {
                let nc = &board.cells[n];
                if nc.is_flagged {
                    flagged += 1;
                } else if !nc.is_revealed {
                    hidden.insert(n);
                }
            }

            if !hidden.is_empty() {
                constraints.push(Constraint {
                    cells: hidden,
                    mines: (cell.adjacent_mines as usize).saturating_sub(flagged),
                });
            }
        }

        // Global constraint: total mines remaining on board
        let all_hidden: BTreeSet<usize> = board.cells.iter().enumerate()
            .filter(|(_, c)| !c.is_revealed && !c.is_flagged)
            .map(|(i, _)| i).collect();
        
        let flagged_count = board.cells.iter().filter(|c| c.is_flagged).count();
        let remaining_total_mines = self.mines.saturating_sub(flagged_count);

        if !all_hidden.is_empty() {
            constraints.push(Constraint {
                cells: all_hidden,
                mines: remaining_total_mines,
            });
        }

        constraints
    }

    // Core logic: Subset reduction
    fn reduce_constraints(&self, constraints: &mut Vec<Constraint>) {
        let mut changed = true;
        while changed {
            changed = false;
            
            constraints.sort_by(|a, b| a.cells.cmp(&b.cells));
            constraints.dedup();
    
            let mut new_constraints = Vec::new();
            for i in 0..constraints.len() {
                for j in 0..constraints.len() {
                    if i == j { continue; }
                    
                    if constraints[i].cells.is_subset(&constraints[j].cells) {
                        let diff: BTreeSet<_> = constraints[j].cells
                            .difference(&constraints[i].cells)
                            .cloned().collect();
                        
                        if diff.is_empty() { continue; }
                        
                        let new_mines = constraints[j].mines.saturating_sub(constraints[i].mines);
                        let new_c = Constraint { cells: diff, mines: new_mines };
                        
                        if !constraints.contains(&new_c) && !new_constraints.contains(&new_c) {
                            new_constraints.push(new_c);
                            changed = true;
                        }
                    }
                }
            }
            constraints.extend(new_constraints);
            if constraints.len() > 200 { break; } // Performance capping
        }
    }

    fn find_safe(&self, constraints: &[Constraint]) -> Vec<usize> {
        let mut safe = HashSet::new();
        for c in constraints {
            if c.mines == 0 {
                for &i in &c.cells {
                    safe.insert(i);
                }
            }
        }
        safe.into_iter().collect()
    }

    fn guess(&self, board: &Board, constraints: &[Constraint]) -> Vec<usize> {
        let mut probs: HashMap<usize, f64> = HashMap::new();

        for c in constraints {
            if c.cells.is_empty() { continue; }
            let p = c.mines as f64 / c.cells.len() as f64;
            for &idx in &c.cells {
                let entry = probs.entry(idx).or_insert(0.0);
                *entry = entry.max(p);
            }
        }

        let mut best = Vec::new();
        let mut min_p = 1.1;

        for (idx, cell) in board.cells.iter().enumerate() {
            if cell.is_revealed || cell.is_flagged { continue; }

            let p = *probs.get(&idx).unwrap_or(&0.5);

            if p < min_p - 1e-6 {
                min_p = p;
                best = vec![idx];
            } else if (p - min_p).abs() < 1e-6 {
                best.push(idx);
            }
        }
        best
    }
}

#[derive(Clone, PartialEq, Eq, PartialOrd, Ord)]
struct Constraint {
    cells: BTreeSet<usize>,
    mines: usize,
}

impl Algorithm for SatSolver4D {
    /// Primary entry point for the SAT solver
    fn find_candidates(&mut self, board: &Board) -> SolverResult {
        // [2026-02-09] Layered Inference Strategy:
        // 1. Simple Scan (Flags/Numbers)
        let simple_safe = self.perform_simple_deduction(board);
        if !simple_safe.is_empty() {
            return SolverResult { candidates: simple_safe, is_guess: false };
        }

        // 2. Subset Reduction Logic
        let subset_safe = self.perform_subset_deduction(board);
        if !subset_safe.is_empty() {
            return SolverResult { candidates: subset_safe, is_guess: false };
        }

        // 3. Complex SAT/Probabilistic Analysis
        self.run_complex_sat_probabilistic(board)
    }
}