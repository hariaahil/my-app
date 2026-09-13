"use client";

import { useState } from "react";

type Question = { a: number; b: number; op: "+" | "-" | "×"; answer: number };

function makeQuestion(): Question {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const op = Math.random() < 0.5 ? "+" : "-";
  return { a, b, op, answer: op === "+" ? a + b : a - b };
}

export default function QuickMathPage() {
  const [question, setQuestion] = useState<Question>(makeQuestion);
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [played, setPlayed] = useState(0);
  const [message, setMessage] = useState("Solve the problem, then submit your answer.");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (answer.trim() === "") {
      setMessage("Enter an answer first.");
      return;
    }
    const correct = Number(answer) === question.answer;
    setScore((value) => value + (correct ? 1 : 0));
    setPlayed((value) => value + 1);
    setMessage(correct ? "Correct! Next one." : `Not quite. The answer was ${question.answer}. Next one.`);
    setAnswer("");
    setQuestion(makeQuestion());
  }

  return (
    <main id="main-content" className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" className="text-xs text-black/45"><a href="/games" className="underline underline-offset-4">Games</a> <span aria-hidden="true">/</span> Quick Math</nav>
      <section className="mt-8 rounded-3xl border border-black/10 p-6 text-center sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/45">TargetBud Games</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Quick Math</h1>
        <p className="mt-3 text-sm leading-6 text-black/60">Solve short arithmetic challenges and build your score.</p>
        <div className="mt-8 rounded-2xl bg-black/[.04] p-8" aria-live="polite">
          <p className="text-4xl font-black tabular-nums sm:text-5xl">{question.a} {question.op} {question.b} = ?</p>
        </div>
        <form onSubmit={submit} className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
          <label htmlFor="answer" className="sr-only">Your answer</label>
          <input id="answer" name="answer" type="number" inputMode="numeric" value={answer} onChange={(e) => setAnswer(e.target.value)} autoFocus className="min-w-0 flex-1 rounded-xl border border-black/15 px-4 py-3 text-center outline-none focus-visible:ring-2 focus-visible:ring-black" placeholder="Answer" />
          <button type="submit" className="rounded-xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-black/80">Submit</button>
        </form>
        <p className="mt-4 min-h-6 text-sm font-bold" aria-live="polite">{message}</p>
        <p className="mt-3 text-xs text-black/50">Score: {score} / {played}</p>
      </section>
    </main>
  );
}
