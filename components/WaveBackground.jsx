"use client";

// components/WaveBackground.jsx
// One continuous wave surface (not dots). Light rolls over it, the cursor lifts it,
// and clicks/taps send ripples across it. Requires: npm i three
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

/* ------------------------------------------------------------------ *
 *  TUNING: change these numbers to adjust the feel without touching
 *  the shaders.
 * ------------------------------------------------------------------ */
const CONFIG = {
  // Surface size and detail
  cols: 260, // mesh detail across (phones use about half)
  rows: 140, // mesh detail in depth
  width: 46,
  depth: 26,

  // Ambient motion
  speed: 0.33, // overall wave speed (1 = original, 0.33 = a third)
  amplitude: 0.33, // overall wave height (1 = original, 0.33 = a third)

  // Look
  specular: 0.6, // shine on the crests (0 = matte)
  lines: 0.16, // faint contour lines that show the motion (0 = none)
  opacity: 0.92,

  // Cursor interaction
  hoverLift: 0.3, // swell under the cursor
  followSmoothing: 9, // higher = cursor effect follows tighter
  idleSeconds: 1.8, // seconds after the last move before the cursor effect fades

  // Ripples (a trail while moving, a bigger one on click/tap)
  rippleSpacing: 1.1,
  rippleSpeed: 3.0,
  rippleLife: 4.0,
  rippleHeight: 0.4,
  clickStrength: 1.6,

  // Camera
  parallax: 1.4,
  parallaxSmoothing: 2.5,

  // Entrance
  introSeconds: 2.2,

  // Colors (same palette as the page)
  deep: "#2B4A5C",
  tide: "#7FA6B8",
  pearl: "#E9EEF2",
};

const RIPPLES = 12;

const hexToVec3 = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

// Frame-rate independent smoothing: same feel at 60Hz and 120Hz
const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));

const vertexShader = /* glsl */ `
  #define RIPPLES ${RIPPLES}

  uniform float uTime;
  uniform float uSpeed;
  uniform float uAmp;
  uniform float uHover;
  uniform float uHoverLift;
  uniform float uRippleSpeed;
  uniform float uRippleLife;
  uniform float uRippleHeight;
  uniform vec2 uMouse;
  uniform vec4 uRipples[RIPPLES]; // x, z, startTime, strength

  varying vec3 vNormal;
  varying vec3 vView;
  varying float vHeight;
  varying float vFade;

  // Height of the water at a point on the surface
  float heightAt(vec2 q) {
    float t = uTime * uSpeed;

    // Slow overlapping swells plus a faint fast ripple on top
    float h = sin(q.x * 0.30 + t * 0.55) * 0.65
            + sin(q.y * 0.45 - t * 0.40) * 0.45
            + sin((q.x + q.y) * 0.18 + t * 0.28) * 0.50
            + sin(q.x * 0.12 + q.y * 0.20 + t * 0.35) * 0.40
            + sin(q.x * 0.80 - q.y * 0.60 + t * 0.90) * 0.12;
    h *= uAmp;

    // Cursor: smooth swell under the pointer
    vec2 dm = q - uMouse;
    h += exp(-dot(dm, dm) * 0.12) * uHoverLift * uHover;

    // Ripples: rings that expand from where the cursor passed or clicked
    for (int i = 0; i < RIPPLES; i++) {
      vec4 r = uRipples[i];
      float age = uTime - r.z;
      if (age > 0.0 && age < uRippleLife) {
        float band = distance(q, r.xy) - age * uRippleSpeed;
        float ring = sin(band * 2.4) * exp(-band * band * 0.35);
        float fade = exp(-age * 0.9) * (1.0 - age / uRippleLife);
        h += ring * uRippleHeight * r.w * fade;
      }
    }
    return h;
  }

  void main() {
    vec2 q = position.xz;
    float e = 0.1;
    float h = heightAt(q);
    float hx = heightAt(q + vec2(e, 0.0));
    float hz = heightAt(q + vec2(0.0, e));

    // Surface normal from the slope, so light can roll over the waves
    vec3 n = normalize(vec3(-(hx - h) / e, 1.0, -(hz - h) / e));
    vec3 p = vec3(q.x, h, q.y);

    vec4 wp = modelMatrix * vec4(p, 1.0);
    vNormal = normalize(mat3(modelMatrix) * n);
    vView = normalize(cameraPosition - wp.xyz);
    vHeight = h;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float depthFade = 1.0 - smoothstep(14.0, 34.0, -mv.z);
    float edgeX = 1.0 - smoothstep(0.7, 1.0, abs(q.x) / ${(CONFIG.width / 2).toFixed(1)});
    float edgeZ = 1.0 - smoothstep(0.75, 1.0, abs(q.y) / ${(CONFIG.depth / 2).toFixed(1)});
    vFade = depthFade * edgeX * edgeZ;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uTide;
  uniform vec3 uPearl;
  uniform float uIntro;
  uniform float uSpec;
  uniform float uLines;
  uniform float uOpacity;

  varying vec3 vNormal;
  varying vec3 vView;
  varying float vHeight;
  varying float vFade;

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(vView);
    vec3 L = normalize(vec3(-0.35, 0.75, 0.55));

    float diff = max(dot(N, L), 0.0);
    float lit = clamp((diff - 0.5) * 2.2, 0.0, 1.0);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
    float spec = pow(max(dot(reflect(-L, N), V), 0.0), 48.0);
    float t = smoothstep(-1.2, 2.4, vHeight);

    // Deep water, lit slopes, pale crests
    vec3 col = uDeep * 0.35;
    col = mix(col, uTide * 0.8, lit * 0.6);
    col = mix(col, uPearl, smoothstep(0.65, 1.0, t) * 0.5);
    col += uTide * fres * 0.6;
    col += uPearl * spec * uSpec;

    // Faint contour lines that make the motion easy to read
    float c = vHeight * 3.0;
    float w = fwidth(c);
    float line = 1.0 - smoothstep(0.0, w * 1.5, abs(fract(c - 0.5) - 0.5));
    col += uTide * line * uLines * (0.4 + 0.6 * t);

    gl_FragColor = vec4(col, vFade * uIntro * uOpacity);
  }
`;

