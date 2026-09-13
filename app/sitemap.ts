import type { MetadataRoute } from "next";
import { developerToolSeo, siteUrl } from "@/lib/developer-tools-seo";

const calculatorSlugs = ["home-loan-emi","personal-loan-emi","car-loan-emi","two-wheeler-loan-emi","education-loan-emi","sip","fd","rd","simple-interest","compound-interest"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: siteUrl, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/tools`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${siteUrl}/calculators`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    ...calculatorSlugs.map((slug) => ({ url: `${siteUrl}/calculators/${slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.9 })),
    ...developerToolSeo.map((tool) => ({ url: `${siteUrl}/tools/${tool.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.85 })),
  ];
}
