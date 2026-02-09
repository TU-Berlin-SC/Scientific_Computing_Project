/**
 * Minesweeper Board Module (3D Cube Version)
 * This module defines the Board and Cell structures for the 6-faced Minesweeper cube.
 */
use serde::{Serialize, Deserialize};
use rand::{thread_rng, SeedableRng}; 
use rand::rngs::StdRng; 
use rand::seq::SliceRandom;
use std::collections::VecDeque; 

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Cell {
    pub is_mine: bool,
    pub is_revealed: bool,
    pub is_flagged: bool,
    pub adjacent_mines: u8,
    /// 3D Cube: [face, y, x], ND: [d1, d2, ...]
    pub coordinates: Vec<usize>, 
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Board {
    pub dimensions: Vec<usize>, 
    pub mines: usize,
    pub cells: Vec<Cell>,
    pub game_over: bool,
    pub game_won: bool,
    pub total_revealed: usize,
    pub total_clicks: usize,
    pub last_click_idx: usize,         
    pub adjacency_map: Vec<Vec<usize>>,
    pub seed: Option<u64>, 
}

impl Board {
    pub fn new(dims: Vec<usize>, mines: usize, adjacency_map: Vec<Vec<usize>>) -> Self {
        let total_cells = adjacency_map.len(); 
        
        if mines >= total_cells {
            panic!("Too many mines for board size!");
        }
        
        let mut cells = Vec::with_capacity(total_cells);
        let is_3d_cube = dims.len() == 3 && dims[0] == 6;
        let face_size = if is_3d_cube { dims[1] * dims[2] } else { 0 };

        for i in 0..total_cells {
            let mut coords = Vec::new();
            if is_3d_cube {
                let face = i / face_size;
                let rem = i % face_size;
                coords = vec![face, rem / dims[2], rem % dims[2]];
            } else {
                let mut temp_idx = i;
                for &d in dims.iter().rev() {
                    coords.push(temp_idx % d);
                    temp_idx /= d;
                }
                coords.reverse();
            }

            cells.push(Cell {
                is_mine: false,
                is_revealed: false,
                is_flagged: false,
                adjacent_mines: 0,
                coordinates: coords,
            });
        }

        Board {
            dimensions: dims,
            mines,
            cells,
            game_over: false,
            game_won: false,
            total_revealed: 0,
            total_clicks: 0,
            last_click_idx: 0,
            adjacency_map,
            seed: None,
        }
    }

    pub fn place_mines_after_first_click(&mut self, first_idx: usize) {
        let mut indices: Vec<usize> = (0..self.cells.len()).collect();
        indices.retain(|&idx| idx != first_idx && !self.adjacency_map[first_idx].contains(&idx));
        
        if let Some(s) = self.seed {
            let mut rng = StdRng::seed_from_u64(s);
            indices.shuffle(&mut rng);
        } else {
            let mut rng = thread_rng();
            indices.shuffle(&mut rng);
        }

        for &idx in indices.iter().take(self.mines) {
            self.cells[idx].is_mine = true;
        }

        for i in 0..self.cells.len() {
            if !self.cells[i].is_mine {
                let count = self.adjacency_map[i].iter()
                    .filter(|&&n| self.cells[n].is_mine)
                    .count();
                self.cells[i].adjacent_mines = count as u8;
            }
        }
    }

    pub fn reveal_cell(&mut self, idx: usize) {
        if self.game_over || self.cells[idx].is_revealed || self.cells[idx].is_flagged {
            return;
        }
        if self.total_clicks == 0 {
            self.place_mines_after_first_click(idx);
        }
        self.last_click_idx = idx;
        self.total_clicks += 1;
        if self.cells[idx].is_mine {
            self.game_over = true;
            return;
        }
        self.flood_fill(idx);
        if self.total_revealed == self.cells.len() - self.mines {
            self.game_over = true;
            self.game_won = true;
        }
    }

    fn flood_fill(&mut self, start_idx: usize) {
        let mut stack = vec![start_idx];
        if !self.cells[start_idx].is_revealed {
            self.cells[start_idx].is_revealed = true;
            self.total_revealed += 1;
        }
        if self.cells[start_idx].adjacent_mines > 0 { return; }
        while let Some(curr_idx) = stack.pop() {
            for &n_idx in &self.adjacency_map[curr_idx] {
                if !self.cells[n_idx].is_revealed && !self.cells[n_idx].is_mine && !self.cells[n_idx].is_flagged {
                    self.cells[n_idx].is_revealed = true;
                    self.total_revealed += 1;
                    if self.cells[n_idx].adjacent_mines == 0 {
                        stack.push(n_idx);
                    }
                }
            }
        }
    }

    pub fn toggle_flag(&mut self, idx: usize) {
        if idx < self.cells.len() && !self.cells[idx].is_revealed {
            self.cells[idx].is_flagged = !self.cells[idx].is_flagged;
        }
    }

    pub fn reset(&mut self) {
        for cell in &mut self.cells {
            cell.is_mine = false; cell.is_revealed = false; cell.is_flagged = false; cell.adjacent_mines = 0;
        }
        self.game_over = false; 
        self.game_won = false;
        self.total_revealed = 0;
        self.total_clicks = 0;
        // mine placement is done on first click
    }

    /// Clculates distances to all cells from start_idx using BFS
    pub fn get_distance_map(&self, start_idx: usize) -> Vec<usize> {
        let mut distances = vec![usize::MAX; self.cells.len()];
        let mut queue = VecDeque::new();

        if start_idx < self.cells.len() {
            distances[start_idx] = 0;
            queue.push_back(start_idx);
        }

        while let Some(current) = queue.pop_front() {
            let current_dist = distances[current];

            for &neighbor in &self.adjacency_map[current] {
                if distances[neighbor] == usize::MAX {
                    distances[neighbor] = current_dist + 1;
                    queue.push_back(neighbor);
                }
            }
        }
        distances
    }

    pub fn get_hidden_neighbor_count(&self, idx: usize) -> usize {
        self.adjacency_map[idx].iter()
            .filter(|&&n| !self.cells[n].is_revealed && !self.cells[n].is_flagged)
            .count()
    }
    /// for meta-heuristic purposes,thats calling from runner
    pub fn get_width(&self) -> usize {
        *self.dimensions.last().unwrap_or(&0)
    }

    pub fn get_height(&self) -> usize {
        if self.dimensions.len() >= 2 {
            self.dimensions[self.dimensions.len() - 2]
        } else {
            // 1D 보드일 경우 높이를 1로 간주
            1
        }
    }
}