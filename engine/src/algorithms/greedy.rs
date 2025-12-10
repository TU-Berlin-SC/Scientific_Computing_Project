use crate::board::Board;
use crate::algorithms::Algorithm;

/// GreedyAlgorithm 구조체
pub struct GreedyAlgorithm {
    width: usize,
    height: usize,
    mines: usize,
    first_move: bool,
}

impl GreedyAlgorithm {
    /// 생성자
    pub fn new(width: usize, height: usize, mines: usize) -> Self {
        Self {
            width,
            height,
            mines,
            first_move: true,
        }
    }

    /// 주변 지뢰 확률 계산
    fn calculate_mine_probability(&self, board: &Board, x: usize, y: usize) -> f64 {
        let idx = y * self.width + x;
        let cell = &board.cells[idx];
        
        // 이미 열렸거나 깃발이 꽂힌 셀은 선택하지 않음
        if cell.is_revealed || cell.is_flagged {
            return 1.0; // 무조건 피해야 할 셀
        }
        
        // 주변 셀 정보 수집
        let mut total_neighbors = 0;
        let mut revealed_neighbors = 0;
        let mut neighbor_mine_count = 0;
        let mut neighbor_flagged_count = 0;
        
        for dy in -1..=1 {
            for dx in -1..=1 {
                if dx == 0 && dy == 0 {
                    continue;
                }
                
                let nx = x as isize + dx;
                let ny = y as isize + dy;
                
                if nx >= 0 && nx < self.width as isize && ny >= 0 && ny < self.height as isize {
                    total_neighbors += 1;
                    let nidx = ny as usize * self.width + nx as usize;
                    let neighbor = &board.cells[nidx];
                    
                    if neighbor.is_revealed {
                        revealed_neighbors += 1;
                        if neighbor.adjacent_mines > 0 {
                            neighbor_mine_count += neighbor.adjacent_mines as usize;
                        }
                    }
                    
                    if neighbor.is_flagged {
                        neighbor_flagged_count += 1;
                    }
                }
            }
        }
        
        // 1. 주변에 열린 셀이 있고 숫자가 있는 경우
        if revealed_neighbors > 0 && neighbor_mine_count > 0 {
            let hidden_neighbors = total_neighbors - revealed_neighbors - neighbor_flagged_count;
            if hidden_neighbors > 0 {
                let remaining_mines = neighbor_mine_count as f64 - neighbor_flagged_count as f64;
                return remaining_mines.max(0.0) / hidden_neighbors as f64;
            }
        }
        
        // 2. 보드 전체의 기본 확률 (초기 상황용)
        let mut flag_count = 0;
        for cell in &board.cells {
            if cell.is_flagged {
                flag_count += 1;
            }
        }
        
        let remaining_cells = (self.width * self.height) - board.total_revealed;
        let remaining_mines = self.mines - flag_count;
        
        if remaining_cells > 0 {
            remaining_mines as f64 / remaining_cells as f64
        } else {
            1.0
        }
    }

    /// 안전한 셀 찾기 (그리디 방식)
    fn find_safe_cell(&self, board: &Board) -> Option<(usize, usize)> {
        // 전략 1: 확실히 안전한 셀 찾기 (패턴 매칭)
        for y in 0..self.height {
            for x in 0..self.width {
                let idx = y * self.width + x;
                let cell = &board.cells[idx];
                
                if cell.is_revealed && !cell.is_flagged && cell.adjacent_mines > 0 {
                    if let Some(safe_cell) = self.find_definitely_safe(board, x, y) {
                        return Some(safe_cell);
                    }
                }
            }
        }
        
        // 전략 2: 지뢰 확률이 가장 낮은 셀 찾기
        let mut best_cell = None;
        let mut best_probability = 1.0; // 낮을수록 좋음
        
        for y in 0..self.height {
            for x in 0..self.width {
                let idx = y * self.width + x;
                let cell = &board.cells[idx];
                
                if !cell.is_revealed && !cell.is_flagged {
                    let probability = self.calculate_mine_probability(board, x, y);
                    
                    if probability < best_probability {
                        best_probability = probability;
                        best_cell = Some((x, y));
                    }
                }
            }
        }
        
        best_cell
    }
    
