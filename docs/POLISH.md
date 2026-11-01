# Gate 6 local polish evidence

1 November 2026. LOCAL_POLISH_VERIFIED, PUBLIC_OPERATION_BLOCKED_ACCESS. Gate 6 is not complete.

## Actual gameplay and presentation

Inspected the original period battlefield during a live local combat drill and Endless Front. Timber framing, sandbags, duckboards, radio equipment, period inspired uniforms, wooden rifles and articulated figures remain procedural source assets. Static scenery now uses material and shape batches while preserving world transforms, including scaled crates and rotated roof framing. The view weapon now adds a small sleeve and bolt hand reload motion, with the existing wooden rifle and bolt geometry. No navigation, damage or token rules changed.

Reduced motion now suppresses idle soldier bob, floating loot motion and muzzle flashes. Disabling effects also suppresses soldier muzzle flashes, in addition to rain and particles. This fixes visual paths that previously ignored those settings. Audio mute now persists alongside effects and motion. The synthesized sound implementation remains original. Checkbox state and persistence were checked in the browser; no subjective audio mix or loudness certification is claimed.

Actual desktop review used 1280 by 800. Phone layout review used a verified 390 by 844 browser viewport with document width 390. This is responsive emulation on the identified Windows device, not a physical phone or mobile Safari test. The phone combat panel has nonoverlapping movement and action rows; visible movement and combat buttons measured at least 44 pixels high. Touch movement controls and hold to fire are implemented. Touch hardware, simultaneous multitouch and mobile audio still need a real device playthrough. Enemy labels can overlap other world labels during crowded combat; further art and HUD refinement remains useful.

Evidence: evidence/gate6-desktop.png, evidence/gate6-phone.png and evidence/gate6-phone-layout.json. evidence/gate6-phone-onboarding.png also records the corrected command deck above the footer. Narrow layout fixes were made after the desktop screenshot, so the phone screenshot shows the later control arrangement.

## Measured rendering and memory

Identified device: owner's Dell Windows laptop, Intel Core i7 6600U at 2.60 GHz, Intel HD Graphics 520, 16 GiB physical RAM. Browser: in app Chromium 156, ANGLE D3D11 on the Intel GPU. Two visible 15 second actual combat drill samples used a 480 by 636 viewport, a 600 by 795 render buffer, effects on and reduced motion off.

| Metric | Before batching | After batching |
| --- | --- | --- |
| Visible frame cadence | 51.16 FPS | 39.56 FPS |
| 95th percentile frame interval | 33.30 ms | 33.60 ms |
| Mean reported draw calls | 705.76 | 438.07 |
| Renderer geometry count at sample end | 1,309 | 740 |
| Texture count | 7 | 7 |
| Approximate used JavaScript heap | 47,318,900 bytes | 54,395,614 bytes |

Raw data is in evidence/gate6-baseline.json and evidence/gate6-batched.json. These are samples from different live combat moments on a multitasking laptop, not a controlled benchmark. Background verification also caused test timeouts in this session. Draw calls fell about 38 percent and geometry count about 43 percent in these samples. FPS did not improve and sampled heap was higher. No FPS gain, memory reduction, leak freedom, GPU timing, total browser memory or performance on other devices is claimed. More repeatable profiling and spatial culling work remains appropriate before a performance release claim.

PERFORMANCE & CAPTURE lets the owner repeat measurements during visible gameplay and save the actual JSON. Nothing is uploaded. The browser memory field may be unavailable elsewhere; it is not substituted with an invented number.

## Bundle work

The previous combined renderer and scenery chunk was 594.09 kB. The measured new production output separates two renderer chunks at 211.46 and 352.59 kB and procedural scene code at 33.90 kB. Their compressed sizes were 56.58, 84.48 and 12.32 kB respectively. This separates engine caching from scene changes and puts each emitted chunk below the default 500 kB warning threshold. It does not reduce the total engine transfer or prove a faster load. No warning limit was raised. Exact final JavaScript asset byte and gzip counts are retained in evidence/gate6-bundle.json. A small startup module displays a loading state, imports the selected game entry and provides retry and token recovery links if startup fails.

