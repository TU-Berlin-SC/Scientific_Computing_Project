/**
* Minesweeper Board Module
* This module defines the Board and Cell structures for the Minesweeper game,
* along with methods to initialize the board, place mines, reveal cells, and manage game state.
*/

use serde::{Serialize, Deserialize};
use rand::seq::SliceRandom;
use rand::thread_rng;
use std::hash::Hash;

#[derive(Serialize, Deserialize, Copy, Clone, Debug, PartialEq, Eq, Hash)]
pub enum Face { Front, Back, Left, Right, Top, Bottom }

impl Face {
    pub const ALL: [Face; 6] = [
        Face::Front, Face::Back, Face::Left, Face::Right, Face::Top, Face::Bottom
    ];
    #[inline] pub fn idx(self) -> usize {
        match self {
            Face::Front => 0, Face::Back => 1, Face::Left => 2,
            Face::Right => 3, Face::Top => 4, Face::Bottom => 5,
        }
    }
}

// Cell struct
#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Cell {
    pub is_mine: bool,
    pub is_revealed: bool,
    pub is_flagged: bool,
    pub adjacent_mines: u8,
    pub face: Face,
    pub u: usize,
    pub v: usize,
}

#[inline]
pub fn index(n: usize, face: Face, u: usize, v: usize) -> usize {
    face.idx() * n * n + v * n + u
}

// Board struct
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Board {
    pub n: usize,          // width == height per face
    pub mines: usize,
    pub cells: Vec<Cell>,
    pub game_over: bool,
    pub game_won: bool,
    pub total_revealed: usize,
    pub total_clicks: usize,
}

impl Board {
    pub fn new(n: usize, mines: usize) -> Self {
        let total_cells = 6 * n * n;
        if mines >= total_cells { panic!("Too many mines for cube surface!"); }

        let mut cells = Vec::with_capacity(total_cells);
        for face in Face::ALL {
            for v in 0..n {
                for u in 0..n {
                    cells.push(Cell {
                        is_mine: false,
                        is_revealed: false,
                        is_flagged: false,
                        adjacent_mines: 0,
                        face, u, v,
                    });
                }
            }
        }

        Self {
            n, mines, cells,
            game_over: false,
            game_won: false,
            total_revealed: 0,
            total_clicks: 0,
        }
    }

    fn neighbor(&self, face: Face, u: usize, v: usize, du: i32, dv: i32) -> (Face, usize, usize) {
        let b = basis(face);
        let mut p = cell_center_to_pos(self.n, face, u, v);

        // one cell step size in surface coords:
        // centers are spaced by 2/n across [-1,1]
        let step = 2.0 / (self.n as f32);

        // move along the surface directions of the current face
        p = add(p, mul(b.u, step * du as f32));
        p = add(p, mul(b.v, step * dv as f32));

        // reproject to a face cell
        pos_to_face_and_uv(self.n, p)
    }

    pub fn neighbors8(&self, face: Face, u: usize, v: usize) -> Vec<(Face, usize, usize)> {
        let mut out = Vec::with_capacity(8);
        for dv in -1..=1 {
            for du in -1..=1 {
                if du == 0 && dv == 0 { continue; }
                out.push(self.neighbor(face, u, v, du, dv));
            }
        }
        out
    }

