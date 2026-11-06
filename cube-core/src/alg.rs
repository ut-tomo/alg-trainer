use crate::{Cube, Move};

pub fn apply_alg(cube: &Cube, alg: &[Move]) -> Cube {
    let mut c = *cube;
    for &m in alg {
        c.apply_move(m);
    }
    c
}

impl Move {
    pub fn inverse(self) -> Move {
        use Move::*;
        match self {
            U => Up,
            Up => U,
            U2 => U2,
            D => Dp,
            Dp => D,
            D2 => D2,
            R => Rp,
            Rp => R,
            R2 => R2,
            L => Lp,
            Lp => L,
            L2 => L2,
            F => Fp,
            Fp => F,
            F2 => F2,
            B => Bp,
            Bp => B,
            B2 => B2,
        }
    }
}

pub fn invert_alg(alg: &[Move]) -> Vec<Move> {
    alg.iter().rev().map(|m| m.inverse()).collect()
}

pub fn commutator(a: &[Move], b: &[Move]) -> Vec<Move> {
    let mut res = Vec::new();
    res.extend_from_slice(a);
    res.extend_from_slice(b);
    res.extend(invert_alg(a));
    res.extend(invert_alg(b));
    res
}

pub fn conjugate(a: &[Move], b: &[Move]) -> Vec<Move> {
    let mut res = Vec::new();
    res.extend_from_slice(b);
    res.extend_from_slice(a);
    res.extend(invert_alg(b));
    res
}
