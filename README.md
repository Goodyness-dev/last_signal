# LAST SIGNAL

A playable local tactics prototype built from the parent specification pack. Command squads in an original rain soaked communications compound. Capture A, B and C, manage a finite reserve, and fight a local bot.

The current art direction is a fictional early 20th century inspired front. It includes muddy duckboard lanes, sandbags, damaged brick and plaster, exposed rafters, timber doors, crates, barrels, oil lanterns, wire outside the perimeter, dead trees and burned carts. Soldiers wear cloth uniforms, steel brim helmets, leather pouches and canvas packs with bedrolls. Rifles have wooden stocks, iron sights, bolt details and slings. Flags sway and smoke drifts over a clouded warm dawn sky. The close camera, guns, movement and game rules are retained. It is period inspired fiction with abstract shield and EMP support, not a historical simulation.

Current verification: strict TypeScript and production build pass, and all 25 tests pass. Browser checks covered player damage and death, numeric enemy health bars, pause, finite ammo and reload conservation. Loot, weapon switching and practice WIF accounting are covered by simulation tests. See docs/PROOF.md for exact evidence and remaining visual checks.

Current mode: **UNTIMED LOCAL PRACTICE**. Your main character can die. Rifle ammunition is finite. Defeated enemies drop original procedural guns, ammunition and clearly simulated practice WIF. Credits are simulated. No wallet, real money, token purchase, chain balance or settlement is involved. tWIF in the design is a proposed mock token, not official WIF.

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

The default camera is now at squad eye level with visible hands and weapon. WASD directly moves the selected squad relative to your view and stops on release. In EYE LEVEL, TAKE CONTROL enables mouse look. Outside that control mode, touch drag still looks around. V cycles eye level, squad and command views. F restores camera facing. A, B and C buttons order a relay capture. The minimap supports precise movement orders. Your soldiers fire automatically on legal contact. In EYE LEVEL, click TAKE CONTROL to use mouse look, left click to fire your rifle and hold right click to aim. Escape releases the mouse.

Select a cyan squad by clicking it, using its card, or pressing 1 to 3. Right click a destination, or press M or Move and tap the ground. Touch supports tap selection followed by tap movement. T retreats. R reloads the player weapon, G collects nearby loot and X cycles collected guns. P pauses or resumes local practice. Q shields the selected squad for 10 credits. E opens EMP targeting; a ground tap confirms a valid 15 credit pulse. Escape cancels targeting and clears selection. Hold Space or toggle Tactical to inspect cover. Camera buttons zoom and restore framing.

Hold a relay alone for five seconds to capture it. Each relay generates one point per second. Reach 240 points to win. There is no match deadline, overtime or late score multiplier in the web practice modes. Your main character dying ends the run immediately. Existing ownership scores during contested capture. Suppressed squads cannot capture but can contest.

Each side starts with one free squad and 100 practice credits. Deployments cost 20, prepare for two seconds, and have a five second cooldown. At most three squads including preparing reinforcements. Shield absorbs 30 damage for four seconds with an 18 second cooldown. EMP removes enemy shields and disables weapons for two seconds with a 22 second cooldown. No refunds for destroyed squads or practice credit replenishment. Living friendly squads in hero practice now recover health after avoiding damage. Gun pickups replenish the separate bullet inventory and practice WIF counter. The ledger shows accepted spending. Results show scores, losses and reserve, and support rematch.

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


Guidance revision, 31 October 2026: larger cyan squad cards, named relay destination buttons, larger world letters, highlighted training targets and direct tutorial action buttons. Guided practice starts overhead. Instructions collapse to reveal the map. Ordinary practice retains eye level. Strict TypeScript and production build pass. Browser verified guided start, squad selection, accepted B movement, progression to capture guidance, and instruction collapse and restore. Desktop and 390 by 844 phone layouts were inspected. Current period screenshots are docs/evidence/clear-guidance-desktop.png and clear-guidance-phone.png. This closes the missing period screenshot gap for these views. This is local practice only; no new full match, complete tutorial, multiplayer or chain verification is claimed.

New player start: choose Guided first match. Click SELECT SQUAD 1 in the training panel, then SEND SQUAD TO B. The matching card is at the bottom left; the GO TO CENTRE destination is at the top. Wait inside the B ground circle for five uncontested seconds to capture. Hide instructions to see map reveals the battlefield; Show instructions restores the explanation.

Selecting a squad card or pressing 1 on the opening screen now starts guided practice directly. During play both paths select the squad and show a confirmation. Wait for the three second deployment countdown before ordering a station. Click inside the game first if keyboard focus is in another application or the browser address bar.

Move has two steps: click MOVE TO…, then click open ground in the overhead battlefield. The persistent prompt says NOW CLICK THE GROUND while waiting. Station buttons such as GO TO CENTRE are single click movement orders. Escape cancels targeting while keeping the squad selected.

## Player rifle controls

