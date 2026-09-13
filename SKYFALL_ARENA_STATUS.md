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

### 3D prototype
- [x] Babylon.js 3D engine.
- [x] Stylized island, lower platform, towers, energy ring and protected spawn pad.
- [x] Original simple capsule/head avatar.
- [x] WASD/arrows + mobile touch movement.
- [x] Third-person camera.
- [x] Basic remote-player rendering.
- [x] Visible newcomer protection timer.
- [x] Protected arrival area visually distinguished.

### Playable resource loop
- [x] Resource nodes exist in the world: crystals, scrap and relics.
- [x] Nearby resources can be collected with **E**.
- [x] Carried inventory has a prototype capacity of 10 units.
- [x] HUD shows carried loot and collection feedback.
- [x] A prototype **Secure loot** action moves carried loot into a local safe stash.
- [x] Collection nodes disappear after collection during the current play session.

### Realtime prototype
- [x] Supabase Realtime Presence population display.
- [x] Supabase Broadcast movement prototype.
- [x] Protected state can be advertised in movement payloads.
- [x] Invite/copy-room-link.

### Portal / QA
- [x] Games hub integration.
- [x] Sitemap integration.
- [x] Previous smoke testing confirmed 3D render, movement, invite flow, responsive layout and no horizontal overflow.

## Currently working
- Instant entry and late-join world flow.
- Movement and mobile controls.
- Resource collection and local carried/safe-stash prototype loop.
- Newcomer protection timer in the browser prototype.
- Realtime presence/basic movement where Supabase is configured.
- 100-player target UI.

## Important known limitations — do not mistake these for completed features
1. **Not production-grade 100-player multiplayer.** Presence/Broadcast is prototype transport, not authoritative simulation.
2. **Collection and safe stash are client-side prototype state.** They are not persistent or cheat-resistant yet.
3. **Stealing/combat is not implemented.** Do not claim kills, theft or risk states are live.
4. **100 players is a target, not load-tested capacity.**
5. **Two-client multiplayer sync was not independently verified in the latest QA pass.**
6. **Resource state is not shared authoritatively between players yet**, so two clients can currently collect their own local copy.
7. **Avatars are prototype geometry.** Customisation/cosmetics are future work.
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
1. **Safe non-destructive steal interaction** with risk/reward feedback.
2. **Respawn/recovery** and Safe/Carried/Vault split.
3. **Large-world region layout.**
4. **Authoritative server-side combat/loot/protection/capacity.**
5. **100-player load testing + spatial interest management.**
6. **Original TargetBud avatar system + later customisation.**
7. **Progression, missions, social systems and retention loops.**

## Agent guardrails
- Read this file first.
- Do not rebuild completed lobby, room, Babylon world, movement, invite, games-hub or sitemap work unless regression is proven.
- Do not treat UI as proof that gameplay is implemented.
- Update this file after every meaningful gameplay change with Implemented, Currently working, Known limitations and Next priority.
- Prefer small testable increments.
- Keep existing Vercel primary deployment; keep Netlify as-is.
- Never fabricate live data or multiplayer capacity.