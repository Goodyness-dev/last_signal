# Fact register

Checked 31 October 2026. External observations are not deployment evidence.

| Fact | Value | Source and method | Status | Caveat |
| --- | --- | --- | --- | --- |
| Installed Node and npm | 24.16.0 and 11.13.0 | node --version and npm --version | LOCALLY_VERIFIED | Windows host |
| Vite | 8.3.5 | npm view and npm ls; https://vite.dev/guide/ | LOCALLY_VERIFIED | Node engine checked |
| Three.js and types | 0.187.0 | npm view and npm ls; https://threejs.org/manual/pages/installation.html | LOCALLY_VERIFIED | WebGL 2 required |
| TypeScript | 7.0.2 | npm view and npm ls | LOCALLY_VERIFIED | Strict build executed |
| Vitest | 5.0.5 | npm view and npm ls; https://vitest.dev/guide/ | LOCALLY_VERIFIED | Node 24 accepted by engines |
| Fastify | 5.12.7 | npm view and npm ls; https://fastify.dev/docs/latest/Guides/Getting-Started/ | LOCALLY_VERIFIED | Health service only |
| tsx | 4.23.15 | npm view and npm ls | LOCALLY_VERIFIED | Local service runner |
| Node types | 24.10.1 | npm ls | LOCALLY_VERIFIED | Pinned host major |
| Rendering output | sRGB and ACES tone mapping | https://threejs.org/manual/pages/color-management.html and installed types | DOC_OBSERVED | Runtime image inspected separately |
| Install audit | Zero vulnerabilities reported | npm install output | LOCALLY_VERIFIED | Point in time audit |
| Event page | https://worldisflat.fun/build | Retrieval returned zero readable lines | UNCONFIRMED | No eligibility or date confirmation |
| Deadline | 2 November 2026 17:30 UTC | Parent pack 18_BUILD_SEQUENCE.md | USER_SUPPLIED | 18:30 Nigeria. Not independently verified |
| Mock token eligibility | Unknown | Parent pack and event page retrieval | UNCONFIRMED | No organizer confirmation |
| Blockchain integration | None | No contract or wallet implementation | LOCALLY_VERIFIED | No chain reads or transactions |

Chain parameters in the parent pack were not reverified because this slice makes no RPC calls or deployments. No address, receipt, token balance or network identity is asserted here.

Camera and feedback revision, 31 October 2026: installed Three.js camera, raycasting, geometry, materials and color management APIs were checked against https://threejs.org/docs/ and https://threejs.org/manual/pages/color-management.html. No dependencies were added or updated. Eye level is a camera on the selected aggregate squad with a cosmetic view weapon; it does not add independent soldier hitboxes, ammunition or manually aimed shots.

Period art revision is fictional early 20th century inspiration, not a reconstruction of a specific war, army or weapon. No historical accuracy claim is made. New geometry and textures are authored locally. The local renderer log reported a deprecated soft shadow fallback, so the source now selects PCFShadowMap directly.

Verification retry, 31 October 2026: Node 24.16.0 responded again. npm run build passed strict TypeScript and Vite packaging. npm test passed 14 tests. Local page and /src/main.ts, /src/old-front.ts, /src/soldier.ts returned HTTP 200. These checks are LOCALLY_VERIFIED. Current browser automation timed out, so a fresh visual render and screenshot are UNCONFIRMED. Public hosting and chain integrations remain absent.


Guidance revision, 31 October 2026: larger cyan squad cards, named relay destination buttons, larger world letters, highlighted training targets and direct tutorial action buttons. Guided practice starts overhead. Instructions collapse to reveal the map. Ordinary practice retains eye level. Strict TypeScript and production build pass. Browser verified guided start, squad selection, accepted B movement, progression to capture guidance, and instruction collapse and restore. Desktop and 390 by 844 phone layouts were inspected. Current period screenshots are docs/evidence/clear-guidance-desktop.png and clear-guidance-phone.png. This closes the missing period screenshot gap for these views. This is local practice only; no new full match, complete tutorial, multiplayer or chain verification is claimed.


