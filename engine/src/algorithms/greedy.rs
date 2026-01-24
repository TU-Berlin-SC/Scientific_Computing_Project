// src/algorithms/greedy_solver.rs
use crate::board::{Board, Face, index};
use crate::algorithms::Algorithm;

pub struct GreedyAlgorithm {
    n: usize,
    mines: usize,
    first_move: bool,
}

impl GreedyAlgorithm {
    pub fn new(n: usize, mines: usize) -> Self {
        Self { n, mines, first_move: true }
    }

    /// Mine probability estimate for a hidden cell on the cube surface.
    fn calculate_mine_probability(&self, board: &Board, face: Face, u: usize, v: usize) -> f64 {
        let idx = index(board.n, face, u, v);
        let cell = &board.cells[idx];

        // already revealed or flagged -> don't pick
        if cell.is_revealed || cell.is_flagged {
            return 1.0;
        }

        // Aggregate evidence from revealed numbered neighbors around (face,u,v)
        let mut numbered_revealed_neighbors = 0usize;
        let mut inferred_remaining_mines_sum = 0f64;
        let mut inferred_hidden_sum = 0f64;

        for (nf, nu, nv) in board.neighbors8(face, u, v) {
            let nidx = index(board.n, nf, nu, nv);
            let nb = &board.cells[nidx];

            // Only revealed numbered cells provide constraints
            if nb.is_revealed && nb.adjacent_mines > 0 {
                numbered_revealed_neighbors += 1;

                let mut nb_flagged = 0usize;
                let mut nb_hidden_unflagged = 0usize;

                // Look at nb's neighborhood to estimate its remaining mine density
                for (nnf, nnu, nnv) in board.neighbors8(nf, nu, nv) {
                    let nnidx = index(board.n, nnf, nnu, nnv);
                    let nn = &board.cells[nnidx];

                    if nn.is_flagged {
                        nb_flagged += 1;
                    } else if !nn.is_revealed {
                        // hidden AND not flagged
                        nb_hidden_unflagged += 1;
                    }
                }

                let remaining = (nb.adjacent_mines as isize - nb_flagged as isize).max(0) as f64;

                if nb_hidden_unflagged > 0 {
                    inferred_remaining_mines_sum += remaining;
                    inferred_hidden_sum += nb_hidden_unflagged as f64;
                }
            }
        }

        // 1) If we have local constraint info, use it
        if numbered_revealed_neighbors > 0 && inferred_hidden_sum > 0.0 {
            return (inferred_remaining_mines_sum / inferred_hidden_sum).clamp(0.0, 1.0);
        }

        // 2) Fallback: global base probability
        let flag_count = board.cells.iter().filter(|c| c.is_flagged).count();
        let remaining_cells = (6 * self.n * self.n).saturating_sub(board.total_revealed);
        let remaining_mines = self.mines.saturating_sub(flag_count);

        if remaining_cells > 0 {
            (remaining_mines as f64 / remaining_cells as f64).clamp(0.0, 1.0)
        } else {
            1.0
        }
    }


    /// Pattern-based: if a revealed numbered cell has all its mines flagged,
    /// then its other hidden neighbors are safe -> return one.
    fn find_definitely_safe_from_number(
        &self,
        board: &Board,
        face: Face,
        u: usize,
        v: usize,
    ) -> Option<(Face, usize, usize)> {
        let idx = index(board.n, face, u, v);
        let cell = &board.cells[idx];

        if !cell.is_revealed || cell.adjacent_mines == 0 {
            return None;
        }

        let mine_count = cell.adjacent_mines as usize;
        let mut hidden_neighbors: Vec<(Face, usize, usize)> = Vec::new();
        let mut flagged_neighbors = 0usize;

        for (nf, nu, nv) in board.neighbors8(face, u, v) {
            let nidx = index(board.n, nf, nu, nv);
            let nb = &board.cells[nidx];

            if nb.is_flagged {
                flagged_neighbors += 1;
            } else if !nb.is_revealed {
                hidden_neighbors.push((nf, nu, nv));
            }
        }

        if flagged_neighbors == mine_count && !hidden_neighbors.is_empty() {
            return Some(hidden_neighbors[0]);
        }

        None
    }

    /// Pick the next move (safe if found, else minimum probability).
    fn find_safe_cell(&self, board: &Board) -> Option<(Face, usize, usize)> {
        // Strategy 1: find a guaranteed safe cell from constraints around revealed numbers
        for face in Face::ALL {
            for v in 0..self.n {
                for u in 0..self.n {
                    let idx = index(board.n, face, u, v);
                    let cell = &board.cells[idx];

                    if cell.is_revealed && !cell.is_flagged && cell.adjacent_mines > 0 {
                        if let Some(safe) = self.find_definitely_safe_from_number(board, face, u, v) {
                            return Some(safe);
                        }
                    }
                }
            }
        }

        // Strategy 2: choose the hidden cell with lowest estimated mine probability
        let mut best_cell: Option<(Face, usize, usize)> = None;
        let mut best_p = 1.0f64;

        for face in Face::ALL {
            for v in 0..self.n {
                for u in 0..self.n {
                    let idx = index(board.n, face, u, v);
                    let cell = &board.cells[idx];

                    if !cell.is_revealed && !cell.is_flagged {
                        let p = self.calculate_mine_probability(board, face, u, v);
                        if p < best_p {
                            best_p = p;
                            best_cell = Some((face, u, v));
                        }
                    }
                }
            }
        }

        best_cell
    }

    fn first_click_position(&self) -> (Face, usize, usize) {
        // same idea as 2D: click near center of a face
        // choose Front face center-ish
        let face = Face::Front;
        let center_u = self.n / 2;
        let center_v = self.n / 2;

        // small random offset in a 5x5 region
        use rand::Rng;
        let mut rng = rand::thread_rng();
        let du = rng.gen_range(-2..=2);
        let dv = rng.gen_range(-2..=2);

        let u = (center_u as isize + du).clamp(0, (self.n - 1) as isize) as usize;
        let v = (center_v as isize + dv).clamp(0, (self.n - 1) as isize) as usize;

        (face, u, v)
    }
}

impl Algorithm for GreedyAlgorithm {
    fn next_move(&mut self, board: &Board) -> Option<(Face, usize, usize)> {
        if self.first_move {
            self.first_move = false;
            return Some(self.first_click_position());
        }
        self.find_safe_cell(board)
    }
}
