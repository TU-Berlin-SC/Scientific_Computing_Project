use crate::board::Board;
use crate::algorithms::Algorithm;
use std::collections::{HashSet, HashMap, BTreeSet};

pub struct SATSolver {
    pub dimensions: Vec<usize>,
    pub mines: usize,
    pub first_move: bool,
    known_mines: HashSet<Vec<usize>>, 
}

#[derive(Clone, Debug, PartialEq, Eq, Hash)]
struct Constraint {
    hidden_cells: BTreeSet<Vec<usize>>,
    num_mines: usize,
}

impl SATSolver {
    pub fn new(dimensions: Vec<usize>, mines: usize) -> Self {
        Self { 
            dimensions, 
            mines, 
            first_move: true,
            known_mines: HashSet::new(),
        }
    }

    fn get_frontier_constraints(&self, board: &Board) -> Vec<Constraint> {
        let mut constraints = Vec::new();
        for i in 0..board.cells.len() {
            let cell = &board.cells[i];
            if cell.is_revealed && cell.adjacent_mines > 0 {
                let coords = board.index_to_coords(i);
                let mut hidden = BTreeSet::new();
                let mut known_flags_around = 0;

                for neighbor in board.generate_neighbors(&coords) {
                    let n_idx = board.coords_to_index(&neighbor);
                    let n_cell = &board.cells[n_idx];
                    
                    if n_cell.is_flagged || self.known_mines.contains(&neighbor) {
                        known_flags_around += 1;
                    } else if !n_cell.is_revealed {
                        hidden.insert(neighbor);
                    }
                }

                if !hidden.is_empty() {
                    constraints.push(Constraint {
                        hidden_cells: hidden,
                        num_mines: (cell.adjacent_mines as usize).saturating_sub(known_flags_around),
                    });
                }
            }
        }
        constraints
    }

    // [최적화] 차원에 따라 연산 강도를 조절하는 적응형 로직
    fn reduce_constraints_adaptive(&self, constraints: &mut Vec<Constraint>) {
        let mut changed = true;
        let mut iterations = 0;
        
        // 2D 이하면 15회, 고차원이면 5회로 반복 제한
        let max_iter = if self.dimensions.len() <= 2 { 15 } else { 5 };
        let max_new_per_iter = if self.dimensions.len() <= 2 { 200 } else { 50 };

        while changed && iterations < max_iter {
            changed = false;
            let mut new_constraints = Vec::new();
            
            // 작은 제약조건부터 검사하여 부분집합 발견 확률 극대화
            constraints.sort_by_key(|c| c.hidden_cells.len());

            for i in 0..constraints.len() {
                for j in (i + 1)..constraints.len() {
                    let a = &constraints[i];
                    let b = &constraints[j];

                    // Subset Reduction: A ⊂ B 이면 (B - A) 제약조건 생성
                    if a.hidden_cells.is_subset(&b.hidden_cells) {
                        let diff_cells: BTreeSet<_> = b.hidden_cells.difference(&a.hidden_cells).cloned().collect();
                        let diff_mines = b.num_mines.saturating_sub(a.num_mines);
                        let new_c = Constraint { hidden_cells: diff_cells, num_mines: diff_mines };
                        
                        if !new_c.hidden_cells.is_empty() && !constraints.contains(&new_c) {
                            new_constraints.push(new_c);
                            changed = true;
                        }
                    }
                }
                if new_constraints.len() > max_new_per_iter { break; }
            }
            
            constraints.extend(new_constraints);
            constraints.dedup();
            iterations += 1;
        }
    }

    fn make_educated_guess(&self, board: &Board, constraints: &[Constraint]) -> Option<Vec<usize>> {
        let mut cell_probs: HashMap<Vec<usize>, f64> = HashMap::new();
        for c in constraints {
            let prob = c.num_mines as f64 / c.hidden_cells.len() as f64;
            for cell in &c.hidden_cells {
                let entry = cell_probs.entry(cell.clone()).or_insert(0.0);
                if prob > *entry { *entry = prob; }
            }
        }

        let mut best_cell = None;
        let mut min_prob = 1.1;

        for (cell, prob) in cell_probs {
            if prob < min_prob {
                min_prob = prob;
                best_cell = Some(cell);
            }
        }

        best_cell.or_else(|| {
            // 정보가 없는 영역에서 아무 곳이나 선택 (Global fallback)
            for i in 0..board.cells.len() {
                let coords = board.index_to_coords(i);
                if !board.cells[i].is_revealed && !board.cells[i].is_flagged && !self.known_mines.contains(&coords) {
                    return Some(coords);
                }
            }
            None
        })
    }

    fn check_global_victory(&self, board: &Board) -> Option<Vec<usize>> {
        let current_flags = board.cells.iter().filter(|c| c.is_flagged).count() + self.known_mines.len();
        if current_flags >= self.mines {
            for i in 0..board.cells.len() {
                if !board.cells[i].is_revealed && !board.cells[i].is_flagged {
                    let coords = board.index_to_coords(i);
                    if !self.known_mines.contains(&coords) {
                        return Some(coords);
                    }
                }
            }
        }
        None
    }
}

impl Algorithm for SATSolver {
    fn next_move(&mut self, board: &Board) -> Option<Vec<usize>> {
        if board.total_clicks == 0 {
            return Some(self.dimensions.iter().map(|&d| d / 2).collect());
        }

        if let Some(safe_move) = self.check_global_victory(board) {
            return Some(safe_move);
        }

        let mut constraints = self.get_frontier_constraints(board);
        
        // 차원에 따른 제약 조건 개수 제한 (2D: 1000개, 4D: 100개)
        let limit = if self.dimensions.len() <= 2 { 1000 } else { 100 };
        if constraints.len() > limit {
            constraints.sort_by_key(|c| c.hidden_cells.len());
            constraints.truncate(limit);
        }

        self.reduce_constraints_adaptive(&mut constraints);

        // 1. 확정 안전 셀 (Mines == 0)
        for c in &constraints {
            if c.num_mines == 0 {
                for safe_cell in &c.hidden_cells {
                    let idx = board.coords_to_index(safe_cell);
                    if !board.cells[idx].is_revealed && !board.cells[idx].is_flagged {
                        return Some(safe_cell.clone());
                    }
                }
            }
        }

        // 2. 확정 지뢰 암기 (Mines == Cells)
        for c in &constraints {
            if c.num_mines == c.hidden_cells.len() {
                for mine_cell in &c.hidden_cells {
                    self.known_mines.insert(mine_cell.clone());
                }
            }
        }

        // 3. 최선의 찍기
        self.make_educated_guess(board, &constraints)
    }
}