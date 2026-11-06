// notation.rs: Singmaster notation <-> Move (face turns only, same as the playground)
use cube_core::Move;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParseError(pub String);

impl std::fmt::Display for ParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Invalid move: {}", self.0)
    }
}

pub fn parse_move(s: &str) -> Option<Move> {
    use Move::*;
    Some(match s.trim() {
        "U" => U,
        "U2" | "U2'" => U2,
        "U'" => Up,
        "D" => D,
        "D2" | "D2'" => D2,
        "D'" => Dp,
        "L" => L,
        "L2" | "L2'" => L2,
        "L'" => Lp,
        "R" => R,
        "R2" | "R2'" => R2,
        "R'" => Rp,
        "F" => F,
        "F2" | "F2'" => F2,
        "F'" => Fp,
        "B" => B,
        "B2" | "B2'" => B2,
        "B'" => Bp,
        _ => return None,
    })
}

pub fn parse_alg(s: &str) -> Result<Vec<Move>, ParseError> {
    s.split_whitespace()
        .map(|t| parse_move(t).ok_or_else(|| ParseError(t.to_string())))
        .collect()
}

pub fn format_move(m: Move) -> &'static str {
    use Move::*;
    match m {
        U => "U",
        U2 => "U2",
        Up => "U'",
        D => "D",
        D2 => "D2",
        Dp => "D'",
        L => "L",
        L2 => "L2",
        Lp => "L'",
        R => "R",
        R2 => "R2",
        Rp => "R'",
        F => "F",
        F2 => "F2",
        Fp => "F'",
        B => "B",
        B2 => "B2",
        Bp => "B'",
    }
}

pub fn format_alg(moves: &[Move]) -> String {
    moves
        .iter()
        .map(|&m| format_move(m))
        .collect::<Vec<_>>()
        .join(" ")
}
