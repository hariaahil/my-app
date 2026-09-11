import type { Metadata } from "next";
import DeveloperTools from "./DeveloperTools";
import Link from "next/link";
import { developerToolSeo } from "@/lib/developer-tools-seo";

export const metadata: Metadata = {
  title: "Free Developer Tools Online — JSON, Base64, JWT, Regex & More",
  description: "Free browser-based developer tools for JSON, Base64, URLs, JWT, regex, HTTP, text, timestamps, SEO and more. Fast, responsive and local-first.",
  keywords: ["developer tools", "online developer tools", "free developer tools", "JSON tools", "JWT decoder", "regex tester", "Base64 encoder", "SEO tools"],
  alternates: { canonical: "https://targetbud.vercel.app/tools" },
};

export default function ToolsPage() {
  return (
    <>
      <DeveloperTools />
      <section className="mx-auto max-w-[1540px] px-4 pb-14 sm:px-6 lg:px-8">
        <div className="border-t border-[#e5e5e5] pt-8">
          <h2 className="text-2xl font-bold tracking-tight">Free online developer tools</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#666]">TargetBud provides focused browser tools for developers, webmasters, SEO work and everyday technical tasks. Use the directory below to jump directly to a tool.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {developerToolSeo.map((tool) => <Link key={tool.slug} href={`/tools/${tool.slug}`} className="rounded-xl border border-[#e1e1e1] p-4 transition hover:-translate-y-0.5 hover:bg-[#fafafa]"><div className="text-sm font-semibold">{tool.name}</div><div className="mt-1 text-xs text-[#777]">{tool.category}</div><p className="mt-2 line-clamp-2 text-xs leading-5 text-[#666]">{tool.description}</p></Link>)}
          </div>
        </div>
      </section>
    </>
  );
}
