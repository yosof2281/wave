// lib/stock.js  (server only)
// Stock changes made from the admin panel are saved in Upstash Redis (free tier).
// products.js stays the default; whatever is saved here overrides it.
import { PRODUCTS, SIZES } from "./products";

const KEY = "wave:stock";

export const storeReady = () =>
  Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

export async function redis(cmd) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { ok: false, result: null };
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, result: json.result ?? null };
}

export async function getStock() {
  try {
    const { result } = await redis(["GET", KEY]);
    return result ? JSON.parse(result) : {};
  } catch {
    return {};
  }
}

export async function saveStock(next) {
  const clean = {};
  for (const p of PRODUCTS) {
    const e = next && next[p.id];
    if (!e) continue;
    clean[p.id] = {
      inStock: e.inStock !== false,
      soldOutSizes: Array.isArray(e.soldOutSizes) ? e.soldOutSizes.filter((s) => SIZES.includes(s)) : [],
    };
  }
  const r = await redis(["SET", KEY, JSON.stringify(clean)]);
  if (!r.ok) throw new Error("Could not save to the stock store");
  return clean;
}

// Use this in the order route: is this piece in this size still on sale?
export function isAvailable(productId, size, stock) {
  const base = PRODUCTS.find((p) => p.id === productId);
  if (!base) return false;
  const e = (stock && stock[productId]) || {};
  const inStock = e.inStock ?? base.inStock !== false;
  const sold = e.soldOutSizes ?? base.soldOutSizes ?? [];
  return inStock && !sold.includes(size);
}
