import type { Metadata } from "next";
import VideoStudio from "./video-studio-v8";

const videoStudioUrl = "https://targetbud.vercel.app/video-studio";

export const metadata: Metadata = {
  title: "Free Online Video Editor — TargetBud Video Studio",
  description: "Create videos in your browser with TargetBud Video Studio. Import media, edit a multi-track timeline, animate with keyframes, add captions, filters, effects, masks, chroma key and audio, then export.",
  keywords: ["online video editor","free video editor","browser video editor","keyframe video editor","multi track video editor","short video maker","TargetBud Video Studio"],
  alternates: { canonical: videoStudioUrl },
  openGraph: { title: "Free Online Video Editor — TargetBud Video Studio", description: "Create and edit videos in your browser with TargetBud Video Studio.", url: videoStudioUrl, siteName: "TargetBud", type: "website" },
  twitter: { card: "summary", title: "Free Online Video Editor — TargetBud Video Studio", description: "Create and edit videos in your browser with TargetBud Video Studio." },
};

export default function VideoStudioPage() { return <VideoStudio />; }
