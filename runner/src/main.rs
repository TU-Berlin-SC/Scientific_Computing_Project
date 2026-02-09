/** 
* [PLEASE NOTE] I seperated benchmarking and metaheuristic testing into a separate runner crate 
* to avoid error with frontend and to keep the engine focused on core logic and algorithms.
* This test codes cannot be used with frontend, because of the scip and wasm dependencies, 
* and since its main purpose is to test the metaheuristic algorithm, i decided to put it in a separate crate.
**/
use engine::algorithms::{WasmAlgorithmType, TspObjective};
use engine::Simulator;
use std::time::Instant;
use serde::{Serialize, Deserialize};

mod benchmark;
use benchmark::metaheuristic::MetaHeuristicRunner;
fn main() {
    let runner = MetaHeuristicRunner::new(30); // change iteration/configuration number here

    println!("configurations: 4 board sizes x 5 algorithms x 3 tsp objectives");
    
    // run the simulation matrix
    let results = runner.run_benchmarks();
    
    // convert results to csv 
    let csv_output = MetaHeuristicRunner::to_csv(&results);
    
    // print to console or write to a file
    println!("\n--- benchmark results ---\n");
    println!("{}", csv_output);
    
    let wins = results.iter().filter(|r| r.win).count();
    let win_rate = (wins as f64 / results.len() as f64) * 100.0;
    println!("--- summary ---");
    println!("total games played: {}", results.len());
    println!("overall win rate: {:.2}%", win_rate);
}