Squad selection fix, 31 October 2026: reproduced that a squad card click and key 1 on the opening screen left OPERATION STANDBY active despite showing a selected card. Selecting from that screen now starts guided practice, focuses the battlefield, announces the selection and advances to the station order step. All selection entry points share one handler. Cards update health and selection in place instead of replacing their DOM nodes on each stat update, preserving pointer clicks and focus. Digit and numpad shortcuts are recognized, and an unavailable squad no longer clears the current selection. Strict TypeScript and production build passed. Browser checks verified opening card start, opening key 1 start, Escape then key 1 reselection, and Escape then card reselection, with order buttons enabled after the countdown. No simulation rules changed.


Movement playthrough, 31 October 2026: used computer use in the existing Chrome game tab. Before changes, Move armed targeting with only a small toast; a subsequent ground click did move the squad across the screen. Relay commands could leave targeting armed. Move now switches overhead, labels itself PICK GROUND and displays a persistent NOW CLICK THE GROUND panel. Accepted movement, EMP or retreat clears targeting; invalid destinations keep it active for retry. Escape cancels an armed order without clearing selection. A guided browser playthrough verified ground movement, arrival and B capture, rising score, enemy approach and automatic combat, paid deployment, shield, selecting reinforcement cards, relay orders and close camera. Training reached step 7 through ordinary gameplay. The instruction action remains visible while its panel scrolls. No simulation rules or dependencies changed.


The Chrome guided playthrough continued to a natural result: player 114, bot 240, four friendly losses, four paid deployments, two shields, 100 credits spent and zero remaining. B and C captures, combat, retreat back to home and continuing scores were observed on screen. REDEPLOY reset scores to zero and began a fresh countdown. Evidence: docs/evidence/movement-playthrough-combat.png and movement-playthrough-result.png. Final strict build and 14 tests passed after the movement changes. The final patch also cancels unfinished targeting when the selected squad is lost or the match ends and announces automatic squad replacement. Remaining limitation: the procedural visuals and squad combat are stylized; these checks are local practice only, not multiplayer or chain integration.


Player control revision, 31 October 2026: the owner explicitly requested mouse look, direct motion and manual firing while soldiers remain automatic. EYE LEVEL now offers TAKE CONTROL, mouse yaw and pitch to approximately 80 degrees up or down, left click or hold to fire a bolt action rifle, right hold to aim, and Escape to release. WASD uses validated direct movement with collision sliding, immediate stop on key release and a short input expiry. Strafe direction is corrected relative to camera right. The close camera no longer jumps above a building when the player stands beside a wall. Automatic squad volleys remain 10 damage per second; a player rifle shot adds 5 damage at most once per second within the existing 8 unit range. Both resolve in the fixed tick combat phase, with shield, cover, EMP, home safety and observation checks. The new rules version is practice-2-rifle. Shots aimed above or beside enemies miss. A ray stops at canonical wall volumes. Targets still use aggregate squad spheres, not individual soldier hitboxes. No ammunition or reload inventory is added. Rifle hits and target health appear in the HUD. No dependencies or external assets were added.

API references checked for this implementation: [MDN Pointer Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_Lock_API), [Three.js camera documentation](https://threejs.org/docs/#PerspectiveCamera). Pointer lock needs a user gesture and may be unavailable in an embedded browser. The implementation handles a rejected request with hover mouse look. No browser permission or operating system security setting was changed.


Untimed survival revision, 31 October 2026. Owner requested removal of the timer, main character death, meaningful damage, obvious enemy health, finite bullets, recoverable guns and WIF, and coordinated enemies. All web modes now create untimed practice games with a fixed main character. Timed regulation remains available only in the underlying legacy simulation mode and tests. The web run ends at 240 points, concession or main character death. NPC death drops a gun, 12 bullets and five simulated practice WIF; collection requires the living main character within two metres and line of sight. Duplicate collection cannot award twice. WIF is a separate local counter with no real value or chain read. Service rifle damage is 20 with six rounds, carbine damage is 12 with ten rounds and faster cadence. R reloads from finite reserve, G loots, X swaps collected types and T retreats. Shared ammo is conserved across switching. Automatic squad volleys remain 10 damage. Player health remains linked to the main character squad entity; individual soldier hitboxes are not implemented.