Choose Enter the front or Quick combat drill, stay in EYE LEVEL and click TAKE CONTROL after the countdown. Move the mouse to look. WASD moves relative to your view and stops when released. Left click fires; holding repeats at the rifle bolt cadence. Hold right click to aim with lower sensitivity and zoom. Escape releases the mouse so you can use the squad cards and relay buttons. Your soldiers continue automatic volleys. The service rifle deals 20 damage per shot at four shots per second with a 20 round magazine. The field carbine deals 12 per shot at about 6.7 shots per second with a 30 round magazine. Manual range is 14 units and friendly visibility is required. If mouse capture is unavailable, the fallback looks when the cursor moves over the battlefield; its travel is limited by the window boundary. FIRE RIFLE and AIM buttons remain available before taking control. Health and collision remain squad based.

## Untimed survival practice

Choose Enter the front for the coordinated enemy bot. Guided first match retains its staged teaching route before the ordinary bot activates. Quick combat drill is a labeled immediate battle fixture. The main character is fixed for each run and cannot escape death by switching squad cards. Its current squad health is shown as player health; individual soldier hitboxes are not simulated. Other squad cards remain available for orders.

Start with 20 rifle rounds and 80 spare. R reloads for 1.5 seconds and consumes the reserve. Empty reserve means no more manual shots until ammunition is collected. Autonomous soldiers still fire their squad volleys. Defeated enemy squads drop their weapon, 12 bullets and five practice WIF. Walk within two metres with a clear path and press G. A pickup can be collected once. X switches recovered weapon types using a shared ammunition pool; switching never refills bullets. Practice WIF is a local score counter with no monetary value, wallet balance or chain connection.

Visible enemy squads have red health bars and numeric HP. Player hits show floating damage. The bot shares visible targets, assigns separate station routes, holds captured ground, uses available cover, flanks, shields and physically sidesteps after taking damage. These are deterministic heuristics, not machine learning or a guarantee that every shot is dodged. Pause with P while learning. No dependencies were added.

## Shoot and loot training

Choose SHOOT & LOOT TRAINING on the opening screen for a safe teaching fixture. The single enemy target is stationary and disarmed; your squad assists with ordinary automatic volleys. Shoot it, then walk to the dropped gun with WASD. The marker shows distance and highlights within pickup range. Press G to collect the gun, ammunition and five simulated practice WIF. X cycles your collected gun types. R reloads with a visible progress bar and a lowering weapon animation. Reduced motion avoids the larger weapon motion. START LIVE MATCH resets the inventory and begins ordinary bot practice. Training results carry an explicit label and training flag in local result history. No assets or dependencies were added.

Your main character takes half incoming damage with a short protection window against focused volleys. Your men visibly fall as squad health drops, and the HUD shows survivors out of three. Each lost helper reduces automatic fire. You still aim and fire your own weapon. Squad health and hitboxes remain shared.

## Endless Front and recovery

Choose ENDLESS FRONT on the opening screen for an action focused local run. Eliminate the wave, collect enemy guns and practice WIF with G, recover during the eight second break, then fight the next wave. One, two, then three enemy squads arrive. Later waves fire faster with a capped difficulty. Relays are optional here. The run continues until death or concession; REDEPLOY explicitly restarts Endless Front. P pauses. Classic relay matches and the firing range remain available.

Health recovers at eight HP per second after five seconds without damage, up to 100. Fallen men stay down. H opens field supplies and pauses practice: 40 spare bullets cost five WIF, a four second shield costs five, and a replacement helper with full squad health costs ten after five seconds without damage. Every wave clear pays ten WIF and 20 spare bullets; pickups add five WIF. Supplies and tokens are simulated and reset each run. No real WIF or chain connection exists.

Validated with `npm run build` and `npm test`. Launch from this directory using `npm run dev -w @last-signal/web -- --port 5174 --strictPort`, then open http://127.0.0.1:5174/.

## Unfunded private multiplayer

Start the service from the repository directory:

```powershell
npm run server
```

In a second terminal start the frontend:

```powershell
npm run dev -w @last-signal/web -- --port 5174 --strictPort
```

Open http://127.0.0.1:5174/private.html in two browser tabs. Create a room in one, enter its 16 character code in the other and press READY in both. Select a squad and use GO TO A, B or C, ground clicks or WASD to move. Squads fire automatically. EYE LEVEL adds manual left mouse shooting and right mouse drag looking; R reloads. Capture stations and reach 240 signal. CONCEDE ends the shared match; NEW ROOM creates another afterward. This is the classic untimed relay ruleset with equal 100 simulated credits, no hero recovery, local bot, WIF inventory or escrow. Endless Front remains a separate local mode.

The server controls all match state. If a connection is lost, choose RECONNECT in that same tab within 60 seconds. Both connections must be present to advance. Server restart restores a verified SQLite checkpoint and waits for both sessions. Closing the tab can lose its session credential. Losing both participants aborts without a winner. P does not pause multiplayer.

Service health: http://127.0.0.1:3001/health . Data: ignored .runtime/rooms.sqlite. Keep this data for recovery. Default origins are http://127.0.0.1:5174 and http://localhost:5174. Default binding is loopback only. ALLOWED_ORIGINS can explicitly configure a comma separated list for a later deployment. No public hosting or TLS is configured.

Hidden background launch helpers for Windows: `node scripts/start-private.cjs` and `node scripts/start-preview.cjs`. Start each once; a second instance cannot share the same port. Logs and process IDs are under .runtime.
