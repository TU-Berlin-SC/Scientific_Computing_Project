use crate::board::Board;
use crate::algorithms::Algorithm;

pub struct GreedySolver {
    pub dimensions: Vec<usize>,
    pub mines: usize,
    pub first_move: bool,
}

impl GreedySolver {
    pub fn new(dimensions: Vec<usize>, mines: usize) -> Self {
        Self { dimensions, mines, first_move: true }
    }

    // 특정 칸이 지뢰일 확률을 더 정교하게 계산
    fn calculate_cell_risk(&self, board: &Board, coords: &[usize]) -> f64 {
        let mut combined_prob = 0.0;
        let mut info_sources = 0;

        for neighbor in board.generate_neighbors(coords) {
            let n_idx = board.coords_to_index(&neighbor);
            let n_cell = &board.cells[n_idx];

            if n_cell.is_revealed && n_cell.adjacent_mines > 0 {
                let mut hidden_count = 0;
                let mut flag_count = 0;
                
                for nn in board.generate_neighbors(&neighbor) {
                    let nn_idx = board.coords_to_index(&nn);
                    if board.cells[nn_idx].is_flagged { flag_count += 1; }
                    else if !board.cells[nn_idx].is_revealed { hidden_count += 1; }
                }

                if hidden_count > 0 {
                    let remaining_mines = (n_cell.adjacent_mines as i32 - flag_count as i32).max(0);
                    combined_prob += remaining_mines as f64 / hidden_count as f64;
                    info_sources += 1;
                }
            }
        }

        if info_sources == 0 {
            // 주변에 열린 숫자가 없는 경우: 전역 확률 적용
            let total_hidden = board.cells.iter().filter(|c| !c.is_revealed && !c.is_flagged).count();
            let flagged = board.cells.iter().filter(|c| c.is_flagged).count();
            let remaining_total = (self.mines as i32 - flagged as i32).max(0);
            
            if total_hidden == 0 { 1.0 } else { remaining_total as f64 / total_hidden as f64 }
        } else {
            // 여러 숫자 칸에서 오는 확률의 평균치 사용
            combined_prob / info_sources as f64
        }
    }
}

impl Algorithm for GreedySolver {
    fn next_move(&mut self, board: &mut Board) -> Option<Vec<usize>> { // &mut 추가
        // 1. 첫 수: 정중앙 클릭 (4D에서도 중앙이 정보를 가장 많이 얻음)
        if board.total_clicks == 0 {
            return Some(self.dimensions.iter().map(|&d| d / 2).collect());
        }

        // 2. 확정 안전 칸 찾기 (리스크 0인 칸)
        for i in 0..board.cells.len() {
            let cell = &board.cells[i];
            if cell.is_revealed && cell.adjacent_mines > 0 {
                let coords = board.index_to_coords(i);
                let mut flags = 0;
                let mut hidden = Vec::new();

                for neighbor in board.generate_neighbors(&coords) {
                    let n_idx = board.coords_to_index(&neighbor);
                    if board.cells[n_idx].is_flagged { flags += 1; }
                    else if !board.cells[n_idx].is_revealed { hidden.push(neighbor); }
                }

                // 주변 지뢰를 다 찾았다면, 남은 닫힌 칸은 모두 안전!
                if flags == cell.adjacent_mines as usize && !hidden.is_empty() {
                    return Some(hidden[0].clone());
                }
            }
        }

        // 3. 확정 지뢰 플래그 꼽기 (Greedy의 약점 보완)
        // 지뢰찾기 로직상 '다음 클릭'을 반환해야 하므로, 
        // 여기서 직접 보드에 플래그를 꼽을 수 없다면 가장 안전한 칸을 계산하러 가야 합니다.
        // (참고: 플래그가 없으면 확률 계산이 정확해지지 않으므로, 
        // 사실상 이 그리디는 '확실한 안전 칸'이 없을 때만 아래 확률 계산을 수행합니다.)
        board.record_guess(); // [add data]

        let mut best_move = None;
        let mut min_risk = 1.1;

        for i in 0..board.cells.len() {
            if !board.cells[i].is_revealed && !board.cells[i].is_flagged {
                let coords = board.index_to_coords(i);
                let risk = self.calculate_cell_risk(board, &coords);
                
                // 미세한 랜덤값을 더해 같은 확률일 때 교착상태 방지
                if risk < min_risk {
                    min_risk = risk;
                    best_move = Some(coords);
                }
            }
        }
        best_move
    }
}