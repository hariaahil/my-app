"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { validateCredentials } from "@/lib/auth-validation";

export default function FinancePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null);

  useEffect(() => {
    let mounted = true;
    try {
      const client = createClient();
      if (!mounted) return;
      setSupabase(client);
      client.auth.getUser().then(({ data }) => {
        if (mounted) setUserEmail(data.user?.email ?? null);
      });
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        if (mounted) setUserEmail(session?.user?.email ?? null);
      });
      return () => {
        mounted = false;
        data.subscription.unsubscribe();
      };
    } catch (e) {
      if (mounted) setError(e instanceof Error ? e.message : "Supabase configuration is missing.");
      return () => { mounted = false; };
    }
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (!supabase) throw new Error("Supabase is not configured. Add the public Supabase environment variables in Vercel.");
      const validationError = validateCredentials(email, password, mode);
      if (validationError) throw new Error(validationError);
      const result = mode === "signin"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin + "/finance" } });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) setMessage("Account created. Check your email to confirm your account, then sign in.");
      else { setMessage("Signed in successfully."); setUserEmail(result.data.user?.email ?? email.trim()); router.refresh(); }
    } catch (e) { setError(e instanceof Error ? e.message : "Authentication failed. Please try again."); }
    finally { setBusy(false); }
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut(); setUserEmail(null); setMessage("Signed out."); router.refresh();
  }

  if (userEmail) return (
    <main className="min-h-screen px-5 py-12"><div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between gap-4"><div><p className="text-sm text-violet-300">PRIVATE WORKSPACE</p><h1 className="mt-2 text-4xl font-semibold">My Finance</h1><p className="mt-2 text-slate-400">Signed in as {userEmail}</p></div><button onClick={signOut} className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/10">Sign out</button></div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{["₹70L Target", "EOD Expenses", "Loans", "Investments"].map((title) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[.045] p-5"><p className="text-sm text-slate-400">{title}</p><p className="mt-3 text-xl font-semibold">Ready</p><p className="mt-1 text-xs text-slate-500">Private data protected by Supabase RLS</p></div>)}</div>
    </div></main>
  );

  return <main className="min-h-screen px-5 py-12"><div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/[.045] p-7 shadow-2xl">
    <p className="text-sm font-semibold text-violet-300">TARGETBUD PRIVATE AREA</p><h1 className="mt-3 text-3xl font-semibold">My Finance</h1><p className="mt-2 text-sm leading-6 text-slate-400">Sign in to access your private financial workspace.</p>
    <form onSubmit={submit} className="mt-7 space-y-4"><input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" placeholder="Email" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-400" /><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder="Password" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-400" />
      {error && <p className="text-sm text-red-300">{error}</p>}{message && <p className="text-sm text-emerald-300">{message}</p>}<button disabled={busy} className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold disabled:opacity-50">{busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button></form>
    <button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }} className="mt-4 w-full text-sm text-violet-300">{mode === "signin" ? "Create a new account" : "Already have an account? Sign in"}</button>
  </div></main>;
}
