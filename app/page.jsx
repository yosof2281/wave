// app/page.jsx  (Next.js App Router + Tailwind CSS)
import { serif } from "../lib/fonts";
import Navbar from "../components/Navbar";
import WaveBackground from "../components/WaveBackground";
import Collections from "../components/Collections";

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="relative min-h-screen overflow-hidden bg-[#070A12] text-[#E9EEF2]">
        {/* 3D interactive background */}
        <WaveBackground />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(127,166,184,0.10),transparent_60%)]"
        />

        {/* Hero */}
        <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <h1 className={`${serif.className} text-[clamp(3.5rem,13vw,10rem)] leading-[0.92] tracking-tight`}>
            Elegance,
            <br />
            <span className="italic text-[#E9EEF2]/85">in motion.</span>
          </h1>

          <p className="mt-8 max-w-md text-base leading-relaxed text-[#E9EEF2]/60 sm:text-lg">
            Pieces cut to move with you. The Autumn/Winter 2026 collection is here.
          </p>

          <a
            href="#collections"
            className="mt-12 inline-flex items-center rounded-full bg-[#E9EEF2] px-10 py-4 text-base font-semibold text-[#070A12] shadow-[0_0_60px_-10px_rgba(127,166,184,0.6)] transition duration-300 hover:bg-[#7FA6B8] hover:shadow-[0_0_80px_-5px_rgba(127,166,184,0.9)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E9EEF2]"
          >
            Explore Collection
          </a>
        </section>
      </main>

      <Collections />
    </>
  );
}