# Skyfall Arena

TargetBud's first 3D multiplayer game prototype.

## Product direction

Skyfall Arena is intentionally a small, polished multiplayer vertical slice rather than a Roblox-scale platform. The first loop is: join room -> explore -> invite friends -> move together. Future iterations can add collectibles, challenges, cosmetics, rounds and progression without replacing the existing portal.

## Technical approach

- Babylon.js is loaded client-side from the official CDN so the existing Next.js dependency footprint stays small.
- Supabase Realtime Presence is used for room membership and Broadcast for lightweight movement sync.
- Room identity is URL-based (`?room=...`) so an invite link can open the same room.
- The page degrades to a solo preview if Supabase is not configured.

## Production requirements

- Never invent player counts or other multiplayer state.
- Keep the neutral/monochrome visual language.
- Test desktop and touch controls before each release.
- Keep the initial 3D world small enough for mobile browsers.
- Treat collectibles/challenges/progression as subsequent retention work, not part of the first multiplayer slice.
