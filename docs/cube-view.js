// cube-view.js: three.js cube renderer (ported from rubik-playground/docs/cube-app.js)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls, cubeGroup;
// Corner positions and color definitions
export const CORNER_POSITIONS = [
    { pos: [-1, 1, 1] },   // 0: UFL
    { pos: [1, 1, 1] },    // 1: UFR
    { pos: [1, 1, -1] },   // 2: UBR
    { pos: [-1, 1, -1] },  // 3: UBL
    { pos: [-1, -1, 1] },  // 4: DFL
    { pos: [1, -1, 1] },   // 5: DFR
    { pos: [1, -1, -1] },  // 6: DBR
    { pos: [-1, -1, -1] }, // 7: DBL
];

export const CORNER_BASE_COLORS = [
    [0, 2, 4],  // 0: UFL (黄・青・赤)
    [0, 4, 3],  // 1: UFR (黄・赤・緑)
    [0, 3, 5],  // 2: UBR (黄・緑・橙)
    [0, 5, 2],  // 3: UBL (黄・橙・青)
    [1, 4, 2],  // 4: DFL (白・赤・青)
    [1, 3, 4],  // 5: DFR (白・緑・赤)
    [1, 5, 3],  // 6: DBR (白・橙・緑)
    [1, 2, 5]   // 7: DBL (白・青・橙)
];

export const CORNER_POSITION_INFO = [
    { yFace: 'top', side1: 'left', side2: 'front' },
    { yFace: 'top', side1: 'front', side2: 'right' },
    { yFace: 'top', side1: 'right', side2: 'back' },
    { yFace: 'top', side1: 'back', side2: 'left' },
    { yFace: 'bottom', side1: 'front', side2: 'left' },
    { yFace: 'bottom', side1: 'right', side2: 'front' },
    { yFace: 'bottom', side1: 'back', side2: 'right' },
    { yFace: 'bottom', side1: 'left', side2: 'back' }
];

export const EDGE_POSITIONS = [
    { pos: [0, 1, 1], faces: [0, 4] },
    { pos: [1, 1, 0], faces: [0, 3] },
    { pos: [0, 1, -1], faces: [0, 5] },
    { pos: [-1, 1, 0], faces: [0, 2] },
    { pos: [-1, 0, 1], faces: [4, 2] },
    { pos: [1, 0, 1], faces: [4, 3] },
    { pos: [1, 0, -1], faces: [5, 3] },
    { pos: [-1, 0, -1], faces: [5, 2] },
    { pos: [0, -1, 1], faces: [1, 4] },
    { pos: [1, -1, 0], faces: [1, 3] },
    { pos: [0, -1, -1], faces: [1, 5] },
    { pos: [-1, -1, 0], faces: [1, 2] },
];
export function getCornerColors(cornerIndex, state) {
    const perm = state.corner_perm[cornerIndex];
    const ori = state.corner_ori[cornerIndex];
    const baseColors = CORNER_BASE_COLORS[perm];
    
    let rotatedColors;
    if (ori === 0) {
        rotatedColors = [baseColors[0], baseColors[1], baseColors[2]];
    } else if (ori === 1) {
        rotatedColors = [baseColors[1], baseColors[2], baseColors[0]];
    } else {
        rotatedColors = [baseColors[2], baseColors[0], baseColors[1]];
    }
    
    const posInfo = CORNER_POSITION_INFO[cornerIndex];
    const result = {
        top: -1, bottom: -1, left: -1,
        right: -1, front: -1, back: -1
    };
    
    result[posInfo.yFace] = rotatedColors[0];
    result[posInfo.side1] = rotatedColors[1];
    result[posInfo.side2] = rotatedColors[2];
    
    return result;
}

export function getEdgeColors(edgeIndex, state) {
    const perm = state.edge_perm[edgeIndex];
    const ori = state.edge_ori[edgeIndex];
    const originalFaces = EDGE_POSITIONS[perm].faces;
    
    const [color1, color2] = ori === 1 ? 
        [originalFaces[1], originalFaces[0]] : 
        [originalFaces[0], originalFaces[1]];
    
    const result = {
        right: -1, left: -1, top: -1,
        bottom: -1, front: -1, back: -1
    };
    
    const edgeMapping = [
        ['top', 'front'], ['top', 'right'], ['top', 'back'], ['top', 'left'],
        ['front', 'left'], ['front', 'right'], ['back', 'right'], ['back', 'left'],
        ['bottom', 'front'], ['bottom', 'right'], ['bottom', 'back'], ['bottom', 'left']
    ];
    
    if (edgeIndex < edgeMapping.length) {
        const [face1, face2] = edgeMapping[edgeIndex];
        result[face1] = color1;
        result[face2] = color2;
    }
    
    return result;
}

