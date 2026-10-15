"use client";

// components/CartContext.jsx
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";

const CartCtx = createContext(null);
const STORAGE_KEY = "wave-cart-v2";
const MAX_QTY = 10;

function reducer(state, a) {
  switch (a.type) {
    case "load":
      return a.items;
    case "add": {
      const key = `${a.item.id}|${a.item.size}|${a.item.color}`;
      if (state.some((i) => i.key === key)) {
        return state.map((i) => (i.key === key ? { ...i, qty: Math.min(i.qty + 1, MAX_QTY) } : i));
      }
      return [...state, { ...a.item, key, qty: 1 }];
    }
    case "qty":
      return state
        .map((i) => (i.key === a.key ? { ...i, qty: Math.min(MAX_QTY, i.qty + a.delta) } : i))
        .filter((i) => i.qty > 0);
    case "remove":
      return state.filter((i) => i.key !== a.key);
    case "clear":
      return [];
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, []);
  const [isOpen, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) dispatch({ type: "load", items: saved });
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const openCart = useCallback(() => setOpen(true), []);
  const closeCart = useCallback(() => setOpen(false), []);
  const add = useCallback((item) => dispatch({ type: "add", item }), []);
  const changeQty = useCallback((key, delta) => dispatch({ type: "qty", key, delta }), []);
  const remove = useCallback((key) => dispatch({ type: "remove", key }), []);
  const clear = useCallback(() => dispatch({ type: "clear" }), []);

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((n, i) => n + i.qty, 0),
      total: items.reduce((n, i) => n + i.qty * i.price, 0),
      isOpen,
      openCart,
      closeCart,
      add,
      changeQty,
      remove,
      clear,
    }),
    [items, isOpen, openCart, closeCart, add, changeQty, remove, clear]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
};
