"use client";

// components/ProductModal.jsx
// Big product card: large photo, up to 3 more photos, sizes with weight/height guide, buy button.
// It is drawn on document.body (portal) so the card's tilt animation cannot shift it.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { serif } from "../lib/fonts";
import { SIZES, SIZE_GUIDE, formatPrice } from "../lib/products";

const ring = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E9EEF2]";
const panelBg = "radial-gradient(ellipse at 50% 30%, #7FA6B833, transparent 65%), linear-gradient(160deg, #16222E, #0A1119)";

export default function ProductModal({ product, size, setSize, soldOut = false, soldOutSizes = [], onBuy, onClose }) {
  const [failed, setFailed] = useState({});
  const [active, setActive] = useState(0);
  const closeRef = useRef(null);
  const closeFn = useRef(onClose);
  closeFn.current = onClose;

  const all = (product.images && product.images.length ? product.images : [product.image]).slice(0, 4);
  const imgs = all.filter((s) => s && !failed[s]);
  const idx = Math.min(active, Math.max(imgs.length - 1, 0));
  const current = imgs[idx];
  const countRef = useRef(0);
  countRef.current = imgs.length;

  const guide = product.sizeGuide || SIZE_GUIDE;
  const onSale = product.oldPrice > product.price;
  const na = (s) => soldOut || soldOutSizes.includes(s);
  const chosen = guide[size];

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") closeFn.current();
      if (e.key === "ArrowRight") setActive((a) => Math.min(a + 1, Math.max(countRef.current - 1, 0)));
      if (e.key === "ArrowLeft") setActive((a) => Math.max(a - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <div className="relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0B1018] text-[#E9EEF2] shadow-2xl sm:rounded-3xl">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-[#070A12]/80 text-[#E9EEF2] backdrop-blur hover:bg-[#070A12] ${ring}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="grid gap-5 overflow-y-auto p-4 sm:p-6 md:grid-cols-2 md:gap-8">
          {/* photos */}
          <div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl" style={{ background: panelBg }}>
              {current && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={current}
                  src={current}
                  alt={product.name}
                  draggable={false}
                  onError={() => setFailed((f) => ({ ...f, [current]: true }))}
                  className={`absolute inset-0 h-full w-full select-none object-cover object-top ${soldOut ? "opacity-60 grayscale" : ""}`}
                />
              )}
              {soldOut && (
                <span className="absolute left-4 top-4 rounded-full bg-[#070A12]/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em]">
                  Out of stock
                </span>
              )}
            </div>
            {imgs.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {imgs.map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setActive(i)}
                    aria-label={`Photo ${i + 1}`}
                    aria-current={i === idx}
                    className={`relative aspect-[3/4] overflow-hidden rounded-xl border-2 transition-colors ${ring} ${
                      i === idx ? "border-[#E9EEF2]" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                    style={{ background: panelBg }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      draggable={false}
                      onError={() => setFailed((f) => ({ ...f, [src]: true }))}
                      className="absolute inset-0 h-full w-full object-cover object-top"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* details */}
          <div className="flex flex-col">
            <h3 className={`${serif.className} pr-10 text-3xl leading-tight sm:text-4xl`}>{product.name}</h3>
            <p className="mt-2 flex items-baseline gap-3 text-base text-[#E9EEF2]/80">
              {onSale && <span className="text-[#E9EEF2]/40 line-through">{formatPrice(product.oldPrice)}</span>}
              <span className={onSale ? "text-xl font-semibold text-[#E9EEF2]" : "text-xl"}>{formatPrice(product.price)}</span>
            </p>

            <p className="mt-6 text-sm text-[#E9EEF2]/60">Size</p>
            <div role="radiogroup" aria-label={`Size for ${product.name}`} className="mt-2 flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={size === s}
                  disabled={na(s)}
                  onClick={() => setSize(s)}
                  className={`h-11 flex-1 rounded-full border text-sm transition-colors ${ring} ${
                    na(s)
                      ? "cursor-not-allowed border-white/10 text-[#E9EEF2]/30 line-through"
                      : size === s
                      ? "border-[#E9EEF2] bg-[#E9EEF2] font-semibold text-[#070A12]"
                      : "border-white/20 text-[#E9EEF2]/70 hover:border-white/50"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {chosen && (
              <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                Size <span className="font-semibold">{size}</span> fits{" "}
                <span className="font-semibold">{chosen.weight}</span> and <span className="font-semibold">{chosen.height}</span>
              </p>
            )}

            <p className="mt-6 text-sm text-[#E9EEF2]/60">Size guide</p>
            <div className="mt-2 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-white/[0.04] text-xs uppercase tracking-wider text-[#E9EEF2]/50">
                    <th className="px-4 py-2 font-medium">Size</th>
                    <th className="px-4 py-2 font-medium">Weight</th>
                    <th className="px-4 py-2 font-medium">Height</th>
                  </tr>
                </thead>
                <tbody>
                  {SIZES.map((s) => (
                    <tr key={s} className={`border-t border-white/10 ${size === s ? "bg-white/[0.08] text-[#E9EEF2]" : "text-[#E9EEF2]/70"}`}>
                      <td className="px-4 py-2.5 font-semibold">{s}</td>
                      <td className="px-4 py-2.5">{guide[s]?.weight || "-"}</td>
                      <td className="px-4 py-2.5">{guide[s]?.height || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={onBuy}
              disabled={soldOut || soldOutSizes.includes(size)}
              className={`mt-6 w-full rounded-full py-3.5 text-sm font-semibold transition-colors ${ring} ${
                soldOut || soldOutSizes.includes(size)
                  ? "cursor-not-allowed bg-white/10 text-[#E9EEF2]/40"
                  : "bg-[#E9EEF2] text-[#070A12] hover:bg-[#7FA6B8]"
              }`}
            >
              {soldOut ? "Out of stock" : soldOutSizes.includes(size) ? "Size sold out" : "Quick buy"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
