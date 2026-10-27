// components/Contact.jsx
import { serif } from "../lib/fonts";

const LINKS = [
  {
    label: "Instagram",
    handle: "@wave_wear_99",
    href: "https://www.instagram.com/wave_wear_99",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    handle: "WAVE on Facebook",
    href: "https://www.facebook.com/share/1Hjn4REnpK/",
    icon: (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M14 8.5h2.5V5H14c-2.2 0-3.5 1.5-3.5 3.6V11H8v3.5h2.5V21H14v-6.5h2.4l.4-3.5H14V9.2c0-.5.3-.7.7-.7z" />
      </svg>
    ),
  },
];

export default function Contact() {
  return (
    <section id="contact" className="relative scroll-mt-24 bg-[#070A12] px-6 py-24 text-center text-[#E9EEF2]">
      <div className="mx-auto max-w-2xl">
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-white/50">Contact</p>
        <h2 className={`${serif.className} text-4xl leading-tight text-[#E9EEF2] md:text-5xl`}>
          Stay in <em className="text-white/80">touch.</em>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-white/60">
          Follow WAVE for new drops, behind the scenes and order updates. Message us any time.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              data-hover
              className="group flex w-full items-center justify-center gap-3 rounded-full border border-white/15 bg-white/5 px-7 py-4 text-white/80 backdrop-blur transition hover:border-white/40 hover:bg-white/10 hover:text-white sm:w-auto"
            >
              {l.icon}
              <span className="flex flex-col items-start leading-tight">
                <span className="text-sm">{l.label}</span>
                <span className="text-xs text-white/50 group-hover:text-white/70">{l.handle}</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}