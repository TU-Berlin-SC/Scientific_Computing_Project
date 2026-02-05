use crate::board::Board;
use crate::algorithms::Algorithm;
use std::collections::HashSet;

pub struct GreedySolver {
    pub dimensions: Vec<usize>,
    pub mines: usize,
}

impl GreedySolver {
    pub fn new(dimensions: Vec<usize>, mines: usize) -> Self {
        Self { dimensions, mines }
    }

    /// 확정된 지뢰(Virtual Mines)를 기반으로 특정 칸의 위험도(지뢰 확률) 계산
    fn calculate_cell_risk(&self, board: &Board, coords: &[usize], virtual_mines: &HashSet<usize>) -> f64 {
        // warning 해결: 사용하지 않는 idx 변수 제거 또는 언더바 처리
        let _idx = board.coords_to_index(coords); 
        let mut combined_prob = 0.0;
        let mut info_sources = 0;

        for neighbor in board.generate_neighbors(coords) {
            let n_idx = board.coords_to_index(&neighbor);
            let n_cell = &board.cells[n_idx];

            if n_cell.is_revealed && n_cell.adjacent_mines > 0 {
                let mut hidden_unflagged = 0;
                let mut flagged_count = 0;
                
                for nn in board.generate_neighbors(&neighbor) {
                    let nn_idx = board.coords_to_index(&nn);
                    if board.cells[nn_idx].is_flagged || virtual_mines.contains(&nn_idx) {
                        flagged_count += 1;
                    } else if !board.cells[nn_idx].is_revealed {
                        hidden_unflagged += 1;
                    }
                }

                if hidden_unflagged > 0 {
                    let remaining_mines = (n_cell.adjacent_mines as i32 - flagged_count as i32).max(0);
                    combined_prob += remaining_mines as f64 / hidden_unflagged as f64;
                    info_sources += 1;
                }
            }
        }

        if info_sources == 0 {
            let total_cells: usize = self.dimensions.iter().product();
            let remaining_cells = total_cells.saturating_sub(board.total_revealed);
            let current_flags = board.cells.iter().filter(|c| c.is_flagged).count();
            let remaining_mines = self.mines.saturating_sub(current_flags);
            
            if remaining_cells > 0 {
                remaining_mines as f64 / remaining_cells as f64
            } else {
                1.0
            }
        } else {
            combined_prob / info_sources as f64
        }
    }
}

impl Algorithm for GreedySolver {
    fn next_move(&mut self, board: &mut Board) -> Option<Vec<usize>> {
        if board.total_clicks == 0 {
            return Some(self.dimensions.iter().map(|&d| d / 2).collect());
        }

        let mut virtual_mines = HashSet::new();
        // error[E0282] 해결: 타입을 Vec<Vec<usize>>로 명시
        let mut _safe_candidates: Vec<Vec<usize>> = Vec::new();

        // 1차 패스: 가상 플래깅
        for i in 0..board.cells.len() {
            let cell = &board.cells[i];
            if cell.is_revealed && cell.adjacent_mines > 0 {
                let coords = board.index_to_coords(i);
                let mut hidden_unflagged = Vec::new();
                let mut flagged_count = 0;

                for neighbor in board.generate_neighbors(&coords) {
                    let n_idx = board.coords_to_index(&neighbor);
                    if board.cells[n_idx].is_flagged {
                        flagged_count += 1;
                    } else if !board.cells[n_idx].is_revealed {
                        hidden_unflagged.push(n_idx);
                    }
                }

                let needed_mines = (cell.adjacent_mines as usize).saturating_sub(flagged_count);
                if !hidden_unflagged.is_empty() && hidden_unflagged.len() == needed_mines {
                    for m_idx in hidden_unflagged {
                        virtual_mines.insert(m_idx);
                    }
                }
            }
        }

        // 2차 패스: 확정 안전 칸 탐색
        for i in 0..board.cells.len() {
            let cell = &board.cells[i];
            if cell.is_revealed && cell.adjacent_mines > 0 {
                let coords = board.index_to_coords(i);
                let mut hidden_unflagged = Vec::new();
                let mut total_flagged = 0;

                for neighbor in board.generate_neighbors(&coords) {
                    let n_idx = board.coords_to_index(&neighbor);
                    if board.cells[n_idx].is_flagged || virtual_mines.contains(&n_idx) {
                        total_flagged += 1;
                    } else if !board.cells[n_idx].is_revealed {
                        hidden_unflagged.push(neighbor);
                    }
                }

                if total_flagged == cell.adjacent_mines as usize && !hidden_unflagged.is_empty() {
                    return Some(hidden_unflagged[0].clone());
                }
            }
        }

        // 확률 기반 추측
        board.record_guess();
        let mut best_move = None;
        let mut min_risk = 1.01;

        for i in 0..board.cells.len() {
            if !board.cells[i].is_revealed && !board.cells[i].is_flagged && !virtual_mines.contains(&i) {
                let coords = board.index_to_coords(i);
                let risk = self.calculate_cell_risk(board, &coords, &virtual_mines);
                
                if risk < min_risk - 1e-6 {
                    min_risk = risk;
                    best_move = Some(coords);
                }
            }
        }
        best_move
    }
}