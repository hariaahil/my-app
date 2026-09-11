import type { Metadata } from "next";
import Link from "next/link";
import ToolRunner from "./ToolRunner";
import { developerToolBySlug, developerToolSeo, siteUrl } from "@/lib/developer-tools-seo";

export const dynamicParams = false;
export function generateStaticParams() { return developerToolSeo.map((tool) => ({ tool: tool.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool: slug } = await params; const tool = developerToolBySlug[slug];
  if (!tool) return { title: "Developer Tool | TargetBud" };
  const title = `${tool.name} Online — Free Developer Tool | TargetBud`;
  return { title, description: tool.description, keywords: tool.keywords, alternates: { canonical: `${siteUrl}/tools/${tool.slug}` }, openGraph: { title, description: tool.description, url: `${siteUrl}/tools/${tool.slug}`, type: "website", siteName: "TargetBud" }, twitter: { card: "summary", title, description: tool.description } };
}

export default async function DeveloperToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool: slug } = await params; const tool = developerToolBySlug[slug]; if (!tool) return null;
  const related = developerToolSeo.filter((item) => item.category === tool.category && item.slug !== tool.slug).slice(0, 6);
  const jsonLd = { "@context": "https://schema.org", "@type": "SoftwareApplication", name: tool.name, applicationCategory: "DeveloperApplication", operatingSystem: "Web", description: tool.description, url: `${siteUrl}/tools/${tool.slug}`, isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }, publisher: { "@type": "Organization", name: "TargetBud", url: siteUrl } };
  const breadcrumb = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "TargetBud", item: siteUrl }, { "@type": "ListItem", position: 2, name: "Developer Tools", item: `${siteUrl}/tools` }, { "@type": "ListItem", position: 3, name: tool.name, item: `${siteUrl}/tools/${tool.slug}` }] };
  return <main className="min-h-screen bg-white text-[#111]"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} /><div className="mx-auto max-w-[1540px] px-4 py-8 sm:px-6 lg:px-8">
    <nav aria-label="Breadcrumb" className="mb-5 text-sm text-[#666]"><Link href="/tools" className="hover:text-[#111]">Developer Tools</Link><span className="mx-2">/</span><span className="text-[#111]">{tool.name}</span></nav>
    <section className="mb-8 max-w-4xl"><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[#777]">{tool.category}</p><h1 className="text-4xl font-bold tracking-[-.045em] sm:text-5xl">{tool.name} Online</h1><p className="mt-4 text-lg leading-8 text-[#555]">{tool.description}</p><div className="mt-5 flex flex-wrap gap-2">{tool.keywords.map((keyword) => <span key={keyword} className="rounded-full border border-[#ddd] px-3 py-1.5 text-xs text-[#555]">{keyword}</span>)}</div></section>
    <section className="mb-10 rounded-2xl border border-[#ddd] bg-[#fafafa] p-5 sm:p-7"><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-bold">Use {tool.name}</h2><p className="mt-1 text-sm text-[#666]">Fast browser-based processing with TargetBud.</p></div><Link href="/tools" className="rounded-lg bg-[#111] px-4 py-2.5 text-sm font-semibold text-white">Browse all tools</Link></div><ToolRunner slug={tool.slug} placeholder={tool.slug === "json-formatter" ? '{\n  "name": "TargetBud"\n}' : tool.slug === "regex-tester" ? "/TargetBud/gi\nTargetBud Developer Tools" : tool.slug === "uuid-generator" ? "No input required" : tool.slug === "robots-txt-generator" ? "https://targetbud.vercel.app" : tool.slug === "meta-tag-generator" ? "TargetBud Developer Tools" : tool.slug === "number-base-converter" ? "255 10" : tool.slug === "unix-timestamp-converter" ? "1757548800" : "Enter input here…"} /></section>
    <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div className="rounded-2xl border border-[#ddd] p-5 sm:p-7"><h2 className="text-xl font-bold">What can you use it for?</h2><ul className="mt-4 space-y-3 text-sm leading-6 text-[#555]">{tool.useCases.map((item) => <li key={item} className="border-l-2 border-[#111] pl-3">{item}</li>)}</ul></div><div className="rounded-2xl border border-[#ddd] p-5 sm:p-7"><h2 className="text-xl font-bold">Related developer tools</h2><div className="mt-4 space-y-2">{related.map((item) => <Link key={item.slug} href={`/tools/${item.slug}`} className="block rounded-lg border border-[#eee] px-3 py-2.5 text-sm font-medium hover:bg-[#f7f7f7]">{item.name}</Link>)}</div></div></section>
  </div></main>;
}
