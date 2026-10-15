"use client";

// components/Navbar.jsx
import { useEffect, useState } from "react";
import { serif } from "../lib/fonts";
import { useCart } from "./CartContext";

const links = ["Collections", "About", "Contact"];

export default function Navbar() {
  const { count, openCart } = useCart();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const focus = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7FA6B8]";

  return (
    // Transparent at the top; a soft blur appears once the page scrolls
    <header className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${scrolled ? "bg-[#070A12]/70 backdrop-blur-md" : "bg-transparent"}`}>
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 text-[#E9EEF2] sm:px-10">
        <a href="/" className={`${serif.className} text-3xl tracking-[0.28em] ${focus}`}>WAVE</a>
        <ul className="flex items-center gap-4 text-sm sm:gap-9">
          {links.map((l) => (
            <li key={l}>
              <a href={`#${l.toLowerCase()}`} className={`text-[#E9EEF2]/70 transition-colors hover:text-white ${focus}`}>{l}</a>
            </li>
          ))}
          <li>
            <button type="button" onClick={openCart} aria-label={`Open bag, ${count} items`} className={`relative p-1 text-[#E9EEF2]/80 transition-colors hover:text-white ${focus}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 8h14l-1 12H6L5 8Z" />
                <path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
              {count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-[#E9EEF2] px-1 text-[11px] font-semibold text-[#070A12]">{count}</span>
              )}
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
}
