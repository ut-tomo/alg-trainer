import { setupScene, renderState, resetCamera, setFront } from './cube-view.js';
import { initTakahashi, enterTakahashi, onModeHook, toPhysical, holdLabel, refreshHold, renderFaceTurns, animateAlg } from './tk-app.js';

let wasm, trainer, setId, revealed = false;
// the case state the learner is working on, and undo stack
let pllState = null, pllUndo = [], pllBusy = false;
const $ = (id) => document.getElementById(id);
const storageKey = (id) => `alg-trainer:${id}`;

function updateProgress(percent, status) {
    $('progress-bar').style.width = percent + '%';
    $('loading-status').textContent = status;
}

function save() {
    localStorage.setItem(storageKey(setId), trainer.exportProgress());
}

function loadSet(id) {
    setId = id;
    localStorage.setItem('alg-trainer:last-set', id);
    trainer = new wasm.Trainer(id, localStorage.getItem(storageKey(id)));
    $('set-description').textContent = trainer.setDescription();
    nextCase();
}

function showCase() {
    const c = trainer.current();
    pllState = trainer.currentState();
    pllUndo = [];
    renderState(pllState);
    $('case-name').textContent = c.id;
    $('case-group').textContent = c.group;
    $('case-alg').textContent = c.alg;
    $('attempt-result').textContent = '';
    $('attempt-result').className = 'attempt-result';
    setRevealed(false);
    refreshStats();
}

function nextCase() {
    trainer.next(Date.now());
    showCase();
}

function setRevealed(v) {
    revealed = v;
    $('case-alg').classList.toggle('hidden', !v);
    $('grade-row').classList.toggle('hidden', !v);
    $('reveal-row').classList.toggle('hidden', v);
}

function grade(g) {
    if (!revealed) return;
    trainer.grade(g, Date.now());
    save();
    nextCase();
}

function refreshStats() {
    const s = trainer.stats(Date.now());
    $('stat-due').textContent = s.due;
    $('stat-new').textContent = s.new;
    $('stat-learned').textContent = s.learned;
    $('stat-total').textContent = s.total;
    renderCaseList();
}

function level(card) {
    if (card.seen === 0) return 'new';
    if (card.reps === 0) return 'again';
    if (card.reps < 2) return 'learning';
    return 'learned';
}

function renderCaseList() {
    const list = $('case-list');
    const current = trainer.current();
    list.innerHTML = '';
    let group = null;
    for (const c of trainer.cases()) {
        if (c.group !== group) {
            group = c.group;
            const h = document.createElement('h3');
            h.textContent = group;
            list.appendChild(h);
        }
        const el = document.createElement('button');
        el.className = `case-chip ${level(c.card)}` + (current && current.index === c.index ? ' current' : '');
        el.textContent = c.id;
        el.title = c.alg;
        el.onclick = () => {
            trainer.select(c.index);
            showCase();
            $('app').scrollIntoView({ behavior: 'smooth' });
        };
        list.appendChild(el);
    }
}

// solved up to a final U turn (AUF)?
function solvedWithAuf(st) {
    for (const u of ['', 'U', 'U2', "U'"]) {
        if (isSolved(u ? wasm.applyTo(st, u) : st)) return { ok: true, auf: u };
    }
    return { ok: false };
}

// Apply moves written relative to how the learner holds the cube, then check.
async function pllApply(rel) {
    const out = $('attempt-result');
    if (pllBusy || !rel.trim()) return;
    let phys;
    try { phys = toPhysical(rel); } catch (e) { out.textContent = String(e.message || e); out.className = 'attempt-result ng'; return; }
    pllBusy = true;
    try {
        pllUndo.push(pllState);
        pllState = await animateAlg(pllState, phys);
        const r = solvedWithAuf(pllState);
        out.textContent = r.ok ? `✓ Solved${r.auf ? ` (+ ${r.auf})` : ''}` : '';
        out.className = 'attempt-result ' + (r.ok ? 'ok' : '');
    } finally { pllBusy = false; }
}

function tryAttempt() {
    const v = $('attempt-input').value;
    $('attempt-input').value = '';
    pllApply(v);
}

function isSolved(s) {
    return s.corner_perm.every((v, i) => v === i) && s.edge_perm.every((v, i) => v === i)
        && s.corner_ori.every((v) => v === 0) && s.edge_ori.every((v) => v === 0);
}

function bindUI() {
    for (const s of wasm.listSets()) {
        const o = document.createElement('option');
        o.value = s.id;
        o.textContent = `${s.name} (${s.count})`;
        $('set-select').appendChild(o);
    }
    $('set-select').onchange = (e) => loadSet(e.target.value);
    $('reveal-btn').onclick = () => setRevealed(true);
    for (const b of document.querySelectorAll('#grade-row button')) {
        b.onclick = () => grade(+b.dataset.grade);
    }
    $('attempt-btn').onclick = tryAttempt;
    $('attempt-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') tryAttempt(); });
    $('show-case-btn').onclick = () => { pllState = trainer.currentState(); pllUndo = []; renderState(pllState); $('attempt-result').textContent = ''; };
    $('pll-undo').onclick = () => { if (pllUndo.length && !pllBusy) { pllState = pllUndo.pop(); renderState(pllState); $('attempt-result').textContent = ''; } };
    renderFaceTurns($('pll-ops'), (m) => pllApply(m));
    $('camera-btn').onclick = resetCamera;
    $('reset-btn').onclick = () => {
        if (!confirm('Reset all progress for this set?')) return;
        trainer.resetProgress();
        save();
        nextCase();
    };
    document.addEventListener('keydown', (e) => {
        if (mode !== 'pll' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        if (e.code === 'Space') { e.preventDefault(); setRevealed(true); }
        const g = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }[e.code];
        if (g !== undefined) grade(g);
    });
}

let mode = null;
function setMode(m) {
    if (m === mode) return;
    mode = m;
    localStorage.setItem('alg-trainer:mode', m);
    $('mode-select').value = m;
    document.body.classList.remove('pll', 'takahashi');
    document.body.classList.add(m);
    if (m === 'pll') {
        refreshHold();
        if (trainer) renderState(pllState ?? trainer.currentState());
    } else {
        enterTakahashi();
    }
    window.dispatchEvent(new Event('resize'));
}

export async function main() {
    try {
        updateProgress(10, 'Loading WASM module...');
        wasm = await import('./pkg/trainer_wasm.js');
        updateProgress(40, 'Initializing WASM...');
        await wasm.default();

        updateProgress(70, 'Setting up scene...');
        $('loading').style.display = 'none';
        $('app').style.display = 'grid';
        const view = setupScene($('canvas-container'));
        bindUI();

        initTakahashi(wasm);
        onModeHook(setMode);
        $('mode-select').onchange = (e) => setMode(e.target.value);

        const last = localStorage.getItem('alg-trainer:last-set');
        const first = wasm.listSets().find((s) => s.id === last)?.id ?? wasm.listSets()[0].id;
        $('set-select').value = first;
        loadSet(first);
        setMode(localStorage.getItem('alg-trainer:mode') || 'takahashi');
        setTimeout(view.resize, 50);
        updateProgress(100, 'Ready!');
    } catch (error) {
        console.error('Error during initialization:', error);
        $('loading').innerHTML = `<h2>❌ Error Loading</h2><p>${error.message}</p>`;
    }
}
