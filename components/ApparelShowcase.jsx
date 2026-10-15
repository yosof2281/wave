"use client";

// components/ApparelShowcase.jsx
// Three apparel pieces in a Three.js scene: staggered entrance from different
// angles, idle float, mouse-driven tilt, hover lift, light sheen, soft reflection.
// Images come from /public. If one is missing, a drawn silhouette is used instead.
import { useEffect, useRef } from "react";
import * as THREE from "three";

const DEFAULT_ITEMS = [
  { src: "/quarterzip-umber.png", color: "#8a5d45", glow: "#c08a66", kind: "zip" },
  { src: "/jacket-navy-bomber.png", color: "#22345a", glow: "#7FA6B8", kind: "bomber" },
  { src: "/hoodie-grey.png", color: "#80858e", glow: "#b9c6d0", kind: "hoodie" },
];

// Where each piece starts before it settles (different angle for each)
const ENTRANCE = [
  { x: -7, y: 0.6, z: -1, ry: 1.3, rz: -0.35, delay: 0.1 },
  { x: 0, y: -4.5, z: -7, ry: 0.0, rz: 0.0, delay: 0.4 },
  { x: 7, y: 1.2, z: -1, ry: -1.3, rz: 0.35, delay: 0.7 },
];
const INTRO_SECONDS = 1.8;
// Resting yaw: side pieces angle in toward the centre piece
const FAN = [0.2, 0, -0.2];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/* ---------- fallback artwork, used only if the PNG fails to load ---------- */
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
  g.moveTo(210, 70); // collar left
  g.quadraticCurveTo(300, 120, 390, 70);
  g.lineTo(520, 130); // shoulder right
  g.lineTo(580, 600); // sleeve right
  g.lineTo(490, 610);
  g.lineTo(450, 330);
  g.lineTo(440, 700); // hem right
  g.lineTo(160, 700); // hem left
  g.lineTo(150, 330);
  g.lineTo(110, 610);
  g.lineTo(20, 600); // sleeve left
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

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, "rgba(255,255,255,1)");
  r.addColorStop(0.45, "rgba(255,255,255,0.28)");
  r.addColorStop(1, "rgba(255,255,255,0)");
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
  varying vec2 vUv;
  void main() {
    vec4 t = texture2D(uMap, vUv);
    vec3 col = t.rgb;
    // slow band of light that sweeps across the fabric
    float band = smoothstep(0.22, 0.0, abs(vUv.x - uSheen));
    col += vec3(0.85, 0.93, 1.0) * band * 0.16 * t.a;
    float a = t.a * uOpacity;
    // soften the image borders so no rectangle shows around a photo
    vec2 ed = smoothstep(vec2(0.0), vec2(0.07), vUv) * smoothstep(vec2(0.0), vec2(0.07), 1.0 - vUv);
    a *= ed.x * ed.y;
    // reflection fades with distance from the floor
    if (uReflect > 0.5) a *= pow(1.0 - vUv.y, 2.2) * 0.3;
    gl_FragColor = vec4(col, a);
  }
