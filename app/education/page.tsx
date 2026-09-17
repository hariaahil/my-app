"use client";

import Link from "next/link";
import { BookOpen, GraduationCap, Target, Trophy } from "lucide-react";
import { LEARNING_MODES } from "@/lib/education/learning-modes";

const tracks = [
  { title: "TS Police", text: "SI and Constable preparation with target-based, subject-wise, diagnostic, practice, revision and mock paths.", href: "/study", label: "Open Police Prep" },
  { title: "Subject practice", text: "Choose one subject and keep practicing it until your evidence shows improvement. You do not have to follow a fixed order.", href: "/education/modes", label: "Start subject practice" },
  { title: "Assessment first", text: "Take a diagnostic or assessment before studying. Use the results to identify gaps and build the next study block.", href: "/education/modes", label: "Take an assessment" },
  { title: "Full preparation", text: "Move through learning, practice, revision and mock exams at your own pace. The system keeps the end goal focused on mastery.", href: "/education/modes", label: "Build a plan" },
];

export default function EducationPage(){
 return <main className="min-h-screen bg-white text-black">
  <section className="border-b border-black/10 bg-black text-white"><div className="mx-auto max-w-7xl px-5 py-12 sm:px-8"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-white/50"><GraduationCap size={17}/> TargetBud Education</div><h1 className="mt-4 max-w-4xl text-4xl font-black tracking-[-.04em] sm:text-6xl">Learn your way. Finish with mastery.</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-white/60">Education is the home. Each exam, subject and learning goal can have its own path. TargetBud adapts around what the learner actually does instead of forcing everyone through one flow.</p></div></section>
  <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
   <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">{tracks.map(x=><article key={x.title} className="rounded-2xl border border-black/10 p-5"><div className="grid size-10 place-items-center rounded-xl bg-black text-white"><BookOpen size={18}/></div><h2 className="mt-5 text-xl font-black">{x.title}</h2><p className="mt-2 text-sm leading-6 text-black/55">{x.text}</p><Link href={x.href} className="mt-5 inline-flex rounded-xl bg-black px-4 py-2.5 text-xs font-black text-white">{x.label}</Link></article>)}</div>

   <div className="mt-8 rounded-3xl border border-black/10 p-6 sm:p-8"><div className="flex items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-black text-white"><Target size={19}/></div><div><h2 className="text-2xl font-black">Choose how you want to learn</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-black/55">There is no single correct route. Pick a starting mode, switch whenever you want, and keep the same progress and evidence. The mastery engine remains the destination.</p></div></div>
    <div className="mt-7 grid gap-3 md:grid-cols-2 lg:grid-cols-3">{LEARNING_MODES.map((mode)=><Link key={mode.id} href="/education/modes" className="rounded-2xl border border-black/10 p-4 transition hover:border-black hover:bg-black/[.03]"><div className="flex items-center justify-between gap-3"><h3 className="font-black">{mode.title}</h3><span className="rounded-full bg-black px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white">{mode.primaryStage}</span></div><p className="mt-2 text-sm leading-6 text-black/55">{mode.description}</p></Link>)}</div>
   </div>

   <div className="mt-8 rounded-3xl border border-black/10 p-6 sm:p-8"><div className="flex items-start gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-black text-white"><Target size={19}/></div><div><h2 className="text-2xl font-black">One engine, many valid learning styles</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-black/55">A learner may complete one subject at a time, jump between subjects, take assessments repeatedly, study from basics, focus on weak areas, or run full mocks. The system should preserve every attempt and use evidence to recommend the next useful action.</p></div></div><div className="mt-7 grid gap-3 sm:grid-cols-5">{["Choose","Learn","Practice","Assess","Master"].map((x,i)=><div key={x} className="rounded-xl border p-4 text-center"><p className="text-[10px] font-black uppercase tracking-wider text-black/35">{i+1}</p><p className="mt-1 text-sm font-black">{x}</p></div>)}</div></div>
   <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-2xl bg-black/[.04] p-6"><Trophy size={19}/><h2 className="mt-4 text-xl font-black">End goal: mastery</h2><p className="mt-2 text-sm leading-6 text-black/55">Scores are evidence, not the destination. Readiness should improve through accuracy, speed, coverage, revision and repeated assessment.</p></div><div className="rounded-2xl bg-black/[.04] p-6"><GraduationCap size={19}/><h2 className="mt-4 text-xl font-black">Designed to expand</h2><p className="mt-2 text-sm leading-6 text-black/55">TS Police is the first education track. The same architecture can support other competitive exams and structured learning paths without changing the main navigation.</p></div></div>
  </section>
 </main>;
}
