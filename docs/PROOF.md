# Proof record

31 October 2026. Every screenshot here is LOCAL_PRACTICE. None proves multiplayer, local chain or public testnet.

## Executed commands

```powershell
node --version
npm --version
npm view vite version engines
npm view three version
npm view typescript version
npm view vitest version engines
npm view fastify version
npm view @types/three version
npm view tsx version
npm install
npm ls --depth=0
npm run build
npm test
npm test -- --reporter=verbose
npm run dev -w @last-signal/web -- --port 5174 --strictPort
npm run server
Invoke-WebRequest http://127.0.0.1:5174/ -UseBasicParsing
Invoke-RestMethod http://127.0.0.1:3001/health
```

Install: 101 packages added, zero vulnerabilities reported. Strict typecheck and Vite production build passed. Initial minified JS 583.09 kB, gzip 149.61 kB. Vite warns about a chunk above 500 kB. This is recorded rather than suppressed. Font bundling and final source changes require the final build below.

Simulation: 13 tests passed. Deterministic normal bot mirror exercise completed at tick 3600 twice. Scores 172 to 185; both sides spent 80. This checks reproducibility, not strategic balance or cross runtime hashing. No cosmetic seed affects damage.

Server: health returned status ok, service LAST SIGNAL, mode LOCAL_PRACTICE, multiplayer false, rules practice-1, map compound-1. This is only a service baseline.

The first preview command incorrectly passed a positional 5173 through npm and produced a 404. It was stopped and corrected with the workspace command above. Port 5173 was already used by unrelated work and was preserved. The corrected page returned HTTP 200.

Retained terminal processes ended during a user message. Preview and health were restarted as hidden background Node processes. Local PID files and logs are ignored under .runtime. No services are exposed beyond loopback.

## Browser evidence

In app browser on Windows. Real WebGL scene and normal practice engine. Viewports 1440 by 900, 1920 by 1080 and 390 by 844 were exercised. A shorter desktop viewport exposed clipped briefing controls and phone review exposed horizontal overflow; both were corrected. Phone DOM later reported page width 375 within a 390 viewport including scrollbar.

| Evidence | What it demonstrates |
| --- | --- |
| evidence/desktop-1440.jpg | Runtime battlefield and briefing |
| evidence/live-practice-1440.jpg | Running match, capture ownership, selected squad, shield and reserve |
| evidence/mobile-390.jpg | Corrected phone layout with reachable start controls |
| evidence/desktop-1920.jpg | Runtime large desktop layout |
| evidence/spending-ledger.jpg | Accepted deploy 20, shield 10 and EMP 15, spent 45 and remaining 55 |

Observed live: player movement, bot relay capture and score growth, preparing reinforcement and new squad card, HP damage and squad loss, shield capacity presentation and cooldown, valid EMP target and 15 credit deduction, low effects and reduced motion checkboxes, optional synthesized audio initialization. Audio listening quality was not assessed.

Natural browser result verified: Bot reached 241 points, player 0, one player squad lost, 45 credits spent and 55 remaining. The result showed local practice with no chain settlement. Screenshot: evidence/result-practice.jpg. Rematch restored 0 to 0 scores, a 3 second countdown, one free squad and 100 credits.

After the guided opener improvement, a fresh tutorial captured B for the player before the bot advanced through the northern route. Player score reached 21 while bot score was 0. The bot became visible in the contested central circle. Guidance advanced from capture to observed flank, reinforcement and shield. All bot movement used ordinary commands. Selecting the new squad and purchasing a shield advanced guidance to You have command, with reserve 70 and an 18 second cooldown. Screenshot: evidence/tutorial-complete.jpg. This completes the guided flow review.

Final strict production build passed after font bundling, timer correction, phone overflow fix and scripted tutorial. CSS 16.12 kB, gzip 4.25 kB. JS 583.62 kB, gzip 149.81 kB. All three licensed fonts appeared in dist/fonts. A final simulation run again passed 13 tests. Browser error log inspection returned an empty list.

No combat video was recorded. Keyboard only, physical touch, no WebGL fallback, performance profiling, human balance review and network security tests are pending.

Final handoff review found that bundled font metrics made the medium height desktop briefing too tall. A CSS correction hides redundant briefing detail at that size and adds a bounded scroll fallback. At 1440 by 900, both start buttons and the whole briefing were confirmed inside the battlefield. The desktop evidence was refreshed and the production build repeated successfully. This last change only affects CSS.

