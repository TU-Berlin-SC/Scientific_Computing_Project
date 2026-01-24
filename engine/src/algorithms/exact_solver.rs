// src/algorithms/exact_solver.rs
use crate::board::{Board, Face, index};
use crate::algorithms::Algorithm;
use std::collections::HashSet;

pub struct ExactSolver {
    n: usize,
    mines: usize,
    first_move: bool,
}

impl ExactSolver {
    pub fn new(n: usize, mines: usize) -> Self {
        Self { n, mines, first_move: true }
    }

    fn first_click_position(&self) -> (Face, usize, usize) {
        (Face::Front, self.n / 2, self.n / 2)
    }

    fn solve_exact(&self, board: &Board) -> Option<(Face, usize, usize)> {
        // 1. 제약 조건 수집
        let mut constraints = Vec::new();
        let mut all_hidden_cells = HashSet::new();
        
        for face in Face::ALL {
            for v in 0..self.n {
                for u in 0..self.n {
                    let idx = index(board.n, face, u, v);
                    let cell = &board.cells[idx];
                    
                    if cell.is_revealed && cell.adjacent_mines > 0 {
                        let constraint = self.build_constraint(board, face, u, v);
                        if !constraint.hidden_cells.is_empty() {
                            all_hidden_cells.extend(constraint.hidden_cells.iter().cloned());
                            constraints.push(constraint);
                        }
                    } 
                }
            }
        }
        
        // 2. 확실히 안전한 셀 찾기 (제약 조건 분석)
        if let Some(safe) = self.find_definitely_safe(&constraints, board) {
            return Some(safe);
        }
        
        // 3. 확률 계산
        self.calculate_best_cell(&all_hidden_cells, board)
    }
    
    fn build_constraint(&self, board: &Board, face: Face, u: usize, v: usize) -> Constraint {
        let idx = index(board.n, face, u, v);
        let cell = &board.cells[idx];
        let mut hidden = Vec::new();
        let mut flags = 0;
        
        for (nf, nu, nv) in board.neighbors8(face, u, v) {
            let nidx = index(board.n, nf, nu, nv);
            let neighbor = &board.cells[nidx];
            
            if neighbor.is_flagged {
                flags += 1;
            } else if !neighbor.is_revealed {
                hidden.push((nf, nu, nv));
            }
        }
        
        Constraint {
            center: (face, u, v),
            total_mines: cell.adjacent_mines as usize,
            flagged: flags,
            hidden_cells: hidden,
        }
    }
    
    fn find_definitely_safe(&self, constraints: &[Constraint], board: &Board) -> Option<(Face, usize, usize)> {
        // 고급 제약 조건 분석
        // 1. 단순 비교: 남은 지뢰가 0이면 모든 숨겨진 셀 안전
        for constraint in constraints {
            if constraint.remaining_mines() == 0 && !constraint.hidden_cells.is_empty() {
                // 이미 확인되지 않은 안전한 셀 반환
                for &cell in &constraint.hidden_cells {
                    let idx = index(board.n, cell.0, cell.1, cell.2);
                    if !board.cells[idx].is_revealed && !board.cells[idx].is_flagged {
                        return Some(cell);
                    }
                }
            }
        }
        
        // 2. 제약 조건 비교 분석
        self.analyze_constraint_pairs(constraints, board)
    }
    
    fn analyze_constraint_pairs(&self, constraints: &[Constraint], board: &Board) -> Option<(Face, usize, usize)> {
        for i in 0..constraints.len() {
            for j in i+1..constraints.len() {
                if let Some(safe) = self.compare_two_constraints(&constraints[i], &constraints[j], board) {
                    return Some(safe);
                }
            }
        }
        None
    }
    
    fn compare_two_constraints(&self, c1: &Constraint, c2: &Constraint, board: &Board) -> Option<(Face, usize, usize)> {
        // 두 제약 조건 비교 (집합 연산)
        let set1: HashSet<(Face, usize, usize)> = c1.hidden_cells.iter().cloned().collect();
        let set2: HashSet<(Face, usize, usize)> = c2.hidden_cells.iter().cloned().collect();

        
        // 교집합
        let intersection: HashSet<_> = set1.intersection(&set2).collect();
        
        if !intersection.is_empty() {
            // 차집합
            let only_in_c1: Vec<_> = set1.difference(&set2).collect();
            let only_in_c2: Vec<_> = set2.difference(&set1).collect();
            
            // 수학적 분석
            if c1.remaining_mines() as isize - c2.remaining_mines() as isize == only_in_c1.len() as isize {
                // only_in_c2의 모든 셀 안전
                for &&cell in &only_in_c2 {
                    let idx = index(board.n, cell.0, cell.1, cell.2);
                    if !board.cells[idx].is_revealed && !board.cells[idx].is_flagged {
                        return Some(cell); 
                    }
                }
            }
            
            if c2.remaining_mines() as isize - c1.remaining_mines() as isize == only_in_c2.len() as isize {
                // only_in_c1의 모든 셀 안전
                for &&cell in &only_in_c1 {
                    let idx = index(board.n, cell.0, cell.1, cell.2);
                    if !board.cells[idx].is_revealed && !board.cells[idx].is_flagged {
                        return Some(cell);  // *로 역참조
                    }
                }
            }
        }
        
        None
    }
    
    fn calculate_best_cell(&self, all_hidden: &HashSet<(Face, usize, usize)>, board: &Board) -> Option<(Face, usize, usize)> {
        // 확률 계산 (단순화된 버전)
        let mut best_cell = None;
        let mut best_probability = 1.0;
        
        for &(face, u, v) in all_hidden {
            let idx = index(board.n, face, u, v);
            let cell = &board.cells[idx];
            
            if !cell.is_revealed && !cell.is_flagged {
                // 기본 확률 계산
                let mut flag_count = 0;
                for c in &board.cells {
                    if c.is_flagged { flag_count += 1; }
                }
                
                let remaining_cells = (self.n * self.n * 6) - board.total_revealed;
                let remaining_mines = self.mines.saturating_sub(flag_count);
                
                let probability = if remaining_cells > 0 {
                    remaining_mines as f64 / remaining_cells as f64
                } else {
                    1.0
                };
                
                if probability < best_probability {
                    best_probability = probability;
                    best_cell = Some((face, u, v));
                }
            }
        }
        
        best_cell
    }
}

#[derive(Clone)]  // Clone 트레잇 구현 추가
struct Constraint {
    center: (Face, usize, usize),
    total_mines: usize,
    flagged: usize,
    hidden_cells: Vec<(Face, usize, usize)>,
}

impl Constraint {
    fn remaining_mines(&self) -> usize {
        self.total_mines.saturating_sub(self.flagged)
    }
}

impl Algorithm for ExactSolver {
    fn next_move(&mut self, board: &Board) -> Option<(Face, usize, usize)> {
        if self.first_move {
            self.first_move = false;
            return Some(self.first_click_position());
        }
        self.solve_exact(board)
    }
}