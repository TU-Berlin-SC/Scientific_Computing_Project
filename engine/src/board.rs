// src/board.rs
use serde::{Serialize, Deserialize};
use rand::seq::SliceRandom;
use rand::thread_rng;

// Cell struct for N-dimensions
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Cell {
    pub is_mine: bool,
    pub is_revealed: bool,
    pub is_flagged: bool,
    pub adjacent_mines: u8,
    pub coordinates: Vec<usize>, // N Dimensions
}

// N-dimensional Board struct
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Board {
    pub dimensions: Vec<usize>,
    pub mines: usize,
    pub cells: Vec<Cell>,
    pub game_over: bool,
    pub game_won: bool,
    pub total_revealed: usize,
    pub total_clicks: usize,
}

impl Board {
    pub fn new(dimensions: Vec<usize>, mines: usize) -> Self {
        let total_cells = dimensions.iter().product();
        if mines >= total_cells {
            panic!("Too many mines for board size!");
        }
        
        let mut cells = Vec::with_capacity(total_cells);
        let indices = Self::generate_all_indices(&dimensions);
        
        for coords in indices {
            cells.push(Cell {
                is_mine: false,
                is_revealed: false,
                is_flagged: false,
                adjacent_mines: 0,
                coordinates: coords,
            });
        }
        
        Board {
            dimensions: dimensions.clone(),
            mines,
            cells,
            game_over: false,
            game_won: false,
            total_revealed: 0,
            total_clicks: 0,
        }
    }
    
    fn generate_all_indices(dimensions: &[usize]) -> Vec<Vec<usize>> {
        let total_cells = dimensions.iter().product();
        let mut indices = Vec::with_capacity(total_cells);
        let mut current = vec![0; dimensions.len()];
        
        fn generate_recursive(
            dimensions: &[usize],
            current: &mut Vec<usize>,
            index: usize,
            result: &mut Vec<Vec<usize>>
        ) {
            if index == dimensions.len() {
                result.push(current.clone());
                return;
            }
            
            for i in 0..dimensions[index] {
                current[index] = i;
                generate_recursive(dimensions, current, index + 1, result);
            }
        }
        
        generate_recursive(dimensions, &mut current, 0, &mut indices);
        indices
    }
    
    pub fn coords_to_index(&self, coords: &[usize]) -> usize {
        let mut index = 0;
        let mut multiplier = 1;
        
        for (i, &coord) in coords.iter().enumerate() {
            if i > 0 {
                multiplier *= self.dimensions[i - 1];
            }
            index += coord * multiplier;
        }
        
        index
    }
    
    pub fn index_to_coords(&self, index: usize) -> Vec<usize> {
        let mut coords = vec![0; self.dimensions.len()];
        let mut remaining = index;
        
        for i in (0..self.dimensions.len()).rev() {
            let mut multiplier = 1;
            for j in 0..i {
                multiplier *= self.dimensions[j];
            }
            coords[i] = remaining / multiplier;
            remaining %= multiplier;
        }
        
        coords
    }
    
    pub fn place_mines_after_first_click(&mut self, first_coords: &[usize]) {
        let total_cells = self.dimensions.iter().product();
        let mut indices: Vec<usize> = (0..total_cells).collect();
        
        let first_idx = self.coords_to_index(first_coords);
        indices.retain(|&idx| idx != first_idx);
        
        // Exclude cells within Chebyshev distance of 1 (N차원 인접 셀)
        indices.retain(|&idx| {
            let coords = self.index_to_coords(idx);
            !self.are_neighbors(&coords, first_coords)
        });
        
        let mut rng = thread_rng();
        indices.shuffle(&mut rng);
        
        for &idx in indices.iter().take(self.mines) {
            self.cells[idx].is_mine = true;
        }
        
        self.calculate_adjacent_mines();
    }
    
    fn are_neighbors(&self, coords1: &[usize], coords2: &[usize]) -> bool {
        if coords1.len() != coords2.len() {
            return false;
        }
        
        let mut max_diff = 0;
        for (&c1, &c2) in coords1.iter().zip(coords2.iter()) {
            let diff = c1.abs_diff(c2);
            if diff > max_diff {
                max_diff = diff;
            }
        }
        
        max_diff <= 1 && coords1 != coords2
    }
    
    pub fn calculate_adjacent_mines(&mut self) {
        let total_cells: usize = self.dimensions.iter().product();
        
        for idx in 0..total_cells {
            if !self.cells[idx].is_mine {
                let coords = self.index_to_coords(idx);
                let mut count = 0;
                
                let neighbors = self.generate_neighbors(&coords);
                
                for neighbor_coords in neighbors {
                    let neighbor_idx = self.coords_to_index(&neighbor_coords);
                    if neighbor_idx < self.cells.len() && self.cells[neighbor_idx].is_mine {
                        count += 1;
                    }
                }
                
                self.cells[idx].adjacent_mines = count as u8;
            }
        }
    }
    
