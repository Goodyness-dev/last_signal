# Gate 4: local escrow

31 October 2026. LOCAL_EVM_ONLY. The intended public target is Robinhood Chain testnet. No public RPC, faucet, transaction or deployment was used for this gate. LAST SIGNAL Test WIF, symbol tWIF, is an original 18 decimal mock token. It is not official WIF, is not redeemable and has no monetary value. The practice WIF score counter is separate and is never used as a chain balance.

## Contracts and trust

Source is in packages/contracts/src. TestWIF uses OpenZeppelin ERC20Burnable, with a 100 tWIF faucet per calling address and a one hour cooldown. This is convenience rate limiting, not Sybil resistance. There is no owner mint function. burn reduces totalSupply.

MatchEscrow is nonupgradeable. Token and server settlement signer are immutable constructor parameters. There is no owner, signer replacement, admin withdrawal, rescue or upgrade function. Unsolicited token transfers are surplus, not rewards or player liabilities, and remain in the contract. They are not recoverable by an administrator.

The server signer decides winner and spending within the deposited caps. The contract verifies authorized accounting, not combat, replay truth or tactical correctness. A dishonest signer can authorize a dishonest result before timeout. These tests do not establish audited security. The local proof uses a distinct random signer held only in process memory; it does not store or commit a key or signature. The live private game service remains unfunded. Wallet authentication and browser funding controls are not connected by this gate.

## Signed data

EIP712 domain: name LAST SIGNAL MatchEscrow, version 1, actual chain ID and verifying contract address.

Offer fields: matchId, playerA, playerB, rulesHash, deposit, createdAt, fundingExpiry and nonce. Participant A must be the lower numeric address, ensuring a canonical order. Both are distinct and nonzero. Only a named participant may deposit their own allocation. Deposit is exactly 100 * 10^18 units. A changed offer cannot replace an already funded match ID. Funding checks the exact token balance delta and rejects duplicate deposits and nonstandard transfer behavior.

Result fields: matchId, playerA, playerB, rulesHash, spendA, spendB, outcome, terminalTick, resultHash, nonce and expiry. The nonce must match the signed offer. Each spend is capped at 100 * 10^18. Outcomes are 0 A_WIN, 1 B_WIN, 2 DRAW and 3 ABORT. Either participant can submit a valid result. Once settlement or refund finalizes a match, it cannot finalize again.

Compiler generated ABI files are in packages/contracts/abi/TestWIF.json and MatchEscrow.json. Main functions are fundMatch(Offer,bytes), settle(Result,bytes), refundExpired(bytes32), claim(), matches(bytes32), claimable(address), liabilities(), offerDigest(Offer) and resultDigest(Result). The source and generated ABI define the precise tuple order.

## Accounting

The two deposits total 200 tWIF. For a normal result, unusedA = 100 minus spendA, unusedB = 100 minus spendB. Burn floor((spendA + spendB) / 10) in base units. The winner receives their unused allocation plus the distributable spent pool. A draw splits the distributable pool, with an odd base unit going to canonical participant A. ABORT requires both signed spends zero and refunds 100 each with no burn.

Credits are pull claims. Credits are cleared before the guarded transfer and restored by transaction rollback if the transfer fails. lockedLiability plus claimLiability tracks all deposits still owed. Burning must reduce both contract token balance and totalSupply by the exact amount. Multi match tests exercise combined pull credits without taking funds from another match.

## Deadlines

Funding expiry is exactly createdAt plus ten minutes. Funding is legal strictly before expiry. Partially funded offers can refund at or after funding expiry. There is no early cancellation of an already deposited allocation. Cancelling approval before funding moves no tokens.

The hard refund deadline is second funding block timestamp plus twenty minutes. A result must authorize expiry no later than this deadline. Settlement is legal strictly before both the signed expiry and the hard deadline. At or after the hard deadline, settlement reverts and either participant can finalize full refunds for both. There is no overlap between settlement and timeout refund windows. Refund finalization only creates pull credits; each player then calls claim.

## Actual evidence

