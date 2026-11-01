# Gate 5: Robinhood Chain testnet integration

31 October 2026. State: IMPLEMENTED_LOCALLY, PUBLIC_DEPLOYMENT_BLOCKED_FREE_GAS. This is not a completed public testnet match. No public contract address or transaction receipt is claimed.

## Verified network

The official connecting and wallet documentation list Robinhood Chain Testnet as chain 46630, RPC https://rpc.testnet.chain.robinhood.com and explorer https://explorer.testnet.chain.robinhood.com. Actual eth_chainId returned 0xb626 over HTTP 200. eth_blockNumber and the latest block read also succeeded. See evidence/testnet-preflight.json for the actual checked head and balances.

Sources checked: https://docs.robinhood.com/chain/connecting/ , https://docs.robinhood.com/chain/add-network-to-wallet/ , https://docs.robinhood.com/chain/transaction-finality/ , https://docs.robinhood.com/chain/differences-from-ethereum/ and https://docs.robinhood.com/chain/deploy-smart-contracts/ . Only testnet values were selected. Mainnet chain 4663 is rejected by the deployment, proof and wallet flows.

This valueless demo requires two canonical L2 blocks for funding verification. This is a soft confirmation policy, not Ethereum finality. The official finality document distinguishes sequencer confirmation, Ethereum posting and Ethereum finality. Funding block hashes and receipts are rechecked; a reorganization aborts the match and prevents an unprovable settlement authorization. RPC loss pauses funded play. Timeouts use contract timestamps, not L2 block.number or the browser clock.

## Current free access blocker

Four distinct dedicated wallets were generated: deployment, settlement signing and two participants. They are new test wallets with zero test ETH. The settlement signer is separate from the deployment wallet and does not need gas to sign results.

Deployment funding address on Robinhood Chain Testnet only:

`0x019BF89f9A51b3FdF447df279bb0a493959295bc`

The official faucet at https://faucet.testnet.chain.robinhood.com opens in the available browser, but its request form is blank. No faucet request was submitted. Alchemy's official faucet documentation requires 0.001 ETH and transaction history on Ethereum mainnet, so these fresh wallets do not qualify. The live QuickNode faucet FAQ also states a mainnet balance requirement; cached search text claiming no requirement conflicted with that live page. No restriction was bypassed and no paid funding, subscription or mainnet transaction was attempted. The owner confirmed that they have neither existing free test ETH nor faucet access available yet.

Reference links: https://www.alchemy.com/docs/faucets and https://faucet.quicknode.com/robinhood/url .

The actual deployment precheck read deployer balance zero and stopped without sending a transaction. Its first token deployment estimate including margin was 0.000014848416 test ETH; this was an estimate, not the total funding required for both contracts and the two participant gas allocations. There is no testnet token or escrow deployment manifest. The match proof command refuses to run without one. No public transaction hash was invented. Local practice, private unfunded rooms and Gate 4 remain available.

## Implemented flow

The wallet panel is http://127.0.0.1:5174/testnet.html. It checks the wallet chain before actions, offers only the configured testnet switch/add request, and invalidates authentication on account or network changes. The funded private game also checks the current wallet binding before opening its room. Wallet rejection and transaction replacement errors are shown without blindly retrying spending writes.

Wallet login uses an expiring one use challenge containing domain, origin, address, chain ID, nonce, expiry and a readable login purpose. The server verifies the personal message signature, consumes the challenge atomically and issues a short lived session stored as a hash in SQLite. Login and EIP712 settlement signatures have separate purposes. Funded room access derives participant ownership from the authenticated wallet, not from a client supplied side or an unfunded reconnect token.

A challenge names two distinct canonical participants and carries the immutable testnet contract identity, rules hash and ten minute funding expiry. The server persists its signed offer before returning it. Each participant requests the original mock tWIF from its capped faucet, approves exactly 100 and funds exactly 100. Nonzero stale allowances are reset before the bounded approval. Wallet balances come from RPC reads; there is no simulated replacement for a failed read. tWIF remains clearly labeled as the original 18 decimal mock, not official WIF, and is separate from practice WIF scores or server battle allocations.

