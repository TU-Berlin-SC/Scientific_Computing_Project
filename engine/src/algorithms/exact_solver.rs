// src/algorithms/exact_solver.rs
use crate::board::Board;
use crate::algorithms::Algorithm;
use std::collections::{HashSet, HashMap};

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

impl ExactSolver {
    pub fn new(dimensions: Vec<usize>, mines: usize) -> Self {
        Self { 
            dimensions,
            mines, 
            first_move: true 
        }
    }

    fn first_click_position(&self) -> Vec<usize> {
        self.dimensions.iter().map(|&dim| dim / 2).collect()
    }

    fn build_constraint(&self, board: &Board, coords: &[usize]) -> Option<Constraint> {
        let idx = board.coords_to_index(coords);
        if idx >= board.cells.len() {
            return None;
        }
        
        let cell = &board.cells[idx];
        if !cell.is_revealed || cell.adjacent_mines == 0 {
            return None;
        }
        
        let mut hidden = Vec::new();
        let mut flags = 0;
        
        let neighbors = board.generate_neighbors(coords);
        
        for neighbor_coords in &neighbors {
            let nidx = board.coords_to_index(neighbor_coords);
            if nidx >= board.cells.len() {
                continue;
            }
            
            let neighbor = &board.cells[nidx];
            
            if neighbor.is_flagged {
                flags += 1;
            } else if !neighbor.is_revealed {
                hidden.push(neighbor_coords.clone());
            }
        }
        
        if hidden.is_empty() {
            return None;
        }
        
        Some(Constraint {
            center: coords.to_vec(),
            total_mines: cell.adjacent_mines as usize,
            flagged: flags,
            hidden_cells: hidden,
        })
    }
    
    fn collect_constraints(&self, board: &Board) -> Vec<Constraint> {
        let total_cells = board.dimensions.iter().product();
        let mut constraints = Vec::new();
        
        for idx in 0..total_cells {
            if board.cells[idx].is_revealed && board.cells[idx].adjacent_mines > 0 {
                let coords = board.index_to_coords(idx);
                if let Some(constraint) = self.build_constraint(board, &coords) {
                    constraints.push(constraint);
                }
            }
        }
        
        constraints
    }
    
    fn find_safe_cell(&self, board: &Board) -> Option<Vec<usize>> {
        let constraints = self.collect_constraints(board);
        
        // 1. 단순한 경우: 남은 지뢰가 0인 제약 조건
        for constraint in &constraints {
            if constraint.remaining_mines() == 0 && !constraint.hidden_cells.is_empty() {
                for cell in &constraint.hidden_cells {
                    let idx = board.coords_to_index(cell);
                    if idx < board.cells.len() && 
                       !board.cells[idx].is_revealed && 
                       !board.cells[idx].is_flagged {
                        return Some(cell.clone());
                    }
                }
            }
        }
        
        // 2. 집합 차이 분석
        for i in 0..constraints.len() {
            for j in i+1..constraints.len() {
                if let Some(safe) = self.compare_two_constraints(&constraints[i], &constraints[j], board) {
                    return Some(safe);
                }
            }
        }
        
        // 3. 확장된 제약 조건 분석
        if constraints.len() >= 3 {
            if let Some(safe) = self.analyze_multiple_constraints(&constraints, board) {
                return Some(safe);
            }
        }
        
        None
    }
    
    fn compare_two_constraints(&self, c1: &Constraint, c2: &Constraint, board: &Board) -> Option<Vec<usize>> {
        let set1: HashSet<_> = c1.hidden_cells.iter().cloned().collect();
        let set2: HashSet<_> = c2.hidden_cells.iter().cloned().collect();
        
        if set1.is_disjoint(&set2) {
            return None;
        }
        
        // 부분집합 분석
        if set1.is_subset(&set2) {
            let diff: Vec<_> = set2.difference(&set1).cloned().collect();
            let mines_diff = c2.remaining_mines() as isize - c1.remaining_mines() as isize;
            
            if mines_diff == 0 && !diff.is_empty() {
                for cell in &diff {
                    let idx = board.coords_to_index(cell);
                    if idx < board.cells.len() && 
                       !board.cells[idx].is_revealed && 
                       !board.cells[idx].is_flagged {
                        return Some(cell.clone());
                    }
                }
            }
        }
        
        if set2.is_subset(&set1) {
            let diff: Vec<_> = set1.difference(&set2).cloned().collect();
            let mines_diff = c1.remaining_mines() as isize - c2.remaining_mines() as isize;
            
            if mines_diff == 0 && !diff.is_empty() {
                for cell in &diff {
                    let idx = board.coords_to_index(cell);
                    if idx < board.cells.len() && 
                       !board.cells[idx].is_revealed && 
                       !board.cells[idx].is_flagged {
                        return Some(cell.clone());
                    }
                }
            }
        }
        
        // 교집합 분석
        let intersection: HashSet<_> = set1.intersection(&set2).cloned().collect();
        let only_in_c1: Vec<_> = set1.difference(&set2).cloned().collect();
        let only_in_c2: Vec<_> = set2.difference(&set1).cloned().collect();
        
        if !only_in_c1.is_empty() && c1.remaining_mines() == only_in_c1.len() {
            for cell in &intersection {
                let idx = board.coords_to_index(cell);
                if idx < board.cells.len() && 
                   !board.cells[idx].is_revealed && 
                   !board.cells[idx].is_flagged {
                    return Some(cell.clone());
                }
            }
        }
        
        if !only_in_c2.is_empty() && c2.remaining_mines() == only_in_c2.len() {
            for cell in &intersection {
                let idx = board.coords_to_index(cell);
                if idx < board.cells.len() && 
                   !board.cells[idx].is_revealed && 
                   !board.cells[idx].is_flagged {
                    return Some(cell.clone());
                }
            }
        }
        
        None
    }
    
