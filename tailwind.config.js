// tailwind.config.js  (Tailwind CSS v3)
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx,mdx}",
    "./components/**/*.{js,jsx,ts,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#070A12",   // page background
        foam: "#E9EEF2",  // text, primary button
        tide: "#7FA6B8",  // accent
        deep: "#2B4A5C",  // dark accent
      },
    },
  },
  plugins: [],
};