Vite 8.3.5 and Rolldown's supported output.codeSplitting configuration were used. Official references: https://vite.dev/guide/build and https://rolldown.rs/reference/OutputOptions.codeSplitting . Instanced scenery follows https://threejs.org/docs/pages/InstancedMesh.html . Existing pinned dependencies were retained.

## Actual footage

evidence/gate6-local-combat.webm is an approximately 20 second, 960 by 540 silent recording from the actual WebGL canvas, with a mode and time label composited during capture. The first moment is practice standby; the label changes to LOCAL PRACTICE COMBAT DRILL when that mode begins. It contains actual movement, automatic squad fire, visible tracer and rifle activity, and fallen soldiers. One manual rifle shot was issued through the visible FIRE RIFLE control during recording. It is not a replay, offline render, multiplayer video or blockchain proof. The later reload interaction happened after capture ended and is not claimed as part of the clip.

The saved 1,451,595 byte WebM was reopened in the browser, decoded at 960 by 540 and played beyond 17 seconds without a video error. evidence/gate6-video-playback.png shows the decoded combat frame. evidence/combat-review.html provides a local review wrapper. No desktop, microphone, wallet or other application content was recorded.

## Failure and recovery checks

TEST GRAPHICS RECOVERY uses the renderer's actual WebGL context loss extension. The browser displayed the Graphics paused alert, local simulation stopped rendering and advancing, and RESTORE GRAPHICS restored the renderer and cleared the alert. evidence/gate6-webgl-loss.png records the failure state. Initial WebGL creation failure has a source implemented startup fallback; an unavailable hardware driver was not physically reproduced. The fallback was also encountered and recovered during transient development module reload, which is not proof of hardware failure.

Keyboard focus outlines are visible; settings use native labeled checkboxes and dialogs; health, ammunition and enemy damage have text as well as color; status notices remain live regions. This is a focused accessibility review, not a WCAG conformance audit, screen reader gameplay test or complete keyboard only aim solution.

The actual loopback operation drill used two network WebSocket clients, ran server countdown, spent 20 credits, closed the service, reloaded its SQLite database, reconnected both original seats, replayed the paid command without another spend and completed a conceded match with one shared result. Both clients received close code 1001. Evidence: evidence/gate6-operation.json. This drill calls application shutdown; it does not claim a real remote host SIGTERM or power loss drill. Both clients ran on this computer and are not external clients.

## Verification and acceptance

The strict TypeScript and production build passed after the UI changes. All 50 existing and initial operation tests passed in a serial worker run; a subsequent targeted run passed all three operation tests after adding the secret file case, giving 51 distinct game/server/operation tests verified. Two funded local EVM integration tests also passed with the new shutdown and signer adapter. The unchanged 26 escrow tests retain the preceding Gate 5 pass; they were not rerun for this polish revision. One earlier parallel game test run had 49 passes and a full relay timeout; it is superseded by the serial pass, not concealed.

| Exit item | Actual state |
| --- | --- |
| Period art and animation review against gameplay | Local review done, procedural prototype fidelity, further refinement remains |
| Desktop and phone views | Desktop and verified phone viewport done, physical phone pending |
| Effects, motion, audio and accessibility | Controls, persistence and focused review done, subjective audio and assistive device playthrough pending |
| Frame rate, draw calls and memory | Actual device samples recorded, no general performance improvement claim |
| Renderer bundle | Caching and loading separated, production build and browser inspection, no total transfer reduction claim |
| Real combat footage | Actual labeled local practice clip saved and played |
| Public frontend and TLS WebSocket service | Blocked, no hosting access or suitable existing free SQLite host |
| Durable storage and server recovery | Source configuration and actual local network restart drill, public disk and restart unverified |
| Hosted secret storage | Mounted file adapter tested locally, platform integration pending |
| Two external clients finishing a match | Pending public access, no substitute claim from loopback clients |
| Actual chain receipts | Gate 4 local evidence retained; Gate 5 public settlement evidence obtained later on 1 November, see TESTNET_RESULT.md |
| Asset licenses and handoff | Asset register updated, OFL notices included in distributable, OPERATION.md provided |

Public hosting, public load testing, security audit, physical phone testing remain absent. Gate 5 public settlement receipts were obtained after this polish review; see TESTNET_RESULT.md. See OPERATION.md for exact launch commands, provider limits, deployment requirements and recovery procedure.
