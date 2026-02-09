use crate::board::Board;
use crate::algorithms::{Algorithm, SolverResult};
use std::collections::{BTreeSet, HashMap, HashSet};

/// 4D 전용 초고속 logical SAT-lite solver
/// DPLL 없이 constraint reduction만 사용
pub struct SatSolver4D {
    mines: usize,
}

impl SatSolver4D {
    pub fn new(_w: usize, _h: usize, mines: usize) -> Self {
        Self { mines }
    }
}

#[derive(Clone, PartialEq, Eq, PartialOrd, Ord)] // 이 부분을 추가/수정하세요
struct Constraint {
    cells: BTreeSet<usize>,
    mines: usize,
}

impl SatSolver4D {

    // frontier constraint 수집
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

        constraints
    }

    // 핵심: subset reduction
    fn reduce_constraints(&self, constraints: &mut Vec<Constraint>) {
        let mut changed = true;
        while changed {
            changed = false;
            let old_len = constraints.len();
            
            // 1. 단순화 및 중복 제거
            constraints.sort_by(|a, b| a.cells.cmp(&b.cells));
            constraints.dedup();
    
            // 2. Subset Reduction (핵심 루프)
            let mut new_constraints = Vec::new();
            for i in 0..constraints.len() {
                for j in 0..constraints.len() {
                    if i == j { continue; }
                    
                    // a 가 b의 진부분집합인 경우
                    if constraints[i].cells.is_subset(&constraints[j].cells) {
                        let diff: BTreeSet<_> = constraints[j].cells
                            .difference(&constraints[i].cells)
                            .cloned().collect();
                        
                        if diff.is_empty() { continue; }
                        
                        let new_mines = constraints[j].mines.saturating_sub(constraints[i].mines);
                        let new_c = Constraint { cells: diff, mines: new_mines };
                        
                        // 이미 있는 제약 조건이 아닐 때만 추가
                        if !constraints.contains(&new_c) && !new_constraints.contains(&new_c) {
                            new_constraints.push(new_c);
                            changed = true;
                        }
                    }
                }
            }
            constraints.extend(new_constraints);
            if constraints.len() > 200 { break; } // 무한 루프 방지 및 성능 캡핑
        }
    }
    // 확정 safe
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

    // 확정 mine
    fn mark_mines(&self, constraints: &[Constraint]) -> HashSet<usize> {
        let mut mines = HashSet::new();

        for c in constraints {
            if c.mines == c.cells.len() {
                for &i in &c.cells {
                    mines.insert(i);
                }
            }
        }

        mines
    }

    // 확률 기반 guess
    fn guess(&self, board: &Board, constraints: &[Constraint]) -> Vec<usize> {
        let mut probs: HashMap<usize, f64> = HashMap::new();

        for c in constraints {
            let p = c.mines as f64 / c.cells.len() as f64;
            for &idx in &c.cells {
                let entry = probs.entry(idx).or_insert(0.0);
                *entry = entry.max(p);
            }
        }

        let mut best = Vec::new();
        let mut min_p = 1.1;

        for (idx, cell) in board.cells.iter().enumerate() {
            if cell.is_revealed || cell.is_flagged {
                continue;
            }

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

impl Algorithm for SatSolver4D {
    fn find_candidates(&mut self, board: &Board) -> SolverResult {
        let mut constraints = self.collect_constraints(board);

        if constraints.is_empty() {
            return SolverResult {
                candidates: (0..board.cells.len())
                    .filter(|&i| !board.cells[i].is_revealed && !board.cells[i].is_flagged)
                    .collect(),
                is_guess: true,
            };
        }

        self.reduce_constraints(&mut constraints);

        let safe = self.find_safe(&constraints);
        if !safe.is_empty() {
            return SolverResult {
                candidates: safe,
                is_guess: false,
            };
        }

        let _mines = self.mark_mines(&constraints);

        SolverResult {
            candidates: self.guess(board, &constraints),
            is_guess: true,
        }
    }
}
