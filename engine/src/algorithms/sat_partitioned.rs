use crate::board::Board;
use crate::algorithms::Algorithm;
use crate::algorithms::sat_utils::*;
use std::collections::{HashSet, VecDeque};

/// partitioned sat solver algorithm 
pub struct PartitionedSatSolver {
    _width: usize,
    _height: usize,
    mines: usize,
}

impl PartitionedSatSolver {
    pub fn new(width: usize, height: usize, mines: usize) -> Self {
        Self { _width: width, _height: height, mines }
    }
}

impl Algorithm for PartitionedSatSolver {
    fn find_candidates(&mut self, board: &Board) -> Vec<usize> {
        let mut safe_cells = Vec::new();
        let frontier = get_frontier(board);

        if frontier.is_empty() {
            return get_probabilistic_fallback(board, self._width, self._height, self.mines);
        }

        // identify independent clusters via connected components
        let clusters = self.get_connected_components(&frontier, board);

        for cluster in clusters {
            // build localized cnf for this cluster
            let mut cluster_clauses = Vec::new();
            let mut related_clues = HashSet::new();
            for &idx in &cluster {
                for &adj in &board.adjacency_map[idx] {
                    if board.cells[adj].is_revealed { related_clues.insert(adj); }
                }
            }
            for clue_idx in related_clues {
                let neighbors: Vec<usize> = board.adjacency_map[clue_idx].iter()
                    .filter(|&&n| !board.cells[n].is_revealed && !board.cells[n].is_flagged)
                    .cloned().collect();
                let flags = board.adjacency_map[clue_idx].iter().filter(|&&n| board.cells[n].is_flagged).count();
                let k = (board.cells[clue_idx].adjacent_mines as usize).saturating_sub(flags);
                if !neighbors.is_empty() { add_exactly_k_clauses(&mut cluster_clauses, &neighbors, k); }
            }

            // test each cell in the cluster
            for &idx in &cluster {
                let mut test_clauses = cluster_clauses.clone();
                test_clauses.push(Clause(vec![(idx as isize) + 1]));
                if !dpll(test_clauses, HashSet::new()) {
                    safe_cells.push(idx);
                }
            }
        }

        if safe_cells.is_empty() {
            get_probabilistic_fallback(board, self._width, self._height, self.mines)
        } else {
            safe_cells
        }
    }
}

impl PartitionedSatSolver {
    fn get_connected_components(&self, frontier: &[usize], board: &Board) -> Vec<Vec<usize>> {
        // logic is simple: use dfs to find all non revealed 
        // we can do it way more complicated but is it worth the overhead?
        let mut visited = HashSet::new();
        let mut clusters = Vec::new();
        let frontier_set: HashSet<usize> = frontier.iter().cloned().collect();

        for &start in frontier {
            if visited.contains(&start) { continue; }
            let mut cluster = Vec::new();
            let mut queue = VecDeque::from([start]);
            visited.insert(start);

            while let Some(node) = queue.pop_front() {
                cluster.push(node);
                for &clue in &board.adjacency_map[node] {
                    if board.cells[clue].is_revealed {
                        for &neighbor in &board.adjacency_map[clue] {
                            if frontier_set.contains(&neighbor) && !visited.contains(&neighbor) {
                                visited.insert(neighbor);
                                queue.push_back(neighbor);
                            }
                        }
                    }
                }
            }
            clusters.push(cluster);
        }
        clusters
    }
}