    pub fn generate_neighbors(&self, coords: &[usize]) -> Vec<Vec<usize>> {
        let mut neighbors = Vec::new();
        let offsets = self.generate_offsets();
        
        for offset in offsets {
            let mut neighbor = Vec::with_capacity(coords.len());
            let mut valid = true;
            
            for (i, &coord) in coords.iter().enumerate() {
                let new_coord = coord as isize + offset[i];
                if new_coord < 0 || new_coord >= self.dimensions[i] as isize {
                    valid = false;
                    break;
                }
                neighbor.push(new_coord as usize);
            }
            
            if valid {
                neighbors.push(neighbor);
            }
        }
        
        neighbors
    }
    
    fn generate_offsets(&self) -> Vec<Vec<isize>> {
        let dimension_count = self.dimensions.len();
        let mut offsets = Vec::new();
        let mut current = vec![0; dimension_count];
        
        fn generate_offsets_recursive(
            dim: usize,
            current: &mut Vec<isize>,
            result: &mut Vec<Vec<isize>>
        ) {
            if dim == current.len() {
                if !current.iter().all(|&x| x == 0) {
                    result.push(current.clone());
                }
                return;
            }
            
            for offset in -1..=1 {
                current[dim] = offset;
                generate_offsets_recursive(dim + 1, current, result);
            }
        }
        
        generate_offsets_recursive(0, &mut current, &mut offsets);
        offsets
    }
    
    pub fn reveal_cell(&mut self, coords: &[usize]) -> bool {
        let idx = self.coords_to_index(coords);
        
        if idx >= self.cells.len() {
            return false;
        }
        
        if self.cells[idx].is_revealed || self.cells[idx].is_flagged {
            return false;
        }
        
        if self.total_clicks == 0 {
            self.place_mines_after_first_click(coords);
        }
        
        self.total_clicks += 1;
        self.cells[idx].is_revealed = true;
        
        if self.cells[idx].is_mine {
            self.game_over = true;
            return true;
        }
        
        self.total_revealed += 1;
        
        if self.cells[idx].adjacent_mines == 0 {
            self.reveal_adjacent_zero_cells(coords);
        }
        
        let total_safe_cells = self.dimensions.iter().product::<usize>() - self.mines;
        if self.total_revealed == total_safe_cells {
            self.game_won = true;
        }
        
        true
    }
    
    fn reveal_adjacent_zero_cells(&mut self, coords: &[usize]) {
        let mut stack = vec![coords.to_vec()];
        let mut visited = vec![false; self.dimensions.iter().product()];
        visited[self.coords_to_index(coords)] = true;
        
        while let Some(current_coords) = stack.pop() {
            let neighbors = self.generate_neighbors(&current_coords);
            
            for neighbor_coords in neighbors {
                let nidx = self.coords_to_index(&neighbor_coords);
                
                if nidx >= self.cells.len() {
                    continue;
                }
                
                if !visited[nidx] && !self.cells[nidx].is_revealed && 
                   !self.cells[nidx].is_mine && !self.cells[nidx].is_flagged {
                    self.cells[nidx].is_revealed = true;
                    self.total_revealed += 1;
                    visited[nidx] = true;
                    
                    if self.cells[nidx].adjacent_mines == 0 {
                        stack.push(neighbor_coords);
                    }
                }
            }
        }
    }
    
    pub fn toggle_flag(&mut self, coords: &[usize]) {
        let idx = self.coords_to_index(coords);
        if idx < self.cells.len() && !self.cells[idx].is_revealed {
            self.cells[idx].is_flagged = !self.cells[idx].is_flagged;
        }
    }
    
    pub fn reset(&mut self) {
        for cell in &mut self.cells {
            cell.is_mine = false;
            cell.is_revealed = false;
            cell.is_flagged = false;
            cell.adjacent_mines = 0;
        }
        
        self.game_over = false;
        self.game_won = false;
        self.total_revealed = 0;
        self.total_clicks = 0;
    }
    
    // Helper methods for 2D compatibility
    pub fn new_2d(width: usize, height: usize, mines: usize) -> Self {
        Self::new(vec![width, height], mines)
    }
    
    pub fn width(&self) -> usize {
        self.dimensions.get(0).copied().unwrap_or(0)
    }
    
    pub fn height(&self) -> usize {
        self.dimensions.get(1).copied().unwrap_or(0)
    }
    
    pub fn get_cell_at_coords(&self, coords: &[usize]) -> Option<&Cell> {
        if coords.len() != self.dimensions.len() {
            return None;
        }
        
        for (i, &coord) in coords.iter().enumerate() {
            if coord >= self.dimensions[i] {
                return None;
            }
        }
        
        let idx = self.coords_to_index(coords);
        self.cells.get(idx)
    }
    
    // 디버깅용
    pub fn get_dimensions(&self) -> &Vec<usize> {
        &self.dimensions
    }
}