// src/algorithms/macros.rs
#[macro_export]
macro_rules! register_algorithms {
    ($($name:ident => $type_name:expr, $struct_type:path),* $(,)?) => {
        pub enum AlgorithmType {
            $($name,)*
        }
        
        pub struct AlgorithmFactory;
        
        impl AlgorithmFactory {
            pub fn create_agent(
                algo_type: WasmAlgorithmType,
                objective: TspObjective,
                width: usize,
                height: usize,
                mines: usize,
            ) -> MinesweeperAgent {
                // this Box handles the dynamic dispatch for algorithms 
                // returning the new SolverResult struct
                let solver: Box<dyn Algorithm> = match algo_type {
                    $(WasmAlgorithmType::$name => Box::new(<$struct_type>::new(width, height, mines)),)*
                };

                MinesweeperAgent {
                    solver,
                    objective,
                    first_move: true,
                }
            }
        }
        
        #[wasm_bindgen]
        #[derive(Copy, Clone, Debug, PartialEq, Eq)]
        pub enum WasmAlgorithmType {
            $($name,)*
        }
        
        impl WasmAlgorithmType {
            pub fn as_str(&self) -> &'static str {
                match self {
                    $(WasmAlgorithmType::$name => $type_name,)*
                }
            }
            
            pub fn all() -> Vec<Self> {
                vec![$(WasmAlgorithmType::$name,)*]
            }
        }
    };
}