## Not present

No multiplayer match, local blockchain, contract tests, funding, settlement, timeout refund, public URL, chain address, transaction hash or organizer eligibility confirmation exists. Contract accounting and signature security are NOT_STARTED. Do not use these screenshots as chain evidence.

## Close action revision

31 October 2026. The owner rejected the distant interface and asked for a closer, more interactive view. Earlier screenshots above remain historical evidence of the first slice.

Implemented and inspected default eye level camera with original hands and weapon, close squad camera, command overview, drag look, WASD squad movement, relay buttons and clickable visibility filtered minimap. Added articulated limbs, crouching, recoil, aiming, flashes, casings, sparks, dust, splashes, smoke and bounded casualty falls. New cosmetics use real visible gameplay events and never add damage.

Quick Combat Drill is an authored local practice fixture. Both sides pay for two additional squads using the ordinary command validator. It advances seven seconds of legal preparation before placing the squads in three opposing lanes. Opening budgets are 60 each and spent totals are 40 each. It is not a standard match start. A browser drill showed active combat at 90 then 80 HP, three squads per side, contested relays and a 60 credit reserve. Purchasing shield changed reserve to 50 and showed the actual cooldown and shield bubble. See combat-drill-eye-level.jpg and close-combat-action.jpg.

Observed movement using a held W key, drag look, eye level and command view switching, central relay order and capture. The new full screen layout was inspected at 1440 by 900, 390 by 844 and 500 by 626. Phone page width equaled the viewport. In the compact view, all three start buttons fit above the command deck. Browser error log returned no entries. Local preview remains http://127.0.0.1:5174/.

New evidence in docs/evidence: combat-drill-eye-level.jpg, close-combat-action.jpg, close-squad-moving.jpg, revised-command-view.jpg and immersive-mobile-390.jpg. eye-level-view.jpg was taken during the camera iteration before the view weapon was added. The drill screenshots show the completed weapon presentation. Still images do not verify the timing of every effect. No video or physical phone test was captured. Art remains visibly stylized procedural geometry.

Executed npm run build and npm test. Fourteen tests passed after adding a drill accounting and combat scenario. A prior run of the two full bot matches exceeded the default five second Vitest limit under host load. Its timeout was raised to 30 seconds; no gameplay rules or assertions were relaxed. Pixel ratio is capped at 1.4, shadows refresh every fourth frame and movement paths are cached. No FPS target is claimed. Vite still reports the large Three.js bundle warning.

## Period art revision

31 October 2026. The owner requested an older war setting while retaining guns and close interaction. The original procedural environment is now in old-front.ts, with period inspired uniforms and wooden stocked rifles in soldier.ts and a warmer HUD palette in old-front.css. Map collision footprints and gameplay constants were preserved. Muddy communication lanes and small props are visual dressing, not new excavated navigation or damage mechanics. All assets are original source geometry and generated canvas textures.

Implemented details include timber duckboards with nail heads, wheel ruts and puddles, sandbag rows, brick variation, soot and water streaks, chipped plaster, shuttered windows and sills, braced doors, partial roofs and rafters, chimneys, barrel hoops, crates, oil lanterns, maps and cups on field tables, wire outside bounds, dead trees, grass, cart wheels, smoke, moving flags, bedroll straps, canteens, puttee wraps, helmet brims, rifle slings, iron sights and cosmetic bolt movement. Radio tables replace the large luminous towers. No third party art was introduced.

Final verification did not finish. Default PowerShell, system Node, native compiler and browser calls stalled during handoff. cmd internal echo and task listing worked. The bundled runtime at C:/Users/DELL/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe returned v24.22.1. scripts/start-preview.cjs used that runtime and reported a preview request with PID 20348. This is a launch request, not readiness evidence. Subsequent HTTP checks and production builds did not finish. No new screenshot or successful test result is asserted. Git status and commit calls also stalled. Earlier evidence remains explicitly historical.

Normal commands remain npm run build, npm test and npm run dev -w @last-signal/web -- --port 5174 --strictPort from the project root. Once the Windows runtime responds, run these and capture fresh period screenshots before marking the visual acceptance complete. No credentials or external deployment access are required.

## Successful period verification retry

