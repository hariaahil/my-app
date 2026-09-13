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
- [x] Original TargetBud-style prototype humanoid avatar with body, head and legs.
- [x] Third-person camera with close behind-player framing.
- [x] WASD/arrows + persistent joystick movement at all responsive breakpoints.
- [x] Persistent jump control at all responsive breakpoints.
- [x] Right-side drag camera-look interaction without joystick/control conflicts.
- [x] Other players rendered as distinct realtime prototype avatars.

### Realtime prototype
- [x] Supabase Realtime Presence population display.
- [x] Supabase Broadcast movement transport in the world prototype.
- [x] Room-based realtime channel.

### Portal / QA
- [x] Games hub integration.
- [x] Sitemap integration.
- [x] Production lobby → world transition verified.
- [x] Production 3D canvas rendering verified.
- [x] Production desktop joystick and jump controls visually verified.
- [x] Production third-person mode verified.
- [x] Latest production deployment is READY on Vercel.

## Currently working
- Connected five-region world prototype.
- Instant entry/late join and responsive joystick/jump controls.
- Third-person avatar/camera presentation.
- Realtime population/movement prototype where Supabase is configured.

## Important known limitations
1. **Not production-grade 100-player multiplayer.** Presence/Broadcast is prototype transport, not authoritative simulation.
2. **Current `/world` route is a connected-world prototype only.** The richer collect/steal/recovery prototype is not yet part of the active routed world.
3. **World resources, inventory, combat, stealing and death are not authoritative/persistent.**
4. **100 players is a target, not load-tested capacity.**
5. **Two-client multiplayer sync has not been independently verified in the latest QA pass.**
6. **Mobile/tablet interaction needs repeated production regression passes at multiple viewport sizes.**
7. **Avatars are still prototype geometry and need the full original TargetBud avatar/customisation system later.**
8. **Reconnect persistence/server migration are unfinished.**

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
1. **Complete responsive production QA across mobile, tablet and desktop, including avatar visibility after the world finishes loading.**
2. **Reintroduce the world map and strengthen remote-player/name presentation cleanly in the active world route.**
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
