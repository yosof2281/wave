"use client";

// components/ApparelShowcase.jsx
// A rotating carousel of apparel on a ring (like the reference video):
//  - the front piece is biggest and sits in the middle, the rest curve away behind it
//  - the ring turns on its own, you can drag it, and scrolling the page nudges it
//  - hover: the piece under the cursor tilts like a product card, lifts, and catches light
//  - intro: pieces rotate in from staggered angles while fading in
//  - depth: layered edge, contact shadows, floor reflection, ambient light
// Images come from /public (or from the `items` prop). Missing images get a drawn silhouette.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const DEFAULT_ITEMS = [
  { src: "/quarterzip-umber.png", color: "#8a5d45", glow: "#c08a66", kind: "zip" },
  { src: "/jacket-navy-bomber.png", color: "#22345a", glow: "#7FA6B8", kind: "bomber" },
  { src: "/hoodie-grey.png", color: "#80858e", glow: "#b9c6d0", kind: "hoodie" },
];

const AUTO_SPEED = 0.28; // radians per second the ring turns on its own
const INTRO_SECONDS = 1.9;
const DEPTH_LAYERS = [0.035, 0.07, 0.105]; // fake garment thickness
const TAU = Math.PI * 2;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const wrapPi = (a) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;

/* ---------- fallback artwork, used only if a PNG fails to load ---------- */
function drawGarment(kind, color) {
  const c = document.createElement("canvas");
  c.width = 600;
  c.height = 760;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 600, 760);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "#0a0f18");
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(210, 70);
  g.quadraticCurveTo(300, 120, 390, 70);
  g.lineTo(520, 130);
  g.lineTo(580, 600);
  g.lineTo(490, 610);
  g.lineTo(450, 330);
  g.lineTo(440, 700);
  g.lineTo(160, 700);
  g.lineTo(150, 330);
  g.lineTo(110, 610);
  g.lineTo(20, 600);
  g.lineTo(80, 130);
  g.closePath();
  g.fill();
  g.strokeStyle = "rgba(255,255,255,0.18)";
  g.lineWidth = 3;
  g.stroke();
  if (kind === "zip" || kind === "bomber") {
    g.beginPath();
    g.moveTo(300, 120);
    g.lineTo(300, kind === "zip" ? 300 : 700);
    g.stroke();
  }
  if (kind === "hoodie") {
    g.beginPath();
    g.ellipse(300, 105, 80, 45, 0, 0, Math.PI * 2);
    g.stroke();
  }
  return c;
}

function loadTexture(item) {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(
      item.src,
      (tex) => {
        tex.anisotropy = 4;
        resolve({ tex, aspect: tex.image.width / tex.image.height });
      },
      undefined,
      () => {
        const canvas = drawGarment(item.kind, item.color);
        resolve({ tex: new THREE.CanvasTexture(canvas), aspect: canvas.width / canvas.height });
      }
    );
  });
}

function radialTexture(rgb, mid) {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, `rgba(${rgb},1)`);
  r.addColorStop(0.45, `rgba(${rgb},${mid})`);
  r.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uReflect;
  uniform float uSheen;
  uniform float uShade;
  uniform float uDim;
  uniform float uLightAmt;
  uniform vec2 uLight;
  varying vec2 vUv;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    vec3 col = t.rgb;
    // ambient light from above: the lower fabric sits slightly darker
    col *= 0.8 + 0.2 * smoothstep(0.0, 0.9, vUv.y);
    // slow band of light sweeping across the fabric
    float band = smoothstep(0.22, 0.0, abs(vUv.x - uSheen));
    col += vec3(0.85, 0.93, 1.0) * band * 0.12 * t.a;
    // light that follows the cursor
    float lg = smoothstep(0.6, 0.0, distance(vUv, uLight)) * uLightAmt;
    col += vec3(0.8, 0.9, 1.0) * lg * 0.22 * t.a;
    if (!gl_FrontFacing) col *= 0.6;
    col *= uShade * uDim;

    float a = t.a * uOpacity;
    // soften image borders so no rectangle shows around a photo
    vec2 ed = smoothstep(vec2(0.0), vec2(0.07), vUv) * smoothstep(vec2(0.0), vec2(0.07), 1.0 - vUv);
    a *= ed.x * ed.y;
    if (uReflect > 0.5) a *= pow(1.0 - vUv.y, 2.2) * 0.3;
    gl_FragColor = vec4(col, a);
  }
