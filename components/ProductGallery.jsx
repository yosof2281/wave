"use client";

// components/ProductGallery.jsx
// شبكة المنتجات + فتح ProductModal عند الضغط. بيقرأ المخزون من بيانات المنتج نفسها (inStock / soldOutSizes).
import { useState } from "react";
import ProductModal from "./ProductModal";
import { PRODUCTS, SIZES, formatPrice } from "../lib/products";
// لو عندك سلة، فك التعليق وعدّل الاسم حسب CartContext بتاعك:
// import { useCart } from "./CartContext";

export default function ProductGallery() {
  const [selected, setSelected] = useState(null);
  const [size, setSize] = useState(SIZES[0]);
  // const { addItem } = useCart();

  const open = (p) => {
    setSelected(p);
    // اختار أول مقاس متاح
    const free = SIZES.find((s) => !(p.soldOutSizes || []).includes(s));
    setSize(free || SIZES[0]);
  };

  const handleBuy = () => {
    // addItem({ id: selected.id, name: selected.name, price: selected.price, image: selected.image, size, qty: 1 });
    console.log("Buy:", selected.name, size);
    setSelected(null);
  };

  return (
    <section id="shop" className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {PRODUCTS.map((p) => {
          const out = p.inStock === false;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => open(p)}
              className="group text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E9EEF2]"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10 bg-[#0B1018]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt={p.name}
                  className={`h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105 ${out ? "opacity-60 grayscale" : ""}`}
                />
                {out && (
                  <span className="absolute left-3 top-3 rounded-full bg-[#070A12]/85 px-3 py-1 text-xs font-semibold">Out of stock</span>
                )}
              </div>
              <p className="mt-3 text-sm capitalize text-[#E9EEF2]">{p.name}</p>
              <p className="flex gap-2 text-sm text-[#E9EEF2]/60">
                {p.oldPrice && <span className="line-through opacity-60">{formatPrice(p.oldPrice)}</span>}
                <span>{formatPrice(p.price)}</span>
              </p>
            </button>
          );
        })}
      </div>

      {selected && (
        <ProductModal
          product={selected}
          size={size}
          setSize={setSize}
          soldOut={selected.inStock === false}
          soldOutSizes={selected.soldOutSizes || []}
          onBuy={handleBuy}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}