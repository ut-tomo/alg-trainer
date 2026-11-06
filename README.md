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
