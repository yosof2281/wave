// app/page.jsx  (Next.js App Router + Tailwind CSS)
import { serif } from "../lib/fonts";
import Navbar from "../components/Navbar";
import WaveBackground from "../components/WaveBackground";
import ApparelShowcase from "../components/ApparelShowcase";
import Collections from "../components/Collections";
import { PRODUCTS } from "../lib/products";

// The showcase uses the first three products, so the photos always match the shop
const KINDS = ["zip", "bomber", "hoodie"];
const showcaseItems = PRODUCTS.slice(0, 3).map((p, i) => ({
  src: p.image,
  color: p.colors[0].hex,
  glow: p.colors[0].hex,
  kind: KINDS[i],
}));

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="relative min-h-svh overflow-hidden bg-[#0B0F19] text-[#E9EEF2]">
        {/* Glowing particle background */}
        <WaveBackground />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(127,166,184,0.12),transparent_60%)]"
        />
        {/* Blends the hero into the next section */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#070A12]"
        />

        <section className="relative z-10 mx-auto flex min-h-svh max-w-6xl flex-col items-center justify-center px-6 pb-14 pt-28 text-center">
          <h1 className={`${serif.className} text-[clamp(2.75rem,8vw,6.5rem)] leading-[0.95] tracking-tight`}>
            Elegance,
            <br />
            <span className="italic text-[#E9EEF2]/85">in motion.</span>
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-[#E9EEF2]/60 sm:text-lg">
            Pieces cut to move with you. The Autumn/Winter 2026 collection is here.
          </p>

          {/* 3D showcase */}
          <ApparelShowcase items={showcaseItems.length === 3 ? showcaseItems : undefined} className="mt-2" />

          {/* Glass button */}
          <a
            href="#collections"
            className="group relative mt-2 inline-flex items-center gap-3 overflow-hidden rounded-full border border-white/20 bg-white/[0.07] px-10 py-4 text-base font-medium text-[#E9EEF2] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_12px_40px_-12px_rgba(127,166,184,0.5)] backdrop-blur-xl transition duration-300 hover:border-white/40 hover:bg-white/[0.13] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_16px_50px_-10px_rgba(127,166,184,0.75)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E9EEF2]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition duration-700 group-hover:left-[130%] group-hover:opacity-100"
            />
            <span className="relative">Explore Collection</span>
            <svg className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </section>
      </main>

      <Collections />
    </>
  );
}