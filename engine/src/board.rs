use serde::{Serialize, Deserialize};
use rand::seq::SliceRandom;
use rand::thread_rng;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Cell {
    pub is_mine: bool,
    pub is_revealed: bool,
    pub is_flagged: bool,
    pub adjacent_mines: u8,
    pub x: usize,
    pub y: usize,
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
}

impl Board {
    pub fn new(width: usize, height: usize, mines: usize) -> Self {
        let total_cells = width * height;
        if mines >= total_cells {
            panic!("Too many mines for board size!");
        }
        
        let mut cells = Vec::with_capacity(total_cells);
        
        for y in 0..height {
            for x in 0..width {
                cells.push(Cell {
                    is_mine: false,  // 처음에는 지뢰 없음
                    is_revealed: false,
                    is_flagged: false,
                    adjacent_mines: 0,
                    x,
                    y,
                });
            }
        }
        
        Board {
            width,
            height,
            mines,
            cells,
            game_over: false,
            game_won: false,
            total_revealed: 0,
            total_clicks: 0,
        }
        // place_mines를 호출하지 않음!
    }
    
    // 첫 번째 클릭 후 지뢰 배치
    pub fn place_mines_after_first_click(&mut self, first_x: usize, first_y: usize) {
        let total_cells = self.width * self.height;
        let mut indices: Vec<usize> = (0..total_cells).collect();
        
        // 첫 번째 클릭 위치 제외
        let first_idx = first_y * self.width + first_x;
        indices.retain(|&idx| idx != first_idx);
        
        // 첫 번째 클릭 주변 8칸도 제외 (실제 Windows 지뢰찾기처럼)
        indices.retain(|&idx| {
            let x = idx % self.width;
            let y = idx / self.width;
            (x as isize - first_x as isize).abs() > 1 || (y as isize - first_y as isize).abs() > 1
        });
        
        let mut rng = thread_rng();
        indices.shuffle(&mut rng);
        
        // 지뢰 배치
        for &idx in indices.iter().take(self.mines) {
            self.cells[idx].is_mine = true;
        }
        
        // 인접 지뢰 수 계산
        self.calculate_adjacent_mines();
    }
    
    // 인접 지뢰 수 계산
    pub(crate) fn calculate_adjacent_mines(&mut self) {
        for y in 0..self.height {
            for x in 0..self.width {
                let idx = y * self.width + x;
                if !self.cells[idx].is_mine {
                    let mut count = 0;
                    
                    for dy in -1..=1 {
                        for dx in -1..=1 {
                            if dx == 0 && dy == 0 {
                                continue;
                            }
                            
                            let nx = x as isize + dx;
                            let ny = y as isize + dy;
                            
                            if nx >= 0 && nx < self.width as isize && ny >= 0 && ny < self.height as isize {
                                let nidx = ny as usize * self.width + nx as usize;
                                if self.cells[nidx].is_mine {
                                    count += 1;
                                }
                            }
                        }
                    }
                    
                    self.cells[idx].adjacent_mines = count;
                }
            }
        }
    }
    
    // 셀 열기
    pub fn reveal_cell(&mut self, x: usize, y: usize) -> bool {
        let idx = y * self.width + x;
        
        if idx >= self.cells.len() {
            return false;
        }
        
        if self.cells[idx].is_revealed || self.cells[idx].is_flagged {
            return false;
        }
        
        // 첫 번째 클릭이면 지뢰 배치
        if self.total_clicks == 0 {
            self.place_mines_after_first_click(x, y);
        }
        
        self.total_clicks += 1;
        self.cells[idx].is_revealed = true;
        
        if self.cells[idx].is_mine {
            self.game_over = true;
            return true;
        }
        
        self.total_revealed += 1;
        
        // 0인 셀 자동으로 열기
        if self.cells[idx].adjacent_mines == 0 {
            self.reveal_adjacent_zero_cells(x, y);
        }
        
        // 승리 조건 체크
        if self.total_revealed == self.width * self.height - self.mines {
            self.game_won = true;
        }
        
        true
    }
    
    fn reveal_adjacent_zero_cells(&mut self, x: usize, y: usize) {
        let mut stack = vec![(x, y)];
        let mut visited = vec![false; self.width * self.height];
        visited[y * self.width + x] = true;
        
        while let Some((cx, cy)) = stack.pop() {
            for dy in -1..=1 {
                for dx in -1..=1 {
                    if dx == 0 && dy == 0 {
                        continue;
                    }
                    
                    let nx = cx as isize + dx;
                    let ny = cy as isize + dy;
                    
                    if nx >= 0 && nx < self.width as isize && ny >= 0 && ny < self.height as isize {
                        let nx_usize = nx as usize;
                        let ny_usize = ny as usize;
                        let nidx = ny_usize * self.width + nx_usize;
                        
                        if nidx >= self.cells.len() {
                            continue;
                        }
                        
                        if !visited[nidx] && !self.cells[nidx].is_revealed && !self.cells[nidx].is_mine && !self.cells[nidx].is_flagged {
                            self.cells[nidx].is_revealed = true;
                            self.total_revealed += 1;
                            visited[nidx] = true;
                            
                            if self.cells[nidx].adjacent_mines == 0 {
                                stack.push((nx_usize, ny_usize));
                            }
                        }
                    }
                }
            }
        }
    }
    
    pub fn toggle_flag(&mut self, x: usize, y: usize) {
        let idx = y * self.width + x;
        if idx < self.cells.len() && !self.cells[idx].is_revealed {
            self.cells[idx].is_flagged = !self.cells[idx].is_flagged;
        }
    }
    
    // 게임 상태 초기화 (재시작용)
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
        // 지뢰는 첫 클릭 시 배치됨
    }
}