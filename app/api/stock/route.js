// app/api/stock/route.js
import { NextResponse } from "next/server";
import { getStock, saveStock, storeReady } from "../../../lib/stock";
import { isAdmin } from "../../../lib/adminAuth";

export const dynamic = "force-dynamic";

// Anyone: the site reads the current stock from here
export async function GET() {
  const stock = await getStock();
  return NextResponse.json({ stock }, { headers: { "Cache-Control": "no-store" } });
}

// Admin only: save a new stock state
export async function POST(request) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Not allowed" }, { status: 401 });
  if (!storeReady()) {
    return NextResponse.json({ error: "Stock store is not set up (Upstash keys are missing)" }, { status: 500 });
  }
  let body = {};
  try {
    body = await request.json();
  } catch {}
  try {
    const stock = await saveStock(body.stock || {});
    return NextResponse.json({ stock });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Could not save" }, { status: 500 });
  }
}
