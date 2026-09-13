import type { MetadataRoute } from "next";
import { developerToolSeo, siteUrl } from "@/lib/developer-tools-seo";

const calculatorSlugs = ["home-loan-emi","personal-loan-emi","car-loan-emi","two-wheeler-loan-emi","education-loan-emi","sip","fd","rd","simple-interest","compound-interest"];
const gameSlugs = ["number-guess", "quick-math"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: siteUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/tools`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${siteUrl}/calculators`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${siteUrl}/games`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/games/skyfall-arena/lobby`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    ...calculatorSlugs.map((slug) => ({ url: `${siteUrl}/calculators/${slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.9 })),
    ...developerToolSeo.map((tool) => ({ url: `${siteUrl}/tools/${tool.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.85 })),
    ...gameSlugs.map((slug) => ({ url: `${siteUrl}/games/${slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.75 })),
  ];
}
