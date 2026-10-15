"use client";

// components/Header.jsx
import { useCart } from "./CartContext";

export default function Header() {
  const { count, openCart } = useCart();
  return (
    <header>
      <div className="logo">WAVE FROM</div>
      <nav>
        <a href="#collection" data-hover>Collection</a>
        <a href="#craft" data-hover>Craft</a>
        <a href="#contact" data-hover>Contact</a>
      </nav>
      <div className="header-right">
        <a href="#collection" className="header-cta" data-hover>Shop</a>
        <button type="button" className="cart-btn" onClick={openCart} data-hover aria-label={`Open cart, ${count} items`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 6h15l-1.5 9h-12z" />
            <path d="M6 6L4.5 3H2" />
            <circle cx="9.5" cy="19.5" r="1.4" />
            <circle cx="17.5" cy="19.5" r="1.4" />
          </svg>
          <span className={`cart-count${count > 0 ? " is-visible" : ""}`}>{count}</span>
        </button>
      </div>
    </header>
  );
}
