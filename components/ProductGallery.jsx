"use client";

// components/ProductGallery.jsx
// Photo carousel for a product card: swipe on phones, arrows + dots on desktop.
// Takes a list of photos. With one photo it looks exactly like a normal card image.
import { useRef, useState } from "react";

export default function ProductGallery({ images = [], alt = "", tint = "#7FA6B8", className = "" }) {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState({});
  const list = images.filter((src) => src && !failed[src]);
  const many = list.length > 1;

  const onScroll = () => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const go = (i) => {
    const el = trackRef.current;
    if (!el) return;
    const n = Math.max(0, Math.min(list.length - 1, i));
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };

  const arrow =
    "absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-[#070A12]/70 text-[#E9EEF2] opacity-0 backdrop-blur transition-opacity hover:bg-[#070A12] focus-visible:opacity-100 group-hover:opacity-100 sm:flex";

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(ellipse at 50% 30%, ${tint}40, transparent 65%), linear-gradient(160deg, #16222E, #0A1119)`,
      }}
    >
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {list.map((src, i) => (
          <div key={src} className="h-full w-full shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={many ? `${alt} (${i + 1} of ${list.length})` : alt}
              loading={i === 0 ? "eager" : "lazy"}
              draggable={false}
              onError={() => setFailed((f) => ({ ...f, [src]: true }))}
              className="h-full w-full select-none object-cover object-top"
            />
          </div>
        ))}
      </div>

      {many && (
        <>
          {index > 0 && (
            <button type="button" aria-label="Previous photo" onClick={() => go(index - 1)} className={`${arrow} left-2`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          {index < list.length - 1 && (
            <button type="button" aria-label="Next photo" onClick={() => go(index + 1)} className={`${arrow} right-2`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
            {list.map((src, i) => (
              <span
                key={src}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-[#E9EEF2]" : "w-1.5 bg-[#E9EEF2]/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