31 October 2026. Supersedes the build, test, HTTP and Git blockers in the preceding section. System Node responded with v24.16.0. Executed npm run build followed by npm test from last_signal. Strict TypeScript completed successfully. Vite transformed 16 modules and built the period bundle: CSS 26.44 kB, gzip 6.46 kB; JavaScript 625.23 kB, gzip 162.57 kB. The renderer bundle warning remains. Fourteen tests passed in 8 seconds. No rules, dependencies or test assertions were changed for the retry.

Get-NetTCPConnection confirmed the preview listening on 127.0.0.1:5174 under PID 20348. Invoke-WebRequest confirmed HTTP 200 for the page and /src/main.ts, /src/old-front.ts and /src/soldier.ts. Module responses prove source transformation and delivery, not a completed WebGL render. Git status, log and diff checks responded; whitespace check found no errors.

Browser verification remains limited. Reconnecting to the in app tab timed out. A separate Chrome attempt also timed out. No fresh screenshot was captured, and the old modern compound images must not be presented as period evidence. Current visual acceptance is still pending. The stage 3 to 6 implementation plan and required exit evidence are in NEXT_STAGES.md; those systems remain unimplemented unless their status table is updated with actual evidence.


Guidance revision, 31 October 2026: larger cyan squad cards, named relay destination buttons, larger world letters, highlighted training targets and direct tutorial action buttons. Guided practice starts overhead. Instructions collapse to reveal the map. Ordinary practice retains eye level. Strict TypeScript and production build pass. Browser verified guided start, squad selection, accepted B movement, progression to capture guidance, and instruction collapse and restore. Desktop and 390 by 844 phone layouts were inspected. Current period screenshots are docs/evidence/clear-guidance-desktop.png and clear-guidance-phone.png. This closes the missing period screenshot gap for these views. This is local practice only; no new full match, complete tutorial, multiplayer or chain verification is claimed.


Squad selection fix, 31 October 2026: reproduced that a squad card click and key 1 on the opening screen left OPERATION STANDBY active despite showing a selected card. Selecting from that screen now starts guided practice, focuses the battlefield, announces the selection and advances to the station order step. All selection entry points share one handler. Cards update health and selection in place instead of replacing their DOM nodes on each stat update, preserving pointer clicks and focus. Digit and numpad shortcuts are recognized, and an unavailable squad no longer clears the current selection. Strict TypeScript and production build passed. Browser checks verified opening card start, opening key 1 start, Escape then key 1 reselection, and Escape then card reselection, with order buttons enabled after the countdown. No simulation rules changed.


Movement playthrough, 31 October 2026: used computer use in the existing Chrome game tab. Before changes, Move armed targeting with only a small toast; a subsequent ground click did move the squad across the screen. Relay commands could leave targeting armed. Move now switches overhead, labels itself PICK GROUND and displays a persistent NOW CLICK THE GROUND panel. Accepted movement, EMP or retreat clears targeting; invalid destinations keep it active for retry. Escape cancels an armed order without clearing selection. A guided browser playthrough verified ground movement, arrival and B capture, rising score, enemy approach and automatic combat, paid deployment, shield, selecting reinforcement cards, relay orders and close camera. Training reached step 7 through ordinary gameplay. The instruction action remains visible while its panel scrolls. No simulation rules or dependencies changed.


The Chrome guided playthrough continued to a natural result: player 114, bot 240, four friendly losses, four paid deployments, two shields, 100 credits spent and zero remaining. B and C captures, combat, retreat back to home and continuing scores were observed on screen. REDEPLOY reset scores to zero and began a fresh countdown. Evidence: docs/evidence/movement-playthrough-combat.png and movement-playthrough-result.png. Final strict build and 14 tests passed after the movement changes. The final patch also cancels unfinished targeting when the selected squad is lost or the match ends and announces automatic squad replacement. Remaining limitation: the procedural visuals and squad combat are stylized; these checks are local practice only, not multiplayer or chain integration.


Final browser edge check: in Quick combat drill, left Move armed while the selected squad was under fire. After all friendly squads died, the destination panel cleared, selection became empty, movement controls disabled, and an explicit loss notice directed the player to deployment. This used real drill combat, not injected state. A fresh game remains available at http://127.0.0.1:5174/; launch command remains npm run dev -w @last-signal/web -- --port 5174 --strictPort.
