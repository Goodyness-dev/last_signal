import {JsonRpcProvider,parseEther,keccak256,id} from 'ethers';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {fixture,receipt,as,DEPOSIT,at,timestamp,terminalFixture} from './shared.ts';
const url=new URL(process.env.LOCAL_RPC??'http://127.0.0.1:8545');
if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password)throw Error('This proof is restricted to a disposable loopback EVM.');
const provider=new JsonRpcProvider(url.href,undefined,{cacheTimeout:-1,pollingInterval:30,batchMaxCount:1});
try{
 const f=await fixture(provider),{a,b,token,escrow,receipts}=f;
 const chainId=BigInt(await provider.send('eth_chainId',[]));assert.equal(chainId,31337n);assert.notEqual(f.authority.address,f.deployer.address);
 const tokenCode=await provider.getCode(token.target),escrowCode=await provider.getCode(escrow.target);assert.notEqual(tokenCode,'0x');assert.notEqual(escrowCode,'0x');
 const terminal=terminalFixture();assert.deepEqual(terminal.data.spent,[45,60]);
 const offer=await f.offer('local-proof-normal');await f.fund(offer);
 assert.equal(await token.balanceOf(escrow.target),2n*DEPOSIT);assert.equal(await token.allowance(a.address,escrow.target),0n);assert.equal(await token.allowance(b.address,escrow.target),0n);
 const result=await f.result(offer,{spendA:parseEther(String(terminal.data.spent[0])),spendB:parseEther(String(terminal.data.spent[1])),outcome:terminal.data.winner===null?2:terminal.data.winner,terminalTick:BigInt(terminal.data.tick),resultHash:terminal.resultHash});
 const supplyBefore=await token.totalSupply();await receipt(as(escrow,b).settle(result,await f.signResult(result)),'normal settlement and burn',receipts);
 const burn=supplyBefore-await token.totalSupply();assert.equal(burn,parseEther('10.5'));
 const creditA=await escrow.claimable(a.address),creditB=await escrow.claimable(b.address);assert.equal(creditA+creditB+burn,DEPOSIT*2n);
 await receipt(as(escrow,a).claim(),'normal claim A',receipts);await receipt(as(escrow,b).claim(),'normal claim B',receipts);assert.equal(await escrow.liabilities(),0n);assert.equal(await token.balanceOf(escrow.target),0n);
 const normal={offer,result,terminal:terminal.data,burn,creditA,creditB,balanceA:await token.balanceOf(a.address),balanceB:await token.balanceOf(b.address),supplyBefore,supplyAfter:await token.totalSupply()};
 // The development clock advances only through local EVM test RPC methods.
 await at(provider,(await timestamp(provider))+3601n);await receipt(as(token,a).faucet(),'second capped faucet A',receipts);await receipt(as(token,b).faucet(),'second capped faucet B',receipts);
 const approveBoth=async()=>{await receipt(as(token,a).approve(escrow.target,DEPOSIT),'new exact approval A',receipts);await receipt(as(token,b).approve(escrow.target,DEPOSIT),'new exact approval B',receipts);};
 await approveBoth();const timeoutOffer=await f.offer('local-proof-timeout');const beforeTimeoutA=await token.balanceOf(a.address),beforeTimeoutB=await token.balanceOf(b.address),beforeTimeoutSupply=await token.totalSupply();await f.fund(timeoutOffer);
 const deadline=BigInt((await escrow.matches(timeoutOffer.matchId)).refundDeadline);await at(provider,deadline);
 const refundReceipt=await receipt(as(escrow,a).refundExpired(timeoutOffer.matchId,{gasLimit:1000000}),'hard deadline timeout refund',receipts);
 assert.equal(BigInt((await provider.getBlock(refundReceipt.blockNumber))!.timestamp),deadline);
 await receipt(as(escrow,a).claim(),'timeout claim A',receipts);await receipt(as(escrow,b).claim(),'timeout claim B',receipts);
 assert.equal(await token.balanceOf(a.address),beforeTimeoutA);assert.equal(await token.balanceOf(b.address),beforeTimeoutB);assert.equal(await token.totalSupply(),beforeTimeoutSupply);assert.equal(await escrow.liabilities(),0n);
 const timeout={offer:timeoutOffer,deadline,beforeA:beforeTimeoutA,afterA:await token.balanceOf(a.address),beforeB:beforeTimeoutB,afterB:await token.balanceOf(b.address),burn:0n};
 await receipt(as(token,a).approve(escrow.target,DEPOSIT),'unmatched exact approval',receipts);const unmatchedOffer=await f.offer('local-proof-unmatched');await receipt(as(escrow,a).fundMatch(unmatchedOffer,await f.signOffer(unmatchedOffer)),'unmatched funding A only',receipts);
 await at(provider,unmatchedOffer.fundingExpiry);await receipt(as(escrow,a).refundExpired(unmatchedOffer.matchId,{gasLimit:1000000}),'unmatched expiry refund',receipts);assert.equal(await escrow.claimable(a.address),DEPOSIT);assert.equal(await escrow.claimable(b.address),0n);await receipt(as(escrow,a).claim(),'unmatched claim A',receipts);
 await approveBoth();const abortOffer=await f.offer('local-proof-abort');await f.fund(abortOffer);const abortResult=await f.result(abortOffer,{outcome:3,spendA:0n,spendB:0n,resultHash:id('local infrastructure abort fixture')});const abortSupply=await token.totalSupply();await receipt(as(escrow,a).settle(abortResult,await f.signResult(abortResult)),'signed abort full refund',receipts);assert.equal(await escrow.claimable(a.address),DEPOSIT);assert.equal(await escrow.claimable(b.address),DEPOSIT);await receipt(as(escrow,a).claim(),'abort claim A',receipts);await receipt(as(escrow,b).claim(),'abort claim B',receipts);assert.equal(await token.totalSupply(),abortSupply);assert.equal(await escrow.liabilities(),0n);assert.equal(await token.balanceOf(escrow.target),0n);
 const report={mode:'LOCAL_EVM_ONLY',network:'Disposable local Hardhat EVM, not Robinhood Chain testnet',rpc:url.href,chainId,tokenIdentity:'LAST SIGNAL Test WIF (tWIF), 18 decimals, NOT official WIF, no monetary value',compiler:f.artifacts.TestWIF.compiler,evmTarget:'cancun',token:token.target,escrow:escrow.target,deployer:f.deployer.address,settlementSigner:f.authority.address,participants:{A:a.address,B:b.address},tokenCodeHash:keccak256(tokenCode),escrowCodeHash:keccak256(escrowCode),normal,timeout,unmatched:{offer:unmatchedOffer,refunded:DEPOSIT},abort:{offer:abortOffer,result:abortResult,refundedA:DEPOSIT,refundedB:DEPOSIT,burn:0n},finalLiability:await escrow.liabilities(),finalEscrowBalance:await token.balanceOf(escrow.target),developmentClockAdvanced:true,receipts};
 const folder=resolve(import.meta.dirname,'../../../docs/evidence');mkdirSync(folder,{recursive:true});const path=resolve(folder,'local-chain-receipts.json');writeFileSync(path,JSON.stringify(report,(_k,v)=>typeof v==='bigint'?v.toString():v,2)+'\n');
 console.log(JSON.stringify({mode:report.mode,chainId:String(chainId),token:token.target,escrow:escrow.target,burn:String(burn),transactions:receipts.length,evidence:path}));
}finally{provider.destroy();}
