// lib/fbq.js
// Safe wrapper around the Meta Pixel: does nothing if the pixel is blocked or not loaded yet.
export function track(event, data, options) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  try {
    window.fbq("track", event, data, options);
  } catch {}
}
