import {test,before,after,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {id,parseEther,ZeroHash,Wallet} from 'ethers';
import {startEvm} from '../scripts/evm.ts';
import {fixture,deploy,as,receipt,timestamp,at} from '../scripts/shared.ts';
import {salvageRulesHash,lootTypes,type LootClaim} from '@last-signal/chain';
let evm:Awaited<ReturnType<typeof startEvm>>,f:Awaited<ReturnType<typeof fixture>>,armory:Awaited<ReturnType<typeof deploy>>,checkpoint:string;
before(async()=>{evm=await startEvm(18548);f=await fixture(evm.provider);armory=await deploy(f.artifacts.GunArmory,f.deployer,[f.token.target,f.authority.address,salvageRulesHash]);});
after(async()=>{evm?.provider.destroy();await evm?.stop();});
beforeEach(async()=>{checkpoint=await evm.provider.send('evm_snapshot',[]);});
afterEach(async()=>{await evm.provider.send('evm_revert',[checkpoint]);});
const domain=()=>({name:'LAST SIGNAL GunArmory',version:'1',chainId:31337,verifyingContract:String(armory.target)});
const claim=async(label='drop'):Promise<LootClaim>=>({dropId:id(label),runId:id('run'),recipient:f.a.address,kind:1,rulesHash:salvageRulesHash,expiry:String(await timestamp(evm.provider)+3600n)});
const sign=(c:LootClaim,d=domain())=>f.authority.signTypedData(d,lootTypes,c);
test('shop burns bounded tWIF, mints a wallet gun and publishes original onchain metadata',async()=>{
 const a=as(armory,f.a);await receipt(as(f.token,f.a).approve(armory.target,parseEther('20')),'approve 20');await receipt(a.buyGun(0),'buy rifle');assert.equal(await a.ownerOf(1),f.a.address);assert.equal(await f.token.balanceOf(f.a.address),parseEther('80'));assert.equal(await f.token.balanceOf(armory.target),0n);assert.equal(await f.escrow.liabilities(),0n);assert.equal(await a.provenance(1),ZeroHash);const uri=await a.tokenURI(1),metadata=JSON.parse(Buffer.from(uri.split(',')[1],'base64').toString());assert.match(metadata.name,/Service Rifle/);assert.match(metadata.image,/^data:image\/svg\+xml;base64,/);assert.equal((await a.ownedPage(f.a.address,0,32))[0].length,1);await assert.rejects(a.ownedPage(f.a.address,0,33));
});
test('loot authorization binds recipient, source, rules, chain and contract',async()=>{
 const c=await claim(),sig=await sign(c),a=as(armory,f.a);for(const patch of [{runId:id('altered')},{dropId:id('other')},{kind:0},{rulesHash:id('wrong')}])await assert.rejects(a.claimLoot([{...c,...patch}],[sig]));await assert.rejects(as(armory,f.b).claimLoot([c],[sig]));await assert.rejects(a.claimLoot([c],[await sign(c,{...domain(),chainId:46630})]));await assert.rejects(a.claimLoot([c],[await sign(c,{...domain(),verifyingContract:String(f.escrow.target)})]));await assert.rejects(a.claimLoot([c],[await Wallet.createRandom().signTypedData(domain(),lootTypes,c)]));assert.equal(await a.nextTokenId(),1n);
});
test('claims are atomic, one per source, bounded and stop at the expiry boundary',async()=>{
 const c=await claim(),a=as(armory,f.a),sig=await sign(c);await assert.rejects(a.claimLoot([c,c],[sig,sig]));assert.equal(await a.claimed(c.dropId),false);await receipt(a.claimLoot([c],[sig]),'claim loot');assert.equal(await a.claimed(c.dropId),true);assert.equal(await a.provenance(1),c.dropId);await assert.rejects(a.claimLoot([c],[sig]));const expired=await claim('deadline');await at(evm.provider,BigInt(expired.expiry));await evm.provider.send('evm_mine',[]);await assert.rejects(a.claimLoot([expired],[await sign(expired)]));await assert.rejects(a.claimLoot([],[]));await assert.rejects(a.claimLoot([c,c,c,c],[sig,sig,sig,sig]));
});
test('player sales pay the seller, require expected price, and transfers invalidate listings',async()=>{
 const c=await claim(),a=as(armory,f.a),b=as(armory,f.b);await receipt(a.claimLoot([c],[await sign(c)]),'claim');await receipt(a.listGun(1,parseEther('7')),'list');await receipt(as(f.token,f.b).approve(armory.target,parseEther('7')),'approve sale');await assert.rejects(b.buyListed(1,parseEther('6')));await receipt(b.buyListed(1,parseEther('7')),'buy listed');assert.equal(await armory.ownerOf(1),f.b.address);assert.equal(await f.token.balanceOf(f.a.address),parseEther('107'));assert.equal(await f.token.balanceOf(f.b.address),parseEther('93'));assert.equal(await f.token.totalSupply(),parseEther('200'));assert.equal((await armory.listings(1)).price,0n);await assert.rejects(b.buyListed(1,parseEther('7')));await receipt(b.listGun(1,parseEther('9')),'relist');await receipt(b.transferFrom(f.b.address,f.a.address,1),'transfer');assert.equal((await armory.listings(1)).price,0n);await assert.rejects(b.listGun(1,1));await assert.rejects(a.listGun(1,0));await assert.rejects(a.listGun(1,parseEther('1001')));
});
test('failed currency or NFT delivery rolls back payment and ownership',async()=>{
 const a=as(armory,f.a);await assert.rejects(a.buyGun(0));assert.equal(await armory.nextTokenId(),1n);const c=await claim();await receipt(a.claimLoot([c],[await sign(c)]),'claim');await receipt(a.listGun(1,parseEther('10')),'list');const reject=await deploy(f.artifacts.RejectingGunBuyer,f.deployer);await receipt(reject.fund(f.token.target),'fund receiver');await assert.rejects(reject.buy(f.token.target,armory.target,1,parseEther('10')));assert.equal(await armory.ownerOf(1),f.a.address);assert.equal(await f.token.balanceOf(reject.target),parseEther('100'));assert.equal(await f.token.balanceOf(f.a.address),parseEther('100'));assert.equal((await armory.listings(1)).price,parseEther('10'));
});
test('paid supplies name a run, burn exact cost and never touch escrow deposits',async()=>{
 await receipt(as(f.token,f.a).approve(armory.target,parseEther('10')),'approve supply');await receipt(as(armory,f.a).buySupply(id('live-run'),2),'buy helper');assert.equal(await f.token.balanceOf(f.a.address),parseEther('90'));assert.equal(await f.token.totalSupply(),parseEther('190'));assert.equal(await f.token.balanceOf(armory.target),0n);await assert.rejects(as(armory,f.a).buySupply(ZeroHash,0));await assert.rejects(as(armory,f.a).buySupply(id('run'),3));
});
