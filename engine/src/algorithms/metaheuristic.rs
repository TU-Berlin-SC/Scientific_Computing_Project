// src/algorithms/metaheuristic.rs
use crate::algorithms::{WasmAlgorithmType, TspObjective};
use crate::Simulator; 
use std::time::Instant;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SimulationResult {
    pub algorithm: String,
    pub objective: String,
    pub board_dims: String,
    pub win: bool,
    pub total_clicks: usize,
    pub time_ms: u128,
    pub guesses_made: usize,
    pub completion_rate: f64,
}

pub struct MetaHeuristicRunner {
    pub iterations: usize,
    pub board_sizes: Vec<(usize, usize)>,
}

impl MetaHeuristicRunner {
    pub fn new(iterations: usize) -> Self {
        Self {
            iterations,
            board_sizes: vec![(3, 3), (8, 8)], // Change board size here
        }
    }

    /// runs the massive test suite and returns results
    pub fn run_benchmarks(&self) -> Vec<SimulationResult> {
        let mut results = Vec::new();
        let solvers = WasmAlgorithmType::all();
        // for testing only greedy was used
        // let solvers = vec![WasmAlgorithmType::Greedy];
        let objectives = vec![
            TspObjective::MinDistance,
            TspObjective::MinRotation,
            TspObjective::MaxInformation,
        ];

        for &(w, h) in &self.board_sizes {
            let mines = ((w * h * 6) as f64 * 0.20) as usize; // 20% density

            for &solver_type in &solvers {
                for &obj in &objectives {
                    for _ in 0..self.iterations {
                        let res = self.run_single_sim(w, h, mines, solver_type, obj);
                        println!("Completed: {} on {}x{} board", solver_type.as_str(), w, h);
                        results.push(res);
                    }
                }
            }
        }
        results
    }

    fn run_single_sim(&self, w: usize, h: usize, m: usize, algo: WasmAlgorithmType, obj: TspObjective) -> SimulationResult {
        let mut sim = Simulator::new(w, h, m, algo);
        sim.set_tsp_objective(obj);
        
        let start_time = Instant::now();
        let mut guesses = 0;
        
        while !sim.get_state_internal().game_over {
            // if logic engine finds nothing, it counts as a guess
            if !sim.can_deduce_safely() {
                guesses += 1;
            }
            if !sim.run_step() { break; }
        }

        let board = sim.get_state_internal();
        SimulationResult {
            algorithm: algo.as_str().to_string(),
            objective: format!("{:?}", obj),
            board_dims: format!("{}x{}", w, h),
            win: board.game_won,
            total_clicks: board.total_clicks,
            time_ms: start_time.elapsed().as_millis(),
            guesses_made: guesses,
            completion_rate: (board.total_revealed as f64 / (board.cells.len() - m) as f64) * 100.0,
        }
    }

    /// converts the results into a csv string for excel/data analysis
    pub fn to_csv(results: &[SimulationResult]) -> String {
        let mut csv = String::from("algorithm,objective,dims,win,clicks,time_ms,guesses,completion\n");
        for r in results {
            csv.push_str(&format!("{},{},{},{},{},{},{},{:.2}\n", 
                r.algorithm, r.objective, r.board_dims, r.win, r.total_clicks, r.time_ms, r.guesses_made, r.completion_rate));
        }
        csv
    }
}