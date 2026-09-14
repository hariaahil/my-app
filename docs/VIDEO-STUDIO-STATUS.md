# TargetBud Video Studio

## Priority
Video Studio is the current top product-building priority: a browser-first, original TargetBud video creation utility inspired by the capability category of modern short-form editors, not a copy of proprietary CapCut code, UI, or assets.

## Implemented
- First-class `/video-studio` route with SEO metadata and canonical URL.
- Home-page discovery card and primary create CTA.
- Navigation/search/mobile menu discovery.
- Local browser import for video, image, and audio files.
- Preview canvas with 9:16, 16:9 and 1:1 presets.
- Local ordered timeline with clip selection and duration display.
- Drag-and-drop clip reordering plus keyboard ArrowUp/ArrowDown reordering.
- Non-destructive per-video trim start/end controls; split clips preserve their source trim ranges.
- Undo history for timeline reorder, remove, split and trim edits.
- Text overlay preview.
- Playback speed and volume controls.
- Browser preview export using MediaRecorder where supported (WebM).
- Accessible labels for key controls and responsive desktop/mobile layout.
- Metadata probing for imported audio/video duration.

## Not yet production-complete
- True multi-track compositing.
- Reliable MP4 export. The current browser-only fallback exports WebM; do not describe it as MP4.
- Transitions, filters, crop/position controls and caption editor.
- Audio mixing/fades.
- AI captions, voiceover, templates, article/news-to-short workflow, image-to-video.
- Supabase saved projects/cloud storage and creator monetisation.

## Next implementation order
1. Build a real multi-track timeline model and synchronized preview across video/image/audio tracks.
2. Add lazy-loaded FFmpeg/WASM or a suitable processing pipeline for true MP4 export without bloating the initial route bundle.
3. Add captions, transitions, crop and basic filters.
4. Add audio tracks, mixing and fades.
5. Add templates and TargetBud News/Journal -> short-video handoff.
6. Add optional authenticated project persistence in Supabase.

## Content integrity rule
Before any news/blog/editorial insertion, deduplicate against existing content using normalized title, canonical source URL and substantial-body similarity. Only remove existing duplicates after the actual production TargetBud database is positively identified and records are verified; never delete from an unrelated database.

## Verification note
The latest feature commits are on `main`. This run did not independently observe a completed CI or Vercel production deployment, so production success is not claimed.
