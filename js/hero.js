// =============================================================================
// hero.js — a 4-DOF robot arm that reaches for the cursor.
// The arm is solved with closed-form inverse kinematics: base yaw points the
// arm at the target, a two-link planar solve places the wrist, and the wrist
// pitch keeps the gripper pointing straight down. Press to grip.
// =============================================================================
// Three.js (~250 KB) is imported only after the page has loaded and gone
// idle, so it never competes with first paint or the intro animation.
let THREE;

const canvas = document.getElementById('hero-canvas');
const hero = document.querySelector('.hero');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ── Geometry of the arm (world units) ─────────────────────────────────────
const SHOULDER_H = 0.78;   // shoulder joint height above the floor
const L1 = 1.6;            // upper arm
const L2 = 1.4;            // forearm
const L3 = 0.62;           // wrist joint to fingertips
const HOVER_H = 0.38;      // fingertip height while tracking
const GRIP_H = 0.1;        // fingertip height while gripping
const MIN_REACH = 0.7;
const SMOOTHING = 6;       // higher = snappier joint response

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) {
    return false;
  }
}

if (canvas && hero && supportsWebGL()) {
  const boot = async () => {
    THREE = await import('three');
    init();
  };
  const whenIdle = () => ('requestIdleCallback' in window
    ? requestIdleCallback(boot, { timeout: 2500 })
    : setTimeout(boot, 600));
  if (document.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle, { once: true });
}

