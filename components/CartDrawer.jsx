"use client";

// components/CartDrawer.jsx
// One drawer, three views: the bag, the order form, and the confirmation.
import { useEffect, useRef, useState } from "react";
import { serif } from "../lib/fonts";
import { formatPrice } from "../lib/products";
import { useCart } from "./CartContext";
import ProductImage from "./ProductImage";

const input =
  "w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-[#E9EEF2] placeholder:text-[#E9EEF2]/35 focus:border-[#7FA6B8] focus:outline-none";
const primary =
  "w-full rounded-full bg-[#E9EEF2] py-3.5 text-sm font-semibold text-[#070A12] transition-colors hover:bg-[#7FA6B8] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E9EEF2]";
const EMPTY = { name: "", phone: "", address: "", notes: "", website: "" };

export default function CartDrawer() {
  const { items, total, count, isOpen, closeCart, changeQty, remove, clear } = useCart();
  const [view, setView] = useState("cart"); // "cart" | "form" | "done"
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const closeRef = useRef(null);

  // Escape closes; page scroll is locked while open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && closeCart();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen, closeCart]);

  // After closing, return to the bag view
  useEffect(() => {
    if (isOpen) return;
    const t = setTimeout(() => {
      setView("cart");
      setError("");
    }, 400);
    return () => clearTimeout(t);
  }, [isOpen]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name: form.name, phone: form.phone, address: form.address, notes: form.notes },
          website: form.website, // honeypot, stays empty for real customers
          items: items.map(({ id, size, color, qty }) => ({ id, size, color, qty })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setOrderId(data.orderId);
      setPhone(form.phone);
      clear();
      setForm(EMPTY);
      setView("done");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const title = view === "cart" ? "Your bag" : view === "form" ? "Delivery details" : "Order received";
  const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7FA6B8]";

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? "" : "pointer-events-none"}`}>
      <div onClick={closeCart} aria-hidden className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`} />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0A0F1A] text-[#E9EEF2] shadow-2xl transition-[transform,visibility] duration-300 ease-out ${isOpen ? "visible translate-x-0" : "invisible translate-x-full"}`}
      >
        <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <h2 className={`${serif.className} text-3xl`}>
            {title}
            {view === "cart" && count > 0 && <span className="ml-2 text-lg text-[#E9EEF2]/50">({count})</span>}
          </h2>
          <button ref={closeRef} type="button" onClick={closeCart} aria-label="Close" className={`rounded-full p-2 text-[#E9EEF2]/70 hover:text-white ${focus}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>

        {/* BAG */}
        {view === "cart" && (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {items.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <p className="text-[#E9EEF2]/60">Your bag is empty.</p>
                    <a href="#collections" onClick={closeCart} className="mt-5 inline-block rounded-full border border-white/25 px-6 py-3 text-sm hover:border-white/60">Browse the collection</a>
                  </div>
                </div>
              ) : (
                <ul className="space-y-5">
                  {items.map((i) => (
                    <li key={i.key} className="flex gap-4">
                      <ProductImage src={i.image} alt={i.name} className="h-28 w-[5.5rem] shrink-0 rounded-xl" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className={`${serif.className} text-xl leading-tight`}>{i.name}</h3>
                            <p className="mt-1 text-sm text-[#E9EEF2]/60">Size {i.size} · {i.color}</p>
                          </div>
                          <button type="button" onClick={() => remove(i.key)} aria-label={`Remove ${i.name}, size ${i.size}`} className={`p-1 text-[#E9EEF2]/50 hover:text-white ${focus}`}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg>
                          </button>
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-3">
                          <div className="flex items-center rounded-full border border-white/20">
                            <button type="button" onClick={() => changeQty(i.key, -1)} aria-label="Decrease quantity" className={`h-9 w-9 text-lg ${focus}`}>−</button>
                            <span className="w-7 text-center text-sm" aria-live="polite">{i.qty}</span>
                            <button type="button" onClick={() => changeQty(i.key, 1)} disabled={i.qty >= 10} aria-label="Increase quantity" className={`h-9 w-9 text-lg disabled:opacity-30 ${focus}`}>+</button>
                          </div>
                          <p className="text-sm">{formatPrice(i.price * i.qty)}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {items.length > 0 && (
              <footer className="border-t border-white/10 px-6 py-5">
                <div className="mb-4 flex items-baseline justify-between">
                  <span className="text-[#E9EEF2]/60">Subtotal</span>
                  <span className={`${serif.className} text-3xl`}>{formatPrice(total)}</span>
                </div>
                <button type="button" onClick={() => setView("form")} className={primary}>Checkout</button>
              </footer>
            )}
          </>
        )}

        {/* ORDER FORM */}
        {view === "form" && (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <label className="block text-sm">
                <span className="mb-1.5 block text-[#E9EEF2]/70">Full name</span>
                <input required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={set("name")} className={input} />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block text-[#E9EEF2]/70">Phone number</span>
                <input required type="tel" inputMode="tel" autoComplete="tel" placeholder="+20 100 000 0000" value={form.phone} onChange={set("phone")} className={input} />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block text-[#E9EEF2]/70">Delivery address</span>
                <textarea required minLength={8} maxLength={300} rows={3} autoComplete="street-address" value={form.address} onChange={set("address")} className={input} />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block text-[#E9EEF2]/70">Notes (optional)</span>
                <textarea maxLength={500} rows={2} value={form.notes} onChange={set("notes")} className={input} />
              </label>
              {/* Honeypot: hidden from people, filled in by bots */}
              <input tabIndex={-1} autoComplete="off" aria-hidden value={form.website} onChange={set("website")} className="absolute -left-[9999px] h-0 w-0 opacity-0" />

              <div className="rounded-xl border border-white/10 p-4 text-sm">
                <p className="mb-2 text-[#E9EEF2]/60">{count} {count === 1 ? "item" : "items"}</p>
                <ul className="space-y-1">
                  {items.map((i) => (
                    <li key={i.key} className="flex justify-between gap-3">
                      <span className="truncate">{i.name} · {i.size} · {i.color} × {i.qty}</span>
                      <span className="shrink-0">{formatPrice(i.price * i.qty)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {error && <p role="alert" className="text-sm text-[#F2A7A0]">{error}</p>}
            </div>
            <footer className="space-y-3 border-t border-white/10 px-6 py-5">
              <div className="flex items-baseline justify-between">
                <span className="text-[#E9EEF2]/60">Total</span>
                <span className={`${serif.className} text-3xl`}>{formatPrice(total)}</span>
              </div>
              <button type="submit" disabled={sending || items.length === 0} className={primary}>{sending ? "Sending…" : "Place order"}</button>
              <button type="button" onClick={() => setView("cart")} className="w-full py-2 text-sm text-[#E9EEF2]/60 hover:text-white">Back to bag</button>
            </footer>
          </form>
        )}

        {/* CONFIRMATION */}
        {view === "done" && (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <h3 className={`${serif.className} text-4xl`}>Thank you.</h3>
            <p className="mt-4 text-[#E9EEF2]/70">Your order <span className="text-[#E9EEF2]">{orderId}</span> is in. We will contact you on {phone} to confirm it.</p>
            <button type="button" onClick={closeCart} className={`${primary} mt-8 max-w-xs`}>Continue shopping</button>
          </div>
        )}
      </aside>
    </div>
  );
}