// lib/adminAuth.js  (server only)
import crypto from "crypto";
import { redis, storeReady } from "./stock";

export const COOKIE = "wave_admin";
export const SESSION_SECONDS = 2 * 60 * 60; // the admin stays signed in for 2 hours

const secret = () => process.env.ADMIN_SECRET || "";
const sign = (exp) => crypto.createHmac("sha256", secret()).update(String(exp)).digest("hex");

export const configured = () => Boolean(process.env.ADMIN_PASSWORD && secret());

export function makeToken() {
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return `${exp}.${sign(exp)}`;
}

function verifyToken(token) {
  if (!secret() || !token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(exp));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function isAdmin(request) {
  const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)wave_admin=([^;]+)/);
  return verifyToken(m ? decodeURIComponent(m[1]) : "");
}

export function checkPassword(input) {
  const real = process.env.ADMIN_PASSWORD || "";
  if (!real) return false;
  const a = crypto.createHash("sha256").update(String(input ?? "")).digest();
  const b = crypto.createHash("sha256").update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

/* ---- brute-force guard: 5 wrong passwords per IP, then 15 minutes locked ---- */
export const MAX_TRIES = 5;
const WINDOW = 15 * 60;
const mem = new Map(); // fallback if Upstash is not set up
const key = (ip) => `wave:fail:${ip}`;

export async function attempts(ip) {
  if (storeReady()) {
    const { result } = await redis(["GET", key(ip)]);
    return Number(result || 0);
  }
  const e = mem.get(ip);
  return e && e.until > Date.now() ? e.n : 0;
}

export async function recordFailure(ip) {
  if (storeReady()) {
    const { result } = await redis(["INCR", key(ip)]);
    if (Number(result) === 1) await redis(["EXPIRE", key(ip), WINDOW]);
    return;
  }
  const e = mem.get(ip);
  mem.set(ip, e && e.until > Date.now() ? { n: e.n + 1, until: e.until } : { n: 1, until: Date.now() + WINDOW * 1000 });
}

export async function clearFailures(ip) {
  if (storeReady()) await redis(["DEL", key(ip)]);
  else mem.delete(ip);
}
