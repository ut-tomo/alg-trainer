// state.rs: Cube 構造体・基本操作

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Cube {
    pub corner_perm: [u8; 8], //角パーツの位置
    pub corner_ori: [u8; 8],  //向き
    pub edge_perm: [u8; 12],
    pub edge_ori: [u8; 12],
}

impl Cube {
    //完成状態を返す
    pub fn identity() -> Self {
        Cube {
            corner_perm: [0, 1, 2, 3, 4, 5, 6, 7],
            corner_ori: [0; 8], //0, 1, 2の3値で角のねじれ表現
            edge_perm: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            edge_ori: [0; 12], //0,1の2値で辺の反転表現
        }
    }

    //センターキューブは動かさないのでこれでOK
    pub fn is_solved(&self) -> bool {
        self.corner_perm == [0, 1, 2, 3, 4, 5, 6, 7]
            && self.corner_ori == [0; 8]
            && self.edge_perm == [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
            && self.edge_ori == [0; 12]
    }

    pub fn corner_parity(&self) -> u8 {
        parity(&self.corner_perm)
    }

    pub fn edge_parity(&self) -> u8 {
        parity(&self.edge_perm)
    }

    // 辺の置換の偶奇と, 角の置換の偶奇は必ず一致する
    // 角のねじれ総和 mod 3 == 0
    // 辺の反転総和 mod 2 == 0
    pub fn is_legal(&self) -> bool {
        self.corner_parity() == self.edge_parity()
            && self.corner_ori.iter().copied().sum::<u8>() % 3 == 0
            && self.edge_ori.iter().copied().sum::<u8>() % 2 == 0
    }
}

// 置換をサイクル分解して、そのサイクル長から逆順数の偶奇を求める
// 長さ len のサイクルは、「len-1 回の交換（transposition）」で表せる。
// すべてのサイクルについて len - 1 を足し合わせると、置換を生成するために必要な交換回数 inv が得られる（実際には「最小の」交換回数）。
// 交換回数 inv が偶数なら偶置換、奇数なら奇置換。
fn parity(perm: &[u8]) -> u8 {
    let n = perm.len();
    let mut visited = vec![false; n];
    let mut inv = 0;

    for i in 0..n {
        if !visited[i] {
            let mut len = 0;
            let mut j = i;
            while !visited[j] {
                visited[j] = true;
                j = perm[j] as usize;
                len += 1;
            }
            if len > 1 {
                inv += len - 1;
            }
        }
    }

    (inv % 2) as u8
}

// Corner indices (0..7):
// 0: UFL, 1: UFR, 2: UBR, 3: UBL,
// 4: DFL, 5: DFR, 6: DBR, 7: DBL

// Edge indices (0..11):
// 0: UF, 1: UR, 2: UB, 3: UL,
// 4: FL, 5: FR, 6: BR, 7: BL,
// 8: DF, 9: DR, 10: DB, 11: DL
