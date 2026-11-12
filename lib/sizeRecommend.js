// lib/sizeRecommend.js
// Size recommendation from height (cm), weight (kg) and preferred fit.
//
// Calibrated on one reference body: 190 cm / 80 kg wears a "Regular" L and
// chooses XL because he likes a relaxed fit. Everyone else is placed relative
// to that reference:
//
//   score = 0.7 * (weight - 80) / 11  +  0.3 * (height - 190) / 15
//
// One size step is about 11 kg of weight or 15 cm of height; weight counts
// more because it drives width, height drives length. Fit then shifts the
// result by one size: snug = -1, regular = 0, relaxed = +1.
//
// To tune it: change the four numbers below, or the reference.

export const FITS = [
  { id: "snug", label: "Snug", hint: "Close to the body", offset: -1 },
  { id: "regular", label: "Regular", hint: "True to size", offset: 0 },
  { id: "relaxed", label: "Relaxed", hint: "A bit roomy", offset: 1 },
];

const REF = { height: 190, weight: 80, size: "L" };
const KG_PER_SIZE = 11;
const CM_PER_SIZE = 15;
const W_WEIGHT = 0.7;
const W_HEIGHT = 0.3;

export const LIMITS = { height: [140, 220], weight: [35, 160] };

export function recommendSize({ height, weight, fit = "regular" }, sizes) {
  const h = Number(height);
  const w = Number(weight);
  if (!sizes?.length || !(h > 0) || !(w > 0)) return null;

  let anchor = sizes.indexOf(REF.size);
  if (anchor < 0) anchor = Math.floor((sizes.length - 1) / 2);

  const score = (W_WEIGHT * (w - REF.weight)) / KG_PER_SIZE + (W_HEIGHT * (h - REF.height)) / CM_PER_SIZE;
  const base = Math.round(anchor + score);

  const pick = (offset) => {
    const raw = base + offset;
    const idx = Math.min(sizes.length - 1, Math.max(0, raw));
    return { size: sizes[idx], clamped: raw < 0 ? "low" : raw > sizes.length - 1 ? "high" : null };
  };

  const bySize = {};
  for (const f of FITS) bySize[f.id] = pick(f.offset).size;
  const chosen = FITS.find((f) => f.id === fit) || FITS[1];
  const main = pick(chosen.offset);
  return { size: main.size, clamped: main.clamped, bySize };
}
