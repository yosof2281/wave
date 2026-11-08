// lib/products.js
// Single source of truth for the catalog. The server re-reads prices from here,
// so a customer can never change a price from the browser.
export const CURRENCY = "EGP";
export const SIZES = ["M", "L", "XL", "XXL"];

// SALE: every product gets this discount. Set to 0 to end the sale.
// Write the normal price in `basePrice`; the sale price is worked out for you.
// To set an exact sale price for one product, add `salePrice: 600` next to its basePrice.
export const SALE_PERCENT = 20;
const sale = (n) => Math.round((n * (100 - SALE_PERCENT)) / 100);

// Stock: set inStock: false to mark a piece as out of stock.
// To sell out only some sizes, add e.g. soldOutSizes: ["XXL", "XL"] to the product.
// Photos: each product has one main photo in `image`, kept in /public. %20 stands for a space in the file name.
const RAW_PRODUCTS = [
  {
    id: "hoody-black",
    name: "hoody black",
    basePrice: 850,
    inStock: true, // set to false to mark this piece as out of stock
    image: "/hoody%20black.png",
    colors: [{ name: "Black", hex: "#1A1A1A" }],
  },
  {
    id: "cronec-white",
    name: "cronec white",
    basePrice: 800,
    salePrice: 600,
    inStock: true, // set to false to mark this piece as out of stock
    image: "/cronec%20white.png",
    colors: [{ name: "White", hex: "#E9E9E9" }],
  },
  {
    id: "hoody-light-gray",
    name: "hoody light gray",
    basePrice: 850,
    inStock: true, // set to false to mark this piece as out of stock
    image: "/hoodie-light-gray.png",
    colors: [{ name: "Light Gray", hex: "#B9BCC0" }],
  },
  {
    id: "cronce-navy",
    name: "cronce navy",
    basePrice: 800,
    salePrice: 600,
    inStock: true, // set to false to mark this piece as out of stock
    image: "/cronce%20navy.png",
    colors: [{ name: "Navy", hex: "#0E1B3D" }],
  },
  {
    id: "hoody-gray",
    name: "hoody gray",
    basePrice: 850,
    inStock: true, // set to false to mark this piece as out of stock
    image: "/hoody%20gray.png",
    colors: [{ name: "Gray", hex: "#8FA0B3" }],
  },
  {
    id: "cronce-black",
    name: "cronce black",
    basePrice: 800,
    salePrice: 600,
    inStock: true, // set to false to mark this piece as out of stock
    image: "/cronce%20black.png",
    colors: [{ name: "Black", hex: "#1A1A1A" }],
  },
];

// What the site, the cart and the server use. `price` is the price the customer pays,
// `oldPrice` is the crossed-out normal price (only while a sale is on).
export const PRODUCTS = RAW_PRODUCTS.map(({ basePrice, salePrice, ...p }) => ({
  ...p,
  // salePrice (if you set one) wins over the percent; no sale = normal price
  price: SALE_PERCENT > 0 ? salePrice ?? sale(basePrice) : basePrice,
  oldPrice: SALE_PERCENT > 0 ? basePrice : null,
}));

export const formatPrice = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 }).format(n);