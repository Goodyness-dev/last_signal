import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {Wallet,parseEther,id,TypedDataEncoder,type JsonRpcProvider} from 'ethers';
import {compile,type Artifact} from '../scripts/compile.ts';
import {startEvm} from '../scripts/evm.ts';
import {fixture,as,receipt,deploy,at,timestamp,DEPOSIT,offerTypes,resultTypes,type Offer,type Result} from '../scripts/shared.ts';
let evm:Awaited<ReturnType<typeof startEvm>>,provider:JsonRpcProvider,artifacts:Record<string,Artifact>;
before(async()=>{artifacts=compile();evm=await startEvm(18545);provider=evm.provider;},{timeout:60000});
after(async()=>{provider?.destroy();await evm?.stop();});
const setup=()=>fixture(provider,artifacts);
const rejected=async(action:()=>Promise<unknown>)=>{await assert.rejects(action);};
const txOpts={gasLimit:3000000};
async function invariant(f:Awaited<ReturnType<typeof fixture>>){assert.equal(await f.token.balanceOf(f.escrow.target),await f.escrow.liabilities());}
async function settled(f:Awaited<ReturnType<typeof fixture>>,patch:Partial<Result>={}){const o=await f.offer();await f.fund(o);const r=await f.result(o,patch);await receipt(as(f.escrow,f.a).settle(r,await f.signResult(r)),'settle');return {o,r};}
test('original mock token is 18 decimal, has a capped cooldown faucet and real burn',async()=>{
 const f=await setup();assert.equal(await f.token.name(),'LAST SIGNAL Test WIF');assert.equal(await f.token.symbol(),'tWIF');assert.equal(await f.token.decimals(),18n);
 assert.equal(await f.token.balanceOf(f.a.address),DEPOSIT);await rejected(()=>as(f.token,f.a).faucet());
 const next=await f.token.nextFaucetAt(f.a.address);await at(provider,next);await receipt(as(f.token,f.a).faucet(txOpts),'faucet boundary');assert.equal(await f.token.balanceOf(f.a.address),DEPOSIT*2n);
 const supply=await f.token.totalSupply();await receipt(as(f.token,f.a).burn(1n),'burn one unit');assert.equal(await f.token.totalSupply(),supply-1n);
});
test('45 and 60 spending conserves 200, burns 10.5 and pull claims 149.5 and 40',async()=>{
 const f=await setup();const {o,r}=await settled(f);assert.equal(await f.escrow.claimable(f.a.address),parseEther('149.5'));assert.equal(await f.escrow.claimable(f.b.address),parseEther('40'));assert.equal(await f.token.totalSupply(),parseEther('189.5'));await invariant(f);
 await receipt(as(f.escrow,f.a).claim(),'claim A');await receipt(as(f.escrow,f.b).claim(),'claim B');assert.equal(await f.token.balanceOf(f.a.address),parseEther('149.5'));assert.equal(await f.token.balanceOf(f.b.address),parseEther('40'));await invariant(f);
 await rejected(()=>as(f.escrow,f.a).claim());await rejected(()=>as(f.escrow,f.a).settle(r,f.signResult(r)));await rejected(()=>as(f.escrow,f.a).refundExpired(o.matchId));
});
for(const outcome of [0,1,2])test('maximum spend conservation for outcome '+outcome,async()=>{
 const f=await setup();await settled(f,{spendA:DEPOSIT,spendB:DEPOSIT,outcome});const a=await f.escrow.claimable(f.a.address),b=await f.escrow.claimable(f.b.address);assert.equal(a+b,parseEther('180'));assert.equal(await f.token.totalSupply(),parseEther('180'));if(outcome===2){assert.equal(a,parseEther('90'));assert.equal(b,a);}else assert.equal(outcome===0?a:b,parseEther('180'));await invariant(f);
});
test('zero spend returns deposits without burn',async()=>{const f=await setup();await settled(f,{spendA:0n,spendB:0n});assert.equal(await f.escrow.claimable(f.a.address),DEPOSIT);assert.equal(await f.escrow.claimable(f.b.address),DEPOSIT);assert.equal(await f.token.totalSupply(),2n*DEPOSIT);await invariant(f);});
test('draw remainder goes to the lower address in canonical participant order',async()=>{const f=await setup();assert(BigInt(f.a.address)<BigInt(f.b.address));await settled(f,{spendA:1n,spendB:2n,outcome:2});assert.equal(await f.escrow.claimable(f.a.address),DEPOSIT+1n);assert.equal(await f.escrow.claimable(f.b.address),DEPOSIT-1n);assert.equal(await f.token.totalSupply(),2n*DEPOSIT);await invariant(f);});
test('burn rounds down in base units without losing the draw remainder',async()=>{const f=await setup();await settled(f,{spendA:5n,spendB:6n,outcome:2});assert.equal(await f.token.totalSupply(),2n*DEPOSIT-1n);assert.equal(await f.escrow.claimable(f.a.address),DEPOSIT);assert.equal(await f.escrow.claimable(f.b.address),DEPOSIT-1n);await invariant(f);});
test('abort refunds both deposits with zero spends and zero burn',async()=>{const f=await setup();await settled(f,{outcome:3,spendA:0n,spendB:0n});assert.equal(await f.escrow.claimable(f.a.address),DEPOSIT);assert.equal(await f.escrow.claimable(f.b.address),DEPOSIT);assert.equal(await f.token.totalSupply(),2n*DEPOSIT);await invariant(f);});
test('invalid abort, overspending and invalid enum cannot settle',async()=>{const f=await setup(),o=await f.offer();await f.fund(o);for(const patch of [{outcome:3,spendA:1n,spendB:0n},{spendA:DEPOSIT+1n},{spendB:DEPOSIT+1n},{outcome:4}]){const r=await f.result(o,patch);await rejected(async()=>as(f.escrow,f.a).settle(r,await f.signResult(r)));}assert.equal((await f.escrow.matches(o.matchId)).finalized,false);await invariant(f);});
test('altered result fields, signer, chain, contract and match replay are rejected',async()=>{
 const f=await setup(),o=await f.offer();await f.fund(o);const r=await f.result(o),sig=await f.signResult(r);
 assert.equal(await f.escrow.resultDigest(r),TypedDataEncoder.hash(f.domain,resultTypes,r));
 for(const patch of [{spendA:r.spendA+1n},{spendB:r.spendB+1n},{outcome:1},{terminalTick:r.terminalTick+1n},{resultHash:id('changed')},{nonce:1n},{rulesHash:id('changed')},{playerA:f.b.address},{expiry:r.expiry-1n},{matchId:id('other')}])await rejected(()=>as(f.escrow,f.a).settle({...r,...patch},sig));
 await rejected(async()=>as(f.escrow,f.a).settle(r,await Wallet.createRandom().signTypedData(f.domain,resultTypes,r)));
 await rejected(async()=>as(f.escrow,f.a).settle(r,await f.signResult(r,{...f.domain,chainId:31338n})));
 const other=await deploy(artifacts.MatchEscrow,f.deployer,[f.token.target,f.authority.address]);await rejected(async()=>as(f.escrow,f.a).settle(r,await f.signResult(r,{...f.domain,verifyingContract:await other.getAddress()})));
 await receipt(as(f.escrow,f.b).settle(r,sig),'participant B unilateral settlement');await invariant(f);
});
test('offers bind every field and both domain coordinates; no third party can fund',async()=>{
 const f=await setup(),o=await f.offer(),sig=await f.signOffer(o);assert.equal(await f.escrow.offerDigest(o),TypedDataEncoder.hash(f.domain,offerTypes,o));
 for(const patch of [{matchId:id('other')},{playerA:f.deployer.address},{playerB:f.deployer.address},{rulesHash:id('other')},{deposit:DEPOSIT-1n},{nonce:1n},{createdAt:o.createdAt-1n,fundingExpiry:o.fundingExpiry-1n}])await rejected(()=>as(f.escrow,f.a).fundMatch({...o,...patch},sig));
 await rejected(async()=>as(f.escrow,f.a).fundMatch(o,await f.signOffer(o,{...f.domain,chainId:31338n})));
 const other=await deploy(artifacts.MatchEscrow,f.deployer,[f.token.target,f.authority.address]);await rejected(async()=>as(f.escrow,f.a).fundMatch(o,await f.signOffer(o,{...f.domain,verifyingContract:await other.getAddress()})));
 await rejected(()=>as(f.escrow,f.deployer).fundMatch(o,sig));await rejected(async()=>as(f.escrow,f.a).fundMatch(o,await Wallet.createRandom().signTypedData(f.domain,offerTypes,o)));
});
test('duplicate funding, revoked allowance and changed funded offers cannot move deposits',async()=>{
 const f=await setup(),o=await f.offer(),sig=await f.signOffer(o);await receipt(as(f.token,f.a).approve(f.escrow.target,0n),'cancel approval');await rejected(()=>as(f.escrow,f.a).fundMatch(o,sig));assert.equal(await f.escrow.lockedLiability(),0n);
 await receipt(as(f.token,f.a).approve(f.escrow.target,DEPOSIT),'restore exact approval');await receipt(as(f.escrow,f.a).fundMatch(o,sig),'fund once');await rejected(()=>as(f.escrow,f.a).fundMatch(o,sig));
 const changed={...o,rulesHash:id('different rules')};await rejected(async()=>as(f.escrow,f.b).fundMatch(changed,await f.signOffer(changed)));assert.equal(await f.escrow.lockedLiability(),DEPOSIT);await invariant(f);
});
test('a signature for one fully funded match cannot settle another fully funded match',async()=>{
 const f=await fixture(provider,artifacts,'HostileToken');await receipt(f.token.mint(f.a.address,DEPOSIT),'extra A');await receipt(f.token.mint(f.b.address,DEPOSIT),'extra B');
 const one=await f.offer('one'),two=await f.offer('two');await f.fund(one);
 await receipt(as(f.token,f.a).approve(f.escrow.target,DEPOSIT),'approve second A');await receipt(as(f.token,f.b).approve(f.escrow.target,DEPOSIT),'approve second B');await f.fund(two);
 const r=await f.result(one),sig=await f.signResult(r);
 await assert.rejects(()=>as(f.escrow,f.a).settle.staticCall({...r,matchId:two.matchId},sig),/Unauthorized/);
 assert.equal(await f.escrow.lockedLiability(),DEPOSIT*4n);await invariant(f);
});
test('a signed result cannot replay into another escrow with the same fully funded offer',async()=>{
 const f=await fixture(provider,artifacts,'HostileToken');await receipt(f.token.mint(f.a.address,DEPOSIT),'extra A');await receipt(f.token.mint(f.b.address,DEPOSIT),'extra B');
 const o=await f.offer();await f.fund(o);const other=await deploy(artifacts.MatchEscrow,f.deployer,[f.token.target,f.authority.address]);
 const domain={...f.domain,verifyingContract:await other.getAddress()},signature=await f.signOffer(o,domain);
 await assert.rejects(()=>as(other,f.a).fundMatch.staticCall(o,f.signOffer(o)),/Unauthorized/);
 for(const actor of [f.a,f.b]){await receipt(as(f.token,actor).approve(other.target,DEPOSIT),'other approval');await receipt(as(other,actor).fundMatch(o,signature),'other funded');}
 const r=await f.result(o),resultSignature=await f.signResult(r);await assert.rejects(()=>as(other,f.a).settle.staticCall(r,resultSignature),/Unauthorized/);
 assert.equal(await other.lockedLiability(),2n*DEPOSIT);await invariant(f);
});
test('liabilities remain conserved across simultaneous matches and aggregated pull claims',async()=>{
 const f=await fixture(provider,artifacts,'HostileToken');await receipt(f.token.mint(f.a.address,DEPOSIT),'extra A');await receipt(f.token.mint(f.b.address,DEPOSIT),'extra B');const one=await f.offer('one'),two=await f.offer('two');await f.fund(one);
 await receipt(as(f.token,f.a).approve(f.escrow.target,DEPOSIT),'second approval A');await receipt(as(f.token,f.b).approve(f.escrow.target,DEPOSIT),'second approval B');await f.fund(two);
 const r=await f.result(one);await receipt(as(f.escrow,f.b).settle(r,await f.signResult(r)),'settle first');await invariant(f);await receipt(as(f.escrow,f.a).claim(),'first claim A');await invariant(f);
 const deadline=BigInt((await f.escrow.matches(two.matchId)).refundDeadline);await at(provider,deadline);await receipt(as(f.escrow,f.b).refundExpired(two.matchId,{gasLimit:1000000}),'refund second');await invariant(f);
 assert.equal(await f.escrow.claimable(f.b.address),parseEther('140'));await receipt(as(f.escrow,f.b).claim(),'combined claim B');await receipt(as(f.escrow,f.a).claim(),'second claim A');await invariant(f);assert.equal(await f.escrow.liabilities(),0n);
});
test('funding expiry rejects funding at the boundary and refunds unmatched funding once',async()=>{
 const f=await setup(),o=await f.offer(),sig=await f.signOffer(o);await receipt(as(f.escrow,f.a).fundMatch(o,sig),'partial funding');await rejected(()=>as(f.escrow,f.a).refundExpired(o.matchId));
 await at(provider,o.fundingExpiry);await rejected(async()=>receipt(as(f.escrow,f.b).fundMatch(o,sig,txOpts),'too late'));
 await receipt(as(f.escrow,f.a).refundExpired(o.matchId),'unmatched refund');assert.equal(await f.escrow.claimable(f.a.address),DEPOSIT);assert.equal(await f.escrow.claimable(f.b.address),0n);await rejected(()=>as(f.escrow,f.a).refundExpired(o.matchId));await invariant(f);
});
test('settlement succeeds one second before the hard deadline',async()=>{
 const f=await setup(),o=await f.offer();await f.fund(o);const r=await f.result(o),sig=await f.signResult(r);await at(provider,r.expiry-1n);await receipt(as(f.escrow,f.a).settle(r,sig,txOpts),'last valid second');await invariant(f);
});
test('at hard deadline settlement is closed and full timeout refunds replace all spending',async()=>{
 const f=await setup(),o=await f.offer();await f.fund(o);const r=await f.result(o),sig=await f.signResult(r);await rejected(()=>as(f.escrow,f.a).refundExpired(o.matchId));await at(provider,r.expiry);
 await rejected(async()=>receipt(as(f.escrow,f.a).settle(r,sig,txOpts),'deadline settlement'));
 await receipt(as(f.escrow,f.b).refundExpired(o.matchId),'full timeout');assert.equal(await f.escrow.claimable(f.a.address),DEPOSIT);assert.equal(await f.escrow.claimable(f.b.address),DEPOSIT);assert.equal(await f.token.totalSupply(),DEPOSIT*2n);
 await rejected(()=>as(f.escrow,f.a).settle(r,sig));await receipt(as(f.escrow,f.a).claim(),'timeout claim A');await receipt(as(f.escrow,f.b).claim(),'timeout claim B');assert.equal(await f.token.balanceOf(f.a.address),DEPOSIT);assert.equal(await f.token.balanceOf(f.b.address),DEPOSIT);await invariant(f);
});
test('result authorization expiry cannot exceed the hard deadline or survive its own expiry',async()=>{
 const f=await setup(),o=await f.offer();await f.fund(o);let r=await f.result(o);r={...r,expiry:r.expiry+1n};await rejected(async()=>as(f.escrow,f.a).settle(r,await f.signResult(r)));
 r={...r,expiry:(await timestamp(provider))+10n};const sig=await f.signResult(r);await at(provider,r.expiry);await rejected(async()=>receipt(as(f.escrow,f.a).settle(r,sig,txOpts),'expired authorization'));
});
for(const mode of [1,2])test('rejects unexpected receipt or false return from a wrong token, mode '+mode,async()=>{const f=await fixture(provider,artifacts,'HostileToken'),o=await f.offer();await receipt(f.token.setMode(mode),'token fault');await rejected(async()=>as(f.escrow,f.a).fundMatch(o,await f.signOffer(o)));assert.equal(await f.escrow.lockedLiability(),0n);assert.equal(await f.token.balanceOf(f.a.address),DEPOSIT);});
test('a failed claim transfer preserves the entire pull credit for retry',async()=>{const f=await fixture(provider,artifacts,'HostileToken');await settled(f);const credit=await f.escrow.claimable(f.a.address);await receipt(f.token.setBlockClaims(true),'block outgoing transfers');await rejected(()=>as(f.escrow,f.a).claim());assert.equal(await f.escrow.claimable(f.a.address),credit);await invariant(f);await receipt(f.token.setBlockClaims(false),'unblock outgoing transfers');await receipt(as(f.escrow,f.a).claim(),'claim retry');assert.equal(await f.escrow.claimable(f.a.address),0n);});
test('a fake burn cannot finalize a settlement or erase player liabilities',async()=>{const f=await fixture(provider,artifacts,'HostileToken'),o=await f.offer();await f.fund(o);await receipt(f.token.setMode(3),'fake burn mode');const r=await f.result(o);await rejected(async()=>as(f.escrow,f.a).settle(r,await f.signResult(r)));assert.equal((await f.escrow.matches(o.matchId)).finalized,false);assert.equal(await f.escrow.lockedLiability(),DEPOSIT*2n);await invariant(f);});
test('unsolicited transfers remain surplus and there is no owner withdrawal or signer rotation',async()=>{
 const f=await setup();await receipt(as(f.token,f.a).transfer(f.escrow.target,1n),'unsolicited unit');assert.equal(await f.escrow.liabilities(),0n);assert.equal(await f.token.balanceOf(f.escrow.target),1n);
 for(const name of ['withdraw','withdrawTokens','rescueTokens','upgradeTo','setSigner','transferOwnership'])assert.equal(f.escrow.interface.getFunction(name),null);
});
test('reentrant participant is blocked with the guard error and receives only its single claim',async()=>{
 const f=await fixture(provider,artifacts,'HostileToken');const receiver=await deploy(artifacts.ReentrantParticipant,f.deployer,[f.escrow.target,f.token.target]);await receipt(f.token.mint(receiver.target,DEPOSIT),'receiver tokens');
 const o=await f.offer();const pair=[String(receiver.target),f.a.address].sort((a,b)=>BigInt(a)<BigInt(b)?-1:1);o.playerA=pair[0];o.playerB=pair[1];const sig=await f.signOffer(o);
 await receipt(receiver.fund(o,sig),'receiver fund');await receipt(as(f.escrow,f.a).fundMatch(o,sig),'EOA fund');const r=await f.result(o,{spendA:0n,spendB:0n,outcome:3});await receipt(as(f.escrow,f.a).settle(r,await f.signResult(r)),'abort receiver match');
 await receipt(f.token.setCallback(true),'enable hostile callback');await receipt(receiver.claim(),'receiver claim');assert.equal(await receiver.attempted(),true);assert.equal(await receiver.reentryError(),id('ReentrancyGuardReentrantCall()').slice(0,10));assert.equal(await f.token.balanceOf(receiver.target),DEPOSIT);assert.equal(await f.escrow.claimable(receiver.target),0n);
});
