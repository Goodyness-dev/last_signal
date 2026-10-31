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
