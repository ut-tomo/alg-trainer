use cube_core::Cube;
use serde::Serialize;
use trainer_core::{builtin_sets, format_alg, parse_alg, pick_next, AlgSet, Card, Grade};
use wasm_bindgen::prelude::*;

#[derive(Serialize, serde::Deserialize)]
struct CubeState {
    corner_perm: Vec<u8>,
    corner_ori: Vec<u8>,
    edge_perm: Vec<u8>,
    edge_ori: Vec<u8>,
}

impl From<&Cube> for CubeState {
    fn from(c: &Cube) -> Self {
        Self {
            corner_perm: c.corner_perm.to_vec(),
            corner_ori: c.corner_ori.to_vec(),
            edge_perm: c.edge_perm.to_vec(),
            edge_ori: c.edge_ori.to_vec(),
        }
    }
}

#[derive(Serialize)]
struct CaseView<'a> {
    index: usize,
    id: &'a str,
    group: &'a str,
    alg: &'a str,
    card: &'a Card,
}

/// Spaced-repetition session over one alg set. Progress is (de)serialized as
/// JSON so the frontend can persist it in localStorage.
#[wasm_bindgen]
pub struct Trainer {
    set: AlgSet,
    cards: Vec<Card>,
    current: Option<usize>,
}

#[wasm_bindgen]
impl Trainer {
    #[wasm_bindgen(constructor)]
    pub fn new(set_id: &str, saved_json: Option<String>) -> Result<Trainer, JsValue> {
        let set = builtin_sets()
            .into_iter()
            .find(|s| s.id == set_id)
            .ok_or_else(|| JsValue::from_str(&format!("Unknown set: {set_id}")))?;
        let mut cards = vec![Card::default(); set.cases.len()];
        if let Some(json) = saved_json {
            // saved progress is keyed by case id so reordering the set is safe
            if let Ok(map) = serde_json::from_str::<std::collections::HashMap<String, Card>>(&json)
            {
                for (i, c) in set.cases.iter().enumerate() {
                    if let Some(card) = map.get(&c.id) {
                        cards[i] = card.clone();
                    }
                }
            }
        }
        Ok(Trainer {
            set,
            cards,
            current: None,
        })
    }

    #[wasm_bindgen(js_name = setName)]
    pub fn set_name(&self) -> String {
        self.set.name.clone()
    }

    #[wasm_bindgen(js_name = setDescription)]
    pub fn set_description(&self) -> String {
        self.set.description.clone()
    }

    /// Advance to the next case. Returns the case index.
    pub fn next(&mut self, now: f64) -> usize {
        let (i, _) = pick_next(&self.cards, now, self.current).unwrap_or((0, 0));
        self.current = Some(i);
        i
    }

    /// Select a specific case (from the case list).
    pub fn select(&mut self, index: usize) {
        if index < self.cards.len() {
            self.current = Some(index);
        }
    }

    pub fn current(&self) -> JsValue {
        match self.current {
            Some(i) => self.case_view(i),
            None => JsValue::NULL,
        }
    }

    /// Cube state showing the current case (alg inverse applied to solved).
    #[wasm_bindgen(js_name = currentState)]
    pub fn current_state(&self) -> Result<JsValue, JsValue> {
        let i = self.current.ok_or("no current case")?;
        let cube = self.set.cases[i]
            .setup_state()
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        Ok(serde_wasm_bindgen::to_value(&CubeState::from(&cube))?)
    }

    /// 0 = Again, 1 = Hard, 2 = Good, 3 = Easy
    pub fn grade(&mut self, grade: u8, now: f64) -> Result<(), JsValue> {
        let i = self.current.ok_or("no current case")?;
        let g = Grade::from_index(grade).ok_or("invalid grade")?;
        self.cards[i].review(g, now);
        Ok(())
    }

    pub fn stats(&self, now: f64) -> JsValue {
        #[derive(Serialize)]
        struct Stats {
            total: usize,
            new: usize,
            due: usize,
            learned: usize,
        }
        let s = Stats {
            total: self.cards.len(),
            new: self.cards.iter().filter(|c| c.is_new()).count(),
            due: self
                .cards
                .iter()
                .filter(|c| !c.is_new() && c.due <= now)
                .count(),
            learned: self.cards.iter().filter(|c| c.reps >= 2).count(),
        };
        serde_wasm_bindgen::to_value(&s).unwrap()
    }

    pub fn cases(&self) -> JsValue {
        let v: Vec<CaseView> = (0..self.cards.len()).map(|i| self.view(i)).collect();
        serde_wasm_bindgen::to_value(&v).unwrap()
    }

    #[wasm_bindgen(js_name = exportProgress)]
    pub fn export_progress(&self) -> String {
        let map: std::collections::HashMap<&str, &Card> = self
            .set
            .cases
            .iter()
            .map(|c| c.id.as_str())
            .zip(self.cards.iter())
            .collect();
        serde_json::to_string(&map).unwrap()
    }