/* ---------- Fallback for devices without WebGL (e.g. iOS Lockdown Mode) ----------
   The same kind of wave, drawn as stacked lines on a 2D canvas. Each line hides
   the ones behind it, so it reads as one surface rolling toward you. */
function WaveCanvas({ className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth < 768;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ROWS = small ? 26 : 36;
    const COLS = small ? 52 : 80;
    const SPEED = CONFIG.speed;
    const AMP = CONFIG.amplitude;
    let w = 1;
    let h = 1;
    let raf = 0;
    let last = 0;
    let visible = true;
    const ys = new Float32Array(COLS + 1);

    const resize = () => {
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting), { threshold: 0 });
    io.observe(cv);

    // Water colours (same palette as the 3D surface), as 0-255 triples
    const DEEP = [43, 74, 92];
    const TIDE = [127, 166, 184];
    const PEARL = [233, 238, 242];
    const BG = [11, 15, 25];
    const mix = (a, b, k) => a + (b - a) * k;
    const mix3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
    const scale3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
    const sstep = (a, b, x) => {
      const k = clamp01((x - a) / (b - a));
      return k * k * (3 - 2 * k);
    };
    function clamp01(v) {
      return Math.min(1, Math.max(0, v));
    }
    const STOPS = small ? 16 : 28;
    const hs = new Float32Array(COLS + 1);

    const draw = (time) => {
      const t = time * SPEED;
      ctx.clearRect(0, 0, w, h);
      const horizon = h * 0.5;
      for (let r = 0; r < ROWS; r++) {
        const k = r / (ROWS - 1); // 0 = far, 1 = near
        const near = Math.pow(k, 1.7);
        const baseY = horizon + (h * 1.02 - horizon) * near;
        const ampPx = (3 + 22 * near) * (AMP / 0.33) * 0.9;
        const z = (k - 0.5) * CONFIG.depth;
        for (let c = 0; c <= COLS; c++) {
          const x = c / COLS;
          const wx = (x - 0.5) * CONFIG.width;
          const hh =
            Math.sin(wx * 0.3 + t * 0.55) * 0.65 +
            Math.sin(z * 0.45 - t * 0.4) * 0.45 +
            Math.sin((wx + z) * 0.18 + t * 0.28) * 0.5 +
            Math.sin(wx * 0.12 + z * 0.2 + t * 0.35) * 0.4;
          hs[c] = hh;
          ys[c] = baseY - hh * ampPx;
        }

        // Light rolling over the slopes: left-facing slopes catch the light, crests turn pale
        const fade = 0.3 + 0.7 * Math.pow(near, 0.55); // far rows melt into the page colour
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        for (let sI = 0; sI <= STOPS; sI++) {
          const c = Math.round((sI / STOPS) * COLS);
          const c0 = Math.max(c - 1, 0);
          const c1 = Math.min(c + 1, COLS);
          const slope = (ys[c0] - ys[c1]) / (((c1 - c0) / COLS) * w); // + = rising toward the right
          const lit = clamp01((0.5 + slope * 1.6 - 0.5) * 2.2 + 0.25);
          const crest = sstep(0.65, 1.0, clamp01((hs[c] + 1.2) / 3.6));
          let col = scale3(DEEP, 0.35);
          col = mix3(col, scale3(TIDE, 0.8), lit * 0.6);
          col = mix3(col, PEARL, crest * 0.5);
          col = mix3(col, TIDE, (1 - near) * 0.18); // sheen toward the horizon
          col = mix3(BG, col, fade);
          grad.addColorStop(sI / STOPS, `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`);
        }

        // Fill under the line: hides the rows behind it so it reads as one surface
        ctx.beginPath();
        ctx.moveTo(0, ys[0]);
        for (let c = 1; c <= COLS; c++) ctx.lineTo((c / COLS) * w, ys[c]);
        ctx.lineTo(w, h + 4);
        ctx.lineTo(0, h + 4);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Bright edge on the crest line
        ctx.beginPath();
        ctx.moveTo(0, ys[0]);
        for (let c = 1; c <= COLS; c++) ctx.lineTo((c / COLS) * w, ys[c]);
        ctx.strokeStyle = `rgba(190,215,228,${(0.06 + 0.5 * near).toFixed(3)})`;
        ctx.lineWidth = 0.7 + near * 1.3;
        ctx.stroke();
      }
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      if (!visible || now - last < 33) return; // ~30 fps keeps it light
      last = now;
      draw(now / 1000);
    };
    if (reduce) draw(2);
    else raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const mask = "radial-gradient(ellipse 85% 75% at 50% 70%, #000 35%, transparent 85%)";
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ WebkitMaskImage: mask, maskImage: mask }}
    >
      <canvas ref={ref} className="h-full w-full" />
    </div>
  );
}

