import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TargetBud — One place for your targets",
  description: "Markets, news, sports, developer tools and personal finance in one modern platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
