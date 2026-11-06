// tk-app.js: New Takahashi practice mode
import { renderState, setView, animateMove } from './cube-view.js';
import { FACES, COLOR_CSS, COLOR_NAME, netFromState, stateFromNet } from './net.js';

const $ = (id) => document.getElementById(id);
const FRONT_NAMES = ['F', 'R', 'B', 'L'];
// color index i is the center color of face LETTERS[i]
const LETTERS = ['U', 'D', 'L', 'R', 'F', 'B'];
const VEC = { U: [0, 1, 0], D: [0, -1, 0], L: [-1, 0, 0], R: [1, 0, 0], F: [0, 0, 1], B: [0, 0, -1] };
const FRONT_COLOR = [4, 3, 5, 2]; // solver front index (F R B L) -> center color
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const neg = (v) => v.map((x) => -x);
const letterOf = (v) => LETTERS.find((l) => VEC[l].every((x, i) => x === v[i]));
const SOLVED = {
    corner_perm: [0, 1, 2, 3, 4, 5, 6, 7], corner_ori: [0, 0, 0, 0, 0, 0, 0, 0],
    edge_perm: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], edge_ori: Array(12).fill(0),
};

let wasm, state = SOLVED, top = 0, front = 4, history = [], pending = null, busy = false;
let net = {}, paintColor = 0;

const style = () => 'trigger';

function show() {
    renderState(state);
    const s = wasm.takahashiSuggest(state, style());
    $('tk-stage').textContent = s.stage_label;
    $('tk-status').classList.toggle('solved', s.stage === 'Solved');
}

function clearHint() {
    pending = null;
    $('tk-hint').innerHTML = '';
    $('tk-do-next').classList.add('hidden');
    document.querySelectorAll('#tk-ops button').forEach((b) => b.classList.remove('suggested'));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// alg is physical notation
async function apply(alg, label) {
    if (busy || !alg.trim()) return;
    busy = true;
    try {
        const before = state;
        if ($('tk-animate').checked) {
            for (const m of alg.trim().split(/\s+/)) {
                await animateMove(m);
                state = wasm.applyTo(state, m);
                renderState(state);
                await sleep(60);
            }
        } else {
            state = wasm.applyTo(state, alg);
        }
        history.push({ label, before });
        clearHint();
        show();
    } finally {
        busy = false;
    }
}

function setState(s, label) {
    state = s;
    history = [];
    clearHint();
    $('tk-scramble-text').textContent = label || '';
    show();
}

// physical face for each relative face, given the top and front center colors
function frame() {
    const u = VEC[LETTERS[top]], f = VEC[LETTERS[front]], r = cross(u, f);
    return { U: letterOf(u), D: letterOf(neg(u)), F: letterOf(f), B: letterOf(neg(f)), R: letterOf(r), L: letterOf(neg(r)) };
}
const rightColor = () => LETTERS.indexOf(frame().R);

// relative notation (as the learner holds the cube) -> physical notation
function toPhysical(rel) {
    const m = frame();
    return rel.trim().split(/\s+/).map((t) => {
        if (!/^[UDLRFB](2|'|2')?$/.test(t)) throw new Error(`Unknown move: ${t}`);
        return m[t[0]] + t.slice(1);
    }).join(' ');
}
const holdLabel = () => `${COLOR_NAME[top]} top, ${COLOR_NAME[front]} front`;

function fillSelect(id, options, value) {
    const el = $(id);
    el.innerHTML = '';
    for (const i of options) {
        const o = document.createElement('option');
        o.value = i;
        o.textContent = COLOR_NAME[i];
        o.style.background = COLOR_CSS[i];
        el.appendChild(o);
    }
    el.value = value;
    el.style.borderLeft = `14px solid ${COLOR_CSS[value]}`;
}
const opposite = (c) => c ^ 1;
function setHold(t, f) {
    top = t;
    if (f === undefined || f === t || f === opposite(t)) f = front;
    if (f === t || f === opposite(t)) f = [0, 1, 2, 3, 4, 5].find((c) => c !== t && c !== opposite(t));
    front = f;
    const sides = [0, 1, 2, 3, 4, 5].filter((c) => c !== top && c !== opposite(top));
    fillSelect('tk-top', [0, 1, 2, 3, 4, 5], top);
    fillSelect('tk-front', sides, front);
    // right follows from top and front; picking a right color turns the cube instead
    fillSelect('tk-right', sides.filter((c) => c !== front && c !== opposite(front)), rightColor());
    setView(VEC[LETTERS[top]], VEC[LETTERS[front]]);
}
function chooseFront(k) { setHold(0, FRONT_COLOR[k]); }

function renderOps() {
    const box = $('tk-ops');
    box.innerHTML = '';
    const add = (label, title, onclick, id, cls) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.title = title;
        b.dataset.op = id;
        if (cls) b.className = cls;
        b.onclick = onclick;
        box.appendChild(b);
    };
    const group = (t) => { const d = document.createElement('div'); d.className = 'op-group'; d.textContent = t; box.appendChild(d); };
    const rel = (alg, label) => {
        try { apply(toPhysical(alg), `${label} [${holdLabel()}]`); } catch (e) { $('tk-hint').textContent = String(e.message || e); }
    };
    group('Face turns');
    for (const f of ['U', 'R', 'L', 'F', 'D', 'B']) {
        for (const [sfx, n] of [['', ''], ["'", 'p'], ['2', '2']]) {
            const m = f + sfx;
            add(m, m, () => rel(m, m), 'm' + f + n, 'face');
        }
    }
    group('Triggers');
    const tpl = wasm.takahashiTemplates(style());
    for (const t of tpl.filter((t) => t.id === 'rt' || t.id === 'lt')) add(`${t.name}\n${t.rel}`, t.rel, () => rel(t.rel, t.name), t.id, 'trigger');
}

