"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { categorizeTransaction, normalizeHeader, parseCsvLine, parseMoney } from "@/lib/finance-categorizer";
import { validateCredentials } from "@/lib/auth-validation";

type Txn = { transaction_date: string | null; description: string; amount: number; transaction_type: string; category: string; confidence: number; source: string; fingerprint: string };

async function fingerprint(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export default function FinancePage() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null); const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);
  const [transactions, setTransactions] = useState<Txn[]>([]); const [importing, setImporting] = useState(false);

  useEffect(() => {
    let mounted = true;
    try {
      const client = createClient(); setSupabase(client);
      client.auth.getUser().then(({ data }) => { if (mounted) setUserEmail(data.user?.email ?? null); });
      const { data } = client.auth.onAuthStateChange((_event, session) => { if (mounted) setUserEmail(session?.user?.email ?? null); });
      return () => { mounted = false; data.subscription.unsubscribe(); };
    } catch (e) { if (mounted) setError(e instanceof Error ? e.message : "Supabase configuration is missing."); return () => { mounted = false; }; }
  }, []);

  useEffect(() => {
    if (!supabase || !userEmail) return;
    supabase.from("finance_transactions").select("transaction_date,description,amount,transaction_type,category,confidence,source,fingerprint").order("transaction_date", { ascending: false }).limit(1000).then(({ data, error: loadError }) => {
      if (!loadError && data) setTransactions(data as Txn[]);
    });
  }, [supabase, userEmail]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (!supabase) throw new Error("Supabase is not configured.");
      const validationError = validateCredentials(email, password, mode); if (validationError) throw new Error(validationError);
      const result = mode === "signin" ? await supabase.auth.signInWithPassword({ email: email.trim(), password }) : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin + "/finance" } });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) setMessage("Account created. Check your email to confirm your account, then sign in.");
      else { setMessage("Signed in successfully."); setUserEmail(result.data.user?.email ?? email.trim()); router.refresh(); }
    } catch (e) { setError(e instanceof Error ? e.message : "Authentication failed. Please try again."); } finally { setBusy(false); }
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file || !supabase) return;
    setImporting(true); setError(""); setMessage("");
    try {
      const text = await file.text(); const lines = text.split(/\r?\n/).filter(Boolean); if (lines.length < 2) throw new Error("CSV appears to be empty.");
      const headers = parseCsvLine(lines[0]).map(normalizeHeader);
      const find = (...names: string[]) => names.map(normalizeHeader).map((n) => headers.indexOf(n)).find((i) => i >= 0) ?? -1;
      const dateIdx = find("transaction date", "date", "transactiondate"); const descIdx = find("description", "details", "narration", "remarks", "merchant");
      const amountIdx = find("amount", "transaction amount", "value"); const debitIdx = find("debit", "withdrawal", "debit amount"); const creditIdx = find("credit", "deposit", "credit amount"); const typeIdx = find("type", "transaction type", "dr cr");
      if (descIdx < 0 || (amountIdx < 0 && debitIdx < 0 && creditIdx < 0)) throw new Error("I couldn't identify the transaction description and amount columns. Export the GPay history as CSV and try again.");
      const rows: Txn[] = [];
      for (const line of lines.slice(1)) {
        const cells = parseCsvLine(line); const description = (cells[descIdx] || "").trim(); if (!description) continue;
        const debit = debitIdx >= 0 ? Math.abs(parseMoney(cells[debitIdx])) : 0; const credit = creditIdx >= 0 ? Math.abs(parseMoney(cells[creditIdx])) : 0;
        const rawAmount = amountIdx >= 0 ? parseMoney(cells[amountIdx]) : (credit || -debit); if (!rawAmount && !debit && !credit) continue;
        const amount = amountIdx >= 0 ? Math.abs(rawAmount) : (credit || debit); const typeHint = typeIdx >= 0 ? cells[typeIdx] : (credit > 0 ? "credit" : "debit");
        const classified = categorizeTransaction(description, amount, typeHint); const transaction_type = /credit|received|income|deposit/i.test(typeHint) ? "income" : "expense";
        const date = dateIdx >= 0 ? parseDate(cells[dateIdx]) : null; const fp = await fingerprint(`${date || ""}|${description.toLowerCase()}|${amount}|${transaction_type}`);
        rows.push({ transaction_date: date, description, amount, transaction_type, category: classified.category, confidence: classified.confidence, source: "gpay", fingerprint: fp });
      }
      if (!rows.length) throw new Error("No usable transactions were found.");
      const user = (await supabase.auth.getUser()).data.user; if (!user) throw new Error("Your session expired. Please sign in again.");
      const payload = rows.map((r) => ({ ...r, user_id: user.id }));
      const { error: insertError } = await supabase.from("finance_transactions").upsert(payload, { onConflict: "user_id,fingerprint", ignoreDuplicates: true });
      if (insertError) throw insertError;
      const { data } = await supabase.from("finance_transactions").select("transaction_date,description,amount,transaction_type,category,confidence,source,fingerprint").order("transaction_date", { ascending: false }).limit(1000);
      setTransactions((data || []) as Txn[]); setMessage(`Imported ${rows.length.toLocaleString()} transactions. Categories were detected automatically.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Import failed."); } finally { setImporting(false); event.target.value = ""; }
  }

  async function signOut() { if (!supabase) return; await supabase.auth.signOut(); setUserEmail(null); setTransactions([]); setMessage("Signed out."); router.refresh(); }

  const metrics = useMemo(() => {
    const expense = transactions.filter((t) => t.transaction_type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const income = transactions.filter((t) => t.transaction_type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const categories = transactions.filter((t) => t.transaction_type === "expense").reduce<Record<string, number>>((a, t) => { a[t.category] = (a[t.category] || 0) + Number(t.amount); return a; }, {});
    return { expense, income, savings: income - expense, categories };
  }, [transactions]);

  if (!userEmail) return <main className="min-h-screen px-5 py-12"><div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[.045] p-7 shadow-2xl"><p className="text-sm font-semibold text-violet-300">TARGETBUD PRIVATE AREA</p><h1 className="mt-3 text-3xl font-semibold">My Finance</h1><p className="mt-2 text-sm leading-6 text-slate-400">Sign in to access your private financial workspace.</p><form onSubmit={submit} className="mt-7 space-y-4"><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="Email" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-400" /><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="Password" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-400" />{error && <p className="text-sm text-red-300">{error}</p>}{message && <p className="text-sm text-emerald-300">{message}</p>}<button disabled={busy} className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold disabled:opacity-50">{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button></form><button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }} className="mt-4 w-full text-sm text-violet-300">{mode === "signin" ? "Create a new account" : "Already have an account? Sign in"}</button></div></main>;

  const topCategories = Object.entries(metrics.categories).sort((a, b) => b[1] - a[1]).slice(0, 6);
  return <main className="min-h-screen px-5 py-10"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-violet-300">PRIVATE WORKSPACE</p><h1 className="mt-2 text-4xl font-semibold">My Finance</h1><p className="mt-2 text-slate-400">Signed in as {userEmail}</p></div><button onClick={signOut} className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Sign out</button></div>
    <section className="mt-8 rounded-3xl border border-violet-400/20 bg-violet-500/5 p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Smart Transaction Import</h2><p className="mt-1 text-sm text-slate-400">Upload your GPay CSV. TargetBud detects food, fuel, shopping, bills, transport and more.</p></div><label className="cursor-pointer rounded-xl bg-violet-500 px-5 py-3 font-semibold hover:bg-violet-400">{importing ? "Analyzing…" : "Upload GPay CSV"}<input type="file" accept=".csv,text/csv" onChange={importCsv} disabled={importing} className="hidden" /></label></div>{error && <p className="mt-4 text-sm text-red-300">{error}</p>}{message && <p className="mt-4 text-sm text-emerald-300">{message}</p>}</section>
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Income", metrics.income], ["Expenses", metrics.expense], ["Net cash flow", metrics.savings], ["Transactions", transactions.length]].map(([title, value]) => <div key={String(title)} className="rounded-2xl border border-white/10 bg-white/[.045] p-5"><p className="text-sm text-slate-400">{title}</p><p className="mt-3 text-2xl font-semibold">{title === "Transactions" ? Number(value).toLocaleString() : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}</p></div>)}</div>
    <div className="mt-6 grid gap-6 lg:grid-cols-3"><section className="rounded-2xl border border-white/10 bg-white/[.045] p-5 lg:col-span-1"><h2 className="font-semibold">Top spending categories</h2><div className="mt-4 space-y-3">{topCategories.length ? topCategories.map(([cat, amount]) => <div key={cat} className="flex items-center justify-between text-sm"><span>{cat}</span><span className="text-slate-300">₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span></div>) : <p className="text-sm text-slate-500">Upload a transaction file to see your spending breakdown.</p>}</div></section><section className="rounded-2xl border border-white/10 bg-white/[.045] p-5 lg:col-span-2"><div className="flex items-center justify-between"><h2 className="font-semibold">Recent transactions</h2><span className="text-xs text-slate-500">Smart categorized</span></div><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-slate-500"><tr><th className="pb-3">Date</th><th className="pb-3">Merchant / description</th><th className="pb-3">Category</th><th className="pb-3 text-right">Amount</th></tr></thead><tbody>{transactions.slice(0, 20).map((t) => <tr key={t.fingerprint} className="border-t border-white/5"><td className="py-3 text-slate-500">{t.transaction_date || "—"}</td><td className="max-w-[260px] truncate py-3">{t.description}</td><td className="py-3">{t.category}{t.confidence < .6 ? " · review" : ""}</td><td className="py-3 text-right">{t.transaction_type === "income" ? "+" : "−"}₹{Number(t.amount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</td></tr>)}</tbody></table>{!transactions.length && <p className="py-8 text-center text-sm text-slate-500">No transactions yet.</p>}</div></section></div>
  </div></main>;
}
