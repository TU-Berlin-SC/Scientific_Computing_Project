// src/algorithms/sat_solver.rs
use crate::board::Board;
use crate::algorithms::Algorithm;
use std::collections::{HashSet, HashMap};

pub struct SATSolver {
    dimensions: Vec<usize>,
    mines: usize,
    first_move: bool,
}

impl SATSolver {
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
    
    fn apply_simple_rules(&self, board: &Board) -> Option<Vec<usize>> {
        let total_cells = board.dimensions.iter().product();
        
        for idx in 0..total_cells {
            if board.cells[idx].is_revealed && board.cells[idx].adjacent_mines > 0 {
                let coords = board.index_to_coords(idx);
                if let Some(safe) = self.check_single_constraint(board, &coords) {
                    return Some(safe);
                }
            }
        }
        
        None
    }
    
    fn check_single_constraint(&self, board: &Board, coords: &[usize]) -> Option<Vec<usize>> {
        let idx = board.coords_to_index(coords);
        if idx >= board.cells.len() {
            return None;
        }
        
        let cell = &board.cells[idx];
        if !cell.is_revealed {
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
        
        let remaining_mines = cell.adjacent_mines as usize - flags;
        
        // 규칙 1: 남은 지뢰 수가 0이면 모든 숨겨진 셀 안전
        if remaining_mines == 0 && !hidden.is_empty() {
            return Some(hidden[0].clone());
        }
        
        None
    }
    
    fn analyze_with_sat(&self, board: &Board) -> Option<Vec<usize>> {
        let constraints = self.collect_constraints(board);
        
        if constraints.len() < 2 {
            return None;
        }
        
        // 공통으로 나타나는 셀 찾기
        let mut cell_count = HashMap::new();
        
        for constraint in &constraints {
            for cell in &constraint.hidden_cells {
                *cell_count.entry(cell.clone()).or_insert(0) += 1;
            }
        }
        
        // 여러 제약조건에 공통으로 속하는 셀 분석
        for (cell, count) in cell_count {
            if count >= 2 {
                if self.is_cell_always_safe(&cell, &constraints, board) {
                    return Some(cell);
                }
            }
        }
        
        None
    }
    
    fn is_cell_always_safe(
        &self, 
        cell: &Vec<usize>, 
        constraints: &[Constraint],
        board: &Board
    ) -> bool {
        for constraint in constraints {
            if constraint.hidden_cells.contains(cell) {
                let other_cells: Vec<_> = constraint.hidden_cells
                    .iter()
                    .filter(|c| *c != cell)
                    .cloned()
                    .collect();
                
                if other_cells.len() < constraint.remaining_mines() {
                    return false;
                }
            }
        }
        
        true
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
    
    fn make_educated_guess(&self, board: &Board) -> Option<Vec<usize>> {
        let total_cells: usize = board.dimensions.iter().product();
        let mut best_cell = None;
        let mut best_probability = 1.0;
        
        for idx in 0..total_cells {
            if !board.cells[idx].is_revealed && !board.cells[idx].is_flagged {
                let coords = board.index_to_coords(idx);
                let probability = self.calculate_cell_probability(&coords, board);
                
                if probability < best_probability {
                    best_probability = probability;
                    best_cell = Some(coords);
                }
            }
        }
        
        best_cell
    }
    
    fn calculate_cell_probability(&self, coords: &[usize], board: &Board) -> f64 {
        let mut total_weight = 0.0;
        let mut total_probability = 0.0;
        
        let neighbors = board.generate_neighbors(coords);
        
        for neighbor_coords in &neighbors {
            let nidx = board.coords_to_index(neighbor_coords);
            if nidx >= board.cells.len() {
                continue;
            }
            
            let neighbor = &board.cells[nidx];
            
            if neighbor.is_revealed && neighbor.adjacent_mines > 0 {
                let constraint_prob = self.analyze_constraint_probability(neighbor_coords, board);
                total_probability += constraint_prob;
                total_weight += 1.0;
            }
        }
        
        if total_weight > 0.0 {
            total_probability / total_weight
        } else {
            self.calculate_global_probability(board)
        }
    }
    
    fn analyze_constraint_probability(&self, coords: &[usize], board: &Board) -> f64 {
        let idx = board.coords_to_index(coords);
        if idx >= board.cells.len() {
            return 0.5;
        }
        
        let cell = &board.cells[idx];
        if !cell.is_revealed {
            return 0.5;
        }
        
        let mut hidden_count = 0;
        let mut flags_count = 0;
        
        let neighbors = board.generate_neighbors(coords);
        
        for neighbor_coords in &neighbors {
            let nidx = board.coords_to_index(neighbor_coords);
            if nidx >= board.cells.len() {
                continue;
            }
            
            let neighbor = &board.cells[nidx];
            
            if neighbor.is_flagged {
                flags_count += 1;
            } else if !neighbor.is_revealed {
                hidden_count += 1;
            }
        }
        
        if hidden_count == 0 {
            return 0.0;
        }
        
        let remaining_mines = cell.adjacent_mines as usize - flags_count;
        remaining_mines as f64 / hidden_count as f64
    }
    
    fn calculate_global_probability(&self, board: &Board) -> f64 {
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
}

#[derive(Clone, Debug)]
struct Constraint {
    center: Vec<usize>,
    total_mines: usize,
    flagged: usize,
    hidden_cells: Vec<Vec<usize>>,
}

impl Constraint {
    fn remaining_mines(&self) -> usize {
        self.total_mines.saturating_sub(self.flagged)
    }
}

impl Algorithm for SATSolver {
    fn next_move(&mut self, board: &Board) -> Option<Vec<usize>> {
        if self.first_move {
            self.first_move = false;
            return Some(self.first_click_position());
        }
        
        // 1. 단순 규칙 적용
        if let Some(safe) = self.apply_simple_rules(board) {
            return Some(safe);
        }
        
        // 2. SAT 기반 분석
        if let Some(safe) = self.analyze_with_sat(board) {
            return Some(safe);
        }
        
        // 3. 추측
        self.make_educated_guess(board)
    }
}