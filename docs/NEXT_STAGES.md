# Remaining delivery stages

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

Once the period build and runtime review are verified, implement Gate 3's smallest complete slice: create a private room, join from a second browser session, ready both players, send validated movement commands and render server snapshots. Then add durability and failure cases before starting escrow. This document is a delivery plan; it does not mark these systems implemented.
