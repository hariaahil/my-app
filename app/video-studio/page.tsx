import type { Metadata } from "next";
import VideoStudio from "./video-studio-v4";

const videoStudioUrl = "https://targetbud.vercel.app/video-studio";

export const metadata: Metadata = {
  title: "Free Online Video Editor — TargetBud Video Studio",
  description: "Create videos in your browser with TargetBud Video Studio. Import video, photos and audio, trim and split clips, add text, choose 9:16, 16:9 or 1:1, and export your project.",
  keywords: [
    "online video editor",
    "free video editor",
    "browser video editor",
    "video trimmer",
    "video splitter",
    "short video maker",
    "9:16 video editor",
    "TargetBud Video Studio",
  ],
  alternates: { canonical: videoStudioUrl },
  openGraph: {
    title: "Free Online Video Editor — TargetBud Video Studio",
    description: "Create and edit videos in your browser with TargetBud Video Studio.",
    url: videoStudioUrl,
    siteName: "TargetBud",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Free Online Video Editor — TargetBud Video Studio",
    description: "Create and edit videos in your browser with TargetBud Video Studio.",
  },
};

export default function VideoStudioPage() {
  return <VideoStudio />;
}
