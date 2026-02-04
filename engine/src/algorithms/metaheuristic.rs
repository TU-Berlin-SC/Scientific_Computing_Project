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
    pub seed: u64, // added for benchmark consistency
}

pub struct MetaHeuristicRunner {
    pub iterations: usize,
    pub board_sizes: Vec<(usize, usize)>,
}

impl MetaHeuristicRunner {
    pub fn new(iterations: usize) -> Self {
        Self {
            iterations,
            board_sizes: vec![(3, 3), (5,5), (8, 8), (10,10)], // change board size here
        }
    }

    pub fn run_benchmarks(&self) -> Vec<SimulationResult> {
        let mut results = Vec::new();
        let solvers = WasmAlgorithmType::all();
        // for testing only greedy
        // let solvers = vec![WasmAlgorithmType::Greedy];
        let objectives = vec![
            TspObjective::MinDistance,
            TspObjective::MinRotation,
            TspObjective::MaxInformation,
        ];

        for &(w, h) in &self.board_sizes {
            let mines = ((w * h * 6) as f64 * 0.18) as usize; // 10% mine density

            // iterate by seed first to ensure solver parity
            // ensures that every solver plays the exact same board layout
            for i in 0..self.iterations {
                let current_seed = i as u64;

                for &solver_type in &solvers {
                    for &obj in &objectives {
                        let res = self.run_single_sim(w, h, mines, solver_type, obj, current_seed);
                        println!("Completed: {} on {}x{}x{} board (Seed: {})", solver_type.as_str(), w, h, h, current_seed);
                        results.push(res);
                    }
                }
            }
        }
        results
    }

    fn run_single_sim(&self, w: usize, h: usize, m: usize, algo: WasmAlgorithmType, obj: TspObjective, seed: u64) -> SimulationResult {
        let mut sim = Simulator::new(w, h, m, algo);
        sim.set_tsp_objective(obj);
        sim.set_seed(seed); // force deterministic mine placement for this iteration
        
        let start_time = Instant::now();
        let mut guesses = 0;
        
        while !sim.get_state_internal().game_over {
            // we check the move metadata before executing to see if it's a guess
            // this aligns with the updated solver_result logic
            if let Some(res) = sim.get_next_move_metadata() {
                if res.is_guess {
                    guesses += 1;
                }
                if !sim.run_step() { break; }
            } else {
                break;
            }
        }

        let board = sim.get_state_internal();
        SimulationResult {
            algorithm: algo.as_str().to_string(),
            objective: format!("{:?}", obj),
            board_dims: format!("{}x{}x{}", w, h, h),
            win: board.game_won,
            total_clicks: board.total_clicks,
            time_ms: start_time.elapsed().as_millis(),
            guesses_made: guesses,
            completion_rate: (board.total_revealed as f64 / (board.cells.len() - m) as f64) * 100.0,
            seed,
        }
    }

    /// converts the results into a csv string for excel/data analysis
    pub fn to_csv(results: &[SimulationResult]) -> String {
        let mut csv = String::from("algorithm,objective,dims,seed,win,clicks,time_ms,guesses,completion\n");
        for r in results {
            csv.push_str(&format!("{},{},{},{},{},{},{},{},{:.2}\n", 
                r.algorithm, r.objective, r.board_dims, r.seed, r.win, r.total_clicks, r.time_ms, r.guesses_made, r.completion_rate));
        }
        csv
    }
}