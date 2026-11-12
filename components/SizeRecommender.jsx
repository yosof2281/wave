"use client";

// components/SizeRecommender.jsx
// Drop this inside your size chart. Optional: onSelect(size) lets the customer
// pick the recommended size on the product in one tap.
import { useMemo, useState } from "react";
import { SIZES } from "../lib/products";
import { FITS, LIMITS, recommendSize } from "../lib/sizeRecommend";

const input =
  "w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-[#E9EEF2] placeholder:text-[#E9EEF2]/35 focus:border-[#7FA6B8] focus:outline-none";
const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7FA6B8]";

export default function SizeRecommender({ onSelect }) {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [fit, setFit] = useState("regular");

  const h = Number(height);
  const w = Number(weight);
  const valid =
    h >= LIMITS.height[0] && h <= LIMITS.height[1] && w >= LIMITS.weight[0] && w <= LIMITS.weight[1];
  const touched = height !== "" && weight !== "";

  const rec = useMemo(() => (valid ? recommendSize({ height: h, weight: w, fit }, SIZES) : null), [valid, h, w, fit]);
  const fitLabel = FITS.find((f) => f.id === fit)?.label.toLowerCase();

  return (
    <section aria-label="Size recommendation" className="rounded-2xl border border-white/10 p-5 text-[#E9EEF2]">
      <h3 className="text-lg font-medium">Find your size</h3>
      <p className="mt-1 text-sm text-[#E9EEF2]/60">Enter your height and weight, then choose how you like it to fit.</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block text-sm">
          <span className="mb-1.5 block text-[#E9EEF2]/70">Height (cm)</span>
          <input type="number" inputMode="numeric" min={LIMITS.height[0]} max={LIMITS.height[1]} placeholder="e.g. 190" value={height} onChange={(e) => setHeight(e.target.value)} className={input} />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-[#E9EEF2]/70">Weight (kg)</span>
          <input type="number" inputMode="numeric" min={LIMITS.weight[0]} max={LIMITS.weight[1]} placeholder="e.g. 80" value={weight} onChange={(e) => setWeight(e.target.value)} className={input} />
        </label>
      </div>

      <div role="radiogroup" aria-label="Preferred fit" className="mt-4 grid grid-cols-3 gap-2">
        {FITS.map((f) => {
          const active = fit === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setFit(f.id)}
              className={`rounded-xl border px-2 py-2.5 text-center text-sm transition-colors ${focus} ${
                active ? "border-[#7FA6B8] bg-[#7FA6B8]/10" : "border-white/15 hover:border-white/40"
              }`}
            >
              <span className="block font-medium">{f.label}</span>
              <span className="mt-0.5 block text-[11px] leading-tight text-[#E9EEF2]/55">{f.hint}</span>
            </button>
          );
        })}
      </div>

      {touched && !valid && (
        <p role="alert" className="mt-4 text-sm text-[#F2A7A0]">
          Please enter a height between {LIMITS.height[0]} and {LIMITS.height[1]} cm and a weight between {LIMITS.weight[0]} and {LIMITS.weight[1]} kg.
        </p>
      )}

      {rec && (
        <div className="mt-4 rounded-xl bg-white/[0.05] p-4 text-center" aria-live="polite">
          <p className="text-sm text-[#E9EEF2]/60">We recommend, for a {fitLabel} fit</p>
          <p className="my-1 text-4xl font-semibold">{rec.size}</p>
          {rec.clamped && (
            <p className="text-xs text-[#E9EEF2]/55">
              This is at the edge of our size range. Message us and we will help you choose.
            </p>
          )}
          <p className="mt-2 text-xs text-[#E9EEF2]/50">
            Snug {rec.bySize.snug} · Regular {rec.bySize.regular} · Relaxed {rec.bySize.relaxed}
          </p>
          {onSelect && (
            <button
              type="button"
              onClick={() => onSelect(rec.size)}
              className={`mt-4 rounded-full bg-[#E9EEF2] px-6 py-2.5 text-sm font-semibold text-[#070A12] transition-colors hover:bg-[#7FA6B8] ${focus}`}
            >
              Select size {rec.size}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
