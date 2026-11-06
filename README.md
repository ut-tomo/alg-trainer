# alg-trainer

A spaced-repetition trainer for Rubik's Cube algorithms, built on the same stack as [rubik-playground](https://github.com/ut-tomo/rubik-playground): Rust + WebAssembly + Three.js.

## Structure
- `cube-core/`: cube model (copied from rubik-playground)
- `trainer-core/`: alg sets (`data/*.json`), notation parser, SM-2 scheduler. Tests check that every bundled alg is a valid case.
- `trainer-wasm/`: wasm-bindgen API (`Trainer`, `listSets`, `stateAfter`, `invertAlgorithm`)
- `docs/`: static site (GitHub Pages). `cube-view.js` is the playground's three.js renderer.

## Build & run
```sh
cargo test --workspace
./trainer-wasm/build.sh          # requires wasm-pack + wasm32-unknown-unknown
cd docs && python3 -m http.server 8000
```
CI builds the wasm too, and uploads the full site as the `site` artifact.

## Adding a set
1. Add `trainer-core/data/<id>.json` (face turns only, since cube-core has no slice moves or rotations)
2. Register it in `BUILTIN` in `trainer-core/src/algset.rs`
3. Add a validation test

## Roadmap
- [x] PLL (21)
- [ ] OLL (57)
- [ ] Takahashi method set
- [ ] 2×2 blind (Old Pochmann) mode
- [ ] Timer and per-case stats
- [ ] Slice moves and rotations in cube-core (M, x, y)

## New Takahashi mode

Pick it from the **Practice** pulldown at the top of the page.

- Explains the right trigger (`R U R'`) and left trigger (`L' U' L`), with buttons that play them on the cube.
- Practice: start from a random scramble or paint a cube state on the net (checked for legality).
- Operation buttons: U turns, triggers (two styles: `R U R'` + inverse, or repeated `R U R' U'`), and the algorithm for each later step. Front-relative operations use the front you pick (F/R/B/L), and the camera turns to that side.
- **Suggest next operation**: `trainer-core/src/takahashi.rs` detects the current stage and runs an iterative-deepening search over that stage's operations to the next milestone (one more piece for the first three steps).
- The first layer is the D face (yellow), because the cube model has no whole-cube rotations.
