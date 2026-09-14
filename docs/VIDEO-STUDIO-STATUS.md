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
- Browser composition now creates an audio MediaStream destination and mixes audio-bearing video/audio clips into the recorded project.
- Audio clips are synchronized to their project segment and use short automatic fade-in/fade-out ramps to reduce boundary clicks.
- Independent multi-track domain model for video, overlay and audio placement, with per-clip audio mix settings and safe fade/gain calculations.
- Automated unit coverage for cross-track placement, track normalization and audio mix/fade behavior.
- Accessible labels for key controls and responsive desktop/mobile layout.
- Metadata probing for imported audio/video duration.
- Lazy browser-only FFmpeg/WASM loader foundation; the heavy encoder is excluded from the initial editor bundle and loaded only when a rendered export path invokes it.

## Not yet production-complete
- UI exposure for independent multi-track lanes and user-configurable per-clip audio fades/mix levels.
- Wiring the lazy FFmpeg loader into the final MP4 render command and validating browser memory/performance limits.
- Transitions, filters, crop/position controls and caption editor.
- AI captions, voiceover, templates, article/news-to-short workflow, image-to-video.
- Supabase saved projects/cloud storage and creator monetisation.

## Next implementation order
1. Wire the multi-track model into the editor UI: visible video/overlay/audio lanes, clip placement, lane targeting, and independent volume/fade controls.
2. Use the lazy FFmpeg/WASM loader for a reliable MP4 render pipeline without bloating the initial route bundle; keep MediaRecorder as the fallback.
3. Add captions, transitions, crop and basic filters.
4. Add templates and TargetBud News/Journal -> short-video handoff.
5. Add optional authenticated project persistence in Supabase.

## Content integrity rule
Before any news/blog/editorial insertion, deduplicate against existing content using normalized title, canonical source URL and substantial-body similarity. Only remove existing duplicates after the actual production TargetBud database is positively identified and records are verified; never delete from an unrelated database.

## Verification note
The latest feature commits are on `main`. Production status should be verified from the newest commit before claiming a successful deployment.
