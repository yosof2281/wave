"use client";

// components/SizeRecommender.jsx
// Height + weight in two glass cards side by side, fit picker, live recommendation.
// Optional props: onSelect(size), current (selected size), unavailable (sold-out sizes).
import { useMemo, useState } from "react";
import { SIZES } from "../lib/products";
import { FITS, LIMITS, recommendSize } from "../lib/sizeRecommend";

const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7FA6B8]";

// Plain CSS so it works without touching tailwind.config.js
const css = `
.sr-glass{position:relative;overflow:hidden;border-radius:1rem;
  background:linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.04));
  -webkit-backdrop-filter:blur(16px) saturate(140%);backdrop-filter:blur(16px) saturate(140%);
  border:1px solid rgba(255,255,255,.16);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 10px 30px rgba(0,0,0,.28);
  transition:border-color .3s ease,box-shadow .3s ease,transform .3s ease}
.sr-glass::before{content:"";position:absolute;inset:-40% -60%;pointer-events:none;
  background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.10) 50%,transparent 60%);
  animation:sr-sheen 7s ease-in-out infinite}
.sr-glass::after{content:"";position:absolute;width:70%;aspect-ratio:1;right:-20%;top:-35%;pointer-events:none;border-radius:50%;
  background:radial-gradient(circle,rgba(127,166,184,.45),transparent 70%);
  animation:sr-float 9s ease-in-out infinite}
.sr-glass>*{position:relative;z-index:1}
.sr-card:hover{transform:translateY(-2px)}
.sr-card:focus-within{border-color:#7FA6B8;transform:translateY(-2px);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 0 0 3px rgba(127,166,184,.22),0 14px 34px rgba(0,0,0,.34)}
.sr-card:nth-child(2)::after{left:-20%;right:auto;top:auto;bottom:-40%;animation-delay:-4s}
.sr-input{width:100%;background:transparent;border:0;outline:0;color:#E9EEF2;font-size:1.875rem;line-height:1.1;font-weight:600;
  appearance:textfield;-moz-appearance:textfield}
.sr-input::placeholder{color:rgba(233,238,242,.28)}
.sr-input::-webkit-outer-spin-button,.sr-input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.sr-fit[aria-checked="true"]{border-color:#7FA6B8;background:linear-gradient(135deg,rgba(127,166,184,.28),rgba(127,166,184,.10));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 0 18px rgba(127,166,184,.25)}
.sr-pop{animation:sr-pop .45s cubic-bezier(.2,.9,.3,1.2) both}
.sr-size{animation:sr-pop .4s cubic-bezier(.2,.9,.3,1.2) both}
@keyframes sr-sheen{0%,100%{transform:translateX(-30%)}50%{transform:translateX(30%)}}
@keyframes sr-float{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-12%,14%) scale(1.15)}}
@keyframes sr-pop{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.sr-glass::before,.sr-glass::after,.sr-pop,.sr-size{animation:none}.sr-glass,.sr-card:hover,.sr-card:focus-within{transition:none;transform:none}}
`;

// Closest size still in stock (ties go to the larger size). Kept here so this
// file does not depend on anything else being up to date in lib/.
function nearestAvailable(size, sizes, unavailable) {
  const from = sizes.indexOf(size);
  let best = null;
  sizes.forEach((s, i) => {
    if (from < 0 || unavailable.includes(s)) return;
    const d = Math.abs(i - from);
    if (!best || d < best.d || (d === best.d && i > best.i)) best = { s, i, d };
  });
  return best ? best.s : null;
}

