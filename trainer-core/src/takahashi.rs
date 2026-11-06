// takahashi.rs: layer-by-layer (New Takahashi style) stage detection and
// "suggest next operation" search over human-sized operations.
//
// The cube model has no rotations, so the first layer is the D face and the
// learner's "front" is chosen explicitly (F, R, B or L). Every operation is
// written relative to front = F and mapped to physical faces by y-rotation.
use cube_core::{Cube, Move};
use serde::Serialize;

use crate::notation::{format_alg, parse_alg};

pub const FRONTS: [&str; 4] = ["F", "R", "B", "L"];

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub enum Stage {
    Cross,
    FirstLayer,
    SecondLayer,
    TopCross,
    TopFace,
    TopCorners,
    TopEdges,
    Solved,
}

impl Stage {
    pub fn label(self) -> &'static str {
        match self {
            Stage::Cross => "1. Bottom cross",
            Stage::FirstLayer => "2. First-layer corners (triggers)",
            Stage::SecondLayer => "3. Second-layer edges",
            Stage::TopCross => "4. Top cross",
            Stage::TopFace => "5. Top face",
            Stage::TopCorners => "6. Top corners position",
            Stage::TopEdges => "7. Top edges position",
            Stage::Solved => "Solved",
        }
    }
}

/// How the learner wants to apply triggers in the first-layer step.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TriggerStyle {
    /// U R U' R' / U' L' U L and their inverses R U R' U' / L' U' L U
    Trigger,
    /// repeat R U R' U' (or L' U' L U) until the corner is solved
    Sexy,
}

#[derive(Clone, Debug, Serialize)]
pub struct Op {
    pub id: String,
    pub name: String,
    /// notation relative to the chosen front
    pub rel: String,
    /// front index 0..4 (F R B L); 0 for U turns
    pub front: usize,
    /// physical notation actually applied to the cube
    pub alg: String,
    #[serde(skip)]
    moves: Vec<Move>,
}

fn rot_move(m: Move, k: usize) -> Move {
    use Move::*;
    let mut m = m;
    for _ in 0..k {
        m = match m {
            F => R,
            F2 => R2,
            Fp => Rp,
            R => B,
            R2 => B2,
            Rp => Bp,
            B => L,
            B2 => L2,
            Bp => Lp,
            L => F,
            L2 => F2,
            Lp => Fp,
            o => o,
        };
    }
    m
}

/// Map an alg written for front = F to the physical faces for front `k`.
pub fn map_front(alg: &str, k: usize) -> Result<String, String> {
    let moves = parse_alg(alg).map_err(|e| e.to_string())?;
    Ok(format_alg(
        &moves
            .iter()
            .map(|&m| rot_move(m, k % 4))
            .collect::<Vec<_>>(),
    ))
}

fn op(id: &str, name: &str, rel: &str, front: usize) -> Op {
    let moves: Vec<Move> = parse_alg(rel)
        .expect("builtin op")
        .into_iter()
        .map(|m| rot_move(m, front))
        .collect();
    Op {
        id: id.into(),
        name: if id.starts_with('U') {
            name.into()
        } else {
            format!("{name} [front {}]", FRONTS[front])
        },
        rel: rel.into(),
        front,
        alg: format_alg(&moves),
        moves,
    }
}

/// Front-relative operation templates, grouped by the stage they belong to.
pub fn templates(style: TriggerStyle) -> Vec<(&'static str, &'static str, &'static str)> {
    let mut v = vec![];
    match style {
        TriggerStyle::Trigger => {
            v.push(("rt", "Right trigger", "U R U' R'"));
            v.push(("rti", "Right trigger (inverse)", "R U R' U'"));
            v.push(("lt", "Left trigger", "U' L' U L"));
            v.push(("lti", "Left trigger (inverse)", "L' U' L U"));
        }
        TriggerStyle::Sexy => {
            v.push(("rs", "Right trigger + U'", "R U R' U'"));
            v.push(("ls", "Left trigger + U", "L' U' L U"));
        }
    }
    v.push(("e2r", "2nd layer: insert right", "U R U' R' U' F' U F"));
    v.push(("e2l", "2nd layer: insert left", "U' L' U L U F U' F'"));
    v.push(("tc", "Top cross", "F R U R' U' F'"));
    v.push(("sune", "Top face (R U R' U R U2 R')", "R U R' U R U2 R'"));
    v.push(("cp", "Swap top corners", "R' F R' B2 R F' R' B2 R2"));
    v.push(("ep", "Cycle top edges", "R U' R U R U R U' R' U' R2"));
    v
}

pub fn u_ops() -> Vec<Op> {
    vec![
        op("U", "U", "U", 0),
        op("Up", "U'", "U'", 0),
        op("U2", "U2", "U2", 0),
    ]
}

