# Field armory and salvage

Delivered 1 November 2026. In game collectibles and wallet owned testnet NFTs now share an action loop. This uses original 18 decimal mock tWIF on Robinhood Chain Testnet 46630. Neither the token nor the NFTs are official WIF. They have no monetary value. Free test ETH is still required for network gas.

## Play

Start both processes from the repository in separate terminals:

```powershell
npm run server
npm run dev -w @last-signal/web -- --port 5174 --strictPort
```

Open http://127.0.0.1:5174/armory.html in a browser with an injected EVM wallet. Connect, approve the network and sign the readable login challenge. Use a dedicated test wallet. Never paste private keys into the game or chat. Claim 100 mock tWIF from the token faucet, available once per hour, after obtaining free test gas. Buy a service rifle for 20 tWIF or field carbine for 30. Equip an owned NFT to enter salvage.

WASD moves. Mouse look or right drag aims. Hold left click to shoot, R reloads and G takes a nearby enemy gun drop. Helpers shoot automatically. Health regenerates after a safe interval. Waves repeat without a timer. Use END & BANK LOOT to close a run and claim up to three collected guns as NFTs. Death preserves guns already collected. A kill alone does not grant a collectible: move to the drop and pick it up. Loot creates a new collectible, never takes another player's wallet asset.

The armory offers 40 spare bullets for five tWIF, a shield for five and a replacement helper for ten. These purchases pause combat. Resume when ready. Purchases belong to the named run and cannot be refunded after it ends. A confirmed payment that failed to apply can be retried using its saved receipt while the run remains eligible. The server applies each receipt once. Movement, aiming, firing and reloads never require wallet transactions.

List a gun for a chosen price up to 1,000 tWIF. A buyer pays the seller directly; there is no platform fee or royalty. Listings can be cancelled and transfers invalidate them. A listing does not guarantee a buyer. Quartermaster guns and supplies burn their exact token cost. Wallet NFT ownership is checked when entering and during a run. Finish before selling the equipped gun.

The public locker lookup works without a wallet. Try proof buyer `0xD61053d633e39CdcEfFe41A3bfEf6a621B5D70D3` to inspect recovered Service Rifle #2 and its original onchain image. This does not sign in or grant control of that wallet. The in app browser has no injected wallet; it displays an explanation and keeps writes disabled. Free practice at / remains available without any wallet and cannot create token balances or NFT rewards.

## Actual public evidence

Armory contract: [0x4d9d75e997A7dB3C00bc9abae43Fbec20cb0B3df](https://explorer.testnet.chain.robinhood.com/address/0x4d9d75e997A7dB3C00bc9abae43Fbec20cb0B3df).

An automated client played actual server controlled combat through the local Vite HTTP and WebSocket proxy, bought a carbine and ammunition, moved to an enemy drop, picked it up, banked the run, minted Service Rifle #2 and sold it to a second dedicated test wallet for eight tWIF. Kill and loot state were not injected. This is local service gameplay with public chain settlement, not publicly hosted gameplay or two external human players.

* [Deployment receipt](https://explorer.testnet.chain.robinhood.com/tx/0x66258cdfdb147bd1735b7cb068b2aa383acc952c071bfbb9599e0cb441cccd7f).
* [Recovered gun mint](https://explorer.testnet.chain.robinhood.com/tx/0x3b734dfc0bdae3e392f0589d3688f3a7f4953d2bb8e1b42eeb26847805489edf).
* [Eight tWIF player sale](https://explorer.testnet.chain.robinhood.com/tx/0x3efb0f4be310ba6405c7aaa8ae5ef7c4a4027b24023a4576b8c2db47ee886982).

Evidence: armory-deployment.json, armory-proof.json and armory-verified.json under docs/evidence. Eleven receipts cover deployment and this proof. Supply receipt replay did not add ammunition twice. The shop and supply purchases burned 35 tWIF; the sale transferred eight to the seller. Proof end balances were 79 and 82, supply 161. The separate earlier escrow proof burned four from 200 deposited and returned 196. Its balances are historical, not current wallet balances after commerce.

The fresh commerce-current.json check independently reread all 25 receipts across both proofs, checked canonical block hashes and all three deployed code hashes, decoded the salvage mint and sale, and read current ownership, balances, supply and zero escrow liability. The official RPC now reports historical state unavailable at the original proof blocks. The original block anchored accounting reports are preserved; rerunning armory:verify or testnet-verify requires archive access and currently fails honestly. Use the receipt and current state check below without archive access.

```powershell
npm run armory:test
npm run chain:test
npm run testnet:test
npm test -- --maxWorkers=1 --testTimeout=20000
npm run build
node --import tsx packages/contracts/scripts/commerce-recheck.ts
node --env-file=.env --import tsx packages/contracts/scripts/check-secrets.ts
```

## Acceptance and limits

89 distinct tests pass: 53 application tests, six NFT contract cases, two salvage integration scenarios, 26 escrow cases and two funded integration scenarios. Two application cases first exceeded the default five second timeout; all 53 passed on a serial rerun with a twenty second limit. Strict TypeScript, production build and dedicated wallet/provider secret scan pass. The armory entry is 37.35 kB before gzip at the measured build; the renderer remains separately loaded. This is a bundle measurement, not a new FPS claim.

Contract coverage includes altered claim fields, wrong chain or contract, recipient binding, duplicates, expiry, atomic batch limits, exact burns, expected sale prices, transfer invalidation, failed payment and failed NFT delivery. Server coverage includes actual combat pickup provenance, authenticated access, public reads, pagination, restart recovery, single use supply receipts, RPC failure, orphaned payment invalidation and corrupt checkpoints.

Desktop and 390 by 844 viewport reviews inspected the public locker, original onchain NFT image, disabled writes without a wallet and missing wallet feedback. Phone review found no page overflow and visible buttons were at least 44 pixels high. Evidence: armory-nft-desktop.png, armory-nft-phone.png and armory-phone.png. Physical phone input and browser wallet signature or transaction prompts remain unverified. Actual chain writes were exercised by the dedicated SDK proof. No live wallet balance was simulated for screenshots.

The nonupgradeable contract trusts the gameplay signer. It does not verify combat. Claims bind chain, contract, run, unique drop, recipient, gun kind, rules and expiry, and each source mints once. No owner withdrawal exists. The existing 100 tWIF multiplayer escrow is unchanged. The salvage service is a separate solo mode against bots, with SQLite checkpoints and authentication. It checks ownership every four seconds and refuses stale state after eight. RPC failure pauses action; detected orphaned supply payments stop new claims. A previously issued unexpired claim or already minted NFT cannot be revoked after a later reorganization. Two canonical L2 confirmations are not Ethereum finality.

Only two fixed gun archetypes exist. Art remains procedural prototype geometry and original SVG, with no random rarity or profit promise. The salvage page currently has no audio or full effects settings panel. There is no independent security audit, sustained load test, new combat performance profile, public game hosting or external client match proof. Hosting access remains unavailable. Hackathon mock token eligibility is unconfirmed.
