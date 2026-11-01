# Gate 5 actual public testnet result

1 November 2026. State: PUBLIC_TESTNET_SETTLEMENT_VERIFIED. This supersedes the earlier free gas blocker. This does not claim public game hosting or two external human players.

## Free funding and deployment

The BlockVectra faucet accepted the dedicated deployment address using the owner's API key loaded only from the ignored root .env file. The key was never passed as a command argument, printed, included in Vite variables or committed. The official faucet remains unusable in the inspected browser, but this alternative completed a real free claim. No mainnet balance, paid account, purchase, bridge or real ETH transfer was used.

Actual faucet receipt: https://explorer.testnet.chain.robinhood.com/tx/0xd7a41bd39fdccd05bb71e057a0b88397653f249da8b957d12c43494cbdf0f65f . It transferred 0.001 test ETH directly to 0x019BF89f9A51b3FdF447df279bb0a493959295bc. The official RPC returned chain 46630 and balance 0.001 after receipt confirmation.

Actual contracts:

| Contract | Robinhood Chain Testnet address | Deployment transaction |
| --- | --- | --- |
| Original mock tWIF, 18 decimals | 0x510414cA08A84473f8c8FCa77a198eaD4d7cE9d9 | 0xd1bfd14821b36ba7bf9733289ba757d5d0adda7c45c86dd1e5a0cede47daf99d |
| MatchEscrow | 0xB5ABb40Ea1746372adb08d7F644Eb2B76774a692 | 0xca5b3f74a595eda1c9b166e809d0b0664172ce850b050425db1b3c1f80823e9c |

Both deployments have successful receipts and nonempty code. Code hashes match the public manifest, and reads verify the immutable token and separate settlement signer. The compiler is 0.8.38+commit.1835d247.Emscripten.clang. Existing dependency pins were retained. Explorer source verification and independent contract auditing are not claimed.

## Actual funded match

Two distinct disposable participant wallets received free test gas from the deployer. Each requested exactly 100 original mock tWIF, approved exactly 100 and deposited exactly 100. Both authenticated with the local authoritative service and connected through its actual WebSocket transport. The service verified funding before accepting READY and active commands.

The server accepted shield orders, movement and one deployment. Participant A spent 30 mock tokens and participant B spent 10. After live server ticks, participant B conceded. Both clients received the same terminal result, and the persisted server signer authorization settled the escrow. This is an automated conceded match, not a full natural relay victory or an external client playthrough.

Settlement receipt: https://explorer.testnet.chain.robinhood.com/tx/0x807c607425af4fa1c22d8ab7501c39dbd9d79e85cfceb9e3e05030252439ca61 .

The decoded token Transfer logs and fresh contract reads prove:

| Accounting | Mock tWIF |
| --- | --- |
| Total minted | 200 |
| Deposited | 200, exactly 100 from each participant |
| Server spend pool | 40 |
| Burned during settlement | 4 |
| Participant A claimed | 106 |
| Participant B claimed | 90 |
| Remaining token supply | 196 |
| Remaining escrow tokens, liabilities and participant claims | 0 |

Thus claims plus burn equal deposits: 106 + 90 + 4 = 200. The token is our original 18 decimal mock tWIF, not official WIF. Practice WIF remains a separate simulated counter. The escrow explicitly trusts the server signer and does not prove tactics onchain.

## Exit evidence and commands

Fourteen distinct successful public testnet receipts were independently reread from the official RPC: one free faucet transfer, two contract deployments and eleven participant funding, approval, deposit, settlement and claim operations. Every receipt matched its canonical block hash and had at least two L2 confirmations. These are soft confirmations, not Ethereum finality.

Public evidence files: docs/evidence/testnet-faucet.json, testnet-deployment.json, testnet-match.json and testnet-verified.json. The last file includes decoded transfer logs, actual balance reads, accounting assertions, code sizes and receipt confirmation counts. No API key, private key, wallet login signature or settlement signature is in these reports. apps/web/public/testnet-deployment.json contains public contract metadata only.

Actual commands used from last_signal:

```powershell
node --env-file=.env --import tsx packages/contracts/scripts/testnet-faucet.ts
npm run testnet:deploy
# Restart npm run server after deployment so it loads the verified manifest.
npm run testnet:match
npx tsx packages/contracts/scripts/testnet-verify.ts
npm run build
node --env-file=.env --import tsx packages/contracts/scripts/check-secrets.ts
```

The faucet helper journals an accepted transaction before waiting. Later runs inspect that existing claim instead of making another request. Provider limits still apply. The verification helper performs reads only. Do not rerun the match proof expecting a fresh game; its journal resumes the recorded proof. The API key is needed for the free faucet only; chain reads and the authoritative service use the configured official RPC.

Gate 5's required deployment and funded authoritative settlement evidence is now present. Public browser wallet signing and claiming through an injected wallet, public timeout recovery, actual public hosting, external client matches, hosted restart drills and a security audit remain unverified. Timeout refunds and adverse cases retain their existing local EVM tests and Gate 4 receipt evidence. Hackathon mock token eligibility remains UNCONFIRMED until organizer evidence is supplied. Gate 6 remains in progress because hosting access is missing.
