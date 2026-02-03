// src/algorithms/tsp_optimizer.rs
use crate::board::Board;
use crate::algorithms::TSPObjective;
use std::collections::{HashMap, HashSet};
use std::f64::consts::PI;

pub struct TSPOptimizer {
    objective: TSPObjective,
    current_position: Vec<usize>,
    current_orientation: Vec<f64>, // N차원에서의 방향 벡터
    visited_faces: HashSet<Vec<usize>>, // 방문한 면 정보
}

impl TSPOptimizer {
    pub fn new(objective: TSPObjective, start_position: Vec<usize>) -> Self {
        let dimension = start_position.len();
        Self {
            objective,
            current_position: start_position.clone(),
            current_orientation: vec![1.0; dimension], // 기본 방향
            visited_faces: HashSet::new(),
        }
    }
    
    // 안전한 셀 목록에서 최적의 셀 선택
    pub fn select_optimal_cell(
        &mut self,
        safe_cells: &[Vec<usize>],
        board: &Board,
    ) -> Option<Vec<usize>> {
        if safe_cells.is_empty() {
            return None;
        }
        
        match self.objective {
            TSPObjective::MinSurfaceDistance => 
                self.min_surface_distance(safe_cells, board),
            TSPObjective::MinRotation => 
                self.min_rotation(safe_cells, board),
            TSPObjective::MaxInformation => 
                self.max_information(safe_cells, board),
        }
    }
    
    // 1. 최소 표면 거리 (지구 측지 효율성)
    fn min_surface_distance(
        &self,
        safe_cells: &[Vec<usize>],
        board: &Board,
    ) -> Option<Vec<usize>> {
        let mut best_cell = None;
        let mut best_distance = f64::MAX;
        
        for cell in safe_cells {
            let distance = self.surface_distance(&self.current_position, cell, board);
            if distance < best_distance {
                best_distance = distance;
                best_cell = Some(cell.clone());
            }
        }
        
        best_cell
    }
    
    // N차원 표면 거리 계산 (지구 측지 거리)
    fn surface_distance(
        &self,
        from: &[usize],
        to: &[usize],
        board: &Board,
    ) -> f64 {
        let dimension = board.dimensions.len();
        let mut distance = 0.0;
        
        for i in 0..dimension {
            let diff = to[i].abs_diff(from[i]) as f64;
            let max_dim = board.dimensions[i] as f64;
            
            // 순환 거리 고려 (큐브의 반대편이 가까울 수 있음)
            let direct_distance = diff;
            let wrap_distance = max_dim - diff;
            let min_distance = direct_distance.min(wrap_distance);
            
            // 차원별 가중치 추가 (더 높은 차원일수록 영향력 감소)
            let weight = 1.0 / (i as f64 + 1.0);
            distance += min_distance * weight;
        }
        
        distance
    }
    
    // 2. 최소 회전 (기계적 효율성)
    fn min_rotation(
        &mut self,
        safe_cells: &[Vec<usize>],
        board: &Board,
    ) -> Option<Vec<usize>> {
        let current_face = self.get_current_face(board);
        let mut cells_on_same_face = Vec::new();
        let mut cells_other_faces = Vec::new();
        
        // 현재 면과 같은 면에 있는 셀들 분류
        for cell in safe_cells {
            let face = self.get_cell_face(cell, board);
            if face == current_face {
                cells_on_same_face.push(cell.clone());
            } else {
                cells_other_faces.push(cell.clone());
            }
        }
        
        // 같은 면에 있는 셀이 있으면 먼저 처리
        if !cells_on_same_face.is_empty() {
            // 같은 면 내에서는 최소 맨해튼 거리
            let mut best_cell = None;
            let mut best_distance = usize::MAX;
            
            for cell in cells_on_same_face {
                let distance = self.manhattan_distance(&self.current_position, &cell);
                if distance < best_distance {
                    best_distance = distance;
                    best_cell = Some(cell);
                }
            }
            return best_cell;
        }
        
        // 다른 면으로 이동해야 하는 경우
        if !cells_other_faces.is_empty() {
            // 가장 적은 회전이 필요한 면 선택
            let mut best_cell = None;
            let mut min_rotation_cost = f64::MAX;
            
            for cell in cells_other_faces {
                let rotation_cost = self.calculate_rotation_cost(&cell, board);
                if rotation_cost < min_rotation_cost {
                    min_rotation_cost = rotation_cost;
                    best_cell = Some(cell);
                }
            }
            
            if let Some(cell) = &best_cell {
                self.visited_faces.insert(self.get_cell_face(cell, board));
            }
            
            return best_cell;
        }
        
        None
    }
    
