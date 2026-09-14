import type { Metadata } from "next";
import VideoStudio from "./video-studio-v3";

export const metadata: Metadata = {
  title: "Video Studio — TargetBud",
  description: "Create and edit videos in your browser with TargetBud Video Studio. Import media, trim, split, reorder clips, add text, choose aspect ratios and export.",
  alternates: { canonical: "https://targetbud.vercel.app/video-studio" },
};

export default function VideoStudioPage() {
  return <VideoStudio />;
}
