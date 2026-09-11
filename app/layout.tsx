import type { Metadata } from "next";
import "./globals.css";
import SiteNavigation from "@/components/site-navigation";
import GoalInsightsOverlay from "@/components/goal-insights-overlay";
import GoalInsightsRedirect from "@/components/goal-insights-redirect";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://targetbud.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TargetBud — Tools, Markets, News, Sports & Finance",
    template: "%s | TargetBud",
  },
  description: "TargetBud brings practical developer tools, markets, news, sports and personal finance into one fast, modern platform.",
  applicationName: "TargetBud",
  keywords: ["developer tools", "online tools", "JSON formatter", "JSON minifier", "Base64 encoder", "URL encoder", "JWT decoder", "regex tester", "SEO tools", "finance", "markets", "news", "sports"],
  alternates: { canonical: siteUrl },
  openGraph: { type: "website", siteName: "TargetBud", title: "TargetBud — Tools, Markets, News, Sports & Finance", description: "Practical online tools and useful information in one fast platform.", url: siteUrl },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><SiteNavigation />{children}<GoalInsightsOverlay /><GoalInsightsRedirect /></body>
    </html>
  );
}
