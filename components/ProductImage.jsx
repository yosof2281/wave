"use client";

// components/ProductImage.jsx
// Product photo on a dark panel. If the image file is missing, the panel stays (no broken icon).
import { useState } from "react";

export default function ProductImage({ src, alt, tint = "#7FA6B8", className = "" }) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(ellipse at 50% 30%, ${tint}40, transparent 65%), linear-gradient(160deg, #16222E, #0A1119)`,
      }}
    >
      {src && !failed && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-contain p-[8%] drop-shadow-[0_25px_30px_rgba(0,0,0,0.55)]"
        />
      )}
    </div>
  );
}