function scramble() {
    const faces = ['U', 'D', 'R', 'L', 'F', 'B'], suf = ['', "'", '2'];
    const moves = [];
    let last = -1;
    while (moves.length < 22) {
        const f = Math.floor(Math.random() * 6);
        if (f === last || (last >= 0 && (f ^ 1) === last && Math.random() < 0.5)) continue;
        last = f;
        moves.push(faces[f] + suf[Math.floor(Math.random() * 3)]);
    }
    const alg = moves.join(' ');
    setState(wasm.applyTo(SOLVED, alg), `Scramble: ${alg}`);
}

// Keep the last plan so following it step by step never flips between
// equally short alternatives (e.g. D then D' during the cross).
let cached = null;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function getSuggestion() {
    if (cached && cached.style === style()) {
        const i = cached.states.findIndex((st) => same(st, state));
        if (i >= 0 && i < cached.s.plan.length) {
            return { ...cached.s, plan: cached.s.plan.slice(i) };
        }
    }
    const s = wasm.takahashiSuggest(state, style());
    const states = [state];
    for (const o of s.plan) states.push(wasm.applyTo(states.at(-1), o.alg));
    cached = { s, states, style: style() };
    return s;
}

function suggest() {
    clearHint();
    const s = getSuggestion();
    const out = $('tk-hint');
    if (s.stage === 'Solved') { out.textContent = 'Already solved 🎉'; return; }
    if (!s.found || s.plan.length === 0) { out.textContent = 'No suggestion found for this step.'; return; }
    const step = s.plan[0];
    pending = step;
    // face-turn steps (cross, U) are physical moves with white on top
    const isFace = step.id.startsWith('U') || step.id.startsWith('m');
    if (isFace) setHold(0, top === 0 ? front : 4);
    else setHold(0, FRONT_COLOR[step.front]);
    const relAlg = isFace ? step.alg : step.rel;
    const rest = s.plan.slice(1).map((o) => o.name.replace(/ \[front .\]$/, '')).join(' → ');
    out.innerHTML = `<div class="next">Next: ${escape(step.name.replace(/ \[front .\]$/, ''))}</div>`
        + `<div>Hold: <b>${holdLabel()}</b> · moves: <code>${escape(relAlg)}</code></div>`
        + `<div>${escape(s.stage_label)}: ${s.plan.length} operation(s) to the next milestone.</div>`
        + (rest ? `<details><summary>Show the rest</summary>${escape(rest)}</details>` : '');
    $('tk-do-next').classList.remove('hidden');
    const opId = step.id.startsWith('U') ? 'm' + step.id : step.id.replace(/\d$/, '');
    document.querySelectorAll('#tk-ops button').forEach((b) => b.classList.toggle('suggested', b.dataset.op === opId));
}

const escape = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// ---------- net editor ----------
// layout in a 12x9 grid: U above F, L F R B in a row, D below F
const NET_ORIGIN = { U: [0, 3], L: [3, 0], F: [3, 3], R: [3, 6], B: [3, 9], D: [6, 3] };

