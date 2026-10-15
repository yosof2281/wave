"use client";

// components/Collections.jsx
import { useRef, useState } from "react";
import { serif } from "../lib/fonts";
import { PRODUCTS, SIZES, formatPrice } from "../lib/products";
import { useCart } from "./CartContext";
import ProductImage from "./ProductImage";

function PieceCard({ product, delay, dur }) {
  const { add, openCart } = useCart();
  const tiltRef = useRef(null);
  const [size, setSize] = useState("M");
  const [color, setColor] = useState(product.colors[0].name);

  const onMove = (e) => {
    if (e.pointerType !== "mouse") return;
    const el = tiltRef.current;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--ry", `${x * 10}deg`);
    el.style.setProperty("--rx", `${-y * 10}deg`);
    el.style.setProperty("--lift", "-10px");
    el.style.setProperty("--mx", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--my", `${(y + 0.5) * 100}%`);
  };
  const onLeave = () => {
    const el = tiltRef.current;
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--lift", "0px");
  };

  // Quick buy: put it in the bag and open the bag, ready to check out
  const quickBuy = () => {
    add({ id: product.id, name: product.name, price: product.price, image: product.image, size, color });
    openCart();
  };

  const ring = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E9EEF2]";

  return (
    <div className="float-card" style={{ animationDelay: `${delay}s`, animationDuration: `${dur}s` }}>
      <article
        ref={tiltRef}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        className="group relative rounded-2xl border border-white/10 bg-white/[0.03] p-2 shadow sm:rounded-3xl sm:p-3-[0_30px_80px_-40px_rgba(0,0,0,0.9)] hover:border-[#7FA6B8]/50 hover:shadow-[0_40px_90px_-30px_rgba(127,166,184,0.35)]"
        style={{
          transform: "perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateY(var(--lift,0px))",
          transition: "transform .25s ease-out, border-color .3s, box-shadow .3s",
        }}
      >
        <ProductImage src={product.image} alt={product.name} tint={product.colors[0].hex} className="aspect-[3/4] rounded-2xl" />
        {/* Light that follows the cursor */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-2 rounded-xl opacity-0 sm:inset-3 sm:rounded-2xl transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "radial-gradient(260px circle at var(--mx,50%) var(--my,50%), rgba(233,238,242,0.14), transparent 65%)" }}
        />

        <div className="px-1 pb-1 pt-3 sm:px-2 sm:pb-2 sm:pt-4">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <h3 className={`${serif.className} text-lg leading-tight sm:text-2xl`}>{product.name}</h3>
            <p className="text-xs text-[#E9EEF2]/70 sm:text-sm">{formatPrice(product.price)}</p>
          </div>

          <div role="radiogroup" aria-label={`Size for ${product.name}`} className="mt-3 flex gap-1 sm:mt-4 sm:gap-2">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={size === s}
                onClick={() => setSize(s)}
                className={`h-8 min-w-0 flex-1 rounded-full border text-[11px] transition-colors sm:h-10 sm:text-sm ${ring} ${
                  size === s ? "border-[#E9EEF2] bg-[#E9EEF2] font-semibold text-[#070A12]" : "border-white/20 text-[#E9EEF2]/70 hover:border-white/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div role="radiogroup" aria-label={`Color for ${product.name}`} className="mt-3 flex items-center gap-2 sm:mt-4 sm:gap-3">
            {product.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                role="radio"
                aria-checked={color === c.name}
                aria-label={c.name}
                title={c.name}
                onClick={() => setColor(c.name)}
                className={`h-5 w-5 rounded-full border sm:h-6 sm:w-6 border-white/25 transition-transform hover:scale-110 ${ring} ${
                  color === c.name ? "ring-2 ring-[#E9EEF2] ring-offset-2 ring-offset-[#0B1018]" : ""
                }`}
                style={{ background: c.hex }}
              />
            ))}
            <span className="ml-1 truncate text-[11px] text-[#E9EEF2]/50 sm:text-xs">{color}</span>
          </div>

          <button
            type="button"
            onClick={quickBuy}
            className={`mt-4 w-full rounded-full bg-[#E9EEF2] py-2.5 text-xs font-semibold sm:mt-5 sm:py-3 sm:text-sm text-[#070A12] transition-colors hover:bg-[#7FA6B8] ${ring}`}
          >
            Quick buy
          </button>
        </div>
      </article>
    </div>
  );
}

export default function Collections() {
  return (
    <section id="collections" className="relative bg-[#070A12] px-4 py-24 text-[#E9EEF2] sm:px-10 sm:py-36">
      <style>{`
        @keyframes float-y { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .float-card { animation: float-y ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .float-card { animation: none; } }
      `}</style>

      <div className="mx-auto max-w-7xl">
        <div className="max-w-xl">
          <h2 className={`${serif.className} text-5xl leading-none sm:text-7xl`}>The new collection</h2>
          <p className="mt-5 text-base text-[#E9EEF2]/60 sm:text-lg">Autumn/Winter 2026. Made in a limited run.</p>
        </div>

        <ul className="mt-12 grid grid-cols-2 gap-3 sm:mt-16 sm:gap-8 lg:grid-cols-3">
          {PRODUCTS.map((p, i) => (
            <li key={p.id} className="lg:even:mt-14">
              <PieceCard product={p} delay={i * -1.3} dur={6 + (i % 3)} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}