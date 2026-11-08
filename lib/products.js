// lib/products.js
// Single source of truth for the catalog. The server re-reads prices from here,
// so a customer can never change a price from the browser.
export const CURRENCY = "EGP";
export const SIZES = ["M", "L", "XL", "XXL"];

// Images live in /public. Card images use the model photos (no spaces in file names).
export const PRODUCTS = [
  {
    id: "hoody-black",
    name: "hoody black",
    price: 850,
    image: "/hoody-black.jpg",
    colors: [{ name: "Black", hex: "#1A1A1A" }],
  },
  {
    id: "cronec-white",
    name: "cronec white",
    price: 750,
    image: "/cronec-white.png",
    colors: [{ name: "White", hex: "#E9E9E9" }],
  },
  {
    id: "hoody-light-gray",
    name: "hoody light gray",
    price: 850,
    image: "/hoodie-light-gray.png",
    colors: [{ name: "Light Gray", hex: "#B9BCC0" }],
  },
  {
    id: "cronce-navy",
    name: "cronce navy",
    price: 750,
    image: "/cronce-navy.png",
    colors: [{ name: "Navy", hex: "#0E1B3D" }],
  },
  {
    id: "hoody-gray",
    name: "hoody gray",
    price: 850,
    image: "/hoody-gray.png",
    colors: [{ name: "Gray", hex: "#8FA0B3" }],
  },
  {
    id: "cronce-black",
    name: "cronce black",
    price: 750,
    image: "/cronce-black.png",
    colors: [{ name: "Black", hex: "#1A1A1A" }],
  },
];

export const formatPrice = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 }).format(n);