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
    pub coordinates: Vec<usize>, // N차원 좌표
}

// N-dimensional Board struct
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Board {
    pub dimensions: Vec<usize>, // 각 차원의 크기
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
            dimensions,
            mines,
            cells,
            game_over: false,
            game_won: false,
            total_revealed: 0,
            total_clicks: 0,
        }
    }
    
    // 모든 가능한 N차원 좌표 생성
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
    
    // 좌표를 인덱스로 변환
    fn coords_to_index(&self, coords: &[usize]) -> usize {
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
    
    // 인덱스를 좌표로 변환
    fn index_to_coords(&self, index: usize) -> Vec<usize> {
        let mut coords = vec![0; self.dimensions.len()];
        let mut remaining = index;
        
        for i in (0..self.dimensions.len()).rev() {
            let multiplier: usize = self.dimensions[..i].iter().product();
            coords[i] = remaining / multiplier;
            remaining %= multiplier;
        }
        
        coords
    }
    
    // Place mines after the first click
    pub fn place_mines_after_first_click(&mut self, first_coords: &[usize]) {
        let total_cells = self.dimensions.iter().product();
        let mut indices: Vec<usize> = (0..total_cells).collect();
        
        // Exclude the first clicked cell
        let first_idx = self.coords_to_index(first_coords);
        indices.retain(|&idx| idx != first_idx);
        
        // Exclude surrounding cells of the first click
        indices.retain(|&idx| {
            let coords = self.index_to_coords(idx);
            self.manhattan_distance(&coords, first_coords) > 1
        });
        
        let mut rng = thread_rng();
        indices.shuffle(&mut rng);
        
        // Place mines
        for &idx in indices.iter().take(self.mines) {
            self.cells[idx].is_mine = true;
        }
        
        // Calculate adjacent mines after placing mines
        self.calculate_adjacent_mines();
    }
    
    // 맨해튼 거리 계산 (1차원 적 거리)
    fn manhattan_distance(&self, coords1: &[usize], coords2: &[usize]) -> usize {
        coords1.iter().zip(coords2.iter())
            .map(|(&c1, &c2)| c1.abs_diff(c2))
            .max()
            .unwrap_or(0)
    }
    
    // Calculate adjacent mines for each cell (N차원 이웃)
    pub(crate) fn calculate_adjacent_mines(&mut self) {
        let total_cells: usize = self.dimensions.iter().product();
        
        for idx in 0..total_cells {
            if !self.cells[idx].is_mine {
                let coords = self.index_to_coords(idx);
                let mut count = 0;
                
                // N차원 이웃 생성
                let neighbors = self.generate_neighbors(&coords);
                
                for neighbor_coords in neighbors {
                    let neighbor_idx = self.coords_to_index(&neighbor_coords);
                    if self.cells[neighbor_idx].is_mine {
                        count += 1;
                    }
                }
                
                self.cells[idx].adjacent_mines = count;
            }
        }
    }
    
    // N차원 이웃 좌표 생성
    fn generate_neighbors(&self, coords: &[usize]) -> Vec<Vec<usize>> {
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
    
    // N차원 오프셋 생성 (중심 제외)
    fn generate_offsets(&self) -> Vec<Vec<isize>> {
        let dimension_count = self.dimensions.len();
        let mut offsets = Vec::new();
        
        // 재귀적으로 오프셋 생성
        fn generate_offsets_recursive(
            dim: usize,
            current: &mut Vec<isize>,
            result: &mut Vec<Vec<isize>>
        ) {
            if dim == 0 {
                // 모든 요소가 0인 벡터 제외
                if !current.iter().all(|&x| x == 0) {
                    result.push(current.clone());
                }
                return;
            }
            
            for offset in -1..=1 {
                current.push(offset);
                generate_offsets_recursive(dim - 1, current, result);
                current.pop();
            }
        }
        
        generate_offsets_recursive(dimension_count, &mut Vec::new(), &mut offsets);
        offsets
    }
    
    // Cell reveal
    pub fn reveal_cell(&mut self, coords: &[usize]) -> bool {
        let idx = self.coords_to_index(coords);
        
        if idx >= self.cells.len() {
            return false;
        }
        
        if self.cells[idx].is_revealed || self.cells[idx].is_flagged {
            return false;
        }
        
        // Place mines on first click
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
        
        // Clicked cell has 0 adjacent mines
        if self.cells[idx].adjacent_mines == 0 {
            self.reveal_adjacent_zero_cells(coords);
        }
        
        // Check win condition
        if self.total_revealed == self.dimensions.iter().product::<usize>() - self.mines {
            self.game_won = true;
        }
        
        true
    }

    // adjacent zero cells reveal
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
    
    // Reset the board to initial state
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
    
    // Helper method for backward compatibility (2D)
    pub fn new_2d(width: usize, height: usize, mines: usize) -> Self {
        Self::new(vec![width, height], mines)
    }
}