function renderNet() {
    const el = $('net');
    el.innerHTML = '';
    for (const f of FACES) {
        const [r0, c0] = NET_ORIGIN[f];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
            const k = `${f}:${r},${c}`;
            const d = document.createElement('div');
            const center = r === 1 && c === 1;
            d.className = 'st' + (center ? ' center' : '');
            d.style.gridRow = r0 + r + 1;
            d.style.gridColumn = c0 + c + 1;
            d.style.background = net[k] >= 0 ? COLOR_CSS[net[k]] : '#adb5bd';
            d.title = center ? `${f} center` : `${f} ${r + 1},${c + 1}`;
            if (center) d.textContent = '';
            else d.onclick = () => { net[k] = paintColor; renderNet(); };
            el.appendChild(d);
        }
    }
}

function renderPalette() {
    const p = $('net-palette');
    p.innerHTML = '';
    COLOR_CSS.forEach((css, i) => {
        const s = document.createElement('div');
        s.className = 'sw' + (i === paintColor ? ' active' : '');
        s.style.background = css;
        s.title = COLOR_NAME[i];
        s.onclick = () => { paintColor = i; renderPalette(); };
        p.appendChild(s);
    });
}

function clearNet() {
    net = {};
    FACES.forEach((f, i) => { for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) net[`${f}:${r},${c}`] = (r === 1 && c === 1) ? i : -1; });
    renderNet();
}

function useNet() {
    const out = $('net-result');
    const res = stateFromNet(net);
    if (res.error) { out.textContent = '✗ ' + res.error; out.className = 'attempt-result ng'; return; }
    if (!wasm.isLegal(res.state)) {
        out.textContent = '✗ This state can\'t be reached by turning (a twisted corner, flipped edge or swapped pieces). Check the stickers.';
        out.className = 'attempt-result ng';
        return;
    }
    out.textContent = '✓ Valid cube. Loaded.';
    out.className = 'attempt-result ok';
    setState(res.state, 'From the net');
    setTimeout(() => { $('tk-net').classList.add('net-hidden'); $('app').scrollIntoView({ behavior: 'smooth' }); }, 600);
}

export function initTakahashi(w) {
    wasm = w;
    $('tk-scramble').onclick = scramble;
    $('tk-solved').onclick = () => setState(SOLVED, '');
    $('tk-paint').onclick = () => {
        net = netFromState(state); renderNet();
        $('net-result').textContent = '';
        $('tk-net').classList.remove('net-hidden');
        $('tk-net').scrollIntoView({ behavior: 'smooth' });
    };
    $('tk-scramble').addEventListener('click', () => $('tk-net').classList.add('net-hidden'));
    $('tk-top').onchange = (e) => setHold(+e.target.value);
    $('tk-front').onchange = (e) => setHold(top, +e.target.value);
    // choosing the right color keeps the top and turns the cube so that color is on the right
    $('tk-right').onchange = (e) => {
        const r = +e.target.value, u = VEC[LETTERS[top]];
        setHold(top, LETTERS.indexOf(letterOf(cross(VEC[LETTERS[r]], u))));
    };
    const typed = () => {
        try {
            const rel = $('tk-input').value.trim();
            if (!rel) return;
            apply(toPhysical(rel), `${rel} [${holdLabel()}]`);
            $('tk-input').value = '';
        } catch (e) { $('tk-hint').textContent = String(e.message || e); }
    };
    $('tk-apply').onclick = typed;
    $('tk-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') typed(); });
    $('tk-undo').onclick = () => {
        const h = history.pop();
        if (h) { state = h.before; clearHint(); show(); }
    };
    $('tk-suggest').onclick = suggest;
    $('tk-do-next').onclick = () => pending && apply(pending.alg, pending.name);
    for (const b of document.querySelectorAll('[data-demo]')) {
        b.onclick = async () => {
            setMode('takahashi');
            chooseFront(0);
            setState(SOLVED, `Demo: ${b.dataset.demo}`);
            $('app').scrollIntoView({ behavior: 'smooth' });
            await sleep(500);
            const anim = $('tk-animate').checked;
            $('tk-animate').checked = true;
            await apply(b.dataset.demo, b.dataset.demo);
            $('tk-animate').checked = anim;
        };
    }
    $('net-clear').onclick = clearNet;
    $('net-from-cube').onclick = () => { net = netFromState(state); renderNet(); };
    $('net-use').onclick = useNet;
    renderOps();
    renderPalette();
    net = netFromState(SOLVED);
    renderNet();
}

let setMode = () => {};
export function onModeHook(fn) { setMode = fn; }

export function enterTakahashi() {
    setHold(top, front);
    show();
}
