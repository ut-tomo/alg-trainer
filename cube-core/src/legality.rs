// legality.rs: parity & legality checker
// 未解読
use crate::Cube;

fn permutation_parity(perm: &[u8]) -> i32 {
    let n = perm.len();
    let mut visited = vec![false; n];
    let mut sign = 1;

    for i in 0..n {
        if !visited[i] {
            let mut len = 0;
            let mut j = i;
            while !visited[j] {
                visited[j] = true;
                j = perm[j] as usize;
                len += 1;
            }
            if len > 0 && (len % 2 == 0) {
                sign = -sign;
            }
        }
    }
    sign
}

pub struct LegalityInfo {
    pub corner_parity: i32,
    pub edge_parity: i32,
    pub edge_flip_sum_mod2: u8,
    pub corner_twist_sum_mod3: u8,
    pub is_legal: bool,
}

impl Cube {
    pub fn legality(&self) -> LegalityInfo {
        let cp = permutation_parity(&self.corner_perm);
        let ep = permutation_parity(&self.edge_perm);

        let edge_flip_sum: u8 = self.edge_ori.iter().copied().sum::<u8>() % 2;
        let corner_twist_sum: u8 = self.corner_ori.iter().copied().sum::<u8>() % 3;

        let is_legal = cp == ep && edge_flip_sum == 0 && corner_twist_sum == 0;

        LegalityInfo {
            corner_parity: cp,
            edge_parity: ep,
            edge_flip_sum_mod2: edge_flip_sum,
            corner_twist_sum_mod3: corner_twist_sum,
            is_legal,
        }
    }
}
