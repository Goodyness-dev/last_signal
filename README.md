# LAST SIGNAL

A playable local tactics prototype built from the parent specification pack. Command squads in an original rain soaked communications compound. Capture A, B and C, manage a finite reserve, and fight a local bot.

The current art direction is a fictional early 20th century inspired front. It includes muddy duckboard lanes, sandbags, damaged brick and plaster, exposed rafters, timber doors, crates, barrels, oil lanterns, wire outside the perimeter, dead trees and burned carts. Soldiers wear cloth uniforms, steel brim helmets, leather pouches and canvas packs with bedrolls. Rifles have wooden stocks, iron sights, bolt details and slings. Flags sway and smoke drifts over a clouded warm dawn sky. The close camera, guns, movement and game rules are retained. It is period inspired fiction with abstract shield and EMP support, not a historical simulation.

Period revision retry: strict TypeScript checking, the production build and all 14 tests passed. The local page and revised source modules return HTTP 200 at http://127.0.0.1:5174/. Git is responding. Browser automation still times out, so fresh period screenshots and a new visual review remain unverified. Older screenshots show preceding art revisions. See docs/STATUS.md and docs/NEXT_STAGES.md.

Current mode: **LOCAL_PRACTICE**. Credits are simulated. No wallet, real money, token purchase, chain balance or settlement is involved. tWIF in the design is a proposed mock token, not official WIF.

## Launch

Use Node 24 or a newer supported LTS release and npm. Verified with Node 24.16.0 and npm 11.13.0 on Windows.

```powershell
cd C:\Users\DELL\Documents\LAST_SIGNAL_CODEX_PACK\last_signal
npm ci
npm run dev -w @last-signal/web -- --port 5174 --strictPort
```

Open http://127.0.0.1:5174/. Choose Enter the front, Quick combat drill or Guided first match. WebGL 2 is required. `npm run dev` also works and uses the next available Vite port starting at 5173. An earlier project occupied 5173 during this session and was preserved.

Optional service baseline in another terminal:

```powershell
cd C:\Users\DELL\Documents\LAST_SIGNAL_CODEX_PACK\last_signal
npm run server
```

Health: http://127.0.0.1:3001/health. This service reports shared rules and map versions. It does not host matches. Practice runs independently. Stop either terminal with Ctrl+C.

## Play

The default camera is now at squad eye level with visible hands and weapon. WASD moves the selected squad relative to your view. Drag the battlefield to look around. V cycles eye level, squad and command views. F restores camera facing. A, B and C buttons order a relay capture. The minimap supports precise movement orders. Weapons still fire automatically on legal contact.

Select a cyan squad by clicking it, using its card, or pressing 1 to 3. Right click a destination, or press M or Move and tap the ground. Touch supports tap selection followed by tap movement. R retreats. Q shields the selected squad for 10 credits. E opens EMP targeting; a ground tap confirms a valid 15 credit pulse. Escape cancels targeting and clears selection. Hold Space or toggle Tactical to inspect cover. Camera buttons zoom and restore framing.

Hold a relay alone for five seconds to capture it. Each relay generates a point each second, doubled in the last 30 seconds. Reach 240 points or lead at 180 seconds. A tie continues for up to 20 seconds. Existing ownership scores during contested capture. Suppressed squads cannot capture but can contest.

Each side starts with one free squad and 100 practice credits. Deployments cost 20, prepare for two seconds, and have a five second cooldown. At most three squads including preparing reinforcements. Shield absorbs 30 damage for four seconds with an 18 second cooldown. EMP removes enemy shields and disables weapons for two seconds with a 22 second cooldown. No healing, refunds for destroyed squads, or reserve replenishment. The ledger shows accepted spending. Results show scores, losses and reserve, and support rematch.

Quick combat drill starts three squads per side already facing each other. Both sides pay for two reinforcements through the normal command validator, leaving 60 credits each. The seven second preparation is advanced before the drill opens. This is an explicitly labeled local scenario, distinct from a normal match start. It is not multiplayer or chain evidence.

## Checks

```powershell
npm run build
npm test
npm run preview -w @last-signal/web -- --port 4173 --strictPort
```

Strict TypeScript and production build pass. The 14 simulation tests cover budget limits, duplicate spending, squad reservation, navigation, visibility filtering, simultaneous kills, home safety, cover, suppression, shield, EMP, capture, scoring, victory and overtime. Repeated bot matches produce identical final state. See docs/PROOF.md for actual evidence and limits.

## Structure

`apps/web` contains the Vite shell, Three.js scene and controls. `packages/sim` contains pure fixed tick rules shared by browser and service. `apps/server` contains a Fastify health baseline. `tests` contains simulation scenarios. `docs` records facts, decisions, status, licenses and evidence. The original specification remains untouched in the parent folder.

## Current limitations

This is the first playable slice, not the complete testnet product. Private multiplayer, authenticated rooms, durable command journals, recovery, contracts, local chain, public testnet and public hosting are not implemented. No receipts or deployed addresses exist. There is no refund flow because no funds are accepted.

The guided match waits for a first player capture, then scripts an ordinary bot movement through the northern flank before teaching reinforcement and shield. It then enables the normal bot. The bot chooses relay objectives, reinforcements, retreat and shields. Cluster EMP evaluation and varied openings are pending. Art uses procedural placeholder soldiers and simple geometry. Original audio now includes synthesized rain, gunshots, footfall and command cues. No external recordings, blood decals, photorealistic human models, human balance studies, or measured performance targets are claimed. Smoke and casualties are bounded cosmetic effects.

Practice pauses when the page is hidden. Reload starts a fresh battle. Recent results are stored locally when storage is available. There is no service worker for an offline cold start; serve bundled files locally. No network game service is needed during practice. Local fonts are bundled with their licenses.

Hackathon eligibility is **UNCONFIRMED**. The event page did not expose readable rules when checked. The pack supplied a deadline of 2 November 2026 at 17:30 UTC, or 18:30 in Nigeria; this was not independently verified.
