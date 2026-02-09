/** 
* [PLEASE NOTE] MetaHeuristicRunner: A benchmarking tool for evaluating various metaheuristic algorithms on the 3D Minesweeper problem.
* I have moved this file from engine to runner crate to avoid wasm and scip dependencies in the engine, 
* and to keep the engine focused on core logic and algorithms.
**/
use engine::algorithms::{WasmAlgorithmType, TspObjective};
use engine::Simulator; 
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
    pub seed: u64, 
}

pub struct MetaHeuristicRunner {
    pub iterations: usize,
    pub board_sizes: Vec<(usize, usize)>,
}

impl MetaHeuristicRunner {
    pub fn new(iterations: usize) -> Self {
        Self {
            iterations,
            board_sizes: vec![(3, 3), (5,5), (8, 8), (10,10)],
        }
    }

    pub fn run_benchmarks(&self) -> Vec<SimulationResult> {
        let mut results = Vec::new();
        let solvers = WasmAlgorithmType::all();
        let objectives = vec![
            TspObjective::MinDistance,
            TspObjective::MinRotation,
            TspObjective::MaxInformation,
        ];

        for &(w, h) in &self.board_sizes {
            let total_cells = w * h * 6; // 6 faces for the cube
            let mut mines = (total_cells as f64 * 0.15) as usize;
            
            if mines == 0 && total_cells > 1 {
                mines = 1;
            }

            for i in 0..self.iterations {
                let current_seed = i as u64;

                for &solver_type in &solvers {
                    for &obj in &objectives {
                        let res = self.run_single_sim(w, h, mines, solver_type, obj, current_seed);
                        println!("Completed: {} on {}x{}x6 board (Seed: {})", solver_type.as_str(), w, h, current_seed);
                        results.push(res);
                    }
                }
            }
        }
        results
    }

    fn run_single_sim(&self, w: usize, h: usize, m: usize, algo: WasmAlgorithmType, obj: TspObjective, seed: u64) -> SimulationResult {
        // FIX 1: Use separate w, h arguments as defined in lib.rs
        // let mut sim = Simulator::new(w, h, m, algo);
        let mut sim = Simulator::new(vec![6, h, w], m, algo);
        sim.set_tsp_objective(obj);
        sim.set_seed(seed);
        
        let start_time = Instant::now();
        let mut guesses = 0;
        
        while !sim.get_state_internal().game_over {
            // FIX 2: Use get_next_move_metadata to track guesses
            if let Some(res) = sim.get_next_move_metadata() {
                if res.is_guess {
                    guesses += 1;
                }
                if !sim.run_step() { break; } 
            } else {
                break;
            }
        }

        let board_state = sim.get_state_internal();
        
        // FIX 3: Match fields in BoardState (total_cells instead of clicks/cells.len())
        SimulationResult {
            algorithm: algo.as_str().to_string(),
            objective: format!("{:?}", obj),
            board_dims: format!("{}x{}", h, w),
            win: board_state.game_won,
            // total_clicks: sim.steps, // We track clicks via simulator steps
            total_clicks: sim.get_steps(), // <--- Use the getter here
            time_ms: start_time.elapsed().as_millis(),
            guesses_made: guesses,
            completion_rate: (board_state.total_revealed as f64 / (board_state.total_cells - m) as f64) * 100.0,
            seed,
        }
    }

    pub fn to_csv(results: &[SimulationResult]) -> String {
        let mut csv = String::from("algorithm,objective,dims,seed,win,clicks,time_ms,guesses,completion\n");
        for r in results {
            csv.push_str(&format!("{},{},{},{},{},{},{},{},{:.2}\n", 
                r.algorithm, r.objective, r.board_dims, r.seed, r.win, r.total_clicks, r.time_ms, r.guesses_made, r.completion_rate));
        }
        csv
    }
}