function readTokens() {
  const css = getComputedStyle(document.documentElement);
  const get = name => new THREE.Color(css.getPropertyValue(name).trim());
  return {
    raised: get('--surface'),
    sunk: get('--surface-sunk'),
    silk: get('--text'),
    trace: get('--accent-2'),
    copper: get('--neon'),
    light: document.documentElement.getAttribute('data-theme') === 'light',
  };
}

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  // Touch devices have no cursor to follow: the arm boots, settles and stops
  // rendering until tapped, instead of animating every frame forever.
  const touchOnly = window.matchMedia('(hover: none)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, touchOnly ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

  // ── Materials (recolored on theme change) ────────────────────────────────
  const bodyMat = new THREE.MeshStandardMaterial({ roughness: 0.32, metalness: 0.85 });
  const jointMat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.65 });
  const edgeMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.85 });
  const markerMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, side: THREE.DoubleSide });

  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1.1);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(4, 7, 5);
  // Neon rim light from behind-left picks out the silhouette against the dark.
  const rim = new THREE.DirectionalLight(0xffffff, 2.2);
  rim.position.set(-6, 4, -6);
  scene.add(hemi, key, rim);

  function part(geometry, material, edges = true) {
    const mesh = new THREE.Mesh(geometry, material);
    if (edges) mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 25), edgeMat));
    return mesh;
  }

  // A joint is a short cylinder whose axis is the local Z (pitch) axis.
  function joint(radius, width) {
    const j = part(new THREE.CylinderGeometry(radius, radius, width, 32), jointMat, false);
    j.rotation.x = Math.PI / 2;
    return j;
  }

  // ── Arm hierarchy ─────────────────────────────────────────────────────────
  const robot = new THREE.Group();
  scene.add(robot);
  let robotScale = 1;

  const base = part(new THREE.CylinderGeometry(0.6, 0.68, 0.22, 48), bodyMat);
  base.position.y = 0.11;
  robot.add(base);

  const yaw = new THREE.Group();
  robot.add(yaw);
  const turret = part(new THREE.CylinderGeometry(0.34, 0.4, 0.5, 40), bodyMat);
  turret.position.y = 0.47;
  yaw.add(turret);

  const shoulder = new THREE.Group();
  shoulder.position.y = SHOULDER_H;
  yaw.add(shoulder);
  shoulder.add(joint(0.24, 0.56));
  const upper = part(new THREE.BoxGeometry(L1, 0.24, 0.3), bodyMat);
  upper.position.x = L1 / 2;
  shoulder.add(upper);

  const elbow = new THREE.Group();
  elbow.position.x = L1;
  shoulder.add(elbow);
  elbow.add(joint(0.19, 0.42));
  const fore = part(new THREE.BoxGeometry(L2, 0.19, 0.24), bodyMat);
  fore.position.x = L2 / 2;
  elbow.add(fore);

  const wrist = new THREE.Group();
  wrist.position.x = L2;
  elbow.add(wrist);
  wrist.add(joint(0.14, 0.32));
  const palm = part(new THREE.BoxGeometry(0.22, 0.14, 0.36), bodyMat);
  palm.position.x = 0.2;
  wrist.add(palm);

  const fingerGeo = new THREE.BoxGeometry(0.32, 0.07, 0.06);
  const fingerA = part(fingerGeo, jointMat);
  const fingerB = part(fingerGeo, jointMat);
  fingerA.position.x = fingerB.position.x = 0.46;
  wrist.add(fingerA, fingerB);

  // Target marker on the floor and the grid the arm stands on.
  // Both live in the robot's frame, so they follow its position and scale.
  const marker = new THREE.Group();
  const ringMat = markerMat.clone();
  const pulse = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.29, 48), ringMat);
  marker.add(new THREE.Mesh(new THREE.RingGeometry(0.14, 0.19, 40), markerMat), pulse);
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.005;
  robot.add(marker);

  // Polar grid sized to the arm's reach: it doubles as the workspace envelope.
  let grid = null;
  function buildGrid(t) {
    if (grid) { robot.remove(grid); grid.geometry.dispose(); grid.material.dispose(); }
    grid = new THREE.PolarGridHelper(L1 + L2 + 0.3, 16, 6, 96, t.copper, t.copper);
    grid.material.transparent = true;
    grid.material.opacity = t.light ? 0.3 : 0.22;
    robot.add(grid);
  }

  function applyTheme() {
    const t = readTokens();
    bodyMat.color.copy(t.light ? t.raised : t.sunk).lerp(t.silk, t.light ? 0.02 : 0.3);
    rim.color.copy(t.copper);
    rim.intensity = t.light ? 0.6 : 2.2;
    jointMat.color.copy(t.copper);
    jointMat.emissive.copy(t.copper).multiplyScalar(t.light ? 0 : 0.55);
    edgeMat.color.copy(t.copper);
    edgeMat.opacity = t.light ? 0.7 : 0.9;
    markerMat.color.copy(t.trace);
    ringMat.color.copy(t.copper);
    hemi.color.copy(t.silk);
    hemi.groundColor.copy(t.sunk);
    buildGrid(t);
    requestRender();
  }

  // ── Layout: arm on the right on wide screens, behind the text on phones ──
  let portrait = false;
  const camBase = new THREE.Vector3();
  const lookBase = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  function layout() {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    portrait = camera.aspect < 0.95;

    if (portrait) {
      // Sit the arm in the upper half so it clears the name and copy below.
      camera.fov = 50;
      camera.position.set(0, 5.2, 10.5);
      camera.lookAt(0, -2.6, 0);
      lookBase.set(0, -2.6, 0);
      robotScale = 1;
      robot.position.set(-0.4, 0, -2.4);
    } else {
      camera.fov = 35;
      camera.position.set(0, 3.5, 9.2);
      camera.lookAt(0, 1.0, 0);
      lookBase.set(0, 1.0, 0);
      const halfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 9.6 * camera.aspect;
      robotScale = 1.22;
      robot.position.set(Math.min(halfWidth * 0.36, 2.7), 0, -1.2);
    }
    robot.scale.setScalar(robotScale);
    camBase.copy(camera.position);
    camera.updateProjectionMatrix();
    requestRender();
  }

  // ── Inverse kinematics ────────────────────────────────────────────────────
  // Returns joint angles that put the fingertips at local point (x, y, z)
  // with the gripper pointing down. The target is clamped to the reachable
  // annulus, and the clamped point is written back into `out` for the marker.
  const maxWrist = L1 + L2 - 0.04;
  function solve(target, out) {
    const wristY = target.y + L3;
    const dy = wristY - SHOULDER_H;
    const maxR = Math.sqrt(Math.max(maxWrist * maxWrist - dy * dy, 0.01));
    let r = Math.hypot(target.x, target.z);
    const scale = THREE.MathUtils.clamp(r, MIN_REACH, maxR) / (r || 1);
    out.set(target.x * scale, target.y, target.z * scale);
    r = Math.hypot(out.x, out.z);

    // Rotation about +Y by θ sends local +X to (cos θ, 0, −sin θ).
    const base = Math.atan2(-out.z, out.x);
    const d2 = r * r + dy * dy;
    const cosE = THREE.MathUtils.clamp((d2 - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
    const e = Math.acos(cosE);                       // elbow bend (elbow-up branch)
    const s = Math.atan2(dy, r) + Math.atan2(L2 * Math.sin(e), L1 + L2 * Math.cos(e));
    const w = -Math.PI / 2 - (s - e);                // keep the gripper vertical
    return { base, s, e: -e, w };
  }

  // ── State ─────────────────────────────────────────────────────────────────
  const pose = { base: 0.5, s: 1.35, e: -2.5, w: -0.3, grip: 0.16 }; // folded, for the boot-up
  const goal = { ...pose };
  const target = new THREE.Vector3(1.8, HOVER_H, 1.2);
  const clamped = new THREE.Vector3();
  const pointerNdc = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();

  let gripping = false;
  let lastPointer = -Infinity;
  let pointerActive = false;
  const IDLE_AFTER = 2500;

  function aimAtPointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointerNdc, camera);
    if (!raycaster.ray.intersectPlane(floor, hit)) return;
    robot.updateMatrixWorld();
    const local = robot.worldToLocal(hit.clone());
    target.set(local.x, target.y, local.z);
    lastPointer = performance.now();
    pointerActive = true;
  }

  hero.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') aimAtPointer(e); });
  hero.addEventListener('pointerdown', e => {
    if (e.target.closest('a, button')) return;
    aimAtPointer(e);
    gripping = true;
    wake();
  });
  window.addEventListener('pointerup', () => {
    if (!gripping) return;
    gripping = false;
    wake();
  });
  hero.addEventListener('pointerleave', () => { gripping = false; lastPointer = performance.now() - IDLE_AFTER + 600; });

  // ── Scroll moment (desktop): as the hero scrolls away the platform turns
  // toward the viewer, the camera pushes in and the gripper rises to reach
  // out of the frame, toward the content below.
  const scrollFx = !touchOnly;
  const aim = new THREE.Vector3();
  const reachWorld = new THREE.Vector3();
  function scrollProgress() {
    if (!scrollFx || portrait) return 0;
    const p = THREE.MathUtils.clamp(-hero.getBoundingClientRect().top / hero.offsetHeight, 0, 1);
    return p * p * (3 - 2 * p); // smoothstep
  }

  function idleTarget(t) {
    const a = Math.sin(t * 0.00035) * 1.25 + 0.35;
    const r = 1.9 + Math.sin(t * 0.0007) * 0.55;
    target.set(Math.sin(a) * r, target.y, Math.cos(a) * r);
  }

  // ── Render loop (paused off-screen, in background tabs, or reduced motion)
  let running = false;
  let visible = true;
  let last = performance.now();
  let pendingRender = false;
  let settled = false;

  function wake() {
    settled = false;
    updateRunning();
  }

  function step(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (!touchOnly && (!pointerActive || now - lastPointer > IDLE_AFTER)) {
      pointerActive = false;
      idleTarget(now);
    }
    target.y = gripping ? GRIP_H : HOVER_H;

    const sp = scrollProgress();
    robot.rotation.y = -sp * 0.7;
    // The canvas scrolls up with the page, so the camera tilts up to keep
    // the arm in frame while it pushes in toward it.
    camera.position.copy(camBase).add(reachWorld.set(-0.6 * sp, 0.6 * sp, -1.6 * sp));
    camera.lookAt(lookAt.copy(lookBase).add(reachWorld.set(0.7 * sp, 3.0 * sp, 0)));
    aim.copy(target);
    if (sp > 0) {
      // A point between the arm and the camera, lifted: "reaching out".
      reachWorld.copy(camera.position).sub(robot.position).setY(0).normalize()
        .multiplyScalar(2.6 * robotScale).add(robot.position);
      robot.updateMatrixWorld();
      const reachLocal = robot.worldToLocal(reachWorld);
      reachLocal.y = 1.5;
      aim.lerp(reachLocal, sp);
    }

    const sol = solve(aim, clamped);
    goal.base = sol.base; goal.s = sol.s; goal.e = sol.e; goal.w = sol.w;
    goal.grip = gripping ? 0.05 : 0.16;

    const k = 1 - Math.exp(-dt * SMOOTHING);
    // Shortest way round for the base so it never spins the long way.
    let dBase = goal.base - pose.base;
    dBase = Math.atan2(Math.sin(dBase), Math.cos(dBase));
    pose.base += dBase * k;
    pose.s += (goal.s - pose.s) * k;
    pose.e += (goal.e - pose.e) * k;
    pose.w += (goal.w - pose.w) * k;
    pose.grip += (goal.grip - pose.grip) * Math.min(k * 2, 1);

    applyPose();
    marker.position.x = clamped.x;
    marker.position.z = clamped.z;
    marker.scale.setScalar(gripping ? 0.7 : 1);
    const beat = (now * 0.0012) % 1;            // reticle pulse, 0..1
    pulse.scale.setScalar(1 + beat * 0.9);
    ringMat.opacity = 0.8 * (1 - beat);

    if (touchOnly && !gripping) {
      const error = Math.max(Math.abs(dBase), Math.abs(goal.s - pose.s), Math.abs(goal.e - pose.e),
        Math.abs(goal.w - pose.w), Math.abs(goal.grip - pose.grip));
      settled = error < 0.002;
    }
  }

  function applyPose() {
    yaw.rotation.y = pose.base;
    shoulder.rotation.z = pose.s;
    elbow.rotation.z = pose.e;
    wrist.rotation.z = pose.w;
    fingerA.position.z = pose.grip;
    fingerB.position.z = -pose.grip;
  }

  function frame(now) {
    if (!running) return;
    step(now);
    renderer.render(scene, camera);
    if (settled) { running = false; return; }
    requestAnimationFrame(frame);
  }

  function updateRunning() {
    const shouldRun = visible && !document.hidden && !reduceMotion.matches && !settled;
    if (shouldRun && !running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    } else if (!shouldRun) {
      running = false;
    }
  }

  // Single frame for static situations (reduced motion, theme or size change).
  function requestRender() {
    if (running || pendingRender) return;
    pendingRender = true;
    requestAnimationFrame(() => {
      pendingRender = false;
      if (reduceMotion.matches) {
        const sol = solve(new THREE.Vector3(1.6, HOVER_H, 1.3), clamped);
        Object.assign(pose, sol, { grip: 0.16 });
        applyPose();
        marker.position.set(clamped.x, 0.005, clamped.z);
      }
      renderer.render(scene, camera);
    });
  }

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; updateRunning(); }).observe(hero);
  document.addEventListener('visibilitychange', updateRunning);
  reduceMotion.addEventListener('change', () => { updateRunning(); requestRender(); });
  new ResizeObserver(layout).observe(hero);
  window.addEventListener('themechange', applyTheme);

  applyTheme();
  layout();
  updateRunning();
  hero.classList.add('has-arm');
}
