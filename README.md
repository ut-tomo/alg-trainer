# alg-trainer

A spaced-repetition trainer for Rubik's Cube algorithms (CFOP PLL for now; OLL, the Takahashi method, and 2×2 blind are planned).

- Static site with no build step. The cube is rendered with [cubing.js](https://js.cubing.net/cubing/) `<twisty-player>`
- SM-2 scheduling, with state stored in `localStorage`
- Keys: `Space` reveals the alg; `1`–`4` grade it as Again / Hard / Good / Easy

## Run locally
```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

## Adding a set
Add `data/<name>.json` in the form `{ "set": "...", "cases": [{ "id": "...", "alg": "..." }] }`, then add an `<option>` for it in `index.html`.

## Roadmap
- [ ] OLL (57)
- [ ] Takahashi method alg set
- [ ] 2×2 blind (Old Pochmann): letter-scheme drill and memo quiz
- [ ] Per-case timing and stats view
