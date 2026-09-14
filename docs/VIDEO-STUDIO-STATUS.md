# TargetBud Video Studio

## Priority
Video Studio is the current top product-building priority: a browser-first, original TargetBud video creation utility inspired by the capability category of modern short-form editors, not a copy of proprietary CapCut code, UI, or assets.

## Implemented
- First-class `/video-studio` route with SEO metadata and canonical URL.
- Home-page discovery card and primary create CTA.
- Navigation/search/mobile menu discovery.
- Local browser import for video, image, and audio files.
- Preview canvas with 9:16, 16:9 and 1:1 presets.
- Local ordered timeline with clip selection, duration display, split-at-playhead and remove.
- Non-destructive per-video trim start/end controls; split clips preserve their source trim ranges.
- Undo history for destructive timeline operations and trim edits.
- Text overlay preview.
- Playback speed and volume controls.
- Browser preview export using MediaRecorder where supported (WebM).
- Accessible labels for key controls and responsive desktop/mobile layout.

## Not yet production-complete
- True multi-track compositing.
- Clip drag/reordering across tracks.
- Reliable MP4 export. The current browser-only fallback exports WebM; do not describe it as MP4.
- Transitions, filters, crop/position controls and caption editor.
- Audio mixing/fades.
- AI captions, voiceover, templates, article/news-to-short workflow, image-to-video.
- Supabase saved projects/cloud storage and creator monetisation.

## Next implementation order
1. Add drag/reorder and a real multi-track timeline model.
2. Add lazy-loaded FFmpeg/WASM or a suitable processing pipeline for true MP4 export without bloating the initial route bundle.
3. Add captions, transitions, crop and basic filters.
4. Add audio tracks and fades.
5. Add templates and TargetBud News/Journal -> short-video handoff.
6. Add optional authenticated project persistence in Supabase.

## Content integrity rule
Before any news/blog/editorial insertion, deduplicate against existing content using normalized title, canonical source URL and substantial-body similarity. Only remove existing duplicates after the actual production TargetBud database is positively identified and records are verified; never delete from an unrelated database.

## Verification note
The repository's existing GitHub verification workflow runs `npm install`, `npm test`, and `npm run build`. The latest feature commits were made directly to `main`; this run has not independently observed a completed CI or Vercel production deployment, so production success is not claimed.
