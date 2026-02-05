// src/algorithms/exact_solver.rs
use crate::board::Board;
use crate::algorithms::Algorithm;
use std::collections::{HashSet, VecDeque};

pub struct ExactSolver {
    dimensions: Vec<usize>,
    mines: usize,
    first_move: bool,
}

#[derive(Clone, Debug)]
struct Constraint {
    center: Vec<usize>,
    total_mines: usize,
    flagged: usize,
    hidden_cells: Vec<Vec<usize>>,
}

impl Constraint {
    fn remaining_mines(&self) -> usize {
        self.total_mines.saturating_sub(self.flagged)
    }
}

impl ExactSolver {
    pub fn new(dimensions: Vec<usize>, mines: usize) -> Self {
        Self { dimensions, mines, first_move: true }
    }

    fn first_click_position(&self) -> Vec<usize> {
        self.dimensions.iter().map(|&d| d / 2).collect()
    }

    fn build_constraint(&self, board: &Board, coords: &[usize]) -> Option<Constraint> {
        let idx = board.coords_to_index(coords);
        if idx >= board.cells.len() { return None; }
        let cell = &board.cells[idx];
        if !cell.is_revealed || cell.adjacent_mines == 0 { return None; }

        let mut hidden = Vec::new();
        let mut flags = 0;
        for neighbor in board.generate_neighbors(coords) {
            let nidx = board.coords_to_index(&neighbor);
            if nidx >= board.cells.len() { continue; }
            let n = &board.cells[nidx];
            if n.is_flagged { flags += 1; } 
            else if !n.is_revealed { hidden.push(neighbor); }
        }
        if hidden.is_empty() { return None; }
        Some(Constraint { center: coords.to_vec(), total_mines: cell.adjacent_mines as usize, flagged: flags, hidden_cells: hidden })
    }

    fn collect_constraints(&self, board: &Board) -> Vec<Constraint> {
        board.cells.iter().enumerate().filter_map(|(i, c)| {
            if c.is_revealed && c.adjacent_mines > 0 {
                Some(self.build_constraint(board, &board.index_to_coords(i)))
            } else { None }
        }).flatten().collect()
    }

    // 0-constraint flood fill
    fn flood_fill_safe(&self, board: &Board) -> Option<Vec<usize>> {
        let mut visited = HashSet::new();
        let mut queue = VecDeque::new();

        for idx in 0..board.cells.len() {
            let c = &board.cells[idx];
            if c.is_revealed && c.adjacent_mines == 0 {
                let coords = board.index_to_coords(idx);
                queue.push_back(coords);
            }
        }

        while let Some(cell) = queue.pop_front() {
            for neighbor in board.generate_neighbors(&cell) {
                let nidx = board.coords_to_index(&neighbor);
                if nidx >= board.cells.len() || visited.contains(&neighbor) { continue; }
                let ncell = &board.cells[nidx];
                if !ncell.is_revealed && !ncell.is_flagged {
                    return Some(neighbor); // 가장 먼저 찾은 안전셀 return
                }
                visited.insert(neighbor);
            }
        }
        None
    }

    fn make_educated_guess(&self, board: &Board) -> Option<Vec<usize>> {
        let total_hidden: Vec<_> = board.cells.iter().enumerate()
            .filter(|(_, c)| !c.is_revealed && !c.is_flagged)
            .map(|(i, _)| board.index_to_coords(i))
            .collect();

        if total_hidden.is_empty() { return None; }

        // frontier 기반 probability
        let constraints = self.collect_constraints(board);
        let mut best_cell = None;
        let mut best_prob = 1.0;

        for cell in total_hidden {
            let mut prob = 0.0;
            let mut count = 0;
            for constraint in &constraints {
                if constraint.hidden_cells.contains(&cell) {
                    prob += constraint.remaining_mines() as f64 / constraint.hidden_cells.len() as f64;
                    count += 1;
                }
            }
            if count > 0 { prob /= count as f64; } 
            else { prob = self.global_mine_probability(board); }

            if prob < best_prob {
                best_prob = prob;
                best_cell = Some(cell);
            }
        }
        best_cell
    }

    fn global_mine_probability(&self, board: &Board) -> f64 {
        let total_hidden = board.cells.iter().filter(|c| !c.is_revealed && !c.is_flagged).count();
        let flagged = board.cells.iter().filter(|c| c.is_flagged).count();
        if total_hidden == 0 { return 0.0; }
        (self.mines.saturating_sub(flagged)) as f64 / total_hidden as f64
    }
}
// src/algorithms/exact_solver.rs

impl Algorithm for ExactSolver {
    // src/algorithms/exact_solver.rs 의 next_move 수정
    fn next_move(&mut self, board: &mut Board) -> Option<Vec<usize>> { // &mut 추가
    if board.total_clicks == 0 {
        return Some(self.first_click_position());
    }

    // 1. Flood Fill로 찾은 확실히 안전한 칸 (숫자 0 주변) 먼저 처리
    if let Some(safe_coords) = self.flood_fill_safe(board) {
        return Some(safe_coords);
    }

    // 2. 제약 조건 분석 (숫자 N 주변에 이미 N개 지뢰가 플래그된 경우)
    let constraints = self.collect_constraints(board);
    for c in constraints {
        if c.remaining_mines() == 0 {
            for cell in c.hidden_cells {
                let idx = board.coords_to_index(&cell);
                if !board.cells[idx].is_revealed && !board.cells[idx].is_flagged {
                    return Some(cell);
                }
            }
        }
    }
    board.record_guess(); // [add data]
    // 3. 그래도 없으면 추측
    self.make_educated_guess(board)
}
}