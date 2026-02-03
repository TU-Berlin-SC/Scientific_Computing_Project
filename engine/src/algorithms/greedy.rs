// src/algorithms/greedy.rs
use crate::board::Board;
use crate::algorithms::Algorithm;

pub struct GreedySolver {
    dimensions: Vec<usize>,
    mines: usize,
    first_move: bool,
}

impl GreedySolver {
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

    fn find_safe_cell(&self, board: &Board) -> Option<Vec<usize>> {
        let total_cells = board.dimensions.iter().product();
        
        for idx in 0..total_cells {
            if board.cells[idx].is_revealed && board.cells[idx].adjacent_mines > 0 {
                let coords = board.index_to_coords(idx);
                if let Some(safe) = self.find_safe_from_constraint(board, &coords) {
                    return Some(safe);
                }
            }
        }
        
        None
    }
    
    fn find_safe_from_constraint(&self, board: &Board, coords: &[usize]) -> Option<Vec<usize>> {
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
        
        let remaining_mines = cell.adjacent_mines as usize - flags;
        if remaining_mines == 0 && !hidden.is_empty() {
            let mut best_cell = None;
            let mut max_hidden_neighbors = 0;
            
            for cell_coords in &hidden {
                let info_value = self.calculate_information_value(cell_coords, board);
                if info_value > max_hidden_neighbors {
                    max_hidden_neighbors = info_value;
                    best_cell = Some(cell_coords.clone());
                }
            }
            
            return best_cell;
        }
        
        None
    }
    
    fn calculate_information_value(&self, coords: &[usize], board: &Board) -> usize {
        let neighbors = board.generate_neighbors(coords);
        let mut value = 0;
        
        for neighbor_coords in &neighbors {
            let nidx = board.coords_to_index(neighbor_coords);
            if nidx < board.cells.len() {
                let neighbor = &board.cells[nidx];
                
                if neighbor.is_revealed && neighbor.adjacent_mines > 0 {
                    value += 1;
                }
            }
        }
        
        value
    }
    
    fn make_educated_guess(&self, board: &Board) -> Option<Vec<usize>> {
        let total_cells: usize = board.dimensions.iter().product();
        let mut best_cell = None;
        let mut best_score = f64::MAX;
        
        for idx in 0..total_cells {
            if !board.cells[idx].is_revealed && !board.cells[idx].is_flagged {
                let coords = board.index_to_coords(idx);
                let score = self.calculate_cell_score(&coords, board);
                
                if score < best_score {
                    best_score = score;
                    best_cell = Some(coords);
                }
            }
        }
        
        best_cell
    }
    
    fn calculate_cell_score(&self, coords: &[usize], board: &Board) -> f64 {
        let mine_probability = self.calculate_mine_probability(coords, board);
        let information_value = self.calculate_information_value(coords, board) as f64;
        
        mine_probability - (information_value * 0.1)
    }
    
    fn calculate_mine_probability(&self, coords: &[usize], board: &Board) -> f64 {
        let neighbors = board.generate_neighbors(coords);
        let mut total_constraints = 0;
        let mut total_possible_mines = 0;
        
        for neighbor_coords in &neighbors {
            let nidx = board.coords_to_index(neighbor_coords);
            if nidx >= board.cells.len() {
                continue;
            }
            
            let neighbor = &board.cells[nidx];
            
            if neighbor.is_revealed && neighbor.adjacent_mines > 0 {
                // 에러 수정: &를 추가하여 참조 전달
                let (hidden_count, flags_count) = self.analyze_constraint(&neighbor_coords, board);
                if hidden_count > 0 {
                    total_constraints += 1;
                    total_possible_mines += neighbor.adjacent_mines as usize - flags_count;
                }
            }
        }
        
        if total_constraints > 0 {
            total_possible_mines as f64 / (total_constraints * 8) as f64
        } else {
            self.calculate_global_mine_probability(board)
        }
    }
    
    fn analyze_constraint(&self, coords: &[usize], board: &Board) -> (usize, usize) {
        let idx = board.coords_to_index(coords);
        if idx >= board.cells.len() {
            return (0, 0);
        }
        
        let cell = &board.cells[idx];
        if !cell.is_revealed {
            return (0, 0);
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
        
        (hidden_count, flags_count)
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
}

impl Algorithm for GreedySolver {
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