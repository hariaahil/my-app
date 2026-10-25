import Link from "next/link";
import { BookOpen } from "lucide-react";
import GoalShell from "./GoalShell";

export default function GoalPage(){
  return <>
    <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <Link href="/goal/ledger" className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold shadow-sm hover:bg-black/[.03]">
        <BookOpen size={16} /> Open Deposit & Lending Ledger <span aria-hidden="true">→</span>
      </Link>
    </div>
    <GoalShell />
  </>;
}
