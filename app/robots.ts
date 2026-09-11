import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/developer-tools-seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/account/", "/goal/", "/settings/"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
