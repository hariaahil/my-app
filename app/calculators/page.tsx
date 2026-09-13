import type { Metadata } from "next";
import Link from "next/link";

const title = "Financial Calculators — EMI, SIP, FD, RD & Interest | TargetBud";
const description = "Free financial calculators for home loans, personal loans, car loans, education loans, SIP, FD, RD, simple interest and compound interest.";
const canonical = "https://targetbud.vercel.app/calculators";

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "financial calculators",
    "home loan EMI calculator",
    "personal loan EMI calculator",
    "car loan EMI calculator",
    "education loan EMI calculator",
    "SIP calculator",
    "FD calculator",
    "RD calculator",
    "simple interest calculator",
    "compound interest calculator",
  ],
  alternates: { canonical },
  openGraph: {
    title,
    description,
    url: canonical,
    siteName: "TargetBud",
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

const calculators = [
  ["home-loan-emi", "Home Loan EMI Calculator", "Estimate monthly EMI, total interest and repayment amount."],
  ["personal-loan-emi", "Personal Loan EMI Calculator", "Compare repayment cost for a personal loan."],
  ["car-loan-emi", "Car Loan EMI Calculator", "Calculate monthly car-loan repayment and interest."],
  ["two-wheeler-loan-emi", "Two-Wheeler Loan EMI Calculator", "Plan bike or scooter financing with a simple EMI estimate."],
  ["education-loan-emi", "Education Loan EMI Calculator", "Estimate education-loan EMI and total repayment."],
  ["sip", "SIP Calculator", "Project a monthly SIP using an assumed annual return."],
  ["fd", "FD Calculator", "Estimate fixed-deposit maturity using your entered rate."],
  ["rd", "RD Calculator", "Estimate recurring-deposit maturity from monthly deposits."],
  ["simple-interest", "Simple Interest Calculator", "Calculate interest and maturity amount."],
  ["compound-interest", "Compound Interest Calculator", "Calculate growth with compounding frequency."],
];

export default function CalculatorsPage() {
  return <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <div className="max-w-3xl">
      <p className="text-xs font-black uppercase tracking-[.18em] text-black/45">TargetBud / Calculators</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Financial calculators</h1>
      <p className="mt-4 text-base leading-7 text-black/60">Useful calculators for everyday decisions. Enter your own rate when a current bank rate is not verified; results are estimates, not financial advice.</p>
    </div>
    <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {calculators.map(([slug, title, description]) => <Link key={slug} href={`/calculators/${slug}`} className="group rounded-2xl border border-black/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-black/25 hover:shadow-lg">
        <div className="flex items-start justify-between gap-4"><span className="grid size-9 place-items-center rounded-xl bg-black text-xs font-black text-white">TB</span><span className="text-xs font-bold text-black/35 group-hover:text-black">Open →</span></div>
        <h2 className="mt-6 text-lg font-black">{title}</h2><p className="mt-2 text-sm leading-6 text-black/55">{description}</p>
      </Link>)}
    </div>
  </main>;
}
