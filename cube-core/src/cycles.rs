// cycles.rs: 3-cycle などの cycle 分解
// 未解読

use crate::Cube;

pub fn corner_cycles(cube: &Cube) -> Vec<Vec<u8>> {
    let perm = &cube.corner_perm;
    let n = perm.len();
    let mut visited = vec![false; n];
    let mut cycles = Vec::new();

    for i in 0..n {
        if !visited[i] && perm[i] as usize != i {
            let mut cycle = Vec::new();
            let mut j = i;
            while !visited[j] {
                visited[j] = true;
                cycle.push(j as u8);
                j = perm[j] as usize;
            }
            if cycle.len() > 1 {
                cycles.push(cycle);
            }
        }
    }
    cycles
}

// edge 用も同じように書ける
pub fn edge_cycles(cube: &Cube) -> Vec<Vec<u8>> {
    let perm = &cube.edge_perm;
    let n = perm.len();
    let mut visited = vec![false; n];
    let mut cycles = Vec::new();

    for i in 0..n {
        if !visited[i] && perm[i] as usize != i {
            let mut cycle = Vec::new();
            let mut j = i;
            while !visited[j] {
                visited[j] = true;
                cycle.push(j as u8);
                j = perm[j] as usize;
            }
            if cycle.len() > 1 {
                cycles.push(cycle);
            }
        }
    }
    cycles
}
