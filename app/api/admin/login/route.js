// app/api/admin/login/route.js
import { NextResponse } from "next/server";
import {
  COOKIE, SESSION_SECONDS, MAX_TRIES, configured, isAdmin, makeToken,
  checkPassword, attempts, recordFailure, clearFailures,
} from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";

const ipOf = (request) => (request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();

// Am I already signed in?
export async function GET(request) {
  return NextResponse.json({ ok: isAdmin(request) });
}

// Sign in with the password
export async function POST(request) {
  if (!configured()) {
    return NextResponse.json({ error: "Admin is not set up on the server" }, { status: 500 });
  }
  const ip = ipOf(request);
  if ((await attempts(ip)) >= MAX_TRIES) {
    return NextResponse.json({ error: "Too many tries. Try again in 15 minutes." }, { status: 429 });
  }
  let body = {};
  try {
    body = await request.json();
  } catch {}
  if (!checkPassword(body.password)) {
    await recordFailure(ip);
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  await clearFailures(ip);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
  return res;
}

// Sign out
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
