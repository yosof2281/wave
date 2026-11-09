// lib/products.js
// Single source of truth for the catalog. The server re-reads prices from here,
// so a customer can never change a price from the browser.
export const CURRENCY = "EGP";
export const SIZES = ["M", "L", "XL", "XXL"];

// Size guide shown in the product card (weight / height). Edit the numbers to match your fit.
// To give one product its own guide, add `sizeGuide: { M: {...}, ... }` to that product.
export const SIZE_GUIDE = {
  M: { weight: "65-75 kg", height: "168-175 cm" },
  L: { weight: "75-85 kg", height: "175-182 cm" },
  XL: { weight: "85-95 kg", height: "182-190 cm" },
  XXL: { weight: "95-105 kg", height: "188-195 cm" },
};

// SALE: every product gets this discount. Set to 0 to end the sale.
// Write the normal price in `basePrice`; the sale price is worked out for you.
// To set an exact sale price for one product, add `salePrice: 600` next to its basePrice.
export const SALE_PERCENT = 20;
const sale = (n) => Math.round((n * (100 - SALE_PERCENT)) / 100);

// Stock: set inStock: false to mark a piece as out of stock.
// To sell out only some sizes, add e.g. soldOutSizes: ["XXL", "XL"] to the product.
// Photos: each product has one main photo in `image`, kept in /public. %20 stands for a space in the file name.
// To show more photos in the product card, add `images: ["/a.png", "/b.png", "/c.png"]` (up to 4).
const RAW_PRODUCTS = [
  {
    id: "hoody-black",
    name: "hoody black",
    basePrice: 850,
    inStock: true, // set to false to mark this piece as out of stock
    image: "/hoody%20black.png",
    images: ["/hoody%20black.png", "/hoody%20black-2.png", "/hoody%20black-3.png", "/hoody%20black-4.png"], // الأساسية + 3 صور تحتها (غيّر الأسماء لأسماء ملفاتك)
    colors: [{ name: "Black", hex: "#1A1A1A" }],
  },
  {
    id: "cronec-white",
    name: "cronec white",
    basePrice: 800,
    salePrice: 600,
    inStock: true, // set to false to mark this piece as out of stock
    image: "/cronec%20white.png",
    images: ["/cronec%20white.png", "/cronec%20white-2.png", "/cronec%20white-3.png", "/cronec%20white-4.png"], // الأساسية + 3 صور تحتها (غيّر الأسماء لأسماء ملفاتك)
    colors: [{ name: "White", hex: "#E9E9E9" }],
  },
  {
    id: "hoody-light-gray",
    name: "hoody light gray",
    basePrice: 850,
    inStock: true, // set to false to mark this piece as out of stock
    image: "/hoodie-light-gray.png",
    images: ["/hoodie-light-gray.png", "/hoodie-light-gray-2.png", "/hoodie-light-gray-3.png", "/hoodie-light-gray-4.png"], // الأساسية + 3 صور تحتها (غيّر الأسماء لأسماء ملفاتك)
    colors: [{ name: "Light Gray", hex: "#B9BCC0" }],
  },
  {
    id: "cronce-navy",
    name: "cronce navy",
    basePrice: 800,
    salePrice: 600,
    inStock: true, // set to false to mark this piece as out of stock
    image: "/cronce%20navy.png",
    images: ["/cronce%20navy.png", "/cronce%20navy-2.png", "/cronce%20navy-3.png", "/cronce%20navy-4.png"], // الأساسية + 3 صور تحتها (غيّر الأسماء لأسماء ملفاتك)
    colors: [{ name: "Navy", hex: "#0E1B3D" }],
  },
  {
    id: "hoody-gray",
    name: "hoody gray",
    basePrice: 850,
    inStock: true, // set to false to mark this piece as out of stock
    image: "/hoody%20gray.png",
    images: ["/hoody%20gray.png", "/hoody%20gray-2.png", "/hoody%20gray-3.png", "/hoody%20gray-4.png"], // الأساسية + 3 صور تحتها (غيّر الأسماء لأسماء ملفاتك)
    colors: [{ name: "Gray", hex: "#8FA0B3" }],
  },
  {
    id: "cronce-black",
    name: "cronce black",
    basePrice: 800,
    salePrice: 600,
    inStock: true, // set to false to mark this piece as out of stock
    image: "/cronce%20black.png",
    images: ["/cronce%20black.png", "/cronce%20black-2.png", "/cronce%20black-3.png", "/cronce%20black-4.png"], // الأساسية + 3 صور تحتها (غيّر الأسماء لأسماء ملفاتك)
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