function createCubeVisualization(state) {
    if (cubeGroup) {
        scene.remove(cubeGroup);
        cubeGroup.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
    
    cubeGroup = new THREE.Group();
    
    const cubeSize = 0.98;
    const gap = 0.02;
    const bgColor = 0xE9ECEF; 
    // More saturated, less-washed palette
    const colorMap = {
        0: 0xffffff, // white
        1: 0xFFFF00, // yellow
        2: 0xFF9533, // orange
        3: 0xFF4D6D, // stronger pink
        4: 0x00FF00, // vivid yellow-green
        5: 0x42A5F5, // blue
    };
    
    // Helper to create face material with special handling for white
    function makeFaceMaterial(faceColor) {
        const isBg = faceColor === bgColor;
        const isWhite = faceColor === 0xffffff;
        if (isWhite) {
            return new THREE.MeshStandardMaterial({ color: faceColor, roughness: 0.15, emissive: 0xffffff, emissiveIntensity: 0.9 });
        }
        if (isBg) {
            // background panels: keep subtle
            return new THREE.MeshStandardMaterial({ color: faceColor, roughness: 0.6 });
        }
        // regular colored faces: moderate roughness so colors pop
        return new THREE.MeshStandardMaterial({ color: faceColor, roughness: 0.32 });
    }
        
    
    // Create corners
    for (let i = 0; i < 8; i++) {
        const [x, y, z] = CORNER_POSITIONS[i].pos;
        const colors = getCornerColors(i, state);
        
            const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
            const faceRight = colors.right >= 0 ? colorMap[colors.right] : bgColor;
            const faceLeft = colors.left >= 0 ? colorMap[colors.left] : bgColor;
            const faceTop = colors.top >= 0 ? colorMap[colors.top] : bgColor;
            const faceBottom = colors.bottom >= 0 ? colorMap[colors.bottom] : bgColor;
            const faceFront = colors.front >= 0 ? colorMap[colors.front] : bgColor;
            const faceBack = colors.back >= 0 ? colorMap[colors.back] : bgColor;
            const materials = [
                makeFaceMaterial(faceRight),
                makeFaceMaterial(faceLeft),
                makeFaceMaterial(faceTop),
                makeFaceMaterial(faceBottom),
                makeFaceMaterial(faceFront),
                makeFaceMaterial(faceBack),
            ];
        
        const cubelet = new THREE.Mesh(geometry, materials);
        cubelet.position.set(x * (cubeSize + gap), y * (cubeSize + gap), z * (cubeSize + gap));
        
        const edges = new THREE.EdgesGeometry(geometry);
        // Make the cubelet edges solid black for clear boundaries between cubelets
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1, transparent: false, opacity: 1 }));
        cubelet.add(line);
        cubeGroup.add(cubelet);
    }
    
    // Create edges
    for (let i = 0; i < 12; i++) {
        const [x, y, z] = EDGE_POSITIONS[i].pos;
        const colors = getEdgeColors(i, state);
        
        const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const faceR = colors.right >= 0 ? colorMap[colors.right] : bgColor;
        const faceL = colors.left >= 0 ? colorMap[colors.left] : bgColor;
        const faceT = colors.top >= 0 ? colorMap[colors.top] : bgColor;
        const faceB = colors.bottom >= 0 ? colorMap[colors.bottom] : bgColor;
        const faceF = colors.front >= 0 ? colorMap[colors.front] : bgColor;
        const faceBa = colors.back >= 0 ? colorMap[colors.back] : bgColor;
        const materials = [
            makeFaceMaterial(faceR),
            makeFaceMaterial(faceL),
            makeFaceMaterial(faceT),
            makeFaceMaterial(faceB),
            makeFaceMaterial(faceF),
            makeFaceMaterial(faceBa),
        ];
        
        const cubelet = new THREE.Mesh(geometry, materials);
        cubelet.position.set(x * (cubeSize + gap), y * (cubeSize + gap), z * (cubeSize + gap));
        
        const edges = new THREE.EdgesGeometry(geometry);
        // Make the cubelet edges solid black for clear boundaries between cubelets
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1, transparent: false, opacity: 1 }));
        cubelet.add(line);
        cubeGroup.add(cubelet);
    }
    
    // Create centers
    const centers = [
        { pos: [1, 0, 0], color: 3 },
        { pos: [-1, 0, 0], color: 2 },
        { pos: [0, 1, 0], color: 0 },
        { pos: [0, -1, 0], color: 1 },
        { pos: [0, 0, 1], color: 4 },
        { pos: [0, 0, -1], color: 5 },
    ];
    
    for (const center of centers) {
        const [x, y, z] = center.pos;
        const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const matPosX = x === 1 ? colorMap[center.color] : bgColor;
        const matNegX = x === -1 ? colorMap[center.color] : bgColor;
        const matPosY = y === 1 ? colorMap[center.color] : bgColor;
        const matNegY = y === -1 ? colorMap[center.color] : bgColor;
        const matPosZ = z === 1 ? colorMap[center.color] : bgColor;
        const matNegZ = z === -1 ? colorMap[center.color] : bgColor;
        const materials = [
            makeFaceMaterial(matPosX),
            makeFaceMaterial(matNegX),
            makeFaceMaterial(matPosY),
            makeFaceMaterial(matNegY),
            makeFaceMaterial(matPosZ),
            makeFaceMaterial(matNegZ),
        ];
        
        const cubelet = new THREE.Mesh(geometry, materials);
        cubelet.position.set(x * (cubeSize + gap), y * (cubeSize + gap), z * (cubeSize + gap));
        
    const edges = new THREE.EdgesGeometry(geometry);
    // Solid black borders for centers as well
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1, transparent: false, opacity: 1 }));
        cubelet.add(line);
        cubeGroup.add(cubelet);
    }
    
    scene.add(cubeGroup);
}