    #[wasm_bindgen(js_name = resetProgress)]
    pub fn reset_progress(&mut self) {
        self.cards = vec![Card::default(); self.cards.len()];
        self.current = None;
    }
}

impl Trainer {
    fn view(&self, i: usize) -> CaseView<'_> {
        let c = &self.set.cases[i];
        CaseView {
            index: i,
            id: &c.id,
            group: &c.group,
            alg: &c.alg,
            card: &self.cards[i],
        }
    }

    fn case_view(&self, i: usize) -> JsValue {
        serde_wasm_bindgen::to_value(&self.view(i)).unwrap()
    }
}

#[wasm_bindgen(js_name = listSets)]
pub fn list_sets() -> JsValue {
    #[derive(Serialize)]
    struct Info {
        id: String,
        name: String,
        count: usize,
    }
    let v: Vec<Info> = builtin_sets()
        .into_iter()
        .map(|s| Info {
            count: s.cases.len(),
            id: s.id,
            name: s.name,
        })
        .collect();
    serde_wasm_bindgen::to_value(&v).unwrap()
}

/// Apply an alg (face turns only) to a solved cube; used for the free-practice box.
#[wasm_bindgen(js_name = stateAfter)]
pub fn state_after(alg: &str) -> Result<JsValue, JsValue> {
    let moves = parse_alg(alg).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let mut c = Cube::identity();
    for m in moves {
        c.apply_move(m);
    }
    Ok(serde_wasm_bindgen::to_value(&CubeState::from(&c))?)
}

#[wasm_bindgen(js_name = invertAlgorithm)]
pub fn invert_algorithm(alg: &str) -> Result<String, JsValue> {
    let moves = parse_alg(alg).map_err(|e| JsValue::from_str(&e.to_string()))?;
    Ok(format_alg(&cube_core::invert_alg(&moves)))
}

// ---------- New Takahashi practice ----------

fn to_cube(v: JsValue) -> Result<Cube, JsValue> {
    let s: CubeState = serde_wasm_bindgen::from_value(v)?;
    let mut c = Cube::identity();
    if s.corner_perm.len() != 8
        || s.edge_perm.len() != 12
        || s.corner_ori.len() != 8
        || s.edge_ori.len() != 12
    {
        return Err("bad cube state".into());
    }
    c.corner_perm.copy_from_slice(&s.corner_perm);
    c.corner_ori.copy_from_slice(&s.corner_ori);
    c.edge_perm.copy_from_slice(&s.edge_perm);
    c.edge_ori.copy_from_slice(&s.edge_ori);
    Ok(c)
}

/// Apply physical notation to a given state.
#[wasm_bindgen(js_name = applyTo)]
pub fn apply_to(state: JsValue, alg: &str) -> Result<JsValue, JsValue> {
    let mut c = to_cube(state)?;
    for m in parse_alg(alg).map_err(|e| JsValue::from_str(&e.to_string()))? {
        c.apply_move(m);
    }
    Ok(serde_wasm_bindgen::to_value(&CubeState::from(&c))?)
}

/// Whether a state (e.g. painted on the net) is reachable from solved.
#[wasm_bindgen(js_name = isLegal)]
pub fn is_legal(state: JsValue) -> Result<bool, JsValue> {
    Ok(to_cube(state)?.is_legal())
}

/// Map an alg written for front = F to front k (0 F, 1 R, 2 B, 3 L).
#[wasm_bindgen(js_name = mapFront)]
pub fn map_front(alg: &str, k: usize) -> Result<String, JsValue> {
    trainer_core::takahashi::map_front(alg, k).map_err(|e| JsValue::from_str(&e))
}

/// Operation templates (front-relative) for the palette.
#[wasm_bindgen(js_name = takahashiTemplates)]
pub fn takahashi_templates(style: &str) -> JsValue {
    #[derive(Serialize)]
    struct T {
        id: &'static str,
        name: &'static str,
        rel: &'static str,
    }
    let v: Vec<T> = trainer_core::takahashi::templates(trainer_core::takahashi::style_from(style))
        .into_iter()
        .map(|(id, name, rel)| T { id, name, rel })
        .collect();
    serde_wasm_bindgen::to_value(&v).unwrap()
}

/// Current stage and the operations to the next milestone.
#[wasm_bindgen(js_name = takahashiSuggest)]
pub fn takahashi_suggest(state: JsValue, style: &str) -> Result<JsValue, JsValue> {
    let c = to_cube(state)?;
    let s = trainer_core::takahashi::suggest(&c, trainer_core::takahashi::style_from(style));
    Ok(serde_wasm_bindgen::to_value(&s)?)
}
