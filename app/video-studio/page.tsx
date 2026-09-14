import type { Metadata } from "next";
import VideoStudio from "./video-studio";

export const metadata: Metadata = {
  title: "Video Studio — TargetBud",
  description: "Create and edit videos in your browser with TargetBud Video Studio. Trim clips, arrange media, add text, choose aspect ratios and export a preview.",
  alternates: { canonical: "https://targetbud.vercel.app/video-studio" },
};

export default function VideoStudioPage() {
  return <VideoStudio />;
}
