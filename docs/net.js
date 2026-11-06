// net.js: 2D net <-> cube state (uses the same color tables as cube-view.js)
import {
    CORNER_POSITIONS, CORNER_BASE_COLORS, CORNER_POSITION_INFO, EDGE_POSITIONS,
    getCornerColors, getEdgeColors,
} from './cube-view.js';

// face index = solved color index: 0 U, 1 D, 2 L, 3 R, 4 F, 5 B
export const FACES = ['U', 'D', 'L', 'R', 'F', 'B'];
const DIR = { U: 'top', D: 'bottom', L: 'left', R: 'right', F: 'front', B: 'back' };
const EDGE_MAPPING = [
    ['top', 'front'], ['top', 'right'], ['top', 'back'], ['top', 'left'],
    ['front', 'left'], ['front', 'right'], ['back', 'right'], ['back', 'left'],
    ['bottom', 'front'], ['bottom', 'right'], ['bottom', 'back'], ['bottom', 'left'],
];
export const COLOR_CSS = ['#ffffff', '#ffff00', '#ff9533', '#e53935', '#00e000', '#42a5f5'];
export const COLOR_NAME = ['white', 'yellow', 'orange', 'red', 'green', 'blue'];

// cubie coordinate of sticker (row r, col c) on a face, as seen in the net
export function netCoord(face, r, c) {
    switch (face) {
        case 'U': return [c - 1, 1, r - 1];
        case 'D': return [c - 1, -1, 1 - r];
        case 'F': return [c - 1, 1 - r, 1];
        case 'B': return [1 - c, 1 - r, -1];
        case 'R': return [1, 1 - r, 1 - c];
        case 'L': return [-1, 1 - r, c - 1];
    }
}
const key = (dir, p) => `${dir}:${p.join(',')}`;

/** state -> { "U:r,c": colorIndex } */
export function netFromState(state) {
    const byPos = {};
    for (let i = 0; i < 8; i++) {
        const cols = getCornerColors(i, state);
        for (const d in cols) if (cols[d] >= 0) byPos[key(d, CORNER_POSITIONS[i].pos)] = cols[d];
    }
    for (let i = 0; i < 12; i++) {
        const cols = getEdgeColors(i, state);
        for (const d in cols) if (cols[d] >= 0) byPos[key(d, EDGE_POSITIONS[i].pos)] = cols[d];
    }
    const net = {};
    FACES.forEach((f, fi) => {
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
            net[`${f}:${r},${c}`] = (r === 1 && c === 1) ? fi : byPos[key(DIR[f], netCoord(f, r, c))];
        }
    });
    return net;
}

/** net -> { state } or { error } */
export function stateFromNet(net) {
    const byPos = {};
    for (const f of FACES) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const v = net[`${f}:${r},${c}`];
        if (v === undefined || v < 0) return { error: `Sticker ${f} row ${r + 1} col ${c + 1} has no color` };
        byPos[key(DIR[f], netCoord(f, r, c))] = v;
    }
    const counts = [0, 0, 0, 0, 0, 0];
    Object.values(byPos).forEach((v) => counts[v]++);
    const bad = counts.findIndex((n) => n !== 9);
    if (bad >= 0) return { error: `There are ${counts[bad]} ${COLOR_NAME[bad]} stickers (need 9)` };

    const corner_perm = [], corner_ori = [], edge_perm = [], edge_ori = [];
    for (let i = 0; i < 8; i++) {
        const info = CORNER_POSITION_INFO[i], p = CORNER_POSITIONS[i].pos;
        const cols = [info.yFace, info.side1, info.side2].map((d) => byPos[key(d, p)]);
        let found = false;
        for (let piece = 0; piece < 8 && !found; piece++) {
            const b = CORNER_BASE_COLORS[piece];
            for (let o = 0; o < 3; o++) {
                if ([0, 1, 2].every((j) => b[(j + o) % 3] === cols[j])) {
                    corner_perm.push(piece); corner_ori.push(o); found = true; break;
                }
            }
        }
        if (!found) return { error: `Corner ${i + 1} (${cols.map((c) => COLOR_NAME[c]).join('/')}) doesn't exist on a real cube` };
    }
    for (let i = 0; i < 12; i++) {
        const p = EDGE_POSITIONS[i].pos;
        const [a, b] = EDGE_MAPPING[i].map((d) => byPos[key(d, p)]);
        const piece = EDGE_POSITIONS.findIndex((e) => (e.faces[0] === a && e.faces[1] === b) || (e.faces[0] === b && e.faces[1] === a));
        if (piece < 0) return { error: `Edge ${COLOR_NAME[a]}/${COLOR_NAME[b]} doesn't exist on a real cube` };
        edge_perm.push(piece);
        edge_ori.push(EDGE_POSITIONS[piece].faces[0] === a ? 0 : 1);
    }
    if (new Set(corner_perm).size !== 8) return { error: 'The same corner appears twice' };
    if (new Set(edge_perm).size !== 12) return { error: 'The same edge appears twice' };
    return { state: { corner_perm, corner_ori, edge_perm, edge_ori } };
}