    /// 확실히 안전한 셀 찾기 (숫자 패턴 분석)
    fn find_definitely_safe(&self, board: &Board, x: usize, y: usize) -> Option<(usize, usize)> {
        let idx = y * self.width + x;
        let cell = &board.cells[idx];
        if !cell.is_revealed || cell.adjacent_mines == 0 {
            return None;
        }
        
        let mine_count = cell.adjacent_mines as usize;
        let mut hidden_neighbors = Vec::new();
        let mut flagged_neighbors = 0;
        
        // 주변 셀 수집
        for dy in -1..=1 {
            for dx in -1..=1 {
                if dx == 0 && dy == 0 {
                    continue;
                }
                
                let nx = x as isize + dx;
                let ny = y as isize + dy;
                
                if nx >= 0 && nx < self.width as isize && ny >= 0 && ny < self.height as isize {
                    let nidx = ny as usize * self.width + nx as usize;
                    let neighbor = &board.cells[nidx];
                    
                    if neighbor.is_flagged {
                        flagged_neighbors += 1;
                    } else if !neighbor.is_revealed {
                        hidden_neighbors.push((nx as usize, ny as usize));
                    }
                }
            }
        }
        
        // 이미 모든 지뢰가 깃발로 표시되었다면 나머지는 안전함
        if flagged_neighbors == mine_count && !hidden_neighbors.is_empty() {
            return Some(hidden_neighbors[0]);
        }
        
        // 고급 전략: 1-1 패턴 체크
        if mine_count == 1 && hidden_neighbors.len() == 1 {
            let (hx, hy) = hidden_neighbors[0];
            
            // 이 숨겨진 셀 주변에 다른 숫자 1이 있는지 확인
            for dy in -1..=1 {
                for dx in -1..=1 {
                    if dx == 0 && dy == 0 {
                        continue;
                    }
                    
                    let nx = hx as isize + dx;
                    let ny = hy as isize + dy;
                    
                    if nx >= 0 && nx < self.width as isize && ny >= 0 && ny < self.height as isize {
                        let nidx = ny as usize * self.width + nx as usize;
                        let neighbor = &board.cells[nidx];
                        
                        if neighbor.is_revealed && neighbor.adjacent_mines == 1 && 
                           !(neighbor.x == x && neighbor.y == y) {
                            // 1-1 패턴 발견: 두 숫자 1 사이의 셀은 안전함
                            return Some((hx, hy));
                        }
                    }
                }
            }
        }
        
        None
    }
    
    /// 첫 번째 클릭 위치 결정
    fn first_click_position(&self) -> (usize, usize) {
        // 중앙에 가까운 위치를 선택 (안전 확률이 높음)
        let center_x = self.width / 2;
        let center_y = self.height / 2;
        
        // 5x5 영역 내에서 랜덤하게 선택
        use rand::Rng;
        let mut rng = rand::thread_rng();
        
        let offset_x = rng.gen_range(-2..=2) as isize;
        let offset_y = rng.gen_range(-2..=2) as isize;
        
        let x = (center_x as isize + offset_x).max(0).min(self.width as isize - 1) as usize;
        let y = (center_y as isize + offset_y).max(0).min(self.height as isize - 1) as usize;
        
        (x, y)
    }
}

/// Algorithm 트레잇 구현
impl Algorithm for GreedyAlgorithm {
    fn next_move(&mut self, board: &Board) -> Option<(usize, usize)> {
        // 첫 번째 클릭인 경우 특별 처리
        if self.first_move {
            self.first_move = false;
            return Some(self.first_click_position());
        }
        
        // 그 외의 경우 일반 그리디 알고리즘 적용
        self.find_safe_cell(board)
    }
}