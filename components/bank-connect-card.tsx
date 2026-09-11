"use client";

import { useState } from "react";

const banks = ["Kotak Mahindra Bank", "ICICI Bank", "IndusInd Bank", "Slice"];

export function BankConnectCard() {
  const [mobile, setMobile] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function connect() {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/banking/setu/consent", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mobileNumber: mobile }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to start bank connection");
      window.location.assign(body.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to start bank connection");
    } finally { setBusy(false); }
  }

  return <section className="mt-6 rounded-[2rem] border border-emerald-400/20 bg-emerald-400/5 p-5 sm:p-6">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold text-emerald-300">🔗 ZERO-MANUAL-WORK FINANCE</p>
        <h2 className="mt-1 text-2xl font-semibold">Connect your banks once</h2>
        <p className="mt-2 text-sm text-slate-400">After consent, TargetBud can receive account data through the Account Aggregator flow instead of asking you for PDF statements every month.</p>
        <div className="mt-3 flex flex-wrap gap-2">{banks.map(bank => <span key={bank} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">{bank}</span>)}</div>
      </div>
      <div className="w-full max-w-sm">
        <label className="text-xs text-slate-500">Mobile number used with your bank/Account Aggregator</label>
        <div className="mt-2 flex gap-2"><input value={mobile} onChange={e=>setMobile(e.target.value.replace(/\D/g, "").slice(0,10))} inputMode="numeric" placeholder="10-digit mobile" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3"/><button onClick={connect} disabled={busy || mobile.length!==10} className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-40">{busy?"Starting…":"Connect"}</button></div>
        <p className="mt-2 text-xs text-slate-600">You will still approve the one-time consent/OTP yourself. TargetBud will not ask for your bank password.</p>
        {message&&<p className="mt-3 text-sm text-emerald-300">{message}</p>}{error&&<p className="mt-3 text-sm text-red-300">{error}</p>}
      </div>
    </div>
  </section>;
}
