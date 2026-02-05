use serde::{Serialize, Deserialize};
use rand::seq::SliceRandom;
use rand::thread_rng;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Cell {
    pub is_mine: bool,
    pub is_revealed: bool,
    pub is_flagged: bool,
    pub adjacent_mines: u8,
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
    pub total_guesses: usize,
}

impl Board {
    pub fn new(dimensions: Vec<usize>, mines: usize) -> Self {
        let total_cells = dimensions.iter().product();

        let mut cells = Vec::with_capacity(total_cells);
        let all_coords = Self::generate_all_indices(&dimensions);
        for coords in all_coords {
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
            total_guesses: 0,
        }
    }

    // count guesses
    pub fn record_guess(&mut self) {
        self.total_guesses += 1;
    }

    fn generate_all_indices(dimensions: &[usize]) -> Vec<Vec<usize>> {
        let total_cells = dimensions.iter().product();
        let mut result = Vec::with_capacity(total_cells);
        let mut current = vec![0; dimensions.len()];

        fn recurse(dim_idx: usize, dims: &[usize], curr: &mut Vec<usize>, res: &mut Vec<Vec<usize>>) {
            if dim_idx == dims.len() {
                res.push(curr.clone());
                return;
            }
            for i in 0..dims[dim_idx] {
                curr[dim_idx] = i;
                recurse(dim_idx + 1, dims, curr, res);
            }
        }

        recurse(0, dimensions, &mut current, &mut result);
        result
    }

    // [수정] 정방향 인덱싱: x0 + x1*D0 + x2*D0*D1 ...
    pub fn coords_to_index(&self, coords: &[usize]) -> usize {
        let mut index = 0;
        let mut multiplier = 1;
        for i in 0..coords.len() {
            index += coords[i] * multiplier;
            multiplier *= self.dimensions[i];
        }
        index
    }

    // [수정] coords_to_index와 완벽히 대칭되는 정방향 계산
    pub fn index_to_coords(&self, index: usize) -> Vec<usize> {
        let mut coords = vec![0; self.dimensions.len()];
        let mut remaining = index;
        for i in 0..self.dimensions.len() {
            coords[i] = remaining % self.dimensions[i];
            remaining /= self.dimensions[i];
        }
        coords
    }

    pub fn place_mines_after_first_click(&mut self, first_coords: &[usize]) {
        let total_cells = self.cells.len();
        let candidate_indices: Vec<usize> = (0..total_cells).collect(); // removed mutable because it needs to be reused

        // [수정] 3x3x3x3에서 지뢰가 1개인 경우, 주변 1칸을 모두 비우면 설치할 곳이 없습니다.
        // 이 경우 "안전 지대"의 크기를 최소화하여 에러를 방지합니다.
        let first_idx = self.coords_to_index(first_coords);
        
        // 1순위: 첫 클릭 칸과 그 주변 칸들을 제외 시도
        let mut filtered_indices: Vec<usize> = candidate_indices.iter()
            .cloned()
            .filter(|&idx| {
                let coords = self.index_to_coords(idx);
                !self.are_neighbors(&coords, first_coords) && idx != first_idx
            })
            .collect();

        // 2순위: 만약 1순위 결과가 지뢰 개수보다 적다면, 첫 클릭 칸만 제외
        if filtered_indices.len() < self.mines {
            filtered_indices = candidate_indices.iter()
                .cloned()
                .filter(|&idx| idx != first_idx)
                .collect();
        }

        let mut rng = thread_rng();
        filtered_indices.shuffle(&mut rng);

        for &idx in filtered_indices.iter().take(self.mines) {
            self.cells[idx].is_mine = true;
        }
        self.calculate_adjacent_mines();
    }

    fn are_neighbors(&self, coords1: &[usize], coords2: &[usize]) -> bool {
        let mut max_diff = 0;
        for i in 0..coords1.len() {
            let diff = (coords1[i] as isize - coords2[i] as isize).abs();
            if diff > max_diff { max_diff = diff; }
        }
        max_diff == 1 // Chebyshev distance 1
    }

    pub fn calculate_adjacent_mines(&mut self) {
        for i in 0..self.cells.len() {
            if !self.cells[i].is_mine {
                let coords = self.index_to_coords(i);
                let neighbors = self.generate_neighbors(&coords);
                let count = neighbors.iter()
                    .filter(|n_coords| self.cells[self.coords_to_index(n_coords)].is_mine)
                    .count();
                self.cells[i].adjacent_mines = count as u8;
            }
        }
    }

    pub fn generate_neighbors(&self, coords: &[usize]) -> Vec<Vec<usize>> {
        let mut neighbors = Vec::new();
        let mut current_offset = vec![0isize; coords.len()];

        fn generate_recursive(
            dim: usize, 
            coords: &[usize], 
            dims: &[usize], 
            offset: &mut Vec<isize>, 
            res: &mut Vec<Vec<usize>>
        ) {
            if dim == coords.len() {
                if offset.iter().all(|&x| x == 0) { return; }
                let mut neighbor = Vec::with_capacity(dim);
                for i in 0..dim {
                    let val = coords[i] as isize + offset[i];
                    if val < 0 || val >= dims[i] as isize { return; }
                    neighbor.push(val as usize);
                }
                res.push(neighbor);
                return;
            }
            for d in -1..=1 {
                offset[dim] = d;
                generate_recursive(dim + 1, coords, dims, offset, res);
            }
        }

        generate_recursive(0, coords, &self.dimensions, &mut current_offset, &mut neighbors);
        neighbors
    }

    pub fn reveal_cell(&mut self, coords: &[usize]) -> bool {
        let idx = self.coords_to_index(coords);
        if self.cells[idx].is_revealed || self.cells[idx].is_flagged { return false; }

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

        let total_safe = self.cells.len() - self.mines;
        if self.total_revealed == total_safe {
            self.game_won = true;
        }
        true
    }

    fn reveal_adjacent_zero_cells(&mut self, coords: &[usize]) {
        let mut queue = std::collections::VecDeque::new();
        queue.push_back(coords.to_vec());

        while let Some(curr) = queue.pop_front() {
            for neighbor in self.generate_neighbors(&curr) {
                let n_idx = self.coords_to_index(&neighbor);
                let cell = &mut self.cells[n_idx];
                if !cell.is_revealed && !cell.is_mine && !cell.is_flagged {
                    cell.is_revealed = true;
                    self.total_revealed += 1;
                    if cell.adjacent_mines == 0 {
                        queue.push_back(neighbor);
                    }
                }
            }
        }
    }

    pub fn toggle_flag(&mut self, coords: &[usize]) {
        let idx = self.coords_to_index(coords);
        if !self.cells[idx].is_revealed {
            self.cells[idx].is_flagged = !self.cells[idx].is_flagged;
        }
    }

    // [추가] lib.rs에서 참조하는 헬퍼 메서드
    pub fn get_dimensions(&self) -> &Vec<usize> {
        &self.dimensions
    }

    // [추가] 2D 호환성을 위한 헬퍼 (필요한 경우)
    pub fn width(&self) -> usize {
        self.dimensions.get(0).copied().unwrap_or(0)
    }

    pub fn height(&self) -> usize {
        self.dimensions.get(1).copied().unwrap_or(0)
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
}