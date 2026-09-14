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
- Browser project composition export using canvas + MediaRecorder where supported.
- Composition export honors clip order, non-destructive trim ranges, aspect-ratio dimensions and text overlay.
- Browser-native export chooses MP4 only when the current browser exposes a supported MP4 encoder; otherwise it returns WebM with an explicit message.
- Accessible labels for key controls and responsive desktop/mobile layout.
- Metadata probing for imported audio/video duration.

## Not yet production-complete
- Reliable cross-browser MP4 export independent of browser codec support.
- True multi-track synchronized audio/video compositing and audio mixing/fades.
- Transitions, filters, crop/position controls and caption editor.
- AI captions, voiceover, templates, article/news-to-short workflow, image-to-video.
- Supabase saved projects/cloud storage and creator monetisation.

## Next implementation order
1. Upgrade the compositor to genuine multi-track video/image/audio synchronization and audio mixing/fades.
2. Add lazy-loaded FFmpeg/WASM or a suitable processing pipeline for reliable MP4 export without bloating the initial route bundle.
3. Add captions, transitions, crop and basic filters.
4. Add templates and TargetBud News/Journal -> short-video handoff.
5. Add optional authenticated project persistence in Supabase.

## Content integrity rule
Before any news/blog/editorial insertion, deduplicate against existing content using normalized title, canonical source URL and substantial-body similarity. Only remove existing duplicates after the actual production TargetBud database is positively identified and records are verified; never delete from an unrelated database.

## Verification note
The latest feature commits are on `main`. Vercel reports the latest feature commit as `pending` at the time of this run, so production success is not claimed.
