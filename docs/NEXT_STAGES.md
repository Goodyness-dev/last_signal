# Current delivery update

1 November 2026: Gate 5 public deployment and funded authoritative settlement are now verified. The free gas blocker is resolved. Fourteen public receipts and conservation are recorded in docs/TESTNET_RESULT.md. Next is Gate 6 public hosting access, external client play and remote recovery. Local polish and actual local footage are already delivered. Historical stage instructions follow.

# Gate 5 update

31 October 2026. Testnet configuration and live RPC are verified, dedicated account roles are protected, wallet and funded server integration are implemented and local tests pass. Public deployment is blocked by missing free test ETH. See TESTNET.md for exact evidence and resume commands. No public contract address or transaction hash exists for this revision. The remaining public exit evidence still applies below.

# Remaining delivery stages

31 October 2026 Gate 4 update: local token and escrow are implemented, with 26 contract tests and 31 actual local receipts. See ESCROW.md. Robinhood Chain testnet remains the public target. No public testnet transaction or deployed public game is claimed.

31 October 2026 update: Gate 3 local unfunded multiplayer is implemented and verified with 46 passing tests and two browser clients. See STATUS.md and FACTS.md for the precise evidence. No public multiplayer, wallet authentication, local escrow or chain integration is claimed.

Sequence follows the supplied stage gates. Local practice remains available throughout. No real funds, paid services or mainnet deployments are authorized.

## Gate 3: authoritative private multiplayer

First deliver two local browser sessions playing one unfunded private room. Add a protocol package with bounded schemas and rules/map identifiers. The existing Node service owns room membership, ready countdown, command order, fixed ticks and results. The browser renders authorized snapshots instead of owning combat truth in this mode.

Then add random room/session credentials, origin checks, ownership validation, command size and rate limits, acknowledgments and durable command deduplication. Persist accepted commands and checkpoints in SQLite before acknowledging spending. Use only the player's authorized view for snapshots and event payloads; never send hidden enemy coordinates and hide them with CSS.

Complete heartbeat pause, reconnect grace, forfeit/abort behavior and restart recovery. Unprovable recovery produces an abort, not an invented result. Wallet authentication is added before connecting funded rooms, with one use challenges distinct from settlement signatures.

Exit evidence: two browser sessions finish the same match with consistent results; duplicate spending charges once; spoofed and oversized commands fail; captured payloads omit hidden enemies; reconnect and server restart tests pass. No public multiplayer claim before these tests exist.

## Gate 4: local chain and escrow

Use a local EVM and dedicated disposable development accounts. Implement the original 18 decimal tWIF mock token and a small nonupgradeable escrow using verified current dependencies. Neither is official WIF. Both participants deposit exactly 100 mock tokens. Spending remains capped. Settlement explicitly trusts the server signer; the contract does not verify tactics.

Implement signed offers/results with chain, contract, match, participants, rules, spends, outcome and expiry binding. Add pull claims, one settlement, conservation of deposits, the specified spent pool burn and draw rounding. Include unmatched funding refunds and the hard deadline where settlement stops and full timeout refunds become available. No owner withdrawal of player deposits.

Exit evidence: actual local deployment and transaction receipts for funding, normal settlement, burn, claims and timeout refunds. Tests cover altered signatures, replay across chain/contract/match, duplicate funding/claims, deadline boundaries, abort refunds, failed transfers and accounting conservation. Public testnet waits until these pass.

## Gate 5: public testnet

Recheck official Robinhood Chain documentation and query eth_chainId. Check the free faucet and test RPC before selecting network values. Use dedicated testnet credentials, with deployment wallet and settlement signer separated. Never put either secret in Vite variables, source or screenshots.

Deploy only with available free access. Record actual receipts, addresses, nonempty code and balance reads. Add wallet network checks, bounded approval, funding, claim/refund feedback and clear tWIF identity. Keep wallet reads distinct from simulated practice credits.

Exit evidence: two funded testnet participants complete one authoritative match and settle or recover tokens. A faucet, RPC or credential blocker leaves local chain and practice intact. No fabricated address or transaction hash. Hackathon mock token eligibility remains unconfirmed until organizer evidence is available.

## Gate 6: polish, public operation and handoff

Continue period art and animation refinement against actual gameplay, then inspect desktop and phone views, effects settings, audio, WebGL failure and accessibility. Measure frame rate and memory on an identified device; improve the large renderer bundle and draw calls based on measurements. Record real combat footage, clearly labeled by mode.

For public multiplayer, choose free infrastructure only after checking current limits. A static frontend cannot host the Node authoritative WebSocket service. Require TLS, allowed origins, secret storage, persistent database storage, graceful shutdown and versioned health information. Public hosting needs available deployment access; local work does not.

Exit evidence: verified public frontend and service URLs if deployed, two external clients completing a match, recovery drills, actual chain receipts if connected, asset licenses, acceptance matrix and an honest handoff. No public hosting, security audit or performance claim based only on a build or screenshot.

## Immediate next implementation

Gate 3 local private rooms, server snapshots, durable commands and failure cases are now implemented. Gate 4 local chain and escrow is now implemented and verified. Next is Gate 5: verify official Robinhood Chain testnet configuration and actual eth_chainId, free RPC and faucet access, dedicated credentials and wallet funding integration. Wallet authentication must be added before integrating funded rooms. Public testnet and hosting still need the available free access and credentials described above.

Gate 6 update, 1 November 2026: local polish, actual capture and operation recovery drill delivered. Public operation is blocked on available free hosting with durable storage and deployment access. The owner confirmed no hosting access. Render Free and Koyeb Free do not meet the existing SQLite persistence requirement. No paid fallback selected. See docs/OPERATION.md.

1 November 2026 armory addition: combined salvage, wallet NFT ownership, tWIF shop and player sales are implemented and publicly chain verified. See ARMORY.md and evidence/commerce-current.json. Next owner step is browser wallet play using a dedicated test wallet with free test ETH; only a public address is needed for funding help. Do not provide private keys. Then inspect actual signed browser flows and physical phone controls. Public operation still requires free deployment access, TLS, allowed origins, durable storage and secret storage; two external clients and remote recovery remain outstanding. Original Gate 5 accounting requires archive RPC access to reproduce after historical state pruning, while current receipt and ownership checks pass without it.
