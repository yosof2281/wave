"use client";

// components/Collections.jsx
import { useEffect, useRef, useState } from "react";
import { serif } from "../lib/fonts";
import { PRODUCTS, SIZES, formatPrice } from "../lib/products";
import { useCart } from "./CartContext";
import ProductImage from "./ProductImage";
import ProductModal from "./ProductModal";
import AdminStock from "./AdminStock";

function PieceCard({ product, delay, dur }) {
  const { add, openCart } = useCart();
  const tiltRef = useRef(null);
  // Product page (modal): opens when the card is clicked
  const [open, setOpen] = useState(false);
  // Stock: product.inStock === false marks the whole piece sold out,
  // product.soldOutSizes (e.g. ["XXL"]) marks single sizes sold out.
  const soldOut = product.inStock === false;
  const onSale = product.oldPrice > product.price;
  const salePct = onSale ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const soldOutSizes = product.soldOutSizes || [];
  const [size, setSize] = useState(SIZES.find((x) => !soldOutSizes.includes(x)) || SIZES[0]);
  // Color picker removed: the first color is used for the cart line
  const color = product.colors[0].name;

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
    if (soldOut || soldOutSizes.includes(size)) return;
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
        onClick={(e) => {
          // the size buttons and Quick buy keep working and do not open the product page
          if (e.target.closest("button")) return;
          setOpen(true);
        }}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target === e.currentTarget) setOpen(true);
        }}
        aria-label={`Open ${product.name}`}
        className={`group relative cursor-pointer rounded-2xl border border-white/10 bg-white/[0.03] p-2 shadow sm:rounded-3xl sm:p-3-[0_30px_80px_-40px_rgba(0,0,0,0.9)] hover:border-[#7FA6B8]/50 hover:shadow-[0_40px_90px_-30px_rgba(127,166,184,0.35)] ${ring}`}
        style={{
          transform: "perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)) translateY(var(--lift,0px))",
          transition: "transform .25s ease-out, border-color .3s, box-shadow .3s",
        }}
      >
        <ProductImage
          src={product.image}
          alt={product.name}
          tint={product.colors[0].hex}
          className={`aspect-[3/4] rounded-2xl transition-opacity ${soldOut ? "opacity-50 grayscale" : ""}`}
        />
        {onSale && !soldOut && (
          <span className="pointer-events-none absolute right-4 top-4 z-10 rounded-full bg-[#E9EEF2] px-3 py-1 text-[10px] font-semibold text-[#070A12] sm:right-6 sm:top-6 sm:text-xs">
            -{salePct}%
          </span>
        )}
        {soldOut && (
          <span className="pointer-events-none absolute left-4 top-4 z-10 rounded-full bg-[#070A12]/85 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#E9EEF2] sm:left-6 sm:top-6 sm:text-xs">
            Out of stock
          </span>
        )}
        {/* Light that follows the cursor */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-2 rounded-xl opacity-0 sm:inset-3 sm:rounded-2xl transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: "radial-gradient(260px circle at var(--mx,50%) var(--my,50%), rgba(233,238,242,0.14), transparent 65%)" }}
        />

        <div className="px-1 pb-1 pt-3 sm:px-2 sm:pb-2 sm:pt-4">
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <h3 className={`${serif.className} text-lg leading-tight sm:text-2xl`}>{product.name}</h3>
            <p className="flex items-baseline gap-2 text-xs text-[#E9EEF2]/70 sm:text-sm">
              {onSale && <span className="text-[#E9EEF2]/40 line-through">{formatPrice(product.oldPrice)}</span>}
              <span className={onSale ? "font-semibold text-[#E9EEF2]" : ""}>{formatPrice(product.price)}</span>
            </p>
          </div>

          <div role="radiogroup" aria-label={`Size for ${product.name}`} className="mt-3 flex gap-1 sm:mt-4 sm:gap-2">
            {SIZES.map((s) => {
              const na = soldOut || soldOutSizes.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={size === s}
                  disabled={na}
                  onClick={() => setSize(s)}
                  className={`h-8 min-w-0 flex-1 rounded-full border text-[11px] transition-colors sm:h-10 sm:text-sm ${ring} ${
                    na
                      ? "cursor-not-allowed border-white/10 text-[#E9EEF2]/30 line-through"
                      : size === s
                      ? "border-[#E9EEF2] bg-[#E9EEF2] font-semibold text-[#070A12]"
                      : "border-white/20 text-[#E9EEF2]/70 hover:border-white/50"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={quickBuy}
            disabled={soldOut}
            className={`mt-4 w-full rounded-full py-2.5 text-xs font-semibold sm:mt-5 sm:py-3 sm:text-sm transition-colors ${ring} ${
              soldOut
                ? "cursor-not-allowed bg-white/10 text-[#E9EEF2]/40"
                : "bg-[#E9EEF2] text-[#070A12] hover:bg-[#7FA6B8]"
            }`}
          >
            {soldOut ? "Out of stock" : "Quick buy"}
          </button>
        </div>
      </article>

      {/* Outside the <article> on purpose: clicks inside the modal must not reach the card */}
      {open && (
        <ProductModal
          product={product}
          size={size}
          setSize={setSize}
          soldOut={soldOut}
          soldOutSizes={soldOutSizes}
          onBuy={() => {
            quickBuy();
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

export default function Collections() {
  // Stock saved from the admin panel overrides what is written in products.js
  const [stock, setStock] = useState({});
  const [adminOpen, setAdminOpen] = useState(false);
  const clicks = useRef({ n: 0, t: 0 });

  useEffect(() => {
    let dead = false;
    fetch("/api/stock", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => !dead && setStock(d.stock || {}))
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, []);

  const products = PRODUCTS.map((p) => ({ ...p, ...(stock[p.id] || {}) }));

  // Three quick clicks on the title open the hidden stock panel
  const onTitleClick = () => {
    const now = Date.now();
    const c = clicks.current;
    clicks.current = now - c.t < 700 ? { n: c.n + 1, t: now } : { n: 1, t: now };
    if (clicks.current.n >= 3) {
      clicks.current = { n: 0, t: 0 };
      setAdminOpen(true);
    }
  };

  return (
    <section id="collections" className="relative bg-[#070A12] px-4 py-24 text-[#E9EEF2] sm:px-10 sm:py-36">
      <style>{`
        @keyframes float-y { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .float-card { animation: float-y ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .float-card { animation: none; } }
      `}</style>

      <div className="mx-auto max-w-7xl">
        <div className="max-w-xl">
          <h2 onClick={onTitleClick} className={`${serif.className} cursor-default select-none text-5xl leading-none sm:text-7xl`}>
            The new collection
          </h2>
          <p className="mt-5 text-base text-[#E9EEF2]/60 sm:text-lg">Autumn/Winter 2026. Made in a limited run.</p>
        </div>

        <ul className="mt-12 grid grid-cols-2 gap-3 sm:mt-16 sm:gap-8 lg:grid-cols-3">
          {products.map((p, i) => (
            <li key={p.id} className="lg:even:mt-14">
              <PieceCard product={p} delay={i * -1.3} dur={6 + (i % 3)} />
            </li>
          ))}
        </ul>
      </div>

      {adminOpen && <AdminStock products={products} onSaved={setStock} onClose={() => setAdminOpen(false)} />}
    </section>
  );
}