export function setupScene(container) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xE9ECEF);

    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    // looking down at the U face slightly from the front-right, like a last-layer case image
    camera.position.set(3.2, 6, 4.6);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const d1 = new THREE.DirectionalLight(0xffffff, 1.2);
    d1.position.set(5, 10, 5);
    scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.8);
    d2.position.set(-5, -5, -5);
    scene.add(d2);

    const resize = () => {
        const w = container.clientWidth, h = container.clientHeight;
        if (w > 0 && h > 0) {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }
    };
    window.addEventListener('resize', resize);
    resize();

    (function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    })();
    return { resize };
}

export function renderState(state) {
    createCubeVisualization(state);
}

let frontIndex = 0;
// view = { up: [x,y,z], front: [x,y,z] } in cube coordinates (U = +y, F = +z, R = +x)
let view = null;
// Rotate the camera so face k (0 F, 1 R, 2 B, 3 L) faces the viewer, white on top.
export function setFront(k) {
    frontIndex = k;
    view = null;
    resetCamera();
}

// Hold the cube with any face up and any adjacent face toward the viewer.
export function setView(up, front) {
    view = { up, front };
    resetCamera();
}

function rebuildControls(up) {
    const target = new THREE.Vector3(0, 0, 0);
    camera.up.set(up[0], up[1], up[2]);
    if (controls) controls.dispose();
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.copy(target);
}

export function resetCamera() {
    let up = [0, 1, 0], pos;
    if (view) {
        const [u, f] = [view.up, view.front];
        const r = [u[1] * f[2] - u[2] * f[1], u[2] * f[0] - u[0] * f[2], u[0] * f[1] - u[1] * f[0]];
        up = u;
        pos = [0, 1, 2].map((i) => r[i] * 3.2 + u[i] * 6 + f[i] * 4.6);
    } else {
        let [x, z] = [3.2, 4.6];
        for (let i = 0; i < frontIndex; i++) [x, z] = [z, -x];
        pos = [x, 6, z];
    }
    camera.position.set(pos[0], pos[1], pos[2]);
    rebuildControls(up);
    camera.lookAt(0, 0, 0);
}

const FACE_AXIS = { U: [0, 1, 0], D: [0, -1, 0], R: [1, 0, 0], L: [-1, 0, 0], F: [0, 0, 1], B: [0, 0, -1] };
// Turn one layer of the currently drawn cube smoothly, e.g. "R", "U'", "F2".
// Resolves when the turn ends; call renderState with the new state afterwards.
export function animateMove(move, ms = 220) {
    const n = FACE_AXIS[move[0]];
    if (!cubeGroup || !n) return Promise.resolve();
    const axis = new THREE.Vector3(...n);
    const turns = move.includes('2') ? 2 : 1;
    const angle = (move.includes("'") ? 1 : -1) * turns * Math.PI / 2;
    const pivot = new THREE.Group();
    cubeGroup.add(pivot);
    for (const c of [...cubeGroup.children]) {
        if (c !== pivot && c.position.dot(axis) > 0.5) pivot.attach(c);
    }
    const dur = ms * (turns === 2 ? 1.5 : 1);
    const t0 = performance.now();
    return new Promise((resolve) => {
        (function step(now) {
            const t = Math.min(1, (now - t0) / dur);
            const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; // ease in-out
            pivot.quaternion.setFromAxisAngle(axis, angle * e);
            if (t < 1) requestAnimationFrame(step); else resolve();
        })(t0);
    });
}
