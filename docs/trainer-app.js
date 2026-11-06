import { setupScene, renderState, resetCamera } from './cube-view.js';

let wasm, trainer, setId, revealed = false;
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
    renderState(trainer.currentState());
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
            $('train').scrollIntoView({ behavior: 'smooth' });
        };
        list.appendChild(el);
    }
}

// Apply the learner's alg to the case and check it solves (up to an AUF).
function tryAttempt() {
    const c = trainer.current();
    const attempt = $('attempt-input').value.trim();
    const out = $('attempt-result');
    if (!attempt) return;
    try {
        const setup = wasm.invertAlgorithm(c.alg);
        let solved = false, auf = '';
        for (const u of ['', 'U', 'U2', "U'"]) {
            const st = wasm.stateAfter(`${setup} ${attempt} ${u}`.trim());
            if (isSolved(st)) { solved = true; auf = u; break; }
        }
        renderState(wasm.stateAfter(`${setup} ${attempt}`));
        out.textContent = solved ? `✓ Solved${auf ? ` (+ ${auf})` : ''}` : '✗ Not solved';
        out.className = 'attempt-result ' + (solved ? 'ok' : 'ng');
    } catch (e) {
        out.textContent = String(e);
        out.className = 'attempt-result ng';
    }
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
    $('show-case-btn').onclick = () => renderState(trainer.currentState());
    $('camera-btn').onclick = resetCamera;
    $('reset-btn').onclick = () => {
        if (!confirm('Reset all progress for this set?')) return;
        trainer.resetProgress();
        save();
        nextCase();
    };
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        if (e.code === 'Space') { e.preventDefault(); setRevealed(true); }
        const g = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }[e.code];
        if (g !== undefined) grade(g);
    });
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

        const last = localStorage.getItem('alg-trainer:last-set');
        const first = wasm.listSets().find((s) => s.id === last)?.id ?? wasm.listSets()[0].id;
        $('set-select').value = first;
        loadSet(first);
        setTimeout(view.resize, 50);
        updateProgress(100, 'Ready!');
    } catch (error) {
        console.error('Error during initialization:', error);
        $('loading').innerHTML = `<h2>❌ Error Loading</h2><p>${error.message}</p>`;
    }
}