`;

export default function ApparelShowcase({ items = DEFAULT_ITEMS, className = "" }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmall = window.innerWidth < 768;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (err) {
      return; // no WebGL: the rest of the hero still works
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmall ? 1.5 : 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const FOV = 30;
    const CAM_Z = 10;
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50);
    camera.position.set(0, 0, CAM_Z);
    const visibleH = 2 * Math.tan((FOV * Math.PI) / 360) * CAM_Z;

    const glowTex = glowTexture();
    const geo = new THREE.PlaneGeometry(1, 1);
    const pieces = []; // { group, mesh, refl, glow, mat, rmat, aspect, rest, intro }
    const disposables = [glowTex, geo];

    let width = 1;
    let height = 1;
    let time = 0;
    let introStart = null;
    let disposed = false;
    let visible = true;
    let raf = 0;

    const layout = () => {
      const visibleW = visibleH * (width / height);
      const slot = Math.min(visibleW * 0.31, 3.1);
      pieces.forEach((p, i) => {
        const h = Math.min(3.4, (slot * 1.15) / p.aspect);
        const w = h * p.aspect;
        p.h = h;
        p.mesh.scale.set(w, h, 1);
        p.refl.scale.set(w, -h, 1);
        p.refl.position.y = -h;
        p.glow.scale.set(w * 1.9, h * 1.5, 1);
        p.rest = { x: (i - 1) * slot, y: 0.45 };
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

    // Pointer state (-1..1 across the window) and hover detection
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const ndc = new THREE.Vector2(9, 9);
    const raycaster = new THREE.Raycaster();
    let hovered = -1;

    const onMove = (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
      const r = mount.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const onLeave = () => ndc.set(9, 9);
    if (!reduceMotion) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerleave", onLeave);
    }

    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting), { threshold: 0 });
    io.observe(mount);

    const clock = new THREE.Clock();
    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible || !pieces.length) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      time += dt;
      if (introStart === null) introStart = time;

      pointer.x = damp(pointer.x, pointer.tx, 3, dt);
      pointer.y = damp(pointer.y, pointer.ty, 3, dt);

      raycaster.setFromCamera(ndc, camera);
      const hit = raycaster.intersectObjects(pieces.map((p) => p.mesh), false)[0];
      hovered = hit ? pieces.findIndex((p) => p.mesh === hit.object) : -1;

      pieces.forEach((p, i) => {
        const en = ENTRANCE[i % ENTRANCE.length];
        const raw = reduceMotion ? 1 : clamp((time - introStart - en.delay) / INTRO_SECONDS, 0, 1);
        const e = easeOutExpo(raw);
        const inv = 1 - e;

        const float = reduceMotion ? 0 : Math.sin(time * 0.9 + i * 1.7) * 0.07;
        const hov = i === hovered ? 1 : 0;
        p.hover = damp(p.hover, hov, 7, dt);

        p.group.position.set(
          p.rest.x + en.x * inv,
          p.rest.y + en.y * inv + float + p.hover * 0.12,
          en.z * inv + (i === 1 ? 0.4 : 0) + p.hover * 0.5
        );
        p.group.rotation.y =
          en.ry * inv + FAN[i % 3] + pointer.x * 0.32 + Math.sin(time * 0.5 + i) * 0.04 + p.hover * pointer.x * 0.15;
        p.group.rotation.x = pointer.y * 0.1;
        p.group.rotation.z = en.rz * inv;
        p.group.scale.setScalar((i === 1 ? 1.1 : 1) * (1 + p.hover * 0.05));

        const op = clamp(raw * 1.6, 0, 1);
        p.mat.uniforms.uOpacity.value = op;
        p.rmat.uniforms.uOpacity.value = op;
        const sheen = reduceMotion ? 0.5 : (time * 0.12 + i * 0.33) % 1.6 - 0.3 + p.hover * 0.1;
        p.mat.uniforms.uSheen.value = sheen;
        p.rmat.uniforms.uSheen.value = sheen;
        p.glow.material.opacity = op * (0.22 + p.hover * 0.22);
      });

      renderer.render(scene, camera);
    };

    Promise.all(items.map(loadTexture)).then((loaded) => {
      if (disposed) {
        loaded.forEach((l) => l.tex.dispose());
        return;
      }
      loaded.forEach(({ tex, aspect }, i) => {
        const mk = (reflect) =>
          new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            transparent: true,
            depthWrite: false,
            uniforms: {
              uMap: { value: tex },
              uOpacity: { value: 0 },
              uReflect: { value: reflect },
              uSheen: { value: 0 },
            },
          });
        const mat = mk(0);
        const rmat = mk(1);
        const glowMat = new THREE.MeshBasicMaterial({
          map: glowTex,
          color: new THREE.Color(items[i].glow || "#7FA6B8"),
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const group = new THREE.Group();
        const glow = new THREE.Mesh(geo, glowMat);
        glow.position.set(0, 0, -0.3);
        const refl = new THREE.Mesh(geo, rmat);
        const mesh = new THREE.Mesh(geo, mat);
        group.add(glow, refl, mesh);
        scene.add(group);
        pieces.push({ group, mesh, refl, glow, mat, rmat, aspect, hover: 0, rest: { x: 0, y: 0 }, h: 3 });
        disposables.push(tex, mat, rmat, glowMat);
      });
      layout();
      clock.getDelta();
    });

    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      ro.disconnect();
      io.disconnect();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={mountRef}
      role="img"
      aria-label="Three pieces from the Autumn/Winter 2026 collection"
      className={`h-[clamp(320px,44vw,540px)] w-full ${className}`}
    />
  );
}