If you want to add new algorithm :

```rs
// directly export the type in mod.rs
pub use greedy::GreedyAlgorithm;
pub use exact_solver::ExactSolver;
₩₩₩
```

Also for frontend,add to simulation.ts, algorithmselector.ts
