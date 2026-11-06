// srs.rs: SM-2 spaced repetition scheduler
use serde::{Deserialize, Serialize};

pub const MINUTE_MS: f64 = 60_000.0;
pub const DAY_MS: f64 = 86_400_000.0;

/// User's self-assessment after revealing a case.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Grade {
    Again,
    Hard,
    Good,
    Easy,
}

impl Grade {
    /// SM-2 quality (0..=5)
    pub fn quality(self) -> u8 {
        match self {
            Grade::Again => 1,
            Grade::Hard => 3,
            Grade::Good => 4,
            Grade::Easy => 5,
        }
    }

    pub fn from_index(i: u8) -> Option<Self> {
        [Grade::Again, Grade::Hard, Grade::Good, Grade::Easy]
            .get(i as usize)
            .copied()
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Card {
    pub ef: f64,
    pub reps: u32,
    /// days
    pub interval: f64,
    /// unix ms
    pub due: f64,
    pub lapses: u32,
    /// times reviewed in total
    pub seen: u32,
}

impl Default for Card {
    fn default() -> Self {
        Card {
            ef: 2.5,
            reps: 0,
            interval: 0.0,
            due: 0.0,
            lapses: 0,
            seen: 0,
        }
    }
}

impl Card {
    pub fn is_new(&self) -> bool {
        self.seen == 0
    }

    pub fn review(&mut self, g: Grade, now: f64) {
        let q = g.quality() as f64;
        self.seen += 1;
        if g == Grade::Again {
            self.reps = 0;
            self.lapses += 1;
            self.interval = 0.0;
            self.due = now + MINUTE_MS;
        } else {
            self.reps += 1;
            self.interval = match self.reps {
                1 => 1.0,
                2 => 6.0,
                _ => (self.interval * self.ef).round(),
            };
            if g == Grade::Hard {
                self.interval = (self.interval * 0.6).max(1.0);
            }
            self.due = now + self.interval * DAY_MS;
        }
        self.ef = (self.ef + 0.1 - (5.0 - q) * (0.08 + (5.0 - q) * 0.02)).max(1.3);
    }
}

/// Pick the next card: earliest due first, then unseen cards.
/// Returns (index, due_count).
pub fn pick_next(cards: &[Card], now: f64, exclude: Option<usize>) -> Option<(usize, usize)> {
    let due: Vec<usize> = (0..cards.len())
        .filter(|&i| !cards[i].is_new() && cards[i].due <= now)
        .collect();
    let due_count = due.len();
    let candidates: Vec<usize> = if !due.is_empty() {
        due
    } else {
        (0..cards.len()).filter(|&i| cards[i].is_new()).collect()
    };
    let pool: Vec<usize> = if candidates.len() > 1 {
        candidates
            .into_iter()
            .filter(|&i| Some(i) != exclude)
            .collect()
    } else {
        candidates
    };
    pool.into_iter()
        .min_by(|&a, &b| cards[a].due.partial_cmp(&cards[b].due).unwrap())
        .map(|i| (i, due_count))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn intervals_grow() {
        let mut c = Card::default();
        c.review(Grade::Good, 0.0);
        assert_eq!(c.interval, 1.0);
        c.review(Grade::Good, 0.0);
        assert_eq!(c.interval, 6.0);
        c.review(Grade::Good, 0.0);
        assert!(c.interval > 6.0);
    }

    #[test]
    fn again_resets() {
        let mut c = Card::default();
        c.review(Grade::Good, 0.0);
        c.review(Grade::Again, 0.0);
        assert_eq!(c.reps, 0);
        assert_eq!(c.lapses, 1);
        assert_eq!(c.due, MINUTE_MS);
        assert!(c.ef < 2.5);
    }

    #[test]
    fn due_before_new() {
        let mut cards = vec![Card::default(); 3];
        cards[2].review(Grade::Again, 0.0);
        assert_eq!(pick_next(&cards, 2.0 * MINUTE_MS, None), Some((2, 1)));
        assert_eq!(pick_next(&cards, 0.0, None).unwrap().0, 0);
        // don't repeat the same case twice in a row
        assert_eq!(pick_next(&cards, 0.0, Some(0)).unwrap().0, 1);
    }
}