The server verifies code hashes, token decimals, token address and authorized signer. It checks receipt status, contract address, event match ID, participant and exact amount, canonical block hash, confirmations and onchain match fields. A client transaction hash is only a hint to independently verified evidence. Funding can also be reconstructed from indexed logs. Both confirmed deposits are required before READY and active command processing. Waiting for deposits does not consume the connection grace period. Chain deadline expiry stops play and enables recovery.

Only a durable finished or aborted authoritative match may obtain a result authorization. Spends are taken from the server ledger and capped. One canonical payload and signature are persisted under a unique chain/contract/match identity before clients receive them. Either participant can submit. Settlement, refund finalization and claiming are separate chain actions with pending and confirmed feedback.

The panel saves public offer and deployment recovery metadata locally. If the game server is unavailable, the wallet RPC can still inspect contract deadlines, finalize an expired refund and claim credit. New funding and server settlement remain disabled without authentication and verified deployment. Wallet reads remain unavailable when RPC reads fail. Browser recovery metadata still needs to be retained by the user; this is not a custody or backup service.

## Credential isolation

Dedicated keys are generated and held in separate Windows user encrypted role files under ignored .runtime/testnet. The game service loads only settlement.dpapi. A legacy encrypted backup is retained for safe migration; no key was rotated. The deployment and signer roles are distinct. No key or seed is in an environment file, Vite variable, source, screenshot or committed evidence. The key checker decrypted only inside the local process and verified that none of these key values occur in the browser build. A direct dev server request for the encrypted credential file returned HTTP 403. Vite denies the runtime directory and key files.

The current Windows key adapter uses PowerShell 7 and DPAPI. It cannot be transferred to a different user or a Linux host as a production secret provider. A future hosted service needs a dedicated secret store adapter. If signer loading or deployment verification fails, funded mode is disabled while local practice remains available. Lost signer access cannot remove the contract's timeout refunds.

## Commands and resuming

Start the game and service as usual:

```powershell
npm run server
npm run dev -w @last-signal/web -- --port 5174 --strictPort
```

Inspect or prepare dedicated accounts and perform only public read checks:

```powershell
npm run testnet:prepare
```

After legitimate free test ETH becomes available at the deployment address:

```powershell
npm run testnet:deploy
```

The deploy script verifies chain 46630, estimates gas, journals each submitted hash before waiting, confirms receipts, checks nonempty code and identities, and writes a public deployment report only after success. It resumes existing deployment hashes rather than blindly deploying duplicates. No signature or private key is written to the public report. Restart the game service after a successful deployment so it can load the verified manifest and dedicated signer.

Then run the live chain plus local authoritative server proof:

```powershell
npm run testnet:match
```

That script uses the two dedicated participant accounts, allocates only free test gas from the dedicated deployer, requests mock tWIF, authenticates, deposits, plays through the actual WebSocket server and completes a conceded match. It requests the persisted canonical result, settles or uses timeout recovery, claims and records actual RPC balances and confirmed receipts. It is not a full natural victory demonstration or publicly hosted multiplayer proof. Submitted hashes are journaled before waiting. Its successful report is written only after actual transactions complete. It has not completed against the public testnet in this revision.

## Actual verification and remaining work

48 game/server/authentication tests pass. 26 escrow tests pass. Two new integration tests pass using a separate disposable local EVM: two wallet authenticated clients connect through the actual WebSocket transport, prove their deposits, complete a server controlled match, receive one canonical result and claim the correct balances. A reorganization test removes the funding blocks and verifies abort without a result signature. An RPC outage disables funding readiness. The strict production build passes.

The browser wallet panel was inspected at its actual desktop viewport. With no injected wallet, it gives a clear message and retains unavailable balances. It displays NOT_DEPLOYED and disables spending without public contracts. No runtime browser errors were recorded. A phone viewport override did not take effect, so phone wallet review is not claimed. No real injected wallet signing, public funding or live browser claim has been verified. See evidence/testnet-wallet-blocked.png.

Remaining Gate 5 exit evidence is the actual public deployment and two funded testnet participants finishing an authoritative match and settling or recovering. Free test ETH access is currently missing. Hackathon mock token eligibility remains UNCONFIRMED until organizer evidence is provided. No paid access or mainnet fallback is authorized. Gate 6 public hosting is separate.
