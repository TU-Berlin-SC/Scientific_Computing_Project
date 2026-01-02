// src/algorithms/exact_solver.rs
use crate::board::Board;
use crate::algorithms::Algorithm;
use std::collections::HashSet;

pub struct ExactSolver {
    width: usize,
    height: usize,
    mines: usize,
    first_move: bool,
}

// src/algorithms/exact_solver.rs (수정된 부분)
impl ExactSolver {
    pub fn new(dimensions: Vec<usize>, mines: usize) -> Self {
        Self { 
            dimensions,
            mines, 
            first_move: true 
        }
    }

    fn first_click_position(&self) -> Vec<usize> {
        // 중앙 셀 클릭
        self.dimensions.iter().map(|&dim| dim / 2).collect()
    }

    fn build_constraint(&self, board: &Board, coords: &[usize]) -> Constraint {
        let idx = board.coords_to_index(coords);
        let cell = &board.cells[idx];
        let mut hidden = Vec::new();
        let mut flags = 0;
        
        let neighbors = board.generate_neighbors(coords);
        
        for neighbor_coords in neighbors {
            let nidx = board.coords_to_index(&neighbor_coords);
            let neighbor = &board.cells[nidx];
            
            if neighbor.is_flagged {
                flags += 1;
            } else if !neighbor.is_revealed {
                hidden.push(neighbor_coords);
            }
        }
        
        Constraint {
            center: coords.to_vec(),
            total_mines: cell.adjacent_mines as usize,
            flagged: flags,
            hidden_cells: hidden,
        }
    }
    
    fn find_definitely_safe(&self, constraints: &[Constraint], board: &Board) -> Option<(usize, usize)> {
        // 고급 제약 조건 분석
        // 1. 단순 비교: 남은 지뢰가 0이면 모든 숨겨진 셀 안전
        for constraint in constraints {
            if constraint.remaining_mines() == 0 && !constraint.hidden_cells.is_empty() {
                // 이미 확인되지 않은 안전한 셀 반환
                for &cell in &constraint.hidden_cells {
                    let idx = cell.1 * self.width + cell.0;
                    if !board.cells[idx].is_revealed && !board.cells[idx].is_flagged {
                        return Some(cell);
                    }
                }
            }
        }
        
        // 2. 제약 조건 비교 분석
        self.analyze_constraint_pairs(constraints, board)
    }
    
    fn analyze_constraint_pairs(&self, constraints: &[Constraint], board: &Board) -> Option<(usize, usize)> {
        for i in 0..constraints.len() {
            for j in i+1..constraints.len() {
                if let Some(safe) = self.compare_two_constraints(&constraints[i], &constraints[j], board) {
                    return Some(safe);
                }
            }
        }
        None
    }
    
    fn compare_two_constraints(&self, c1: &Constraint, c2: &Constraint, board: &Board) -> Option<(usize, usize)> {
        // 두 제약 조건 비교 (집합 연산)
        let set1: HashSet<_> = c1.hidden_cells.iter().collect();
        let set2: HashSet<_> = c2.hidden_cells.iter().collect();
        
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
                    let idx = cell.1 * self.width + cell.0;
                    if !board.cells[idx].is_revealed && !board.cells[idx].is_flagged {
                        // return Some(*cell);
                        return Some(*cell); 
                    }
                }
            }
            
            if c2.remaining_mines() as isize - c1.remaining_mines() as isize == only_in_c2.len() as isize {
                // only_in_c1의 모든 셀 안전
                for &&cell in &only_in_c1 {
                    let idx = cell.1 * self.width + cell.0;
                    if !board.cells[idx].is_revealed && !board.cells[idx].is_flagged {
                        return Some(*cell);  // *로 역참조
                    }
                }
            }
        }
        
        None
    }
    
    fn calculate_best_cell(&self, all_hidden: &HashSet<(usize, usize)>, board: &Board) -> Option<(usize, usize)> {
        // 확률 계산 (단순화된 버전)
        let mut best_cell = None;
        let mut best_probability = 1.0;
        
        for &(x, y) in all_hidden {
            let idx = y * self.width + x;
            let cell = &board.cells[idx];
            
            if !cell.is_revealed && !cell.is_flagged {
                // 기본 확률 계산
                let mut flag_count = 0;
                for c in &board.cells {
                    if c.is_flagged { flag_count += 1; }
                }
                
                let remaining_cells = (self.width * self.height) - board.total_revealed;
                let remaining_mines = self.mines - flag_count;
                
                let probability = if remaining_cells > 0 {
                    remaining_mines as f64 / remaining_cells as f64
                } else {
                    1.0
                };
                
                if probability < best_probability {
                    best_probability = probability;
                    best_cell = Some((x, y));
                }
            }
        }
        
        best_cell
    }
}

#[derive(Clone)]  // Clone 트레잇 구현 추가
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

impl Algorithm for ExactSolver {
    fn next_move(&mut self, board: &Board) -> Option<(usize, usize)> {
        if self.first_move {
            self.first_move = false;
            return Some(self.first_click_position());
        }
        self.solve_exact(board)
    }
}