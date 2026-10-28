// The landing page's hero: a wardrobe that builds itself, exploded-view style. It renders a real
// design through the viewer's own builders, then flies each part in (with a spin) to its place:
// the carcass first, partitions and shelves from the front, then drawers and rails, and the
// doors last. Afterwards the camera drifts and leans toward the pointer. Reduced motion shows the
// finished wardrobe, still. Visual only: it reads the design and never changes any state.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildWardrobe, disposeWardrobe } from '../viewer/buildWardrobe.js';
import { createMaterials } from '../viewer/materials.js';
import { toM } from '../viewer/units.js';

// Build order and where each kind of part flies in from (metres, before easing in).
export const ORDER = ['carcass', 'partition', 'shelf', 'drawer', 'rail', 'door', 'hardware'];
const ARRIVAL = {
  carcass: new THREE.Vector3(0, 2.2, -0.6),
  partition: new THREE.Vector3(0, 0.4, 2.0),
  shelf: new THREE.Vector3(0, 0.2, 1.8),
  drawer: new THREE.Vector3(0, -0.2, 1.6),
  rail: new THREE.Vector3(0, 1.0, 0.6),
  door: new THREE.Vector3(0, 0, 1.4),
  hardware: new THREE.Vector3(0, 0, 1.4),
};
const STAGGER = 95; // ms between parts
const DURATION = 900; // ms per part
const PAUSE_BEFORE_DOORS = 650; // ms to admire the interior