    /// Place mines after the first click, excluding:
    /// - the clicked cell (face,u,v)
    /// - its 8 neighbors on the cube surface (wraps across edges)
    pub fn place_mines_after_first_click(&mut self, face: Face, u: usize, v: usize) {
        let n = self.n;
        let total_cells = 6 * n * n;

        // Safety: clear any previous mines (in case this is reused/reset incorrectly)
        for c in &mut self.cells {
            c.is_mine = false;
        }

        // Collect forbidden indices: clicked cell + 8 neighbors on cube surface
        let mut forbidden = Vec::with_capacity(9);
        forbidden.push(index(n, face, u, v));

        for (nf, nu, nv) in self.neighbors8(face, u, v) {
            forbidden.push(index(n, nf, nu, nv));
        }

        // remove duplicated cells
        forbidden.sort_unstable();
        forbidden.dedup();

        // Build a list of allowed indices
        let mut candidates: Vec<usize> = (0..total_cells).collect();
        candidates.retain(|idx| forbidden.binary_search(idx).is_err());

        // Make sure we still have enough room to place mines
        if self.mines > candidates.len() {
            panic!(
                "Too many mines: requested {}, but only {} cells available after excluding safe zone",
                self.mines,
                candidates.len()
            );
        }

        // Shuffle and place mines
        let mut rng = thread_rng();
        candidates.shuffle(&mut rng);

        for &idx in candidates.iter().take(self.mines) {
            self.cells[idx].is_mine = true;
        }

        // Now compute numbers
        self.calculate_adjacent_mines();
    }

    pub(crate) fn calculate_adjacent_mines(&mut self) {
        let n = self.n;

        for face in Face::ALL {
            for v in 0..n {
                for u in 0..n {
                    let idx = index(n, face, u, v);
                    if self.cells[idx].is_mine { continue; }

                    let mut count = 0u8;
                    for (nf, nu, nv) in self.neighbors8(face, u, v) {
                        let nidx = index(n, nf, nu, nv);
                        if self.cells[nidx].is_mine {
                            count += 1;
                        }
                    }
                    self.cells[idx].adjacent_mines = count;
                }
            }
        }
    }

    // Cell reveal
    pub fn reveal_cell(&mut self, face: Face, u: usize, v: usize) -> bool {
        if u >= self.n || v >= self.n {
            return false;
        }
        
        let idx = index(self.n, face, u, v);
        
        if idx >= self.cells.len() {
            return false;
        }
        
        if self.cells[idx].is_revealed || self.cells[idx].is_flagged {
            return false;
        }
        
        // Place mines on first click
        if self.total_clicks == 0 {
            self.place_mines_after_first_click(face, u, v);
        }
        
        self.total_clicks += 1;
        self.cells[idx].is_revealed = true;
        
        if self.cells[idx].is_mine {
            self.game_over = true;
            return true;
        }
        
        self.total_revealed += 1;
        
        // Clicked cell has 0 adjacent mines
        if self.cells[idx].adjacent_mines == 0 {
            self.reveal_adjacent_zero_cells(face, u, v);
        }
        
        // Check win condition
        if self.total_revealed == self.n * self.n * 6 - self.mines {
            self.game_won = true;
        }
        
        true
    }

    // adjacent zero cells reveal
    fn reveal_adjacent_zero_cells(&mut self, face: Face, u: usize, v: usize) {
        let n = self.n;
        let total = 6 * n * n;

        let mut stack: Vec<(Face, usize, usize)> = vec![(face, u, v)];
        let mut visited = vec![false; total];

        let start_idx = index(n, face, u, v);
        visited[start_idx] = true;

        while let Some((cf, cu, cv)) = stack.pop() {
            // Walk the 8 neighbors on the cube surface (wraps across edges)
            for (nf, nu, nv) in self.neighbors8(cf, cu, cv) {
                let nidx = index(n, nf, nu, nv);

                if visited[nidx] {
                    continue;
                }

                // Mark visited early to avoid re-adding the same cell many times
                visited[nidx] = true;

                // Skip mines / already revealed / flagged
                if self.cells[nidx].is_revealed || self.cells[nidx].is_flagged || self.cells[nidx].is_mine {
                    continue;
                }

                // Reveal it
                self.cells[nidx].is_revealed = true;
                self.total_revealed += 1;

                // Flood-fill continues only through zeros
                if self.cells[nidx].adjacent_mines == 0 {
                    stack.push((nf, nu, nv));
                }
            }
        }
    }

    pub fn toggle_flag(&mut self, face: Face, u: usize, v: usize) {
        let idx = index(self.n, face, u, v);
        if idx < self.cells.len() && !self.cells[idx].is_revealed {
            self.cells[idx].is_flagged = !self.cells[idx].is_flagged;
        }
    }
    
