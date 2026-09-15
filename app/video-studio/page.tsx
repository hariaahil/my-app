import type { Metadata } from "next";
import VideoStudio from "./video-studio-v12";

const videoStudioUrl = "https://targetbud.vercel.app/video-studio";

export const metadata: Metadata = {
  title: "Free Online Video Editor — TargetBud Video Studio",
  description: "Create videos in your browser with a native WebCodecs-powered media engine.",
  keywords: ["online video editor", "free video editor", "WebCodecs video editor", "browser video editor", "TargetBud Video Studio"],
  alternates: { canonical: videoStudioUrl },
  openGraph: { title: "Free Online Video Editor — TargetBud Video Studio", description: "Create and edit videos in your browser with TargetBud Video Studio.", url: videoStudioUrl, siteName: "TargetBud", type: "website" },
  twitter: { card: "summary", title: "Free Online Video Editor — TargetBud Video Studio", description: "Create and edit videos in your browser with TargetBud Video Studio." },
};

export default function VideoStudioPage() { return <VideoStudio />; }
