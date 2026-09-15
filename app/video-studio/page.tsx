import type { Metadata } from "next";
import VideoStudio from "./video-studio-v6";

const videoStudioUrl = "https://targetbud.vercel.app/video-studio";

export const metadata: Metadata = {
  title: "Free Online Video Editor — TargetBud Video Studio",
  description: "Create videos in your browser with TargetBud Video Studio. Import video, photos and audio, edit a multi-track timeline, trim and split clips, add text, filters and transitions, and export your project.",
  keywords: [
    "online video editor",
    "free video editor",
    "browser video editor",
    "video trimmer",
    "video splitter",
    "multi track video editor",
    "short video maker",
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
