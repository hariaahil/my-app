"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Brain, BookOpen, ClipboardCheck, RotateCcw, Target, Trophy } from "lucide-react";

type Mode = "guided" | "subject" | "assessment" | "weak" | "practice" | "mock" | "revision";

const modes: {id:Mode;title:string;description:string;action:string;icon:typeof Brain}[] = [
 {id:"guided",title:"Guided / Balanced",description:"Let TargetBud balance learning, practice, revision and assessment from your evidence.",action:"Use balanced path",icon:Target},
 {id:"subject",title:"Subject-first",description:"Pick one subject and stay focused until your evidence shows that it is ready for revision.",action:"Focus on a subject",icon:BookOpen},
 {id:"assessment",title:"Assessment-first",description:"Test first, identify gaps, then teach only what the results show you need.",action:"Start with assessment",icon:ClipboardCheck},
 {id:"weak",title:"Weak-area-first",description:"Prioritize repeated mistakes and low-accuracy topics before new coverage.",action:"Fix weak areas",icon:Brain},
 {id:"practice",title:"Practice-first",description:"Spend most of the session solving questions, with teaching inserted when evidence shows a gap.",action:"Practice now",icon:RotateCcw},
 {id:"mock",title:"Mock-first",description:"Use larger mixed assessments to measure readiness, then convert the results into a repair plan.",action:"Measure readiness",icon:Trophy},
 {id:"revision",title:"Revision-first",description:"Work through due and unresolved mistakes before adding new material.",action:"Revise mistakes",icon:RotateCcw},
];

export default function EducationModesPage(){
 const [selected,setSelected]=useState<Mode>("guided");
 useEffect(()=>{const saved=window.localStorage.getItem("targetbud.education.learningMode") as Mode|null;if(saved&&modes.some(x=>x.id===saved))setSelected(saved)},[]);
 function choose(id:Mode){setSelected(id);window.localStorage.setItem("targetbud.education.learningMode",id)}
 const active=modes.find(x=>x.id===selected)!;
 return <main className="min-h-screen bg-white text-black"><section className="border-b bg-black text-white"><div className="mx-auto max-w-6xl px-5 py-10"><p className="text-xs font-black uppercase tracking-[.2em] text-white/45">TargetBud Education</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Choose how you learn.</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-white/60">There is no single correct route. Your selected mode changes the next-action strategy while your attempts, mistakes and progress remain part of one mastery journey.</p></div></section>
 <section className="mx-auto max-w-6xl px-5 py-8"><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{modes.map(m=>{const Icon=m.icon;return <button key={m.id} onClick={()=>choose(m.id)} className={`rounded-2xl border p-5 text-left transition ${selected===m.id?"border-black bg-black text-white":"border-black/10 hover:border-black/30"}`}><div className={`grid size-10 place-items-center rounded-xl ${selected===m.id?"bg-white text-black":"bg-black text-white"}`}><Icon size={18}/></div><h2 className="mt-5 text-xl font-black">{m.title}</h2><p className={`mt-2 text-sm leading-6 ${selected===m.id?"text-white/65":"text-black/55"}`}>{m.description}</p></button>})}</div>
 <div className="mt-6 rounded-3xl border border-black/10 p-6 sm:p-8"><p className="text-xs font-black uppercase tracking-wider text-black/40">Selected path</p><h2 className="mt-2 text-3xl font-black">{active.title}</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-black/55">{active.description}</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/study" className="inline-flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-black text-white">{active.action}<ArrowRight size={16}/></Link><Link href="/education" className="inline-flex items-center rounded-xl border px-5 py-3 text-sm font-black">Back to Education</Link></div><p className="mt-4 text-xs text-black/40">The mode preference is saved on this device. Scored activity remains account-bound in the private study system.</p></div>
 <div className="mt-6 grid gap-3 sm:grid-cols-5">{["Choose","Learn","Practice","Assess","Master"].map((x,i)=><div key={x} className="rounded-xl border p-4 text-center"><p className="text-[10px] font-black uppercase tracking-wider text-black/35">{i+1}</p><p className="mt-1 text-sm font-black">{x}</p></div>)}</div></section></main>;
}
