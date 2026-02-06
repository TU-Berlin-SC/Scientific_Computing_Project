/**
 * Minesweeper Board Module (3D Cube Version)
 * This module defines the Board and Cell structures for the 6-faced Minesweeper cube.
 */

use serde::{Serialize, Deserialize};
use rand::thread_rng;
use rand::seq::SliceRandom;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Cell {
    pub is_mine: bool,
    pub is_revealed: bool,
    pub is_flagged: bool,
    pub adjacent_mines: u8,
    pub x: usize,     // local face coordinate
    pub y: usize,     // local face coordinate
    pub face: usize   // the face of the cube - numbered 0 to 5
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Board {
    pub width: usize,
    pub height: usize,
    pub mines: usize,
    pub cells: Vec<Cell>,
    pub game_over: bool,
    pub game_won: bool,
    pub total_revealed: usize,
    pub total_clicks: usize,
    pub last_click_idx: usize,         
    pub adjacency_map: Vec<Vec<usize>> 
}

impl Board {
    pub fn new(width: usize, height: usize, mines: usize, adjacency_map: Vec<Vec<usize>>) -> Self {
        let total_cells = 6 * width * height; 
        if mines >= total_cells {
            panic!("Too many mines for board size!");
        }
        
        // intialising all the cells on all the faces
        let mut cells = Vec::with_capacity(total_cells);
        for face in 0..6 {
            for y in 0..height {
                for x in 0..width {
                    cells.push(Cell {
                        is_mine: false,
                        is_revealed: false,
                        is_flagged: false,
                        adjacent_mines: 0,
                        x,
                        y,
                        face
                    });
                }
            }
        }

        let mut board = Board {
            width,
            height,
            mines,
            cells,
            game_over: false,
            game_won: false,
            total_revealed: 0,
            total_clicks: 0,
            last_click_idx: 0,
            adjacency_map
        };

        board.place_mines();
        board
    }

    /// logic for placing mines randomly on the board
    fn place_mines(&mut self) {
        let mut rng = thread_rng();
        let mut indices: Vec<usize> = (0..self.cells.len()).collect();
        indices.shuffle(&mut rng);

        for &idx in indices.iter().take(self.mines) {
            self.cells[idx].is_mine = true;
        }

        for i in 0..self.cells.len() {
            if !self.cells[i].is_mine {
                let count = self.adjacency_map[i].iter()
                    .filter(|&&neighbor_idx| self.cells[neighbor_idx].is_mine)
                    .count();
                self.cells[i].adjacent_mines = count as u8;
            }
        }
    }

    /// function for revealing a cell, handles game over and flood fill
    pub fn reveal(&mut self, idx: usize) {
        if self.game_over || self.cells[idx].is_revealed || self.cells[idx].is_flagged {
            return;
        }

        self.last_click_idx = idx;
        self.total_clicks += 1;

        if self.cells[idx].is_mine {
            self.game_over = true;
            self.game_won = false;
            return;
        }

        self.flood_fill(idx);
        
        // --- WIN CONDITION CHECK ---
        let total_cells = self.cells.len();
        if self.total_revealed == total_cells - self.mines {
            self.game_over = true;
            self.game_won = true;
            
            // Auto-flag all mines upon winning
            for cell in &mut self.cells {
                if cell.is_mine {
                    cell.is_flagged = true;
                }
            }
        }
    }

    /// revealed cells recursively if they have 0 mines around them
    fn flood_fill(&mut self, start_idx: usize) {
        let mut stack = vec![start_idx];
        
        if !self.cells[start_idx].is_revealed {
            self.cells[start_idx].is_revealed = true;
            self.total_revealed += 1;
        }

        if self.cells[start_idx].adjacent_mines > 0 {
            return;
        }

        while let Some(curr_idx) = stack.pop() {
            for &neighbor_idx in &self.adjacency_map[curr_idx] {
                let cell = &self.cells[neighbor_idx];
                if !cell.is_revealed && !cell.is_mine && !cell.is_flagged {
                    self.cells[neighbor_idx].is_revealed = true;
                    self.total_revealed += 1;
                    if self.cells[neighbor_idx].adjacent_mines == 0 {
                        stack.push(neighbor_idx);
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
            cell.is_mine = false; 
            cell.is_revealed = false;
            cell.is_flagged = false; 
            cell.adjacent_mines = 0;
        }
        self.game_over = false; 
        self.game_won = false;
        self.total_revealed = 0;
        self.total_clicks = 0;
        self.place_mines();
    }

    pub fn get_3d_dist(&self, a: usize, b: usize) -> f64 {
        let c1 = &self.cells[a];
        let c2 = &self.cells[b];
        let dx = c1.x as f64 - c2.x as f64;
        let dy = c1.y as f64 - c2.y as f64;
        let df = (c1.face as f64 - c2.face as f64) * self.width as f64;
        (dx*dx + dy*dy + df*df).sqrt()
    }

    pub fn get_hidden_neighbor_count(&self, idx: usize) -> usize {
        self.adjacency_map[idx].iter()
            .filter(|&&n| !self.cells[n].is_revealed && !self.cells[n].is_flagged)
            .count()
    }
}