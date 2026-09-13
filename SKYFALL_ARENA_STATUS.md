# Skyfall Arena — Single Source of Truth

> **Read this file before changing Skyfall Arena.** This is the handoff/status document for any human or agent. Do not redo completed work. Update this file in the same change whenever gameplay architecture or implementation status changes.

## Product goal

Build an original, visually appealing, Roblox-like social multiplayer survival/steal world for TargetBud — **not a waiting-room match**.

Core loop:

**Enter instantly → explore → collect → steal → escape → protect loot → hunt / get hunted → survive → upgrade → return.**

Target server size: **100 concurrent players**. A player can enter with 1 player online, and late joiners can enter an already-running world.

## Current product rules (locked direction)

- No minimum-player wait.
- The world is the lobby: players spawn into the world immediately.
- Maximum target: 100 players per server.
- Late joining is first-class gameplay.
- New players get a temporary protected newcomer state (target: 5 minutes).
- Newcomer protection ends early if the player attacks or steals, preventing abuse.
- Protected players cannot be killed or have valuable loot stolen while protected.
- Safe spawn / arrival area is protected.
- Death should be recoverable, not a permanent reset.
- Future inventory model: Safe inventory, Carried loot, Rare loot, Vault.
- Future risk states: Newcomer, Survivor, Hunter, Wanted.
- Original TargetBud avatars first; appearance/customisation comes later.
- Game visuals may be rich/stylized; do not copy proprietary Roblox assets.
- TargetBud site UI remains neutral/monochrome; game world can have its own visual identity.

## Implemented

### World / entry
- [x] Skyfall Arena exists at `/games/skyfall-arena`.
- [x] A multiplayer entry/arrival page exists at `/games/skyfall-arena/lobby`.
- [x] Room codes can be shared through URLs.
- [x] Display name is persisted locally and passed into the game.
- [x] The current entry flow is being changed from a traditional waiting lobby to an instant-entry world arrival flow.

### 3D prototype
- [x] Babylon.js browser 3D engine loads from CDN.
- [x] Stylized island, lower platform, towers, crystals, energy ring and spawn pad exist.
- [x] Own simple capsule/head avatar exists.
- [x] WASD / arrow movement exists.
- [x] Mobile touch movement exists.
- [x] Third-person-follow camera exists.
- [x] Basic remote-player rendering exists.

### Realtime prototype
- [x] Supabase Realtime Presence is used for room population.
- [x] Supabase Broadcast syncs basic movement between clients.
- [x] Room-based multiplayer channel exists.
- [x] Invite/copy-room-link exists.

### Portal integration / QA already completed
- [x] Games hub links to Skyfall Arena.
- [x] Sitemap includes the game/lobby route.
- [x] Previous production smoke testing confirmed the 3D world renders, movement works, invite link works, responsive layout works, and no horizontal overflow was observed.
- [x] Previous production runtime checks found no recent JS fatal/runtime errors.

## Currently working

- 3D world loads in the browser.
- Player can move around the island.
- Mobile controls are available.
- Room identity is visible.
- Player population is displayed.
- Friends can be invited with a room link.
- Supabase-configured environments can show realtime presence and basic movement sync.
- The code/UI is designed around a 100-player target, but **100 concurrent players has NOT been independently load-tested**.

## Important known limitations — do not mistake these for completed features

1. **Not a production-grade 100-player server yet.** Supabase Presence/Broadcast is currently a prototype transport. It is not an authoritative game server and is not sufficient by itself for secure combat, stealing, inventory or capacity enforcement.
2. **Combat/stealing is not implemented yet.** Do not describe kills, loot theft, inventory, wanted status, or protection as live gameplay until implemented and tested.
3. **Newcomer protection is a product rule, not yet a fully authoritative server rule.** Client-only protection is not secure enough for competitive gameplay.
4. **100-player capacity is a target, not a verified result.** UI capacity must not be treated as proof of 100-player scalability.
5. **Two-client multiplayer sync was not independently verified end-to-end in the latest QA pass.** Re-test before claiming it is production verified.
6. **Avatars are prototype geometry only.** Customisation, cosmetics, emotes and persistent appearance are future work.
7. **World persistence / reconnect state / server migration are not finished.**

## Architecture direction

### Phase 1 — current prototype
Browser + Babylon.js + Supabase Realtime Presence/Broadcast.

### Phase 2 — required before real competitive multiplayer
Authoritative server-side game state for:
- player admission/capacity
- movement validation
- combat
- stealing
- loot ownership
- newcomer protection
- death/respawn
- anti-cheat

Supabase should remain useful for persistence/social systems (profiles, progression, inventory, friends, stats), but the realtime simulation should not trust the browser.

### Phase 3 — scale
Use spatial/interest management so a client does not process every update from all 100 players at full frequency. Partition the world into regions and prioritize nearby/visible players.

## World design target

Large shared world with multiple regions:
- central safe city / arrival zone
- forest
- abandoned factory
- mountain
- underground area
- ruins
- treasure zones
- high-risk zones
- hidden passages
- extraction / vault locations

The player should always have something meaningful to do without needing a full server.

## Protection / risk design target

**Newcomer (green)**
- ~5 minute protection
- spawn shield
- cannot be killed
- valuable loot cannot be stolen
- cannot damage others
- location is not broadcast as a target
- protection can end early if they attack/steal

**Survivor (blue)**
- normal gameplay risk

**Hunter (orange)**
- recently attacked/stole; increased visibility/risk

**Wanted (red)**
- repeated aggression / valuable loot / high-risk behavior

These are design targets until authoritative gameplay is implemented.

## Next highest-priority implementation order

1. **Convert lobby into instant-entry arrival zone** — no waiting threshold.
2. **Pass/persist player identity cleanly into the world.**
3. **Implement visible newcomer protection timer + protected spawn zone in the prototype.**
4. **Create world regions and safer spawn/arrival area.**
5. **Implement collectible resources and a basic inventory model.**
6. **Implement first safe steal interaction and risk-state feedback.**
7. **Move combat/loot/protection/capacity authority server-side.**
8. **Load-test toward 100 players and add spatial interest management.**
9. **Build original TargetBud avatar system and later customisation.**

## Agent guardrails

- Read this file first.
- Do not rebuild the lobby, room system, basic Babylon world, movement, invite flow, games-hub link, or sitemap unless a regression is proven.
- Do not claim a feature is implemented merely because its UI exists.
- After every meaningful gameplay change, update this file with: Implemented, Currently working, Known limitations, and Next priority.
- Prefer small, testable increments.
- Keep Vercel as the existing primary deployment; do not replace the Vercel setup.
- Keep Netlify as-is.
- Never fabricate multiplayer capacity, player counts, loot, jobs, news, rates, availability, or other live data.