`;

/* ---------- Cut the black photo background out (used by the no-WebGL carousel) ----------
   Product photos with a solid black backdrop show as dark boxes on the page. This flood-fills
   from the image border through near-black pixels and makes them transparent. */
const cutoutCache = new Map();
function cutoutOf(src, maxW = 720, tol = 16) {
  if (cutoutCache.has(src)) return cutoutCache.get(src);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const k = Math.min(1, maxW / img.naturalWidth);
        const W = Math.max(1, Math.round(img.naturalWidth * k));
        const H = Math.max(1, Math.round(img.naturalHeight * k));
        const cv = document.createElement("canvas");
        cv.width = W;
        cv.height = H;
        const g = cv.getContext("2d", { willReadFrequently: true });
        g.drawImage(img, 0, 0, W, H);
        const im = g.getImageData(0, 0, W, H);
        const d = im.data;
        const bg = new Uint8Array(W * H);
        const stack = new Int32Array(W * H);
        let sp = 0;
        const dark = (idx) => d[idx * 4 + 3] < 8 || Math.max(d[idx * 4], d[idx * 4 + 1], d[idx * 4 + 2]) <= tol;
        const push = (idx) => {
          if (!bg[idx] && dark(idx)) {
            bg[idx] = 1;
            stack[sp++] = idx;
          }
        };
        for (let x = 0; x < W; x++) {
          push(x);
          push((H - 1) * W + x);
        }
        for (let y = 0; y < H; y++) {
          push(y * W);
          push(y * W + W - 1);
        }
        while (sp) {
          const idx = stack[--sp];
          const x = idx % W;
          if (x > 0) push(idx - 1);
          if (x < W - 1) push(idx + 1);
          if (idx >= W) push(idx - W);
          if (idx < W * (H - 1)) push(idx + W);
        }
        for (let idx = 0; idx < W * H; idx++) {
          if (bg[idx]) {
            d[idx * 4 + 3] = 0;
          } else {
            // soften the cut edge a little so it does not look jagged
            const x = idx % W;
            const edge =
              (x > 0 && bg[idx - 1]) || (x < W - 1 && bg[idx + 1]) || (idx >= W && bg[idx - W]) || (idx < W * (H - 1) && bg[idx + W]);
            if (edge) d[idx * 4 + 3] = Math.min(d[idx * 4 + 3], 140);
          }
        }
        g.putImageData(im, 0, 0);
        resolve(cv.toDataURL("image/png"));
      } catch (err) {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
  cutoutCache.set(src, p);
  return p;
}

/* ---------- Fallback for devices without WebGL (e.g. iOS Lockdown Mode) ----------
   Same ring carousel, built from plain images and CSS transforms. */
function CssCarousel({ items, className = "" }) {
  const boxRef = useRef(null);
  const hintRef = useRef(null);
  const els = useRef([]);
  const N = items.length * Math.ceil(8 / items.length);
  const [cut, setCut] = useState({});

  useEffect(() => {
    let dead = false;
    items.forEach((it) => {
      cutoutOf(it.src).then((u) => {
        if (!dead) setCut((prev) => (prev[it.src] === u ? prev : { ...prev, [it.src]: u }));
      });
    });
    return () => {
      dead = true;
    };
  }, [items]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const STEP = TAU / N;
    const st = { angle: 0, vel: AUTO_SPEED, drag: false, lastX: 0, lastT: 0, w: box.clientWidth, over: false };

    const ro = new ResizeObserver(() => (st.w = box.clientWidth));
    ro.observe(box);

    const onDown = (e) => {
      st.drag = true;
      st.lastX = e.clientX;
      st.lastT = e.timeStamp;
      st.vel = 0;
      try { box.setPointerCapture(e.pointerId); } catch (err) {}
      if (hintRef.current) hintRef.current.style.opacity = "0";
    };
    const onMove = (e) => {
      if (!st.drag) return;
      const d = ((e.clientX - st.lastX) / (st.w * 0.33)) * 0.9;
      const dt = Math.max((e.timeStamp - st.lastT) / 1000, 0.008);
      st.angle += d;
      st.vel = clamp(st.vel * 0.4 + (d / dt) * 0.6, -6, 6);
      st.lastX = e.clientX;
      st.lastT = e.timeStamp;
    };
    const onUp = () => (st.drag = false);
    const onEnter = () => (st.over = true);
    const onLeave = () => (st.over = false);
    if (!reduce) {
      box.addEventListener("pointerdown", onDown);
      box.addEventListener("pointermove", onMove);
      box.addEventListener("pointerup", onUp);
      box.addEventListener("pointercancel", onUp);
      box.addEventListener("pointerenter", onEnter);
      box.addEventListener("pointerleave", onLeave);
    }

    let visible = true;
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting), { threshold: 0 });
    io.observe(box);

    let raf = 0;
    let prev = performance.now();
    const t0 = prev;
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      if (!visible) return;
      const time = (now - t0) / 1000;
      if (!reduce && !st.drag) {
        st.vel = damp(st.vel, AUTO_SPEED * (st.over ? 0.35 : 1), 1.4, dt);
        st.angle += st.vel * dt;
      }
      const rx = st.w * 0.33;
      for (let i = 0; i < N; i++) {
        const el = els.current[i];
        if (!el) continue;
        const dir = i % 2 ? -1 : 1;
        const raw = reduce ? 1 : clamp((time - (0.1 + Math.min(i, N - i) * 0.12)) / INTRO_SECONDS, 0, 1);
        const inv = 1 - easeOutExpo(raw);
        const th = wrapPi(i * STEP + st.angle + inv * dir * (1.6 + (i % 3) * 0.3));
        const cos = Math.cos(th);
        const front = 0.5 + 0.5 * cos;
        const op = smooth(-0.55, 0.25, cos) * clamp(raw * 1.6, 0, 1);
        if (op < 0.01) {
          el.style.visibility = "hidden";
          continue;
        }
        const rr = 0.35 + 0.65 * (1 - inv);
        const bob = reduce ? 0 : Math.sin(time * 0.9 + i * 1.7) * 4;
        const yaw = ((th * 0.45 + inv * dir * 2.2) * 180) / Math.PI;
        el.style.visibility = "visible";
        el.style.opacity = op.toFixed(3);
        el.style.zIndex = String(Math.round(front * 100));
        el.style.filter = `brightness(${(0.45 + 0.55 * front).toFixed(2)})`;
        el.style.transform =
          `translate(-50%,-50%) translate(${(Math.sin(th) * rx * rr).toFixed(1)}px,${(inv * 40 + bob).toFixed(1)}px) ` +
          `perspective(900px) rotateY(${yaw.toFixed(1)}deg) scale(${(0.74 + 0.36 * front).toFixed(3)})`;
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      box.removeEventListener("pointerdown", onDown);
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerup", onUp);
      box.removeEventListener("pointercancel", onUp);
      box.removeEventListener("pointerenter", onEnter);
      box.removeEventListener("pointerleave", onLeave);
    };
  }, [N]);

  return (
    <div className={`relative w-full ${className}`}>
      <div ref={boxRef} className="relative h-[clamp(320px,44vw,540px)] w-full cursor-grab touch-pan-y select-none overflow-hidden">
        {Array.from({ length: N }, (_, i) => (
          <div
            key={i}
            ref={(el) => (els.current[i] = el)}
            className="absolute left-1/2 top-[46%] will-change-transform"
            style={{ width: "min(34%, 300px)", visibility: "hidden" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cut[items[i % items.length].src] || items[i % items.length].src}
              alt=""
              draggable={false}
              onError={(e) => (e.currentTarget.style.visibility = "hidden")}
              style={{ opacity: cut[items[i % items.length].src] ? 1 : 0, transition: "opacity .4s" }}
              className="block w-full object-contain drop-shadow-[0_25px_30px_rgba(0,0,0,0.55)]"
            />
            <div aria-hidden className="mx-auto -mt-2 h-4 w-[90%] rounded-[50%] bg-black/60 blur-md" />
          </div>
        ))}
      </div>
      <p
        ref={hintRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[10px] uppercase tracking-[0.3em] text-white/30 transition-opacity duration-500"
      >
        Drag to rotate
      </p>
    </div>
  );
}

export default function ApparelShowcase({ items = DEFAULT_ITEMS, className = "" }) {
  const mountRef = useRef(null);
  const hintRef = useRef(null);
  const [noWebGL, setNoWebGL] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmall = window.innerWidth < 768;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (err) {
      // No WebGL (for example iOS Lockdown Mode): show plain images instead
      setNoWebGL(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    mount.appendChild(renderer.domElement);

    // If the browser drops the WebGL context (common on phones), switch to the light version
    renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      setNoWebGL(true);
    });

    const scene = new THREE.Scene();
    const FOV = 30;
    const CAM_Z = 10;
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
    const look = new THREE.Vector3(0, 0.35, 0);
    camera.position.set(0, 0.3, CAM_Z);
    camera.lookAt(look);
    const visibleH = 2 * Math.tan((FOV * Math.PI) / 360) * CAM_Z;

    const glowTex = radialTexture("255,255,255", 0.28);
    const shadowTex = radialTexture("0,0,0", 0.55);
    const geo = new THREE.PlaneGeometry(1, 1);
    const pieces = [];
    const disposables = [glowTex, shadowTex, geo];

    // The ring needs enough pieces to look full: repeat the list around it
    const N = items.length * Math.ceil(8 / items.length);
    const STEP = TAU / N;
    const RZ = 2.0; // ring depth

    const ring = { angle: 0, vel: AUTO_SPEED, rx: 4, rotPerPx: 0.003 };
    let width = 1;
    let height = 1;
    let time = 0;
    let introStart = null;
    let disposed = false;
    let visible = true;
    let raf = 0;

    const layout = () => {
      const visibleW = visibleH * (width / height);
      ring.rx = Math.min(visibleW * 0.33, 4.2);
      ring.rotPerPx = ((visibleW / width) / ring.rx) * 1.2;
      const targetW = Math.min(visibleW * 0.34, 3.6);
      pieces.forEach((p) => {
        const h = Math.min(2.9, targetW / p.aspect);
        const w = h * p.aspect;
        p.h = h;
        p.w = w;
        p.mesh.scale.set(w, h, 1);
        p.layers.forEach((l) => l.scale.set(w, h, 1));
        p.refl.scale.set(w, -h, 1);
        p.refl.position.y = -h;
        p.glow.scale.set(w * 1.8, h * 1.4, 1);
      });
    };

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (!w || !h) return;
      width = w;
      height = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      layout();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    /* ---------- interaction ---------- */
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const ndc = new THREE.Vector2(9, 9);
    const raycaster = new THREE.Raycaster();
    const hitUv = new THREE.Vector2(0.5, 0.5);
    let hovered = -1;
    let dragging = false;
    let lastX = 0;
    let lastT = 0;
    let lastScrollY = window.scrollY;

    const setNdc = (e) => {
      const r = mount.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const pick = () => {
      if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1) return -1;
      const list = pieces.filter((p) => p.vis);
      if (!list.length) return -1;
      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(list.map((p) => p.mesh), false)[0];
      if (!hit) return -1;
      hitUv.copy(hit.uv);
      return pieces.findIndex((p) => p.mesh === hit.object);
    };

    const onMove = (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
      setNdc(e);
      if (dragging) {
        const d = (e.clientX - lastX) * ring.rotPerPx;
        const dt = Math.max((e.timeStamp - lastT) / 1000, 0.008);
        ring.angle += d;
        ring.vel = clamp(ring.vel * 0.4 + (d / dt) * 0.6, -6, 6);
        lastX = e.clientX;
        lastT = e.timeStamp;
      }
    };
    const onDown = (e) => {
      setNdc(e);
      dragging = true;
      lastX = e.clientX;
      lastT = e.timeStamp;
      ring.vel = 0;
      mount.style.cursor = "grabbing";
      if (hintRef.current) hintRef.current.style.opacity = "0";
    };
    const onUp = () => {
      dragging = false;
      mount.style.cursor = "grab";
    };
    const onLeave = () => ndc.set(9, 9);
    const onScroll = () => {
      const y = window.scrollY;
      ring.angle += (y - lastScrollY) * 0.0035;
      lastScrollY = y;
    };

    if (!reduceMotion) {
      window.addEventListener("pointermove", onMove, { passive: true });
      mount.addEventListener("pointerdown", onDown);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      document.addEventListener("pointerleave", onLeave);
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting), { threshold: 0 });
    io.observe(mount);

    /* ---------- loop ---------- */
    const clock = new THREE.Clock();
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible || !pieces.length) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      time += dt;
      if (introStart === null) introStart = time;

      pointer.x = damp(pointer.x, pointer.tx, 3, dt);
      pointer.y = damp(pointer.y, pointer.ty, 3, dt);

      // Ring turns by itself; slows while the cursor is over it; coasts after a drag
      if (!reduceMotion && !dragging) {
        const over = Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1;
        ring.vel = damp(ring.vel, AUTO_SPEED * (over ? 0.35 : 1), 1.4, dt);
        ring.angle += ring.vel * dt;
      }

      // Camera drifts a little with the cursor for parallax
      camera.position.x = damp(camera.position.x, pointer.x * 0.5, 3, dt);
      camera.position.y = damp(camera.position.y, 0.3 - pointer.y * 0.2, 3, dt);
      camera.lookAt(look);

      hovered = dragging ? -1 : pick();

      pieces.forEach((p, i) => {
        const dir = i % 2 ? -1 : 1;
        const idx = Math.min(i, N - i);
        const raw = reduceMotion ? 1 : clamp((time - introStart - (0.1 + idx * 0.12)) / INTRO_SECONDS, 0, 1);
        const e = easeOutExpo(raw);
        const inv = 1 - e;

        // Intro: each piece swings in from its own angle
        const th = wrapPi(i * STEP + ring.angle + inv * dir * (1.6 + (i % 3) * 0.3));
        const cos = Math.cos(th);
        const front = 0.5 + 0.5 * cos; // 1 at the front, 0 at the back
        const rr = 0.35 + 0.65 * e;

        const isHover = i === hovered;
        p.hover = damp(p.hover, isHover ? 1 : 0, 7, dt);
        p.tiltX = damp(p.tiltX, isHover ? -(hitUv.y - 0.5) * 0.5 : 0, 6, dt);
        p.tiltY = damp(p.tiltY, isHover ? (hitUv.x - 0.5) * 0.5 : 0, 6, dt);
        p.light.x = damp(p.light.x, isHover ? hitUv.x : 0.5, 8, dt);
        p.light.y = damp(p.light.y, isHover ? hitUv.y : 0.5, 8, dt);
        p.lightAmt = damp(p.lightAmt, isHover ? 1 : 0, 5, dt);

        const float = reduceMotion ? 0 : Math.sin(time * 0.9 + i * 1.7) * 0.06;
        const baseY = 0.3 - inv * 1.2;
        const sc = (1 + 0.07 * front * front) * (1 + p.hover * 0.05);

        p.group.position.set(
          Math.sin(th) * ring.rx * rr,
          baseY + float + p.hover * 0.1,
          cos * RZ * rr + p.hover * 0.4
        );
        p.group.rotation.set(
          p.tiltX,
          th * 0.45 + inv * dir * 2.2 + p.tiltY,
          Math.sin(th) * 0.06 + inv * dir * 0.4
        );
        p.group.scale.setScalar(sc);

        // Pieces on the far side of the ring fade out and darken
        const op = smooth(-0.55, 0.25, cos) * clamp(raw * 1.6, 0, 1);
        const dim = 0.45 + 0.55 * front;
        p.vis = op > 0.5;

        const lift = p.group.position.y - baseY;
        const shrink = clamp(1 - lift * 0.7, 0.6, 1.1);
        p.shadow.position.set(
          p.group.position.x,
          baseY - (p.h / 2) * sc + 0.02,
          p.group.position.z - 0.15
        );
        p.shadow.scale.set(p.w * 1.15 * shrink * sc, p.h * 0.16 * shrink * sc, 1);
        p.shadow.material.opacity = op * 0.7 * shrink;

        const sheen = reduceMotion ? 0.5 : ((time * 0.12 + i * 0.21) % 1.6) - 0.3 + p.hover * 0.1;
        p.mats.forEach((m) => {
          m.uniforms.uOpacity.value = op;
          m.uniforms.uDim.value = dim;
          m.uniforms.uSheen.value = sheen;
          m.uniforms.uLight.value.set(p.light.x, p.light.y);
          m.uniforms.uLightAmt.value = p.lightAmt;
        });
        p.glow.material.opacity = op * front * (0.18 + p.hover * 0.22);
      });

      renderer.render(scene, camera);
    };

    Promise.all(items.map(loadTexture)).then((loaded) => {
      if (disposed) {
        loaded.forEach((l) => l.tex.dispose());
        return;
      }
      loaded.forEach((l) => disposables.push(l.tex));

      for (let i = 0; i < N; i++) {
        const k = i % items.length;
        const { tex, aspect } = loaded[k];
        const mk = (reflect, shade) =>
          new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            uniforms: {
              uMap: { value: tex },
              uOpacity: { value: 0 },
              uReflect: { value: reflect },
              uSheen: { value: 0 },
              uShade: { value: shade },
              uDim: { value: 1 },
              uLightAmt: { value: 0 },
              uLight: { value: new THREE.Vector2(0.5, 0.5) },
            },
          });
        const mat = mk(0, 1);
        const rmat = mk(1, 1);
        const layerMats = DEPTH_LAYERS.map(() => mk(0, 0.45));
        const glowMat = new THREE.MeshBasicMaterial({
          map: glowTex,
          color: new THREE.Color(items[k].glow || "#7FA6B8"),
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0, depthWrite: false });

        const group = new THREE.Group();
        const glow = new THREE.Mesh(geo, glowMat);
        glow.position.z = -0.3;
        glow.renderOrder = 0;
        const refl = new THREE.Mesh(geo, rmat);
        refl.renderOrder = 1;
        const shadow = new THREE.Mesh(geo, shadowMat);
        shadow.renderOrder = 2;
        const layers = layerMats.map((m, n) => {
          const l = new THREE.Mesh(geo, m);
          l.position.z = -DEPTH_LAYERS[n];
          l.renderOrder = 3;
          return l;
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.renderOrder = 3;
        group.add(glow, refl, ...layers, mesh);
        scene.add(group, shadow);

        pieces.push({
          group, mesh, layers, refl, glow, shadow,
          mats: [mat, rmat, ...layerMats],
          aspect, w: 3, h: 3, vis: false,
          hover: 0, tiltX: 0, tiltY: 0,
          light: { x: 0.5, y: 0.5 }, lightAmt: 0,
        });
        disposables.push(mat, rmat, glowMat, shadowMat, ...layerMats);
      }
      layout();
      clock.getDelta();
    });

    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      mount.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      ro.disconnect();
      io.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (noWebGL) return <CssCarousel items={items} className={className} />;

  return (
    <div className={`relative w-full ${className}`}>
      <div
        ref={mountRef}
        role="img"
        aria-label="Carousel of pieces from the Autumn/Winter 2026 collection. Drag to rotate it."
        className="h-[clamp(320px,44vw,540px)] w-full cursor-grab touch-pan-y select-none"
      />
      <p
        ref={hintRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[10px] uppercase tracking-[0.3em] text-white/30 transition-opacity duration-500"
      >
        Drag to rotate
      </p>
    </div>
  );
}