export default function SizeRecommender({ onSelect, current, unavailable = [] }) {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [fit, setFit] = useState("regular");

  const h = Number(height);
  const w = Number(weight);
  const valid =
    h >= LIMITS.height[0] && h <= LIMITS.height[1] && w >= LIMITS.weight[0] && w <= LIMITS.weight[1];
  const touched = height !== "" && weight !== "";

  const rec = useMemo(() => (valid ? recommendSize({ height: h, weight: w, fit }, SIZES) : null), [valid, h, w, fit]);
  const soldOut = rec ? unavailable.includes(rec.size) : false;
  const alt = rec && soldOut ? nearestAvailable(rec.size, SIZES, unavailable) : null;
  const target = soldOut ? alt : rec?.size;
  const fitLabel = FITS.find((f) => f.id === fit)?.label.toLowerCase();

  return (
    <section aria-label="Size recommendation" className="text-[#E9EEF2]">
      <style>{css}</style>
      <p className="text-sm text-[#E9EEF2]/60">Enter your height and weight, then choose how you like it to fit.</p>

      {/* two glass cards, side by side */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="sr-glass sr-card block cursor-text p-4">
          <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-[#E9EEF2]/60">Height</span>
          <span className="mt-2 flex items-baseline gap-1.5">
            <input
              className="sr-input"
              type="number"
              inputMode="numeric"
              min={LIMITS.height[0]}
              max={LIMITS.height[1]}
              placeholder="190"
              aria-label="Height in centimeters"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
            <span className="text-sm text-[#E9EEF2]/55">cm</span>
          </span>
        </label>
        <label className="sr-glass sr-card block cursor-text p-4">
          <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-[#E9EEF2]/60">Weight</span>
          <span className="mt-2 flex items-baseline gap-1.5">
            <input
              className="sr-input"
              type="number"
              inputMode="numeric"
              min={LIMITS.weight[0]}
              max={LIMITS.weight[1]}
              placeholder="80"
              aria-label="Weight in kilograms"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
            <span className="text-sm text-[#E9EEF2]/55">kg</span>
          </span>
        </label>
      </div>

      <div role="radiogroup" aria-label="Preferred fit" className="mt-3 grid grid-cols-3 gap-2">
        {FITS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={fit === f.id}
            onClick={() => setFit(f.id)}
            className={`sr-glass sr-fit px-2 py-2.5 text-center text-sm ${focus}`}
          >
            <span className="block font-medium">{f.label}</span>
            <span className="mt-0.5 block text-[11px] leading-tight text-[#E9EEF2]/55">{f.hint}</span>
          </button>
        ))}
      </div>

      {touched && !valid && (
        <p role="alert" className="mt-3 text-sm text-[#F2A7A0]">
          Please enter a height between {LIMITS.height[0]} and {LIMITS.height[1]} cm and a weight between {LIMITS.weight[0]} and {LIMITS.weight[1]} kg.
        </p>
      )}

      {rec && (
        <div className="sr-glass sr-pop mt-3 p-4 text-center" aria-live="polite">
          <p className="text-sm text-[#E9EEF2]/60">We recommend, for a {fitLabel} fit</p>
          <p key={rec.size + fit} className="sr-size my-1 text-5xl font-semibold">{rec.size}</p>
          {soldOut && (
            <p className="mb-1 text-sm text-[#F2C9A0]">
              {alt ? `${rec.size} is sold out. Closest available: ${alt}.` : `${rec.size} is sold out.`}
            </p>
          )}
          {rec.clamped && (
            <p className="text-xs text-[#E9EEF2]/55">
              This is at the edge of our size range. Message us and we will help you choose.
            </p>
          )}
          <p className="mt-2 text-xs text-[#E9EEF2]/50">
            Snug {rec.bySize.snug} · Regular {rec.bySize.regular} · Relaxed {rec.bySize.relaxed}
          </p>
          {onSelect && target && (
            <button
              type="button"
              onClick={() => onSelect(target)}
              disabled={current === target}
              className={`mt-4 rounded-full bg-[#E9EEF2] px-6 py-2.5 text-sm font-semibold text-[#070A12] transition-colors hover:bg-[#7FA6B8] disabled:opacity-60 ${focus}`}
            >
              {current === target ? `Size ${target} selected` : `Select size ${target}`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}