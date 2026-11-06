import { loadState, saveState, grade, nextCard } from "./srs.js";

const $ = (s) => document.querySelector(s);
let setName, cases, state, current;

async function loadSet(name) {
  setName = name;
  const data = await (await fetch(`data/${name}.json`)).json();
  cases = Object.fromEntries(data.cases.map((c) => [c.id, c]));
  state = loadState(name, Object.keys(cases));
  show();
}

function show() {
  const { id, dueCount } = nextCard(state);
  current = cases[id];
  $("#player").alg = current.alg; // setup-anchor=end shows the case to be solved
  $("#case-name").textContent = current.id;
  $("#alg").textContent = current.alg;
  $("#alg").classList.add("hidden");
  $("#grades").classList.add("hidden");
  $("#reveal").classList.remove("hidden");
  $("#stats").textContent = `${dueCount} due / ${Object.keys(cases).length}`;
}

function reveal() {
  $("#alg").classList.remove("hidden");
  $("#grades").classList.remove("hidden");
  $("#reveal").classList.add("hidden");
}

function rate(q) {
  grade(state[current.id], q);
  saveState(setName, state);
  show();
}

$("#reveal").onclick = reveal;
$("#grades").onclick = (e) => e.target.dataset.q && rate(+e.target.dataset.q);
$("#set").onchange = (e) => loadSet(e.target.value);
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); reveal(); }
  const q = { Digit1: 1, Digit2: 3, Digit3: 4, Digit4: 5 }[e.code];
  if (q && !$("#grades").classList.contains("hidden")) rate(q);
});

loadSet("pll");
