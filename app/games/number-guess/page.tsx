"use client";

import { useState } from "react";

const MIN = 1;
const MAX = 100;

export default function NumberGuessPage() {
  const [target, setTarget] = useState(() => Math.floor(Math.random() * MAX) + MIN);
  const [guess, setGuess] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState("Pick a number from 1 to 100.");
  const [won, setWon] = useState(false);

  function reset() {
    setTarget(Math.floor(Math.random() * MAX) + MIN);
    setGuess("");
    setAttempts(0);
    setMessage("Pick a number from 1 to 100.");
    setWon(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(guess);
    if (!Number.isInteger(value) || value < MIN || value > MAX) {
      setMessage("Enter a whole number from 1 to 100.");
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (value === target) {
      setWon(true);
      setMessage(`Correct! You found it in ${nextAttempts} ${nextAttempts === 1 ? "attempt" : "attempts"}.`);
    } else if (value < target) {
      setMessage("Too low. Try a higher number.");
    } else {
      setMessage("Too high. Try a lower number.");
    }
    setGuess("");
  }

  return (
    <main id="main-content" className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-xs text-black/45">
        <a href="/games" className="underline underline-offset-4">Games</a> <span aria-hidden="true">/</span> Number Guess
      </nav>
      <section className="mt-8 rounded-3xl border border-black/10 p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/45">TargetBud Games</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Number Guess</h1>
        <p className="mt-3 text-sm leading-6 text-black/60">Guess the hidden number between 1 and 100 in as few attempts as possible.</p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label htmlFor="guess" className="block text-sm font-bold">Your guess</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input id="guess" name="guess" type="number" min={MIN} max={MAX} step="1" inputMode="numeric" value={guess} onChange={(e) => setGuess(e.target.value)} disabled={won} aria-describedby="game-message" className="min-w-0 flex-1 rounded-xl border border-black/15 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-black" placeholder="1–100" />
            <button type="submit" disabled={won} className="rounded-xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-50">Guess</button>
          </div>
        </form>

        <div id="game-message" aria-live="polite" className="mt-5 rounded-xl bg-black/[.04] p-4 text-sm font-bold">{message}</div>
        <div className="mt-4 flex items-center justify-between text-xs text-black/50"><span>Attempts: {attempts}</span><button type="button" onClick={reset} className="rounded-lg px-3 py-2 font-bold underline underline-offset-4 hover:bg-black/[.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">{won ? "Play again" : "Reset"}</button></div>
      </section>
    </main>
  );
}
