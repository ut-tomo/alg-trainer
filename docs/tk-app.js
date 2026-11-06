// tk-app.js: New Takahashi practice mode
import { renderState, setFront } from './cube-view.js';
import { FACES, COLOR_CSS, COLOR_NAME, netFromState, stateFromNet } from './net.js';

const $ = (id) => document.getElementById(id);
const FRONT_NAMES = ['F', 'R', 'B', 'L'];
const SOLVED = {
    corner_perm: [0, 1, 2, 3, 4, 5, 6, 7], corner_ori: [0, 0, 0, 0, 0, 0, 0, 0],
    edge_perm: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], edge_ori: Array(12).fill(0),
};

let wasm, state = SOLVED, front = 0, history = [], pending = null, busy = false;
let net = {}, paintColor = 0;

const style = () => $('tk-style').value;

function show() {
    renderState(state);
    const s = wasm.takahashiSuggest(state, style());
    $('tk-stage').textContent = s.stage_label;
    $('tk-status').classList.toggle('solved', s.stage === 'Solved');
    $('tk-history').textContent = history.map((h) => h.label).join('  ·  ') || '-';
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
                state = wasm.applyTo(state, m);
                renderState(state);
                await sleep(220);
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

function chooseFront(k) {
    front = k;
    setFront(k);
    document.querySelectorAll('#tk-front button').forEach((b) => b.classList.toggle('active', +b.dataset.front === k));
}

function renderOps() {
    const box = $('tk-ops');
    box.innerHTML = '';
    const add = (label, title, onclick, id) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.title = title;
        b.dataset.op = id;
        b.onclick = onclick;
        box.appendChild(b);
    };
    const group = (t) => { const d = document.createElement('div'); d.className = 'op-group'; d.textContent = t; box.appendChild(d); };
    group('Top layer');
    for (const u of ['U', "U'", 'U2']) add(u, u, () => apply(u, u), u === "U'" ? 'Up' : u);
    group('Front-relative operations (uses the front chosen above)');
    for (const t of wasm.takahashiTemplates(style())) {
        add(t.name, t.rel, () => {
            const alg = wasm.mapFront(t.rel, front);
            apply(alg, `${t.name} [${FRONT_NAMES[front]}]`);
        }, t.id);
    }
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
    const isU = step.id.startsWith('U') || step.id.startsWith('m');
    const where = isU ? '' : ` with <b>${FRONT_NAMES[step.front]}</b> as the front`;
    const rest = s.plan.slice(1).map((o) => o.name).join(' → ');
    out.innerHTML = `<div class="next">Next: ${escape(step.name.replace(/ \[front .\]$/, ''))}${where}</div>`
        + (isU ? '' : `<div>relative: <code>${escape(step.rel)}</code> · actual: <code>${escape(step.alg)}</code></div>`)
        + `<div>${escape(s.stage_label)}: ${s.plan.length} operation(s) to the next milestone.</div>`
        + (rest ? `<details><summary>Show the rest</summary>${escape(rest)}</details>` : '');
    $('tk-do-next').classList.remove('hidden');
    if (!isU) chooseFront(step.front);
    const opId = isU ? step.id : step.id.replace(/\d$/, '');
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
    out.textContent = '✓ Loaded';
    out.className = 'attempt-result ok';
    setState(res.state, 'From the net');
    $('train-anchor')?.scrollIntoView({ behavior: 'smooth' });
}

export function initTakahashi(w) {
    wasm = w;
    $('tk-scramble').onclick = scramble;
    $('tk-solved').onclick = () => setState(SOLVED, '');
    $('tk-paint').onclick = () => { net = netFromState(state); renderNet(); $('tk-net').scrollIntoView({ behavior: 'smooth' }); };
    document.querySelectorAll('#tk-front button').forEach((b) => (b.onclick = () => chooseFront(+b.dataset.front)));
    $('tk-style').onchange = () => { renderOps(); clearHint(); };
    const typed = () => {
        try {
            const rel = $('tk-input').value.trim();
            if (!rel) return;
            apply(wasm.mapFront(rel, front), `${rel} [${FRONT_NAMES[front]}]`);
            $('tk-input').value = '';
        } catch (e) { $('tk-hint').textContent = String(e); }
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
    chooseFront(front);
    show();
}
