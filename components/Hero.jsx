"use client";

// components/Hero.jsx
import { useRef, useState } from "react";

const ROW = "WAVE FROM\u00A0\u00A0".repeat(4);
const PLACEHOLDER = "Click the text and type your name";

function Marquee({ className = "" }) {
  return (
    <div className={`marquee-row ${className}`}>
      <div className="track">
        <span>{ROW}</span>
        <span>{ROW}</span>
      </div>
    </div>
  );
}

export default function Hero() {
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const inputRef = useRef(null);

  const startEdit = () => {
    setEditing(true);
    setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
  };
  const clean = name.trim();

  return (
    <section className="hero">
      <div className="volumetric" />
      <div className="red-glow-floor" />
      <div className="watermark" aria-hidden>
        <Marquee className="dim" />
        <Marquee className="reverse" />
        <Marquee className="dim" />
      </div>

      <div className="hero-inner">
        <div className="kicker">AUTUMN / WINTER — SILHOUETTE 01</div>

        {editing ? (
          <input
            ref={inputRef}
            className="name-cta"
            value={name}
            maxLength={24}
            aria-label="Your name, printed on the jacket"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        ) : (
          <button type="button" className="name-cta" onClick={startEdit} data-hover>
            {clean || PLACEHOLDER}
          </button>
        )}

        <div className="stage">
          <div className="jacket-wrap left">
            <img src="/quarterzip-umber.png" alt="Umber Quarter-Zip" decoding="async" />
            <img className="reflection" src="/quarterzip-umber.png" alt="" decoding="async" />
          </div>
          <div className="jacket-wrap center">
            <div className="floor-line" />
            <div className={`name-print${clean ? " is-set" : ""}`}>{clean.toUpperCase()}</div>
            <img src="/jacket-navy-bomber.png" alt="Navy Bomber" decoding="async" />
            <img className="reflection" src="/jacket-navy-bomber.png" alt="" decoding="async" />
          </div>
          <div className="jacket-wrap right">
            <video className="jacket-video" playsInline muted loop autoPlay preload="metadata" poster="/hoodie-grey.png" disablePictureInPicture>
              <source src="/Cl.mp4" type="video/mp4" />
            </video>
            <img className="reflection" src="/hoodie-grey.png" alt="" decoding="async" />
          </div>
        </div>

        <div className="hero-foot">
          <div className="headline">Cut from pressure. Built for the long descent into winter.</div>
          <a href="#collection" className="cta" data-hover>View the Collection</a>
        </div>
      </div>

      <div className="scroll-cue"><span className="line" /><span className="dot" />SCROLL FOR MORE</div>
    </section>
  );
}
