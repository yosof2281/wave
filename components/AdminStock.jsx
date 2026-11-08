"use client";

// components/AdminStock.jsx
// Hidden stock panel. Opens after 3 quick clicks on the collection title, then asks for the password.
import { useEffect, useRef, useState } from "react";
import { SIZES } from "../lib/products";

const ring = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E9EEF2]";
const json = { "Content-Type": "application/json" };

export default function AdminStock({ products, onSaved, onClose }) {
  const [step, setStep] = useState("checking"); // checking | login | panel
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [draft, setDraft] = useState(() =>
    Object.fromEntries(products.map((p) => [p.id, { inStock: p.inStock !== false, soldOutSizes: p.soldOutSizes || [] }]))
  );
  const inputRef = useRef(null);

  // Already signed in from earlier? Go straight to the panel.
  useEffect(() => {
    let dead = false;
    fetch("/api/admin/login", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => !dead && setStep(d.ok ? "panel" : "login"))
      .catch(() => !dead && setStep("login"));
    return () => {
      dead = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (step === "login") inputRef.current?.focus();
  }, [step]);

  const login = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/login", { method: "POST", headers: json, body: JSON.stringify({ password }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        setPassword("");
        setStep("panel");
      } else setMsg(d.error || "Wrong password");
    } catch {
      setMsg("Network error");
    }
    setBusy(false);
  };

  // Every click saves right away
  const save = async (next) => {
    const prev = draft;
    setDraft(next);
    setMsg("Saving...");
    try {
      const r = await fetch("/api/stock", { method: "POST", headers: json, body: JSON.stringify({ stock: next }) });
      if (r.status === 401) {
        setDraft(prev);
        setStep("login");
        setMsg("Session ended. Enter the password again.");
        return;
      }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Could not save");
      setMsg("Saved");
      onSaved(d.stock);
    } catch (err) {
      setDraft(prev);
      setMsg(err.message || "Could not save");
    }
  };

  const toggleProduct = (id) => save({ ...draft, [id]: { ...draft[id], inStock: !draft[id].inStock } });
  const toggleSize = (id, s) => {
    const cur = draft[id].soldOutSizes;
    const soldOutSizes = cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s];
    save({ ...draft, [id]: { ...draft[id], soldOutSizes } });
  };
  const logout = async () => {
    await fetch("/api/admin/login", { method: "DELETE" }).catch(() => {});
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Stock control"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0B1018] p-5 text-[#E9EEF2] shadow-2xl sm:p-7">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Stock control</h3>
          <button type="button" onClick={onClose} aria-label="Close" className={`rounded-full px-3 py-1 text-sm text-[#E9EEF2]/60 hover:text-[#E9EEF2] ${ring}`}>
            Close
          </button>
        </div>

        {step === "checking" && <p className="mt-6 text-sm text-[#E9EEF2]/50">Loading...</p>}

        {step === "login" && (
          <form onSubmit={login} className="mt-6">
            <label htmlFor="admin-pass" className="text-sm text-[#E9EEF2]/60">
              Password
            </label>
            <input
              id="admin-pass"
              ref={inputRef}
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`mt-2 w-full rounded-full border border-white/20 bg-transparent px-4 py-3 text-base ${ring}`}
            />
            {msg && <p className="mt-3 text-sm text-rose-300">{msg}</p>}
            <button
              type="submit"
              disabled={busy || !password}
              className={`mt-4 w-full rounded-full bg-[#E9EEF2] py-3 text-sm font-semibold text-[#070A12] transition-colors hover:bg-[#7FA6B8] disabled:cursor-not-allowed disabled:opacity-50 ${ring}`}
            >
              {busy ? "Checking..." : "Open"}
            </button>
          </form>
        )}

        {step === "panel" && (
          <div className="mt-5">
            <ul className="space-y-3">
              {products.map((p) => {
                const d = draft[p.id];
                return (
                  <li key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-medium">{p.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleProduct(p.id)}
                        className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${ring} ${
                          d.inStock ? "bg-emerald-400/90 text-[#06210F]" : "bg-rose-400/90 text-[#2A0A10]"
                        }`}
                      >
                        {d.inStock ? "In stock" : "Out of stock"}
                      </button>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {SIZES.map((s) => {
                        const sold = d.soldOutSizes.includes(s);
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => toggleSize(p.id, s)}
                            className={`h-8 flex-1 rounded-full border text-xs transition-colors ${ring} ${
                              sold ? "border-white/10 text-[#E9EEF2]/30 line-through" : "border-white/30 text-[#E9EEF2]"
                            }`}
                          >
                            {s}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-[#E9EEF2]/40">Tap a size to mark it sold out (crossed out). Every change saves at once.</p>
            <div className="mt-4 flex items-center justify-between">
              <span aria-live="polite" className="text-sm text-[#E9EEF2]/60">{msg}</span>
              <button type="button" onClick={logout} className={`rounded-full border border-white/20 px-4 py-1.5 text-xs text-[#E9EEF2]/70 hover:border-white/50 ${ring}`}>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
