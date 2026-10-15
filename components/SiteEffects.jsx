"use client";

// components/SiteEffects.jsx
// Preloader, custom cursor, hero parallax, scroll reveals, hero video pause.
// Same behaviour as the original HTML, wrapped in one effect with full cleanup.
import { useEffect } from "react";

export default function SiteEffects() {
  useEffect(() => {
    const undo = [];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Preloader
    const pre = document.getElementById("preloader");
    const t = setTimeout(() => pre && pre.classList.add("is-hidden"), 700);
    undo.push(() => clearTimeout(t));

    // Cursor + parallax (mouse devices only)
    const cur = document.getElementById("cursor");
    const dot = document.getElementById("cursorDot");
    const fine = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
    if (!reduced && fine && cur && dot) {
      const stage = document.querySelector(".stage");
      const wm = document.querySelector(".watermark");
      let mx = window.innerWidth / 2, my = window.innerHeight / 2, cx = mx, cy = my;
      let queued = false, raf = 0;

      const frame = () => {
        queued = false;
        dot.style.transform = `translate3d(${mx}px,${my}px,0) translate(-50%,-50%)`;
        cx += (mx - cx) * 0.18;
        cy += (my - cy) * 0.18;
        cur.style.transform = `translate3d(${cx}px,${cy}px,0) translate(-50%,-50%)`;
        const nx = mx / window.innerWidth - 0.5;
        const ny = my / window.innerHeight - 0.5;
        if (stage) stage.style.transform = `translate3d(${nx * 10}px,${ny * 6}px,0)`;
        if (wm) wm.style.transform = `translate3d(0, calc(-50% + ${ny * -10}px), 0)`;
        if (Math.abs(mx - cx) > 0.3 || Math.abs(my - cy) > 0.3) {
          queued = true;
          raf = requestAnimationFrame(frame);
        }
      };
      const onMove = (e) => {
        mx = e.clientX;
        my = e.clientY;
        cur.classList.toggle("is-active", !!(e.target.closest && e.target.closest("[data-hover], a, button, .card")));
        if (!queued) {
          queued = true;
          raf = requestAnimationFrame(frame);
        }
      };
      window.addEventListener("mousemove", onMove, { passive: true });
      frame();
      undo.push(() => {
        window.removeEventListener("mousemove", onMove);
        cancelAnimationFrame(raf);
      });
    } else {
      // No custom cursor, so keep the normal one visible
      document.body.style.cursor = "auto";
      undo.push(() => (document.body.style.cursor = ""));
    }

    // Scroll reveals
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.15 }
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    undo.push(() => io.disconnect());

    // Pause the hero video when off screen or tab hidden
    const vid = document.querySelector(".jacket-video");
    if (vid) {
      const vio = new IntersectionObserver(
        (entries) => entries.forEach((en) => (en.isIntersecting ? vid.play().catch(() => {}) : vid.pause())),
        { threshold: 0.05 }
      );
      vio.observe(vid);
      const onVis = () => (document.hidden ? vid.pause() : vid.play().catch(() => {}));
      document.addEventListener("visibilitychange", onVis);
      undo.push(() => {
        vio.disconnect();
        document.removeEventListener("visibilitychange", onVis);
      });
    }

    return () => undo.forEach((fn) => fn());
  }, []);

  return (
    <>
      <div className="preloader" id="preloader"><span>WAVE FROM</span></div>
      <div className="cursor" id="cursor" />
      <div className="cursor-dot" id="cursorDot" />
      <div className="grain" />
      <div className="vignette" />
    </>
  );
}
