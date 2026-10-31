# Status

31 October 2026. Local practice slice.

Current presentation supersedes the initial screenshots below. The owner requested close action. The default view is now eye level, with a visible procedural weapon, WASD squad movement, drag to look, squad follow and command camera modes, direct relay orders, a visibility filtered minimap and a full screen world. Art remains stylized procedural geometry. It is not photorealistic.

New feedback includes articulated running and crouching, aiming, muzzle flashes, recoil, visible volleys, casings, impact debris, dust, splashes, smoke and casualty falls. Audio includes original synthesized rain, gunshots, footfall and radio style command tones. Quick combat drill provides immediate opposing squads with both sides paying 40 credits for reinforcements. It is explicitly LOCAL_PRACTICE.

Revision validation: strict build passes and 14 simulation tests pass, including legal drill positions, equal paid reserves and actual opening damage. Browser review verified WASD movement, drag look, all camera modes, relay orders, real close combat, shield expenditure, 390 by 844 phone layout and the 500 by 626 compact app viewport. Browser error log was empty. See the revision section in PROOF.md and new close combat screenshots. Manual aiming, individual soldier simulation and photorealistic assets remain outside this change.

| Gate | State | Evidence |
| --- | --- | --- |
| 0 Inspect and initialize | PASS | Separate npm workspace, strict TypeScript, pinned dependencies, production build, web HTTP 200, service health response importing shared rules |
| 1 Visual proof | PASS | Original 3D compound, rain, lighting, three relays, selectable moving squad, HUD. docs/evidence/desktop-1440.jpg and live-practice-1440.jpg |
| 2 Local full match | PASS | Core simulation and normal bot, 13 passing tests, natural browser threshold result, reserve ledger and rematch reset verified. Scripted tutorial first capture and northern flank observed. Remaining polish listed below |
| 3 Authoritative multiplayer | NOT_STARTED | Health service only. No rooms or WebSocket transport |
| 4 Local escrow | NOT_STARTED | No contracts or local chain |
| 5 Public testnet | NOT_STARTED | No credentials, RPC calls, faucets, token deployments or receipts used |
| 6 Polish and deployment | IN_PROGRESS | Desktop and phone layout review underway. No public hosting or live combat video |

Implemented: map navigation, quantized fixed tick movement, cover arcs, simultaneous automatic volleys, suppression, protected homes, capture and scoring, threshold victory, regulation and overtime, finite credits, paid spawn preparation, shields, EMP, retreat, surrender, result UI, rematch, guided steps, authorized bot observations, keyboard and touch input paths, tactical overlay, optional command tones, effects controls, local result persistence and spend ledger.

Validated: npm install reported zero vulnerabilities; npm run build passes; npm test passes 13 scenarios. Two deterministic bot runs both completed at tick 3600 with scores 172 to 185 and spending 80 each. Local browser checks accepted movement, deployment, shield and EMP. Observed reserve 100 to 80 to 70 to 55 with a matching 45 credit ledger. Actual browser combat removed a squad without refund.

Known limits: procedural placeholder art, no human balance evidence, only basic audio, no recent results UI, no stale enemy markers, no persistent replay or state hashes, no multiplayer or chain trust boundary. Bot EMP policy, complete canonical event vocabulary and camera pan are pending. Phone layout is reviewed via viewport emulation, not a physical touch device. Hardware and frame rate profiling pending.

External facts: hackathon deadline and mock token eligibility remain unconfirmed. No external blocker prevents the next local engineering step.

Next: authoritative private multiplayer with room sessions, command journal, visibility filtered payloads and reconnect recovery. Local contracts follow only after that stage has evidence. Keep this practice slice usable throughout.
