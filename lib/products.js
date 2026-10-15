// lib/products.js
// Single source of truth for the catalog. The server re-reads prices from here,
// so a customer can never change a price from the browser.
export const CURRENCY = "USD";
export const SIZES = ["M", "L", "XL", "XXL"];

// Images live in /public (e.g. public/quarterzip-umber.png)
export const PRODUCTS = [
  {
    id: "umber-quarterzip",
    name: "Umber Quarter-Zip",
    price: 180,
    image: "/quarterzip-umber.png",
    colors: [
      { name: "Umber", hex: "#7A4B2E" },
      { name: "Charcoal", hex: "#3A3F44" },
      { name: "Stone", hex: "#C9C0B4" },
    ],
  },
  {
    id: "navy-bomber",
    name: "Navy Bomber",
    price: 240,
    image: "/jacket-navy-bomber.png",
    colors: [
      { name: "Navy", hex: "#0E2B44" },
      { name: "Black", hex: "#1A1A1A" },
      { name: "Olive", hex: "#5B5F42" },
    ],
  },
  {
    id: "storm-hoodie",
    name: "Storm Hoodie",
    price: 150,
    image: "/hoodie-grey.png",
    colors: [
      { name: "Grey", hex: "#8A8F96" },
      { name: "Ice Blue", hex: "#AEDDE9" },
      { name: "Black", hex: "#1A1A1A" },
    ],
  },
];

export const formatPrice = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 }).format(n);