    // 셀이 속한 면 식별 (N차원 큐브)
    fn get_cell_face(&self, cell: &[usize], board: &Board) -> Vec<usize> {
        let mut face = Vec::new();
        for (i, &coord) in cell.iter().enumerate() {
            // 좌표가 경계에 있으면 해당 차원의 면 정보 저장
            if coord == 0 || coord == board.dimensions[i] - 1 {
                face.push(i); // 차원 인덱스
                face.push(if coord == 0 { 0 } else { 1 }); // 방향 (0: 시작면, 1: 끝면)
            }
        }
        face
    }
    
    fn get_current_face(&self, board: &Board) -> Vec<usize> {
        self.get_cell_face(&self.current_position, board)
    }
    
    // 회전 비용 계산
    fn calculate_rotation_cost(&self, target: &[usize], board: &Board) -> f64 {
        let current_face = self.get_current_face(board);
        let target_face = self.get_cell_face(target, board);
        
        // 다른 면의 수 계산
        let mut different_faces = 0;
        let mut i = 0;
        while i < current_face.len() && i < target_face.len() {
            if current_face[i] != target_face[i] {
                different_faces += 1;
            }
            i += 1;
        }
        
        // 회전 각도 추정 (라디안)
        (different_faces as f64) * PI / 4.0
    }
    
    // 3. 최대 정보 (휴리스틱 효율성)
    fn max_information(
        &self,
        safe_cells: &[Vec<usize>],
        board: &Board,
    ) -> Option<Vec<usize>> {
        let mut best_cell = None;
        let mut max_info_gain = -1.0;
        
        for cell in safe_cells {
            let info_gain = self.information_gain(cell, board);
            if info_gain > max_info_gain {
                max_info_gain = info_gain;
                best_cell = Some(cell.clone());
            }
        }
        
        best_cell
    }
    
    // 정보 획득량 계산
    fn information_gain(&self, cell: &[usize], board: &Board) -> f64 {
        let idx = board.coords_to_index(cell);
        if idx >= board.cells.len() {
            return 0.0;
        }
        
        // 1. 숨겨진 이웃의 수
        let mut hidden_neighbors = 0;
        let neighbors = board.generate_neighbors(cell);
        
        for neighbor_coords in neighbors {
            let nidx = board.coords_to_index(&neighbor_coords);
            if nidx < board.cells.len() && 
               !board.cells[nidx].is_revealed && 
               !board.cells[nidx].is_flagged {
                hidden_neighbors += 1;
            }
        }
        
        // 2. 제약 조건에 기여하는 정도
        let mut constraint_contribution = 0;
        for neighbor_coords in neighbors {
            let nidx = board.coords_to_index(&neighbor_coords);
            if nidx < board.cells.len() && 
               board.cells[nidx].is_revealed &&
               board.cells[nidx].adjacent_mines > 0 {
                constraint_contribution += 1;
            }
        }
        
        // 3. 엔트로피 기반 가중치
        let total_hidden: usize = board.cells.iter()
            .filter(|c| !c.is_revealed && !c.is_flagged)
            .count();
        
        let probability = if total_hidden > 0 {
            hidden_neighbors as f64 / total_hidden as f64
        } else {
            0.0
        };
        
        let entropy = if probability > 0.0 && probability < 1.0 {
            -probability * probability.log2() - (1.0 - probability) * (1.0 - probability).log2()
        } else {
            0.0
        };
        
        // 종합 정보 획득 점수
        (hidden_neighbors as f64 * 1.0) + 
        (constraint_contribution as f64 * 2.0) + 
        (entropy * 3.0)
    }
    
    // 맨해튼 거리 계산
    fn manhattan_distance(&self, from: &[usize], to: &[usize]) -> usize {
        from.iter().zip(to.iter())
            .map(|(a, b)| a.abs_diff(*b))
            .sum()
    }
    
    // 위치 업데이트
    pub fn update_position(&mut self, new_position: &[usize]) {
        self.current_position = new_position.to_vec();
    }
    
    // 현재 위치 반환
    pub fn get_current_position(&self) -> &Vec<usize> {
        &self.current_position
    }
}