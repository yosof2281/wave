// lib/products.js
// Single source of truth for the catalog. The server re-reads prices from here,
// so a customer can never change a price from the browser.
export const CURRENCY = "EGP";
export const SIZES = ["M", "L", "XL", "XXL"];

// Images live in /public (e.g. public/quarterzip-umber.png)
export const PRODUCTS = [
  {
    id: "umber-quarterzip",
    name: "hoody black",
    price: 850,
    image: "/hoody black.png",
    colors: [
      { name: "Umber", hex: "#7A4B2E" },
      { name: "Charcoal", hex: "#3A3F44" },
      { name: "Stone", hex: "#C9C0B4" },
    ],
  },
  {
    id: "navy-bomber",
    name: "cronec white",
    price: 750,
    image: "/cronec white.png",
    colors: [
      { name: "Navy", hex: "#0E2B44" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Olive", hex: "#5B5F42" },
    ],
  },
  {
    id: "storm-hoodie",
    name: "hoody light gray",
    price: 850,
    image: "/hoodie-light-gray.png",
    colors: [
      { name: "Grey", hex: "#8A8F96" },
      { name: "Ice Blue", hex: "#AEDDE9" },
      { name: "Black", hex: "#1A1A1A" },
    ],
  },
  // NEW: edit name, price and image to match your real products
  {
    id: "tshirt-1",
    name: "cronce navy",
    price: 750,
    image: "/cronce navy.png",
    colors: [{ name: "Black", hex: "#1A1A1A" }],
  },
  {
    id: "tshirt-2",
    name: "hoody gray",
    price: 850,
    image: "/hoody gray.png",
    colors: [{ name: "Stone", hex: "#C9C0B4" }],
  },
  {
    id: "tshirt-3",
    name: "cronce black",
    price: 750,
    image: "/cronce black.png",
    colors: [{ name: "Olive", hex: "#5B5F42" }],
  },
];

export const formatPrice = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 }).format(n);