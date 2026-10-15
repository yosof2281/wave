// app/api/order/route.js
// Validates the order, recomputes prices from the catalog, then:
//   - SHEETS_WEBHOOK_URL set     -> sends it to Google Sheets (Apps Script)
//   - SHEETS_WEBHOOK_URL missing -> saves it locally (console + .orders/orders.jsonl)
//                                   and still answers "success", so checkout works in development.
import { NextResponse } from "next/server";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { CURRENCY, PRODUCTS, SIZES } from "../../../lib/products";

export const runtime = "nodejs";

const fail = (error, status = 400) => NextResponse.json({ ok: false, error }, { status });

async function saveLocally(order) {
  console.log("[WAVE ORDER]", JSON.stringify(order));
  try {
    const dir = path.join(process.cwd(), ".orders");
    await mkdir(dir, { recursive: true });
    await appendFile(path.join(dir, "orders.jsonl"), JSON.stringify(order) + "\n", "utf8");
  } catch {
    // Read-only filesystem (e.g. serverless hosting): the console log above is the record.
  }
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request.");
  }

  // Honeypot: bots fill this hidden field. Pretend success, store nothing.
  if (body?.website) return NextResponse.json({ ok: true, orderId: "WV-000000" });

  const c = body?.customer || {};
  const name = String(c.name || "").trim().slice(0, 100);
  const phone = String(c.phone || "").trim().slice(0, 30);
  const address = String(c.address || "").trim().slice(0, 300);
  const notes = String(c.notes || "").trim().slice(0, 500);
  const digits = phone.replace(/\D/g, "").length;

  if (name.length < 2) return fail("Please enter your full name.");
  if (digits < 8 || digits > 15) return fail("Please enter a valid phone number.");
  if (address.length < 8) return fail("Please enter your full delivery address.");

  if (!Array.isArray(body?.items) || body.items.length === 0 || body.items.length > 30) {
    return fail("Your bag is empty.");
  }

  const lines = [];
  for (const it of body.items) {
    const product = PRODUCTS.find((p) => p.id === it?.id);
    const qty = Number(it?.qty);
    const colorOk = product?.colors.some((col) => col.name === it?.color);
    if (!product || !colorOk || !SIZES.includes(it?.size) || !Number.isInteger(qty) || qty < 1 || qty > 10) {
      return fail("Some items in your bag are no longer valid. Please review your bag.");
    }
    lines.push({
      id: product.id,
      name: product.name,
      size: it.size,
      color: it.color,
      qty,
      unitPrice: product.price,
      lineTotal: product.price * qty,
    });
  }

  const total = lines.reduce((n, l) => n + l.lineTotal, 0);
  const orderId = `WV-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`;
  const date = new Date().toISOString();
  // Text format used by the original script: "Navy Bomber [M / Navy] x2 ($240), ..."
  const itemsText = lines.map((l) => `${l.name} [${l.size} / ${l.color}] x${l.qty} ($${l.unitPrice})`).join(", ");

  // Flat fields (name, phone, address, notes, items, total, date) match the old Apps Script;
  // the extra fields are used by google-apps-script/Code.gs.
  const order = {
    orderId,
    date,
    name,
    phone,
    address,
    notes,
    items: itemsText,
    itemsList: lines,
    total,
    currency: CURRENCY,
  };

  const url = process.env.SHEETS_WEBHOOK_URL;

  // Not configured yet: keep the order locally and let checkout succeed.
  if (!url) {
    console.warn("SHEETS_WEBHOOK_URL is not set. Order saved locally only.");
    await saveLocally(order);
    return NextResponse.json({ ok: true, orderId, saved: "local" });
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // avoids a CORS preflight on Apps Script
      redirect: "follow",
      body: JSON.stringify({ ...order, secret: process.env.SHEETS_SECRET }),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    // Old scripts may reply with plain text; only a clear error or a non-2xx status counts as failure.
    if (!res.ok || json?.ok === false) throw new Error(`Webhook replied ${res.status}: ${text.slice(0, 200)}`);
  } catch (err) {
    console.error("Saving order to Sheets failed:", err);
    await saveLocally(order); // keep a copy so the order is never lost
    return fail("We couldn't save your order. Please try again.", 502);
  }

  return NextResponse.json({ ok: true, orderId });
}
