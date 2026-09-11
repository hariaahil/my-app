"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const supabase = createClient();
    const result = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setMessage("Account created. Check your email to confirm your account, then log in.");
      return;
    }
    window.location.href = "/goal";
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-violet-300">← TargetBud</Link>
        <section className="mt-8 rounded-[2rem] border border-violet-400/20 bg-white/[.045] p-6 shadow-2xl sm:p-8">
          <p className="text-xs font-bold tracking-[.2em] text-violet-300">TARGETBUD ACCOUNT</p>
          <h1 className="mt-2 text-3xl font-semibold">{mode === "login" ? "Login" : "Create account"}</h1>
          <p className="mt-2 text-sm text-slate-400">Your ₹70 lakh goal is private to your account.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block">
              <span className="text-sm text-slate-400">Email</span>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-400" />
            </label>
            <label className="block">
              <span className="text-sm text-slate-400">Password</span>
              <input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none focus:border-violet-400" />
            </label>
            <button disabled={loading} className="w-full rounded-xl bg-violet-500 px-5 py-3 font-semibold disabled:opacity-50">{loading ? "Please wait…" : mode === "login" ? "Login" : "Create account"}</button>
          </form>

          {message && <p className="mt-4 rounded-xl bg-white/5 p-3 text-sm text-slate-300">{message}</p>}
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage(""); }} className="mt-5 text-sm text-violet-300 hover:text-violet-200">
            {mode === "login" ? "Need an account? Sign up" : "Already have an account? Login"}
          </button>
        </section>
      </div>
    </main>
  );
}
