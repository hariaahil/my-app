# Skyfall Arena — Single Source of Truth

> Read this file before changing Skyfall Arena. Update it in the same change whenever gameplay architecture or implementation status changes.

## Product goal
Build an original, visually appealing Roblox-like social multiplayer survival/steal world for TargetBud — **not a waiting-room match**.

Core loop: **Enter instantly → explore → collect → steal → escape → protect loot → hunt / get hunted → survive → upgrade → return.**

Target server size: **100 concurrent players**. A player can enter with 1 player online, and late joiners can enter an already-running world.

## Locked product rules
- No minimum-player wait; the world is the lobby.
- Target maximum: 100 players per server.
- Late joining is first-class gameplay.
- New players receive temporary protection (5 minutes in prototype).
- Protected arrival zone is safe.
- Protection ends automatically in prototype; authoritative future rule ends it early on attack/steal.
- Future inventory: Safe inventory, Carried loot, Rare loot, Vault.
- Future risk states: Newcomer, Survivor, Hunter, Wanted.
- Original TargetBud avatars first; customisation later.

## Implemented
### World / entry
- [x] `/games/skyfall-arena` route redirects to the lobby.
- [x] `/games/skyfall-arena/lobby` entry route.
- [x] Instant entry; no minimum-player wait.
- [x] Shared room URLs and display-name handoff.
- [x] Late-join room routing.
- [x] `/games/skyfall-arena/world` connected-world route.

### 3D prototype
- [x] Babylon.js 3D engine loaded in the browser.
- [x] Connected large-world prototype spanning five named regions.
- [x] Arrival City safe zone.
- [x] Whisper Forest, Iron Factory, Storm Mountain and Underground regions.
- [x] Bridges connecting regions.
- [x] Region detection and live region HUD.
- [x] Original simple capsule/head avatar.
- [x] WASD/arrows + mobile touch movement.
- [x] Third-person camera.

### Realtime prototype
- [x] Supabase Realtime Presence population display.
- [x] Supabase Broadcast movement transport in the world prototype.
- [x] Room-based realtime channel.

### Portal / QA
- [x] Games hub integration.
- [x] Sitemap integration.
- [x] Existing portal smoke tests previously passed for the broader games/calculator areas.
- [x] Found and fixed a stale `SkyfallArena.tsx` typecheck failure that blocked production builds; it now re-exports the active world component.

## Currently working
- Connected five-region world prototype.
- Instant entry/late join and mobile movement.
- Realtime population/movement prototype where Supabase is configured.
- Production deployment is rebuilding from the latest typecheck fix.

## Important known limitations
1. **Not production-grade 100-player multiplayer.** Presence/Broadcast is prototype transport, not authoritative simulation.
2. **Current `/world` route is a connected-world prototype only.** The richer collect/steal/recovery prototype exists in the legacy component but is not the active routed world.
3. **World resources, inventory, combat, stealing and death are not authoritative/persistent.**
4. **100 players is a target, not load-tested capacity.**
5. **Two-client multiplayer sync has not been independently verified in the latest QA pass.**
6. **The latest browser QA run timed out while repeatedly attempting the lobby → world transition; do not treat that run as a pass.**
7. **The active world currently does not expose the earlier world-map overlay or remote-player rendering UI; these need to be reintroduced deliberately after the production build is stable.**
8. **Reconnect persistence/server migration are unfinished.**
9. **Avatars are prototype geometry.**

## Architecture direction
### Phase 1 — prototype
Browser + Babylon.js + Supabase Realtime Presence/Broadcast.
### Phase 2 — authoritative multiplayer
Server-side admission/capacity, movement validation, combat, stealing, loot ownership, protection, death/respawn and anti-cheat. Supabase remains useful for persistence/social data.
### Phase 3 — scale
Spatial/interest management so clients prioritize nearby/visible players rather than processing all 100 at full frequency.

## World design target
Central safe city/arrival → forest → abandoned factory → mountain → underground → ruins → treasure zones → high-risk zones → hidden passages → extraction/vault locations.

## Protection / risk design target
- **Newcomer:** ~5 min protection, cannot be killed/stolen from, cannot damage others, protected spawn, hidden from target highlighting; attack/steal ends protection early.
- **Survivor:** normal risk.
- **Hunter:** recently attacked/stole; increased visibility/risk.
- **Wanted:** repeated aggression/high-value risk.

These remain design targets until authoritative gameplay exists.

## Next highest-priority implementation order
1. **Get production build green and verify the lobby → world transition on desktop/mobile.**
2. **Reintroduce the world map and remote-player rendering cleanly in the active world route.**
3. **Move admission, movement, loot, stealing, protection and capacity to authoritative server-side state.**
4. **100-player load testing + spatial interest management.**
5. **Real combat/damage/death with balanced newcomer protection and steal rules.**
6. **Extraction/vault + persistent inventory.**
7. **Original TargetBud avatar system + customisation.**
8. **Progression, missions, social systems and retention loops.**

## Agent guardrails
- Do not rebuild completed lobby, room, movement, invite, games-hub or sitemap work unless regression is proven.
- Do not treat UI as proof gameplay exists.
- Prefer small testable increments.
- Keep existing Vercel primary deployment; keep Netlify as-is.
- Never fabricate live data or multiplayer capacity.
