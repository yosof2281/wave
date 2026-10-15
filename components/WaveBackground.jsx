"use client";

// components/WaveBackground.jsx
// Interactive 3D particle wave surface. Requires: npm i three
import { useEffect, useRef } from "react";
import * as THREE from "three";

/* ------------------------------------------------------------------ *
 *  TUNING: change these numbers to adjust the feel without touching
 *  the shaders.
 * ------------------------------------------------------------------ */
const CONFIG = {
  // Particle grid
  cols: 200,
  rows: 110,
  width: 46,
  depth: 26,
  particleSize: 30, // bigger = larger dots
  twinkle: 0.35, // 0 = steady dots, 1 = strong shimmer
  drift: 0.12, // how far each dot wanders from its grid spot

  // Ambient motion
  speed: 1.0, // overall wave speed (0.5 = half speed)
  amplitude: 1.0, // overall wave height

  // Cursor interaction
  hoverLift: 0.9, // bump under the cursor
  hoverPush: 0.35, // dots pushed sideways away from the cursor
  followSmoothing: 9, // higher = cursor effect follows tighter, lower = floatier
  idleSeconds: 1.8, // seconds after the last move before the cursor effect fades

  // Ripples (a trail while moving, a bigger one on click/tap)
  rippleSpacing: 1.1, // world distance between trail ripples
  rippleSpeed: 5.0, // ring expansion speed
  rippleLife: 4.0, // seconds before a ripple disappears
  rippleHeight: 1.1,
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
  attribute float aRand;

  uniform float uTime;        // real seconds, used by ripples
  uniform float uSpeed;
  uniform float uAmp;
  uniform float uSize;
  uniform float uTwinkle;
  uniform float uDrift;
  uniform float uPixelRatio;
  uniform float uHover;
  uniform float uHoverLift;
  uniform float uHoverPush;
  uniform float uRippleSpeed;
  uniform float uRippleLife;
  uniform float uRippleHeight;
  uniform vec2 uMouse;
  uniform vec4 uRipples[RIPPLES]; // x, z, startTime, strength

  varying float vHeight;
  varying float vFade;
  varying float vTwinkle;

  void main() {
    vec3 p = position;
    float t = uTime * uSpeed;
    float phase = aRand * 6.2831;

    // Each particle drifts slightly so the grid never looks mechanical
    p.x += sin(t * 0.5 + phase + p.z * 0.3) * uDrift;
    p.z += cos(t * 0.4 + phase + p.x * 0.3) * uDrift;

    // Ambient swell: slow overlapping waves plus a faint fast ripple on top
    float h = sin(p.x * 0.30 + t * 0.55) * 0.65
            + sin(p.z * 0.45 - t * 0.40) * 0.45
            + sin((p.x + p.z) * 0.18 + t * 0.28) * 0.50
            + sin(p.x * 0.80 - p.z * 0.60 + t * 0.90) * 0.12;
    h *= uAmp;

    // Cursor: smooth lift and a gentle push away from the pointer
    vec2 dm = p.xz - uMouse;
    float d = length(dm);
    h += exp(-d * d * 0.12) * uHoverLift * uHover;
    p.xz += normalize(dm + vec2(1e-4)) * exp(-d * d * 0.20) * uHoverPush * uHover;

    // Ripples: rings that expand from where the cursor passed or clicked
    for (int i = 0; i < RIPPLES; i++) {
      vec4 r = uRipples[i];
      float age = uTime - r.z;
      if (age > 0.0 && age < uRippleLife) {
        float rd = distance(p.xz, r.xy);
        float front = age * uRippleSpeed;
        float band = rd - front;
        float ring = sin(band * 2.4) * exp(-band * band * 0.35);
        float fade = exp(-age * 0.9) * (1.0 - age / uRippleLife);
        h += ring * uRippleHeight * r.w * fade;
      }
    }

    p.y = h;
    vHeight = h;
    vTwinkle = 0.5 + 0.5 * sin(uTime * 1.6 + aRand * 40.0);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // Depth cue, shimmer, and a slight swell on crests
    float tw = 1.0 - uTwinkle + uTwinkle * vTwinkle * 1.6;
    gl_PointSize = uSize * uPixelRatio / -mv.z * tw * (1.0 + clamp(h, 0.0, 3.0) * 0.12);

    float depthFade = 1.0 - smoothstep(14.0, 34.0, -mv.z);
    float edgeFade = 1.0 - smoothstep(0.7, 1.0, abs(p.x) / ${(CONFIG.width / 2).toFixed(1)});
    vFade = depthFade * edgeFade;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uTide;
  uniform vec3 uPearl;
  uniform float uIntro;

  varying float vHeight;
  varying float vFade;
  varying float vTwinkle;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float r = length(uv);
    if (r > 0.5) discard;
    float soft = smoothstep(0.5, 0.05, r);

    float t = smoothstep(-1.2, 2.4, vHeight);
    vec3 col = mix(uDeep, uTide, smoothstep(0.0, 0.6, t));
    col = mix(col, uPearl, smoothstep(0.65, 1.0, t));
    col += uPearl * 0.12 * vTwinkle * t; // crests catch the light

    gl_FragColor = vec4(col, soft * vFade * 0.9 * uIntro);
  }
`;

export default function WaveBackground({ className = "" }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmall = window.innerWidth < 768;

    // Renderer / scene / camera
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance" });
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    const baseCam = new THREE.Vector3(0, 5, 13);
    camera.position.copy(baseCam);
    const lookTarget = new THREE.Vector3(0, 1.5, 0);
    camera.lookAt(lookTarget);

    // Particle grid (lighter on phones)
    const cols = isSmall ? Math.round(CONFIG.cols * 0.55) : CONFIG.cols;
    const rows = isSmall ? Math.round(CONFIG.rows * 0.55) : CONFIG.rows;
    const count = cols * rows;
    const positions = new Float32Array(count * 3);
    const rand = new Float32Array(count);
    let pi = 0;
    let ri = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        positions[pi++] = (c / (cols - 1) - 0.5) * CONFIG.width;
        positions[pi++] = 0;
        positions[pi++] = (r / (rows - 1) - 0.5) * CONFIG.depth;
        rand[ri++] = Math.random();
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));

    const ripples = Array.from({ length: RIPPLES }, () => new THREE.Vector4(0, 0, -1000, 0));

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: CONFIG.speed },
        uAmp: { value: CONFIG.amplitude },
        uSize: { value: CONFIG.particleSize * (isSmall ? 0.85 : 1) },
        uTwinkle: { value: CONFIG.twinkle },
        uDrift: { value: CONFIG.drift },
        uPixelRatio: { value: pixelRatio },
        uHover: { value: 0 },
        uHoverLift: { value: CONFIG.hoverLift },
        uHoverPush: { value: CONFIG.hoverPush },
        uRippleSpeed: { value: CONFIG.rippleSpeed },
        uRippleLife: { value: CONFIG.rippleLife },
        uRippleHeight: { value: CONFIG.rippleHeight },
        uMouse: { value: new THREE.Vector2(999, 999) },
        uRipples: { value: ripples },
        uDeep: { value: hexToVec3(CONFIG.deep) },
        uTide: { value: hexToVec3(CONFIG.tide) },
        uPearl: { value: hexToVec3(CONFIG.pearl) },
        uIntro: { value: reduceMotion ? 1 : 0 },
      },
    });
    scene.add(new THREE.Points(geometry, material));
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

      // Entrance: dots fade in once, with an ease-out curve
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

  return <div ref={mountRef} aria-hidden className={`pointer-events-none absolute inset-0 ${className}`} />;
}