    // Reset the board to initial state
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
        // 지뢰는 첫 클릭 시 배치됨 (Mine placement is done on first click - according to the minesweeper rules)
    }
}

// ####################################
// define change of basis for each face
// ####################################

// global coord. system (x,y,z):
// 1st coord: x (rightward)
// 2nd coord: y (downward)
// 3rd coord: z (outward)
// (the coord. system is left-handed because it's common in screen grids)

// local coord. system (n,u,v)
#[derive(Copy, Clone, Debug)]
struct Basis {
    n: [f32; 3], // outward (normal) wrt each face
    u: [f32; 3], // rightward wrt each face
    v: [f32; 3], // downward wrt each face
}

// global coord. system (x,y,z) -> local coord. system (n,u,v) (for each face)
fn basis(face: Face) -> Basis {
    match face {
        Face::Front  => Basis{ n:[ 0., 0., 1.], u:[ 1., 0., 0.], v:[ 0., 1., 0.] },
        Face::Back   => Basis{ n:[ 0., 0.,-1.], u:[-1., 0., 0.], v:[ 0., 1., 0.] },
        Face::Right  => Basis{ n:[ 1., 0., 0.], u:[ 0., 0.,-1.], v:[ 0., 1., 0.] },
        Face::Left   => Basis{ n:[-1., 0., 0.], u:[ 0., 0., 1.], v:[ 0., 1., 0.] },
        Face::Top    => Basis{ n:[ 0.,-1., 0.], u:[ 1., 0., 0.], v:[ 0., 0.,-1.] },
        Face::Bottom => Basis{ n:[ 0., 1., 0.], u:[ 1., 0., 0.], v:[ 0., 0., 1.] },
    }
}

#[inline]
fn dot(a: [f32; 3], b: [f32; 3]) -> f32 { a[0]*b[0] + a[1]*b[1] + a[2]*b[2] }

#[inline]
fn add(a: [f32; 3], b: [f32; 3]) -> [f32; 3] { [a[0]+b[0], a[1]+b[1], a[2]+b[2]] }

#[inline]
fn mul(a: [f32; 3], s: f32) -> [f32; 3] { [a[0]*s, a[1]*s, a[2]*s] }

fn cell_center_to_pos(n: usize, face: Face, u: usize, v: usize) -> [f32; 3] {
    let b = basis(face);

    // center coordinates in [-1, 1]
    let s = ((2.0 * (u as f32) + 1.0) / (n as f32)) - 1.0;
    let t = ((2.0 * (v as f32) + 1.0) / (n as f32)) - 1.0;

    // point on the surface of the unit cube
    // pos = normal*1 + u_axis*s + v_axis*t
    add(add(b.n, mul(b.u, s)), mul(b.v, t))
}

fn pos_to_face_and_uv(n: usize, p: [f32; 3]) -> (Face, usize, usize) {
    let ax = p[0].abs();
    let ay = p[1].abs();
    let az = p[2].abs();

    let face = if ax >= ay && ax >= az {
        if p[0] >= 0.0 { Face::Right } else { Face::Left }
    } else if ay >= ax && ay >= az {
        if p[1] >= 0.0 { Face::Bottom } else { Face::Top }
    } else {
        if p[2] >= 0.0 { Face::Front } else { Face::Back }
    };

    let b = basis(face);
    // s,t are coordinates in [-1,1] on that face
    let mut s = dot(p, b.u);
    let mut t = dot(p, b.v);

    // clamp just in case of tiny floating errors
    s = s.clamp(-1.0, 1.0);
    t = t.clamp(-1.0, 1.0);

    // convert back to u,v (cell center bins)
    let fu = ((s + 1.0) * 0.5 * (n as f32)).floor().clamp(0.0, (n-1) as f32) as usize;
    let fv = ((t + 1.0) * 0.5 * (n as f32)).floor().clamp(0.0, (n-1) as f32) as usize;

    (face, fu, fv)
}

