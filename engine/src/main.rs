use engine::algorithms::metaheuristic::MetaHeuristicRunner;

fn main() {
    // initialize the runner with 100 iterations per configuration
    let runner = MetaHeuristicRunner::new(30); // change batch simulation number here
    
    println!("starting 3d cube benchmarks...");
    println!("configurations: 2 board sizes x 3 algorithms x 3 tsp objectives");
    
    // run the simulation matrix
    let results = runner.run_benchmarks();
    
    // convert results to csv format for data analysis
    let csv_output = MetaHeuristicRunner::to_csv(&results);
    
    // print to console (you can also write this to a file)
    println!("\n--- benchmark results ---\n");
    println!("{}", csv_output);
    
    // basic summary statistics
    let wins = results.iter().filter(|r| r.win).count();
    let win_rate = (wins as f64 / results.len() as f64) * 100.0;
    println!("--- summary ---");
    println!("total games played: {}", results.len());
    println!("overall win rate: {:.2}%", win_rate);
}