    fn analyze_multiple_constraints(&self, constraints: &[Constraint], board: &Board) -> Option<Vec<usize>> {
        // 모든 숨겨진 셀을 수집
        let mut all_hidden_cells = HashSet::new();
        for constraint in constraints {
            for cell in &constraint.hidden_cells {
                all_hidden_cells.insert(cell.clone());
            }
        }
        
        // 각 셀이 나타나는 제약조건 수 세기
        let mut cell_constraint_count = HashMap::new();
        for constraint in constraints {
            for cell in &constraint.hidden_cells {
                *cell_constraint_count.entry(cell.clone()).or_insert(0) += 1;
            }
        }
        
        // 여러 제약조건에 공통으로 나타나는 셀 우선 검사
        for (cell, count) in cell_constraint_count {
            if count >= 2 {
                let mut min_remaining_mines = usize::MAX;
                
                for constraint in constraints {
                    // 에러 수정: contains는 Vec<usize>를 찾음
                    if constraint.hidden_cells.contains(&cell) {
                        let remaining = constraint.remaining_mines();
                        if remaining < min_remaining_mines {
                            min_remaining_mines = remaining;
                        }
                    }
                }
                
                // 모든 관련 제약조건에서 남은 지뢰 수가 0이면 안전
                if min_remaining_mines == 0 {
                    let idx = board.coords_to_index(&cell);
                    if idx < board.cells.len() && 
                       !board.cells[idx].is_revealed && 
                       !board.cells[idx].is_flagged {
                        return Some(cell);
                    }
                }
            }
        }
        
        None
    }
    
    fn make_educated_guess(&self, board: &Board) -> Option<Vec<usize>> {
        let constraints = self.collect_constraints(board);
        
        if !constraints.is_empty() {
            let mut best_cell = None;
            let mut best_probability = 1.0;
            
            for constraint in &constraints {
                for cell in &constraint.hidden_cells {
                    let probability = self.calculate_cell_probability(cell, &constraints, board);
                    if probability < best_probability {
                        best_probability = probability;
                        best_cell = Some(cell.clone());
                    }
                }
            }
            
            return best_cell;
        }
        
        self.find_safest_random_cell(board)
    }
    
    fn calculate_cell_probability(
        &self, 
        cell: &Vec<usize>, 
        constraints: &[Constraint],
        board: &Board
    ) -> f64 {
        let mut total_probability = 0.0;
        let mut count = 0;
        
        for constraint in constraints {
            if constraint.hidden_cells.contains(cell) {
                let remaining_mines = constraint.remaining_mines();
                let hidden_count = constraint.hidden_cells.len();
                
                if hidden_count > 0 {
                    total_probability += remaining_mines as f64 / hidden_count as f64;
                    count += 1;
                }
            }
        }
        
        if count > 0 {
            total_probability / count as f64
        } else {
            self.calculate_global_mine_probability(board)
        }
    }
    
    fn calculate_global_mine_probability(&self, board: &Board) -> f64 {
        let total_hidden: usize = board.cells.iter()
            .filter(|c| !c.is_revealed && !c.is_flagged)
            .count();
        
        let flagged: usize = board.cells.iter()
            .filter(|c| c.is_flagged)
            .count();
        
        let remaining_mines = self.mines.saturating_sub(flagged);
        
        if total_hidden == 0 {
            return 0.0;
        }
        
        remaining_mines as f64 / total_hidden as f64
    }
    
    fn find_safest_random_cell(&self, board: &Board) -> Option<Vec<usize>> {
        let total_cells: usize = board.dimensions.iter().product();
        let mut candidates = Vec::new();
        
        for idx in 0..total_cells {
            if !board.cells[idx].is_revealed && !board.cells[idx].is_flagged {
                let coords = board.index_to_coords(idx);
                let distance_to_center = self.distance_to_center(&coords);
                candidates.push((coords, distance_to_center));
            }
        }
        
        candidates.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap());
        
        candidates.first().map(|(coords, _)| coords.clone())
    }
    
    fn distance_to_center(&self, coords: &[usize]) -> f64 {
        let mut distance = 0.0;
        for (i, &coord) in coords.iter().enumerate() {
            let dim_center = self.dimensions[i] as f64 / 2.0;
            let diff = coord as f64 - dim_center;
            distance += diff * diff;
        }
        distance.sqrt()
    }
}

impl Constraint {
    fn remaining_mines(&self) -> usize {
        self.total_mines.saturating_sub(self.flagged)
    }
}

impl Algorithm for ExactSolver {
    fn next_move(&mut self, board: &Board) -> Option<Vec<usize>> {
        if self.first_move {
            self.first_move = false;
            return Some(self.first_click_position());
        }
        
        if let Some(safe_cell) = self.find_safe_cell(board) {
            return Some(safe_cell);
        }
        
        self.make_educated_guess(board)
    }
}