The machine readable proof is docs/evidence/local-chain-receipts.json. It records 31 successful local transactions, actual transaction hashes, blocks, logs, public addresses, compiler version, code hashes and balance reads. It contains no private keys, mnemonics, signed raw transactions or EIP712 signatures.

The proof deployed both production contracts to a disposable Hardhat EVM on chain 31337. An authored terminal fixture uses normal game commands: A captures north, B stays at home, and accepted actions spend 45 and 60 simulated credits. The simulation reaches an actual A victory. Those spends and its terminal hash are signed and settled on the local EVM. The contract does not itself verify that fixture. Actual chain reads confirmed 10.5 tWIF burned, credits and claims of 149.5 and 40, and conservation of the 200 deposited tokens.

Subsequent actual transactions prove full timeout refunds at the exact hard deadline, an unmatched funding refund at expiry, and a signed infrastructure abort with no burn. All 31 receipts were queried again from RPC and had status 1. Runtime bytecode matched the recorded code hashes. Final escrow balance and liability were both zero. Local EVM time was explicitly advanced for cooldown and deadline scenarios. These receipts are not Robinhood Chain receipts.

## Run and verify

From the repository directory:

```powershell
node scripts/start-chain.cjs
npm run chain:compile
npm run chain:test
npm run chain:proof
npm run build
npm test
```

The hidden node helper binds only http://127.0.0.1:8545, suppresses development key output and records its process ID in ignored .runtime/chain.pid. It generates fresh disposable accounts at every startup. The proof refuses a nonloopback URL or a chain ID other than 31337. chain:proof deploys fresh contracts and overwrites the latest proof report. Restarting the disposable EVM loses its chain state, so rerun the proof afterward. The test runner starts a separate disposable EVM on port 18545 and shuts it down afterward. Never expose either unlocked development node publicly.

Validation: all 26 EVM tests pass, all 46 existing game/server tests pass, and strict TypeScript and the production build pass. Coverage includes changed signatures, signer and domain replay, replay into another funded match or escrow, duplicate deposits and claims, base unit draw and burn rounding, zero and maximum spends, excess spends, deadline boundaries, unmatched and full timeout refunds, signed aborts, revoked approvals, nonstandard tokens, failed claims, fake burn, reentrancy and combined liabilities.

## Dependencies and current limits

Pinned and actually used: Solidity solc 0.8.38+commit.1835d247.Emscripten.clang, OpenZeppelin Contracts 5.6.1, ethers 6.17.0 and Hardhat 3.21.2. Compiler target is Cancun with optimizer 200 runs. Compilation uses the installed solc package rather than downloading an implicit compiler. Compiled bytecode is generated under ignored packages/contracts/artifacts; public ABI is committed.

Official references inspected: https://hardhat.org/docs/reference/configuration , https://hardhat.org/docs/guides/hardhat-node , https://docs.soliditylang.org/en/latest/installing-solidity.html , https://docs.openzeppelin.com/contracts/5.x/api/token/erc20 , https://docs.openzeppelin.com/contracts/5.x/api/utils/cryptography and https://docs.ethers.org/v6/api/providers/jsonrpc/ .

npm audit --omit=dev reported zero vulnerabilities. The full dependency audit reports five high severity package entries in local development tooling, tracing to Zod GHSA-mrhx-c7xc-m3w5 and tmp GHSA-7c78-jf6q-g5cm. The scripts accept only authored compiler sources and loopback EVM traffic. No compatibility breaking dependency rewrite or clean audit claim is made. These tools are not imported by the web client or private match service. Review upstream fixes before public operation. Advisory references: https://github.com/advisories/GHSA-mrhx-c7xc-m3w5 and https://github.com/advisories/GHSA-7c78-jf6q-g5cm .

Gate 5 remains separate: verify official Robinhood Chain testnet settings and eth_chainId, obtain available free RPC and faucet access, add dedicated testnet credentials, wallet authentication and funding verification, then deploy and record actual testnet receipts. No existing local address should be presented as a testnet deployment.
