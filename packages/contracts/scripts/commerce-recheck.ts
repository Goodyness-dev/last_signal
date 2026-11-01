import {Contract,Interface,JsonRpcProvider,ZeroAddress,formatEther,keccak256,parseEther} from 'ethers';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {TESTNET,json,type ArmoryDeployment,type Deployment} from '@last-signal/chain';

// Receipt and current state verification deliberately does not require archive state.
// Preserve the original block anchored accounting reports rather than replacing them.
const root=resolve(import.meta.dirname,'../../..');
const read=(path:string)=>JSON.parse(readFileSync(resolve(root,path),'utf8'));
const p=new JsonRpcProvider(TESTNET.rpc,undefined,{cacheTimeout:-1,batchMaxCount:1});
try{
 assert.equal(BigInt(await p.send('eth_chainId',[])),BigInt(TESTNET.chainId));
 const armory=read('docs/evidence/armory-deployment.json') as {deployment:ArmoryDeployment;receipt:{hash:string}};
 const original=read('docs/evidence/testnet-deployment.json') as {deployment:Deployment;receipts:{hash:string}[]};
 const faucet=read('docs/evidence/testnet-faucet.json') as {hash:string};
 const match=read('docs/evidence/testnet-match.json') as {receipts:{hash:string}[]};
 const proof=read('docs/evidence/armory-proof.json') as {actors:string[];salvageTokenId:string;salvageProvenance:string;receipts:{hash:string}[]};
 const d=armory.deployment,tokenABI=read('packages/contracts/abi/TestWIF.json'),gunABI=read('packages/contracts/abi/GunArmory.json');
 const token=new Contract(d.token,tokenABI,p),gun=new Contract(d.armory,gunABI,p),escrow=new Contract(original.deployment.escrow,read('packages/contracts/abi/MatchEscrow.json'),p);
 assert.equal(keccak256(await p.getCode(d.armory)),d.codeHash);
 assert.equal(keccak256(await p.getCode(d.token)),original.deployment.tokenCodeHash);
 assert.equal(keccak256(await p.getCode(original.deployment.escrow)),original.deployment.escrowCodeHash);
 assert.equal(await gun.currency(),d.token);assert.equal(await gun.gameplaySigner(),d.gameplaySigner);assert.equal(await gun.rulesHash(),d.rulesHash);
 const hashes=[...new Set([faucet.hash,...original.receipts.map(r=>r.hash),...match.receipts.map(r=>r.hash),armory.receipt.hash,...proof.receipts.map(r=>r.hash)])];
 const tokenEvents=new Interface(tokenABI),gunEvents=new Interface(gunABI),head=await p.getBlockNumber(),receipts=[];
 let burn=0n,sale=false,mint=false;
 for(const hash of hashes){
  const r=await p.getTransactionReceipt(hash);assert.ok(r);assert.equal(r.status,1);assert.ok(head-r.blockNumber+1>=2);assert.equal((await p.getBlock(r.blockNumber))?.hash,r.blockHash);
  receipts.push({hash,status:r.status,block:r.blockNumber,blockHash:r.blockHash});
  for(const log of r.logs){
   if(log.address.toLowerCase()===d.token.toLowerCase()){const e=tokenEvents.parseLog(log);if(e?.name==='Transfer'&&e.args.to===ZeroAddress)burn+=e.args.value;}
   if(log.address.toLowerCase()===d.armory.toLowerCase()){const e=gunEvents.parseLog(log);
    if(e?.name==='GunAcquired'&&String(e.args.tokenId)===proof.salvageTokenId){assert.equal(e.args.dropId,proof.salvageProvenance);assert.equal(e.args.recipient,proof.actors[0]);mint=true;}
    if(e?.name==='Sale'&&String(e.args.tokenId)===proof.salvageTokenId){assert.equal(e.args.seller,proof.actors[0]);assert.equal(e.args.buyer,proof.actors[1]);assert.equal(e.args.price,parseEther('8'));sale=true;}
   }
  }
 }
 assert.equal(mint,true);assert.equal(sale,true);assert.equal(burn,parseEther('39'));
 const owner=await gun.ownerOf(proof.salvageTokenId) as string;assert.equal(owner,proof.actors[1]);assert.equal(await gun.provenance(proof.salvageTokenId),proof.salvageProvenance);
 const balances=[];for(const wallet of proof.actors)balances.push({wallet,tWIF:formatEther(await token.balanceOf(wallet)),testETH:formatEther(await p.getBalance(wallet))});
 const report={checkedAt:new Date().toISOString(),mode:'RECEIPTS_AND_CURRENT_STATE',chainId:TESTNET.chainId,observedHead:head,receipts,codeHashesVerified:true,decodedMint:true,decodedSaleTWIF:'8',totalBurnAcrossBothProofs:formatEther(burn),current:{ownerOfRecoveredNFT:owner,balances,totalSupply:formatEther(await token.totalSupply()),escrowBalance:formatEther(await token.balanceOf(original.deployment.escrow)),escrowLiability:formatEther(await escrow.liabilities())},historicalAccountingRechecked:false,archiveLimitation:'Official RPC reports historical state unavailable for the original proof blocks. Original accounting snapshots remain separate.',confirmationPolicy:'Two canonical L2 blocks, not Ethereum finality',publicGameHosting:false};
 writeFileSync(resolve(root,'docs/evidence/commerce-current.json'),json(report)+'\n');
 console.log(json({status:report.mode,receipts:receipts.length,current:report.current,historicalAccountingRechecked:false}));
}catch{console.error('Receipt and current state recheck failed. Prior evidence was preserved.');process.exitCode=1;}finally{p.destroy();}
