// algset.rs: algorithm sets bundled into the binary
use cube_core::{invert_alg, Cube};
use serde::{Deserialize, Serialize};

use crate::notation::{parse_alg, ParseError};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AlgCase {
    pub id: String,
    #[serde(default)]
    pub group: String,
    pub alg: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AlgSet {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    pub cases: Vec<AlgCase>,
}

const BUILTIN: &[&str] = &[include_str!("../data/pll.json")];

pub fn builtin_sets() -> Vec<AlgSet> {
    BUILTIN
        .iter()
        .map(|s| serde_json::from_str(s).expect("bundled alg set must be valid JSON"))
        .collect()
}

impl AlgCase {
    /// Cube state the learner has to solve: inverse of the alg applied to solved.
    pub fn setup_state(&self) -> Result<Cube, ParseError> {
        let moves = parse_alg(&self.alg)?;
        let mut c = Cube::identity();
        for m in invert_alg(&moves) {
            c.apply_move(m);
        }
        Ok(c)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use cube_core::Move;

    fn apply(alg: &str) -> Cube {
        let mut c = Cube::identity();
        for m in parse_alg(alg).unwrap() {
            c.apply_move(m);
        }
        c
    }

    /// (corners displaced, edges displaced) in the U layer
    fn displaced(c: &Cube) -> (usize, usize) {
        let co = (0..4).filter(|&i| c.corner_perm[i] != i as u8).count();
        let eo = (0..4).filter(|&i| c.edge_perm[i] != i as u8).count();
        (co, eo)
    }

    fn expected(id: &str) -> (usize, usize) {
        match id {
            "Aa" | "Ab" => (3, 0),
            "E" => (4, 0),
            "Ua" | "Ub" => (0, 3),
            "H" | "Z" => (0, 4),
            "Ga" | "Gb" | "Gc" | "Gd" => (3, 3),
            _ => (2, 2),
        }
    }

    #[test]
    fn pll_algs_are_valid() {
        let set = &builtin_sets()[0];
        assert_eq!(set.cases.len(), 21);
        for case in &set.cases {
            let mut c = apply(&case.alg);
            // only the U layer may change
            for i in 4..8 {
                assert_eq!(c.corner_perm[i], i as u8, "{}: D corner moved", case.id);
                assert_eq!(c.corner_ori[i], 0, "{}: D corner twisted", case.id);
            }
            for i in 4..12 {
                assert_eq!(c.edge_perm[i], i as u8, "{}: edge {} moved", case.id, i);
                assert_eq!(c.edge_ori[i], 0, "{}: edge flipped", case.id);
            }
            // PLL: orientation untouched
            assert_eq!(&c.corner_ori[..4], &[0; 4], "{}: twisted", case.id);
            assert_eq!(&c.edge_ori[..4], &[0; 4], "{}: flipped", case.id);
            // permutation class matches the case name (allowing an AUF)
            let mut ok = false;
            for _ in 0..4 {
                ok |= displaced(&c) == expected(&case.id);
                c.apply_move(Move::U);
            }
            assert!(ok, "{}: wrong permutation class", case.id);
            assert!(case.setup_state().is_ok());
        }
    }
}
