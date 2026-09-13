# Skyfall Arena — Single Source of Truth

> **Read this file before changing Skyfall Arena.** This is the handoff/status document for any human or agent. Do not redo completed work. Update it in the same change whenever gameplay architecture or implementation status changes.

## Product goal
Build an original, visually appealing Roblox-like social multiplayer survival/steal world for TargetBud — **not a waiting-room match**.

Core loop: **Enter instantly → explore → collect → steal → escape → protect loot → hunt / get hunted → survive → upgrade → return.**

Target server size: **100 concurrent players**. A player can enter with 1 player online, and late joiners can enter an already-running world.

## Current product rules (locked direction)
- No minimum-player wait; the world is the lobby.
- Target maximum: 100 players per server.
- Late joining is first-class gameplay.
- New players receive temporary protection (5 minutes in prototype).
- Protected arrival zone is safe.
- Protection ends automatically in prototype; authoritative future rule ends it early on attack/steal.
- Future inventory: Safe inventory, Carried loot, Rare loot, Vault.
- Future risk states: Newcomer, Survivor, Hunter, Wanted.
- Original TargetBud avatars first; customisation later.
- Rich original game visuals are allowed; do not copy proprietary Roblox assets.

## Implemented
### World / entry
- [x] `/games/skyfall-arena` game route.
- [x] `/games/skyfall-arena/lobby` entry route.
- [x] Instant entry; no minimum-player wait.
- [x] Shared room URLs and display-name handoff.
- [x] Late joiners can enter the same room.
- [x] Lobby now enters the connected world route.

### 3D prototype
- [x] Babylon.js 3D engine.
- [x] Connected large-world prototype spanning five named regions.
- [x] Arrival City safe zone.
- [x] Whisper Forest, Iron Factory, Storm Mountain and Underground regions.
- [x] Bridges connecting regions into one explorable space.
- [x] Region detection and live region HUD.
- [x] World map overlay.
- [x] Original simple capsule/head avatar.
- [x] WASD/arrows + mobile touch movement.
- [x] Third-person camera.
- [x] Basic remote-player rendering.

### Playable resource / survival prototype
- [x] Resource nodes: crystals, scrap and relics.
- [x] E to collect and carried capacity of 10.
- [x] Secure loot local safe stash.
- [x] Q/mobile steal prototype and Wanted feedback.
- [x] Down/respawn prototype with safe-stash preservation and carried-loot loss.
- [x] Short recovery protection after respawn.

### Realtime prototype
- [x] Supabase Realtime Presence population display.
- [x] Supabase Broadcast movement prototype.
- [x] Protected/carried/alive state transport in the gameplay prototype.
- [x] Prototype steal event transport.
- [x] Room invite/copy flow.

### Portal / QA
- [x] Games hub integration.
- [x] Sitemap integration.
- [x] Previous smoke testing confirmed 3D render, movement, invite flow, responsive layout and no horizontal overflow.

## Currently working
- Large-world prototype and connected region traversal.
- Instant entry/late join and mobile movement.
- Resource/steal/recovery gameplay prototype.
- Realtime prototype transport where Supabase is configured.
- 100-player target UI.

## Important known limitations — do not mistake these for completed features
1. **Not production-grade 100-player multiplayer.** Presence/Broadcast is prototype transport, not authoritative simulation.
2. **Collection, safe stash and theft remain client-side prototype state.** They are not persistent or cheat-resistant.
3. **Combat, damage and secure server-side kills are not implemented.**
4. **100 players is a target, not load-tested capacity.**
5. **Two-client multiplayer sync has not been independently verified in the latest QA pass.**
6. **World/resource state is not authoritative or globally synchronized yet.**
7. **Remote-player theft remains trust-based prototype messaging.**
8. **Avatars are prototype geometry.** Customisation/cosmetics are future work.
9. **Reconnect persistence/server migration are unfinished.**

## Architecture direction
### Phase 1 — prototype
Browser + Babylon.js + Supabase Realtime Presence/Broadcast.
### Phase 2 — authoritative multiplayer
Server-side admission/capacity, movement validation, combat, stealing, loot ownership, protection, death/respawn and anti-cheat. Supabase remains useful for persistence/social data.
### Phase 3 — scale
Spatial/interest management so clients prioritize nearby/visible players rather than processing all 100 at full frequency.

## World design target
Central safe city/arrival → forest → abandoned factory → mountain → underground → ruins → treasure zones → high-risk zones → hidden passages → extraction/vault locations.

Current prototype covers the first five major regions; ruins, treasure/high-risk subzones, hidden passages and extraction/vault gameplay remain future layers.

## Protection / risk design target
- **Newcomer:** ~5 min protection, cannot be killed/stolen from, cannot damage others, protected spawn, hidden from target highlighting; attack/steal ends protection early.
- **Survivor:** normal risk.
- **Hunter:** recently attacked/stole; increased visibility/risk.
- **Wanted:** repeated aggression/high-value risk.

These remain design targets until authoritative gameplay exists.

## Next highest-priority implementation order
1. **Authoritative server-side game state** for admission, movement, loot, stealing, protection and capacity.
2. **100-player load testing + spatial interest management.**
3. **Real combat/damage/death and balanced steal rules.**
4. **Extraction/vault system and persistent inventory.**
5. **Original TargetBud avatar system + customisation.**
6. **Progression, missions, social systems and retention loops.**

## Agent guardrails
- Read this file first.
- Do not rebuild completed lobby, room, movement, invite, games-hub or sitemap work unless regression is proven.
- Do not treat UI as proof gameplay exists.
- Update this file after every meaningful gameplay change with Implemented, Currently working, Known limitations and Next priority.
- Prefer small testable increments.
- Keep existing Vercel primary deployment; keep Netlify as-is.
- Never fabricate live data or multiplayer capacity.
