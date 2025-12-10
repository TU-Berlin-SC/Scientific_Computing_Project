// src/algorithms/macros.rs
#[macro_export]
macro_rules! register_algorithms {
    ($($name:ident => $type_name:expr, $struct_name:ident),* $(,)?) => {
        pub enum AlgorithmType {
            $($name,)*
        }
        
        pub struct AlgorithmFactory;
        
        impl AlgorithmFactory {
            pub fn create_algorithm(
                algo_type: AlgorithmType,
                width: usize,
                height: usize,
                mines: usize,
            ) -> Box<dyn Algorithm> {
                match algo_type {
                    $(AlgorithmType::$name => Box::new($struct_name::new(width, height, mines)),)*
                }
            }
        }
        
        #[wasm_bindgen]
        #[derive(Copy, Clone)]
        pub enum WasmAlgorithmType {
            $($name,)*
        }
        
        impl From<WasmAlgorithmType> for AlgorithmType {
            fn from(wasm_type: WasmAlgorithmType) -> Self {
                match wasm_type {
                    $(WasmAlgorithmType::$name => AlgorithmType::$name,)*
                }
            }
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