pub fn all_ops(style: TriggerStyle) -> Vec<Op> {
    let mut v = u_ops();
    for (id, name, rel) in templates(style) {
        for f in 0..4 {
            v.push(op(&format!("{id}{f}"), name, rel, f));
        }
    }
    v
}

// ---------- stage predicates ----------

fn edge_ok(c: &Cube, i: usize) -> bool {
    c.edge_perm[i] as usize == i && c.edge_ori[i] == 0
}
fn corner_ok(c: &Cube, i: usize) -> bool {
    c.corner_perm[i] as usize == i && c.corner_ori[i] == 0
}
fn count(c: &Cube, f: fn(&Cube, usize) -> bool, r: std::ops::Range<usize>) -> usize {
    r.filter(|&i| f(c, i)).count()
}
fn cross_n(c: &Cube) -> usize {
    count(c, edge_ok, 8..12)
}
fn corners_n(c: &Cube) -> usize {
    count(c, corner_ok, 4..8)
}
fn mid_n(c: &Cube) -> usize {
    count(c, edge_ok, 4..8)
}
fn top_cross(c: &Cube) -> bool {
    c.edge_ori[..4].iter().all(|&o| o == 0)
}
fn top_face(c: &Cube) -> bool {
    top_cross(c) && c.corner_ori[..4].iter().all(|&o| o == 0)
}
fn with_u(c: &Cube, k: usize) -> Cube {
    let mut d = *c;
    for _ in 0..k {
        d.apply_move(Move::U);
    }
    d
}
fn top_corners(c: &Cube) -> bool {
    top_face(c) && (0..4).any(|k| with_u(c, k).corner_perm[..4] == [0, 1, 2, 3])
}

pub fn stage(c: &Cube) -> Stage {
    if c.is_solved() {
        Stage::Solved
    } else if cross_n(c) < 4 {
        Stage::Cross
    } else if corners_n(c) < 4 {
        Stage::FirstLayer
    } else if mid_n(c) < 4 {
        Stage::SecondLayer
    } else if !top_cross(c) {
        Stage::TopCross
    } else if !top_face(c) {
        Stage::TopFace
    } else if !top_corners(c) {
        Stage::TopCorners
    } else {
        // top edges, or only the final U turn left
        Stage::TopEdges
    }
}

/// Goal for one suggestion step: earlier stages kept, progress made.
fn goal(st: Stage, start: &Cube) -> Box<dyn Fn(&Cube) -> bool> {
    let (c0, k0, m0, start) = (cross_n(start), corners_n(start), mid_n(start), *start);
    match st {
        Stage::Cross => Box::new(move |c| cross_n(c) > c0 && cross_all_or_more(c, &start)),
        Stage::FirstLayer => Box::new(move |c| cross_n(c) == 4 && corners_n(c) > k0),
        Stage::SecondLayer => {
            Box::new(move |c| cross_n(c) == 4 && corners_n(c) == 4 && mid_n(c) > m0)
        }
        Stage::TopCross => Box::new(|c| f2l(c) && top_cross(c)),
        Stage::TopFace => Box::new(|c| f2l(c) && top_face(c)),
        Stage::TopCorners => Box::new(|c| f2l(c) && top_corners(c)),
        Stage::TopEdges | Stage::Solved => Box::new(|c| c.is_solved()),
    }
}
fn f2l(c: &Cube) -> bool {
    cross_n(c) == 4 && corners_n(c) == 4 && mid_n(c) == 4
}
// keep every cross edge that was already solved
fn cross_all_or_more(c: &Cube, start: &Cube) -> bool {
    (8..12).all(|i| !edge_ok(start, i) || edge_ok(c, i))
}

fn stage_ops(st: Stage, style: TriggerStyle) -> Vec<Op> {
    let mut v = u_ops();
    let ids: &[&str] = match st {
        Stage::Cross => {
            // intuitive step: plain face turns
            let mut v = vec![];
            for (i, f) in ["U", "D", "R", "L", "F", "B"].iter().enumerate() {
                for (s, n) in [("", ""), ("'", "p"), ("2", "2")] {
                    let a = format!("{f}{s}");
                    let mut o = op(&format!("U{}{n}", i), &a, &a, 0);
                    o.id = format!("m{f}{n}");
                    v.push(o);
                }
            }
            return v;
        }
        Stage::FirstLayer => match style {
            TriggerStyle::Trigger => &["rt", "rti", "lt", "lti"],
            TriggerStyle::Sexy => &["rs", "ls"],
        },
        Stage::SecondLayer => &["e2r", "e2l"],
        Stage::TopCross => &["tc"],
        Stage::TopFace => &["sune"],
        Stage::TopCorners => &["cp"],
        Stage::TopEdges => &["ep"],
        Stage::Solved => &[],
    };
    for (id, name, rel) in templates(style) {
        if ids.contains(&id) {
            for f in 0..4 {
                v.push(op(&format!("{id}{f}"), name, rel, f));
            }
        }
    }
    v
}

