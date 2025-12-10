// just trying to see if wasm works with serde
// we will later expand this to a full minesweeper engine
use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use serde_wasm_bindgen::to_value;

#[derive(Serialize, Deserialize, Clone)]
pub struct BoardState {
    pub width: usize,
    pub height: usize,
    pub cells: Vec<i32>,
}

#[wasm_bindgen]
pub enum Algorithm {
    RuleBased,
    Greedy,
}

#[wasm_bindgen]
pub struct Simulator {
    width: usize,
    height: usize,
    cells: Vec<i32>,
    algorithm: Algorithm,
    step_count: usize,
}

#[wasm_bindgen]
impl Simulator {
    #[wasm_bindgen(constructor)]
    pub fn new(width: usize, height: usize, algorithm: Algorithm) -> Simulator {
        Simulator {
            width,
            height,
            cells: vec![-1; width*height],
            algorithm,
            step_count: 0,
        }
    }

    #[wasm_bindgen(js_name = getState)]
    pub fn get_state(&self) -> JsValue {
        to_value(&BoardState {
            width: self.width,
            height: self.height,
            cells: self.cells.clone(),
        }).unwrap()
    }

    #[wasm_bindgen]
    pub fn step(&mut self) -> JsValue {
        self.step_count += 1;

        if self.step_count <= self.cells.len() {
            self.cells[self.step_count - 1] = 0; // 간단한 rule-based step
        }

        self.get_state()
    }
}
