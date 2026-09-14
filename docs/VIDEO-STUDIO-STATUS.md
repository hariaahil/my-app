# TargetBud Video Studio

## Priority
Video Studio is the current top product-building priority: a browser-first, original TargetBud video creation utility inspired by the capability category of modern short-form editors, not a copy of proprietary CapCut code, UI, or assets.

## Implemented in this cycle
- First-class `/video-studio` route with SEO metadata and canonical URL.
- Home-page discovery card and primary create CTA.
- Navigation/search/mobile menu discovery for Video Studio.
- Local browser import for video, image, and audio files.
- Preview canvas with 9:16, 16:9 and 1:1 presets.
- Local timeline with clip selection, duration display, split and remove.
- Undo history for destructive timeline operations.
- Text overlay preview.
- Playback speed and volume controls.
- Browser preview export using MediaRecorder where supported (WebM).
- Accessible labels for key controls and responsive desktop/mobile layout.

## Not yet production-complete
- True multi-track compositing.
- Non-destructive trim handles and clip repositioning across tracks.
- Transitions, filters, crop/position controls and caption editor.
- Audio mixing/fades.
- Reliable MP4 export. The current browser-only fallback exports WebM; do not describe it as MP4.
- AI captions, voiceover, templates, article/news-to-short workflow, image-to-video.
- Supabase saved projects/cloud storage and creator monetisation.

## Next implementation order
1. Add a real timeline model with trim ranges and clip ordering.
2. Add lazy-loaded FFmpeg/WASM or a suitable processing pipeline for true MP4 export without bloating the initial route bundle.
3. Add captions, transitions, crop and basic filters.
4. Add audio tracks and fades.
5. Add templates and TargetBud News/Journal -> short-video handoff.
6. Add optional authenticated project persistence in Supabase.

## Content integrity rule
Before any news/blog/editorial insertion, deduplicate against existing content using normalized title, canonical source URL and substantial-body similarity. Only remove existing duplicates after the actual production TargetBud database is positively identified and records are verified; never delete from an unrelated database.

## Verification note
The repository's existing GitHub verification workflow runs `npm install`, `npm test`, and `npm run build`. This cycle did not receive a workflow run for the final commit, and the connected Vercel deployment action rejected its current invocation schema, so production deployment/build success is not claimed here.