const easeOutBack = (t) => {
  const c = 1.4;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
// Pointer control: how far the wardrobe turns toward the cursor, and how quickly it follows.
const TURN = 0.75; // radians at the edge of the hero
const TILT = 0.2; // camera lift at the top or bottom edge
const FOLLOW = 0.1; // share of the remaining distance covered each frame (smooth, no lag spikes)
const DOOR_OPEN = 1.75; // radians a hinged door swings open (about 100 degrees)
const PEEK_AFTER = 700; // ms after the build before the doors open to show the interior once
const PEEK_FOR = 2600; // ms they stay open on that first peek

/**
 * Put each hinged door (panel, outline and handle, built next to each other) on a pivot at its
 * hinge edge, so the three swing together. Returns the pivots; the doors' `kind` moves to them.
 */
function hingeDoors(wardrobe) {
  const pivots = [];
  const children = [...wardrobe.children];
  children.forEach((panel, i) => {
    const { kind, hingeSide } = panel.userData;
    if (kind !== 'door' || !hingeSide) return;
    panel.geometry.computeBoundingBox();
    const box = panel.geometry.boundingBox;
    const halfWidth = (box.max.x - box.min.x) / 2;
    const halfDepth = (box.max.z - box.min.z) / 2;
    const pivot = new THREE.Group();
    pivot.position.set(panel.position.x + (hingeSide === 'left' ? -halfWidth : halfWidth), 0, panel.position.z - halfDepth);
    pivot.userData = { kind: 'door', hingeSide };
    wardrobe.add(pivot);
    // The panel's outline and handle follow it in the build order.
    [panel, children[i + 1], children[i + 2]]
      .filter((part) => part && (part === panel || part.userData.kind === 'hardware'))
      .forEach((part) => {
        part.position.sub(pivot.position);
        pivot.add(part);
      });
    pivots.push(pivot);
  });
  return pivots;
}

/** Deterministic pseudo-random numbers, so the build looks the same every time. */
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/**
 * `onPhase(kind)` fires as each kind of part starts arriving and `onBuilt()` when the last part
 * lands; `onFrame(project)` runs every frame with a function that maps a point given in design
 * millimetres (x from the left, y from the floor, z from the front) to stage pixels.
 */
export function createAssembly(container, design, catalog, {
  reducedMotion = false, onPhase = () => {}, onBuilt = () => {}, onFrame = () => {},
} = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.append(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environmentIntensity = 0.45;
  scene.add(new THREE.HemisphereLight('#fff6ee', '#d9c2b0', 0.7));
  const sun = new THREE.DirectionalLight('#fff0dc', 2.4);
  sun.position.set(-2.5, 4.5, 3.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.radius = 6;
  Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 });
  scene.add(sun);
  // A warm rim light from behind gives the parts a glowing edge as they land.
  const rim = new THREE.DirectionalLight('#ffb27a', 1.2);
  rim.position.set(2.5, 2.5, -3);
  scene.add(rim);

  const materials = createMaterials(catalog);
  const wardrobe = buildWardrobe(design, materials, { doorsVisible: true });
  const { width, height, depth } = design.dimensions;
  const offset = new THREE.Vector3(-toM(width) / 2, 0, toM(depth) / 2); // centred on the origin
  wardrobe.position.copy(offset);
  wardrobe.traverse((mesh) => { if (mesh.isMesh) mesh.castShadow = true; });
  const pivots = hingeDoors(wardrobe);
  // The doors get their own material, so the landing page can recolour them live.
  const doorPanels = pivots.map((pivot) => pivot.children.find((part) => part.userData.kind === 'door'));
  const doorMaterial = doorPanels[0]?.material.clone() ?? null;
  doorPanels.forEach((panel) => { panel.material = doorMaterial; });
  const doorColour = doorMaterial ? doorMaterial.color.clone() : null;
  scene.add(wardrobe);
  sun.target.position.set(0, 0, 0);
  scene.add(sun.target);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.18 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const target = new THREE.Vector3(0, toM(height) * 0.48, 0);
  const radius = Math.max(toM(width), toM(height)) * 2.9;

  // Each part's resting place, where it flies in from, its spin and its start time.
  const random = seeded(width * 7 + height);
  const kindOf = (mesh) => (ORDER.includes(mesh.userData.kind) ? mesh.userData.kind : 'hardware');
  const sorted = [...wardrobe.children]
    .sort((a, b) => ORDER.indexOf(kindOf(a)) - ORDER.indexOf(kindOf(b)) || a.position.y - b.position.y);
  const doorsStart = sorted.findIndex((m) => kindOf(m) === 'door');
  const parts = sorted.map((mesh, i) => {
    const kind = kindOf(mesh);
    const delay = i * STAGGER + (doorsStart >= 0 && i >= doorsStart ? PAUSE_BEFORE_DOORS : 0);
    const spread = new THREE.Vector3((random() - 0.5) * 0.8, (random() - 0.5) * 0.3, 0);
    const spin = new THREE.Euler((random() - 0.5) * 0.9, (random() - 0.5) * 1.6, (random() - 0.5) * 0.6);
    return { mesh, kind, rest: mesh.position.clone(), from: ARRIVAL[kind].clone().add(spread), spin, delay };
  });
  const total = Math.max(...parts.map((p) => p.delay)) + DURATION;
  const phases = ORDER.map((kind) => ({ kind, at: parts.find((p) => p.kind === kind)?.delay }))
    .filter((phase) => phase.at !== undefined);

  let start = performance.now();
  // The idle drift keeps its own clock, so pausing it under the pointer never makes it jump.
  let lastNow = start;
  let fired = new Set();
  let built = false;
  let frame = 0;
  // x, y: -1..1 across the hero. `hold` blends from the idle drift (0) to pointer control (1).
  const pointer = { x: 0, y: 0, smoothX: 0, smoothY: 0, active: false, hold: 0, driftAt: 0 };
  // Doors: 0 closed .. 1 open. `peeked` marks the one automatic look inside after the build.
  const doors = { open: 0, target: 0, peeked: false, forced: null };

  const pose = (now) => {
    const elapsed = reducedMotion ? total : now - start;
    const step = Math.min(now - lastNow, 50);
    lastNow = now;
    // The first peek inside, unless the customer already opened or closed the doors themselves.
    if (doors.forced === null && !reducedMotion) {
      const since = elapsed - total;
      doors.target = since > PEEK_AFTER && since < PEEK_AFTER + PEEK_FOR ? 1 : 0;
    } else if (doors.forced !== null) {
      doors.target = doors.forced;
    }
    doors.open += (doors.target - doors.open) * (reducedMotion ? 1 : 0.07);
    if (doorMaterial) doorMaterial.color.lerp(doorColour, reducedMotion ? 1 : 0.08);

    for (const { mesh, rest, from, spin, delay } of parts) {
      const t = Math.min(Math.max((elapsed - delay) / DURATION, 0), 1);
      const k = t === 0 ? 0 : easeOutBack(t);
      const r = 1 - easeOutCubic(t);
      mesh.visible = t > 0;
      mesh.position.copy(rest).addScaledVector(from, 1 - k);
      mesh.rotation.set(spin.x * r, spin.y * r, spin.z * r);
      const { hingeSide } = mesh.userData;
      if (hingeSide) mesh.rotation.y += (hingeSide === 'left' ? -1 : 1) * DOOR_OPEN * easeOutCubic(doors.open);
    }
    for (const { kind, at } of phases) {
      if (!fired.has(kind) && elapsed >= at) {
        fired.add(kind);
        onPhase(kind);
      }
    }
    if (!built && elapsed >= total) {
      built = true;
      onBuilt();
    }
    // Camera: swings in during the build. Afterwards it drifts on its own, unless the pointer is
    // over the hero: then the wardrobe turns toward the cursor, and glides back when it leaves.
    pointer.smoothX += (pointer.x - pointer.smoothX) * FOLLOW;
    pointer.smoothY += (pointer.y - pointer.smoothY) * FOLLOW;
    pointer.hold += ((pointer.active ? 1 : 0) - pointer.hold) * FOLLOW;
    pointer.driftAt += step * (1 - pointer.hold); // the drift pauses while the pointer holds it
    const drift = reducedMotion ? 0 : Math.max(pointer.driftAt - total, 0) / 1000;
    const intro = reducedMotion ? 0 : Math.max(1 - elapsed / total, 0);
    const idle = Math.sin(drift * 0.25) * 0.22;
    const angle = 0.5 - intro * 0.6 + (1 - pointer.hold) * idle - pointer.hold * pointer.smoothX * TURN;
    const lift = 0.22 + intro * 0.25 - pointer.hold * pointer.smoothY * TILT;
    camera.position.set(target.x + Math.sin(angle) * radius, target.y + radius * lift, target.z + Math.cos(angle) * radius);
    camera.lookAt(target);
  };

  const project = (xMm, yMm, zMm = 0) => {
    const point = new THREE.Vector3(toM(xMm), toM(yMm), -toM(zMm)).add(offset).project(camera);
    return { x: ((point.x + 1) / 2) * container.clientWidth, y: ((1 - point.y) / 2) * container.clientHeight };
  };

  const resize = () => {
    const { clientWidth, clientHeight } = container;
    renderer.setSize(clientWidth, clientHeight);
    camera.aspect = clientWidth / Math.max(clientHeight, 1);
    // A narrow stage widens the view so the whole wardrobe (and its shadow) stays in frame.
    camera.zoom = Math.min(1, camera.aspect / 0.95);
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  const loop = (now) => {
    pose(now);
    renderer.render(scene, camera);
    onFrame(project);
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);

  return {
    /** Turn toward the pointer: x and y in -1..1 across the hero (ignored with reduced motion). */
    setPointer(x, y) {
      if (reducedMotion) return;
      pointer.active = true;
      pointer.x = Math.max(-1, Math.min(1, x));
      pointer.y = Math.max(-1, Math.min(1, y));
    },
    /** Open (true) or close (false) the doors; this ends the automatic first peek. */
    setDoorsOpen(open) {
      doors.forced = open ? 1 : 0;
    },
    /** Recolour the doors, fading from the current colour. */
    setDoorColour(hex) {
      if (doorColour) doorColour.set(hex);
    },
    /** The pointer left: glide back to the idle drift. */
    releasePointer() {
      pointer.active = false;
      pointer.x = 0;
      pointer.y = 0;
    },
    /** Play the build again from an empty stage. */
    replay() {
      start = performance.now();
      pointer.driftAt = 0;
      doors.forced = null;
      doors.open = 0;
      fired = new Set();
      built = false;
    },
    dispose() {
      cancelAnimationFrame(frame);
      observer.disconnect();
      disposeWardrobe(wardrobe);
      doorMaterial?.dispose();
      materials.dispose();
      floor.geometry.dispose();
      floor.material.dispose();
      scene.environment.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
