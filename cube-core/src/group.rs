//! 群演算の定義とルービックキューブへの適用

use crate::{Cube, Move};

/// 群演算を表すトレイト
pub trait GroupOp {
    /// 単位元を返す
    fn identity() -> Self;

    /// 群演算（合成）を実行
    fn compose(&self, other: &Self) -> Self;

    /// 逆元を返す
    fn inverse(&self) -> Self;

    /// べき乗を計算
    fn power(&self, n: i32) -> Self
    where
        Self: Sized + Clone,
    {
        if n == 0 {
            return Self::identity();
        }

        if n < 0 {
            return self.inverse().power(-n);
        }

        let mut result = Self::identity();
        let mut base = self.clone();
        let mut exp = n;

        while exp > 0 {
            if exp % 2 == 1 {
                result = result.compose(&base);
            }
            base = base.compose(&base);
            exp /= 2;
        }

        result
    }
}

/// 手の列（アルゴリズム）
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Algorithm {
    moves: Vec<Move>,
}

impl Algorithm {
    /// 新しいアルゴリズムを作成
    pub fn new(moves: Vec<Move>) -> Self {
        Self { moves }
    }

    /// 空のアルゴリズム
    pub fn empty() -> Self {
        Self { moves: Vec::new() }
    }

    /// 手を追加
    pub fn push(&mut self, m: Move) {
        self.moves.push(m);
    }

    /// 手の列を取得
    pub fn moves(&self) -> &[Move] {
        &self.moves
    }

    /// 長さを取得
    pub fn len(&self) -> usize {
        self.moves.len()
    }

    /// 空かどうか
    pub fn is_empty(&self) -> bool {
        self.moves.is_empty()
    }

    /// 文字列表記に変換
    pub fn to_notation(&self) -> String {
        self.moves
            .iter()
            .map(|m| m.to_notation())
            .collect::<Vec<_>>()
            .join(" ")
    }

    /// キューブに適用
    pub fn apply(&self, cube: &Cube) -> Cube {
        let mut result = cube.clone();
        for m in &self.moves {
            result = apply_move(&result, *m);
        }
        result
    }
}

impl GroupOp for Algorithm {
    fn identity() -> Self {
        Self::empty()
    }

    fn compose(&self, other: &Self) -> Self {
        let mut moves = self.moves.clone();
        moves.extend_from_slice(&other.moves);
        Self::new(moves)
    }

    fn inverse(&self) -> Self {
        let moves = self.moves.iter().rev().map(|m| m.inverse()).collect();
        Self::new(moves)
    }
}

/// 単一の手をキューブに適用（スタブ実装）
fn apply_move(cube: &Cube, _m: Move) -> Cube {
    // TODO: 実際の手の適用ロジックを実装
    // 現時点では何もしない
    cube.clone()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_algorithm_identity() {
        let algo = Algorithm::identity();
        assert!(algo.is_empty());
    }

    #[test]
    fn test_algorithm_compose() {
        let algo1 = Algorithm::new(vec![Move::R, Move::U]);
        let algo2 = Algorithm::new(vec![Move::RPrime, Move::UPrime]);
        let composed = algo1.compose(&algo2);

        assert_eq!(composed.len(), 4);
        assert_eq!(
            composed.moves(),
            &[Move::R, Move::U, Move::RPrime, Move::UPrime]
        );
    }

    #[test]
    fn test_algorithm_inverse() {
        let algo = Algorithm::new(vec![Move::R, Move::U, Move::F2]);
        let inv = algo.inverse();

        assert_eq!(inv.moves(), &[Move::F2, Move::UPrime, Move::RPrime]);
    }

    #[test]
    fn test_algorithm_notation() {
        let algo = Algorithm::new(vec![Move::R, Move::U, Move::RPrime, Move::UPrime]);
        assert_eq!(algo.to_notation(), "R U R' U'");
    }

    #[test]
    fn test_power() {
        let algo = Algorithm::new(vec![Move::R, Move::U]);
        let squared = algo.power(2);

        assert_eq!(squared.len(), 4);
        assert_eq!(squared.moves(), &[Move::R, Move::U, Move::R, Move::U]);
    }
}