export default function WaveBackground({ className = "" }) {
  const mountRef = useRef(null);
  const [noWebGL, setNoWebGL] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmall = window.innerWidth < 768;

    // Renderer / scene / camera
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !isSmall, alpha: true });
    } catch (err) {
      setNoWebGL(true); // no WebGL (e.g. iOS Lockdown Mode): use the 2D version
      return;
    }
    const pixelRatio = Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    // If the browser drops the WebGL context (common on phones), switch to the light version
    renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      setNoWebGL(true);
    });
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    const baseCam = new THREE.Vector3(0, 5, 13);
    camera.position.copy(baseCam);
    const lookTarget = new THREE.Vector3(0, 1.5, 0);
    camera.lookAt(lookTarget);

    // One continuous surface (lighter mesh on phones)
    const cols = isSmall ? Math.round(CONFIG.cols * 0.55) : CONFIG.cols;
    const rows = isSmall ? Math.round(CONFIG.rows * 0.55) : CONFIG.rows;
    const geometry = new THREE.PlaneGeometry(CONFIG.width, CONFIG.depth, cols, rows);
    geometry.rotateX(-Math.PI / 2); // lay it flat: x across, z in depth

    const ripples = Array.from({ length: RIPPLES }, () => new THREE.Vector4(0, 0, -1000, 0));

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: CONFIG.speed },
        uAmp: { value: CONFIG.amplitude },
        uHover: { value: 0 },
        uHoverLift: { value: CONFIG.hoverLift },
        uRippleSpeed: { value: CONFIG.rippleSpeed },
        uRippleLife: { value: CONFIG.rippleLife },
        uRippleHeight: { value: CONFIG.rippleHeight },
        uMouse: { value: new THREE.Vector2(999, 999) },
        uRipples: { value: ripples },
        uDeep: { value: hexToVec3(CONFIG.deep) },
        uTide: { value: hexToVec3(CONFIG.tide) },
        uPearl: { value: hexToVec3(CONFIG.pearl) },
        uSpec: { value: CONFIG.specular },
        uLines: { value: CONFIG.lines },
        uOpacity: { value: CONFIG.opacity },
        uIntro: { value: reduceMotion ? 1 : 0 },
      },
    });
    scene.add(new THREE.Mesh(geometry, material));
    const u = material.uniforms;

    // Sizing
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // Pointer state
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const ndc = new THREE.Vector2();
    const camNdc = new THREE.Vector2(); // smoothed copy used for parallax
    const hit = new THREE.Vector3();
    const mouseTarget = new THREE.Vector2(999, 999);
    const lastRipplePos = new THREE.Vector2();
    let lastRippleTime = -1;
    let lastMove = -Infinity;
    let time = 0;
    let rippleIndex = 0;

    const emit = (x, z, strength) => {
      ripples[rippleIndex].set(x, z, time, strength);
      rippleIndex = (rippleIndex + 1) % RIPPLES;
    };

    const track = (e) => {
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(plane, hit)) return false;
      if (mouseTarget.x > 900) {
        // First contact: start at the cursor instead of sliding in from far away
        u.uMouse.value.set(hit.x, hit.z);
        lastRipplePos.set(hit.x, hit.z);
      }
      mouseTarget.set(hit.x, hit.z);
      lastMove = performance.now();
      return true;
    };

    const onMove = (e) => {
      if (!track(e)) return;
      const dist = Math.hypot(hit.x - lastRipplePos.x, hit.z - lastRipplePos.y);
      if (dist > CONFIG.rippleSpacing && time - lastRippleTime > 0.07) {
        // Faster movement leaves a stronger ripple
        emit(hit.x, hit.z, Math.min(0.35 + dist * 0.12, 0.9));
        lastRipplePos.set(hit.x, hit.z);
        lastRippleTime = time;
      }
    };

    const onDown = (e) => {
      if (track(e)) emit(hit.x, hit.z, CONFIG.clickStrength);
    };

    // Animation loop
    const clock = new THREE.Clock();
    let raf = 0;
    let running = true;
    const camGoal = new THREE.Vector3();

    const frame = () => {
      if (!running) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      time += dt;
      u.uTime.value = time;

      // Entrance: the surface fades in once, with an ease-out curve
      const k = Math.min(time / CONFIG.introSeconds, 1);
      u.uIntro.value = 1 - Math.pow(1 - k, 3);

      // Cursor follows smoothly; its influence rises quickly and falls slowly
      const m = u.uMouse.value;
      m.x = damp(m.x, mouseTarget.x, CONFIG.followSmoothing, dt);
      m.y = damp(m.y, mouseTarget.y, CONFIG.followSmoothing, dt);
      const active = performance.now() - lastMove < CONFIG.idleSeconds * 1000 ? 1 : 0;
      u.uHover.value = damp(u.uHover.value, active, active ? 6 : 2.2, dt);

      // Gentle camera parallax for depth
      camNdc.x = damp(camNdc.x, ndc.x, CONFIG.parallaxSmoothing, dt);
      camNdc.y = damp(camNdc.y, ndc.y, CONFIG.parallaxSmoothing, dt);
      camGoal.set(baseCam.x + camNdc.x * CONFIG.parallax, baseCam.y + camNdc.y * 0.6, baseCam.z);
      camera.position.copy(camGoal);
      camera.lookAt(lookTarget);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };

    if (reduceMotion) {
      // One still frame: no loop, no pointer tracking
      u.uTime.value = 2.0;
      renderer.render(scene, camera);
    } else {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onDown, { passive: true });
      raf = requestAnimationFrame(frame);
    }

    // Pause when the tab is hidden
    const onVisibility = () => {
      if (reduceMotion) return;
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        clock.getDelta();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  if (noWebGL) return <WaveCanvas className={className} />;
  return <div ref={mountRef} aria-hidden className={`pointer-events-none absolute inset-0 ${className}`} />;
}