#[derive(Clone, Debug, Serialize)]
pub struct Suggestion {
    pub stage: Stage,
    pub stage_label: &'static str,
    pub found: bool,
    /// operations that reach the next milestone; the first one is "next"
    pub plan: Vec<Op>,
}

fn is_u(o: &Op) -> bool {
    o.id.starts_with('U') || o.id.starts_with("mU")
}
fn face_of(o: &Op) -> Option<char> {
    o.id.strip_prefix('m').and_then(|s| s.chars().next())
}

fn dfs(
    c: &Cube,
    ops: &[Op],
    g: &dyn Fn(&Cube) -> bool,
    depth: usize,
    path: &mut Vec<usize>,
) -> bool {
    if g(c) {
        return true;
    }
    if depth == 0 {
        return false;
    }
    for (i, o) in ops.iter().enumerate() {
        if let Some(&last) = path.last() {
            let l = &ops[last];
            // no two U turns (or same face turns) in a row
            if is_u(l) && is_u(o) {
                continue;
            }
            if face_of(l).is_some() && face_of(l) == face_of(o) {
                continue;
            }
            // the same front-relative op on the same front twice in a row
            // is allowed (repeating triggers), but not op then its inverse
            if l.front == o.front && inverse_pair(&l.id, &o.id) {
                continue;
            }
        }
        let mut d = *c;
        for &m in &o.moves {
            d.apply_move(m);
        }
        path.push(i);
        if dfs(&d, ops, g, depth - 1, path) {
            return true;
        }
        path.pop();
    }
    false
}
fn inverse_pair(a: &str, b: &str) -> bool {
    let strip = |s: &str| s.trim_end_matches(char::is_numeric).to_string();
    let (a, b) = (strip(a), strip(b));
    (a == "rt" && b == "rti")
        || (a == "rti" && b == "rt")
        || (a == "lt" && b == "lti")
        || (a == "lti" && b == "lt")
}

pub fn suggest(c: &Cube, style: TriggerStyle) -> Suggestion {
    let st = stage(c);
    let mut s = Suggestion {
        stage: st,
        stage_label: st.label(),
        found: st == Stage::Solved,
        plan: vec![],
    };
    if st == Stage::Solved {
        return s;
    }
    let ops = stage_ops(st, style);
    let g = goal(st, c);
    let max = match st {
        Stage::Cross => 6,
        Stage::FirstLayer => 8,
        Stage::SecondLayer => 5,
        _ => 7,
    };
    let mut path = vec![];
    for d in 0..=max {
        if dfs(c, &ops, &*g, d, &mut path) {
            s.found = true;
            s.plan = path.iter().map(|&i| ops[i].clone()).collect();
            break;
        }
    }
    s
}

pub fn style_from(s: &str) -> TriggerStyle {
    if s == "sexy" {
        TriggerStyle::Sexy
    } else {
        TriggerStyle::Trigger
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scramble(seed: u64) -> Cube {
        let mut x = seed
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);
        let mut c = Cube::identity();
        let mut last = 99;
        for _ in 0..25 {
            x ^= x << 13;
            x ^= x >> 7;
            x ^= x << 17;
            let f = (x % 6) as usize;
            if f == last {
                continue;
            }
            last = f;
            let m = parse_alg(["U", "D", "R", "L", "F", "B"][f]).unwrap()[0];
            for _ in 0..(1 + (x >> 8) % 3) {
                c.apply_move(m);
            }
        }
        c
    }

    fn solve_all(style: TriggerStyle, seeds: u64) {
        for seed in 1..=seeds {
            let mut c = scramble(seed);
            for _ in 0..60 {
                if c.is_solved() {
                    break;
                }
                let s = suggest(&c, style);
                assert!(s.found, "seed {seed}: stuck at {:?}", s.stage);
                for o in &s.plan {
                    for &m in &o.moves {
                        c.apply_move(m);
                    }
                }
            }
            assert!(c.is_solved(), "seed {seed} not solved");
        }
    }

    #[test]
    fn solves_with_triggers() {
        solve_all(TriggerStyle::Trigger, 40);
    }

    #[test]
    fn solves_with_sexy_moves() {
        solve_all(TriggerStyle::Sexy, 40);
    }

    #[test]
    fn front_mapping() {
        assert_eq!(map_front("R U R'", 1).unwrap(), "B U B'");
        assert_eq!(map_front("F R U R' U' F'", 3).unwrap(), "L F U F' U' L'");
    }

    #[test]
    fn stage_algs_preserve_f2l() {
        for (id, _, rel) in templates(TriggerStyle::Trigger) {
            if ["tc", "sune", "cp", "ep"].contains(&id) {
                let mut c = Cube::identity();
                for m in parse_alg(rel).unwrap() {
                    c.apply_move(m);
                }
                assert!(f2l(&c), "{id} breaks F2L");
            }
        }
    }
}
