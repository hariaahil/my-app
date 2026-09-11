import type { Metadata } from "next";
import "./globals.css";
import SiteNavigation from "@/components/site-navigation";
import GoalInsightsOverlay from "@/components/goal-insights-overlay";
import GoalInsightsRedirect from "@/components/goal-insights-redirect";

export const metadata: Metadata = {
  title: "TargetBud — One place for your targets",
  description: "Markets, news, sports, developer tools and personal finance in one modern platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><SiteNavigation />{children}<GoalInsightsOverlay /><GoalInsightsRedirect /></body>
    </html>
  );
}
