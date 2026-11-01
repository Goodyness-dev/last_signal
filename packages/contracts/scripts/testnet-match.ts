import {JsonRpcProvider,NonceManager,Contract,parseEther,formatEther} from 'ethers';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import WebSocket from 'ws';
import {TESTNET,json,type Deployment} from '@last-signal/chain';
import {IDENTIFIERS,type ServerMessage} from '@last-signal/protocol';
import {loadKeys,secretFolder} from './testnet-keys.ts';
const root=resolve(import.meta.dirname,'../../..'),origin='http://127.0.0.1:5174',base='http://127.0.0.1:3001';
const provider=new JsonRpcProvider(TESTNET.rpc,undefined,{cacheTimeout:-1,batchMaxCount:1,pollingInterval:1000});
const receipts:{label:string;hash:string;block:number;blockHash:string;status:number|null}[]=[];
let sockets:WebSocket[]=[];const timers:ReturnType<typeof setInterval>[]=[];
try{
 if(BigInt(await provider.send('eth_chainId',[]))!==BigInt(TESTNET.chainId))throw Error('Refusing wrong chain');
 const file=resolve(secretFolder,'deployment.json');if(!existsSync(file))throw Error('Testnet deployment is unavailable. Fund the dedicated deployer with free test ETH and run testnet:deploy first.');
 const d=JSON.parse(readFileSync(file,'utf8')) as Deployment;if(d.chainId!==TESTNET.chainId)throw Error('Unsupported deployment');const priorFile=resolve(secretFolder,'match-proof-state.json');if(existsSync(priorFile)&&JSON.parse(readFileSync(priorFile,'utf8')).escrow!==d.escrow)throw Error('Existing proof journal belongs to another deployment. Inspect before sending any transaction.');
 const keys=loadKeys(),deployer=new NonceManager(keys.deployer.connect(provider)),actors=[keys.playerA.connect(provider),keys.playerB.connect(provider)].sort((a,b)=>BigInt(a.address)<BigInt(b.address)?-1:1);
 const tokenABI=JSON.parse(readFileSync(resolve(root,'packages/contracts/abi/TestWIF.json'),'utf8')),escrowABI=JSON.parse(readFileSync(resolve(root,'packages/contracts/abi/MatchEscrow.json'),'utf8'));
 const token=new Contract(d.token,tokenABI,provider),escrow=new Contract(d.escrow,escrowABI,provider);
 const api=async(path:string,session='',body?:unknown)=>{const r=await fetch(base+'/testnet/'+path,{method:body===undefined?'GET':'POST',headers:{origin,...(session?{authorization:'Bearer '+session}:{}),...(body===undefined?{}:{'content-type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000)});const data=await r.json();if(!r.ok)throw Error(data.error??'Game service error');return data;};
 const config=await api('config');if(config.status!=='READY'||config.deployment.escrow!==d.escrow)throw Error('Restart the game service with the verified testnet deployment');
 const record=async(label:string,operation:()=>Promise<import('ethers').TransactionResponse>)=>{const tx=await operation();const txFile=resolve(secretFolder,'proof-transactions.json');const submitted=existsSync(txFile)?JSON.parse(readFileSync(txFile,'utf8')) as unknown[]:[];submitted.push({label,hash:tx.hash,status:'SUBMITTED'});writeFileSync(txFile,json(submitted));console.log(label+' submitted '+tx.hash);const r=await tx.wait(TESTNET.confirmations,120000);if(!r||r.status!==1)throw Error(label+' not confirmed');receipts.push({label,hash:r.hash,block:r.blockNumber,blockHash:r.blockHash,status:r.status});return r;};
 const price=(await provider.getFeeData()).gasPrice;if(!price)throw Error('No gas estimate');const target=price*5000000n>parseEther('0.00005')?price*5000000n:parseEther('0.00005');
 const needed=await Promise.all(actors.map(async w=>{const bal=await provider.getBalance(w.address);return bal<target?target-bal:0n;}));
 if((await provider.getBalance(keys.deployer.address))<needed[0]+needed[1]+price*100000n)throw Error('More free test ETH is needed by the dedicated deployer to cover both participants. No paid funding is used.');
 for(let i=0;i<2;i++)if(needed[i])await record('free test gas to participant '+i,()=>deployer.sendTransaction({to:actors[i].address,value:needed[i]}));
 const sessions:string[]=[];for(const actor of actors){const c=await api('challenge','',{address:actor.address,chainId:TESTNET.chainId});const login=await api('login','',{nonce:c.nonce,signature:await actor.signMessage(c.message)});sessions.push(login.session);}
 const journalFile=resolve(secretFolder,'match-proof-state.json');let state:{room:string;escrow:string};
 if(existsSync(journalFile)){state=JSON.parse(readFileSync(journalFile,'utf8'));if(state.escrow!==d.escrow)throw Error('Existing proof journal belongs to another deployment. Inspect it before creating another challenge.');}
 else{const created=await api('rooms',sessions[0],{opponent:actors[1].address});state={room:created.room,escrow:d.escrow};writeFileSync(journalFile,json(state));}
 let status=await api('rooms/'+state.room,sessions[0]);
 for(let i=0;i<2;i++){
  const chain=await escrow.matches(status.offer.matchId);if(i===0?chain.fundedA:chain.fundedB)continue;
  const actor=actors[i],t=new Contract(d.token,tokenABI,actor),e=new Contract(d.escrow,escrowABI,actor);
  if(await t.balanceOf(actor.address)<parseEther('100'))await record('mock tWIF faucet participant '+i,()=>t.faucet());
  if(await t.allowance(actor.address,d.escrow)!==parseEther('100'))await record('approve exactly 100 participant '+i,()=>t.approve(d.escrow,parseEther('100')));
  const r=await record('fund exactly 100 participant '+i,()=>e.fundMatch(status.offer,status.signature));status=await api('rooms/'+state.room+'/verify',sessions[i],{transactionHash:r.hash});
 }
 const messages:ServerMessage[][]=[[],[]];
 const until=async(predicate:()=>boolean,seconds=30)=>{const end=Date.now()+seconds*1000;while(!predicate()){if(Date.now()>end)throw Error('Authoritative match wait timed out. Reconnect or use deadline recovery.');await new Promise(r=>setTimeout(r,100));}};
 if(!status.finalized&&!status.refundEligible&&status.phase!=='finished'&&status.phase!=='aborted'){
  for(let i=0;i<2;i++){
   const ws=new WebSocket('ws://127.0.0.1:3001/room',{origin});sockets.push(ws);ws.on('message',raw=>messages[i].push(JSON.parse(raw.toString())));ws.on('error',()=>{});
   await new Promise<void>((resolve,reject)=>{ws.once('open',()=>resolve());ws.once('error',()=>reject(Error('Game WebSocket unavailable')));});ws.send(json({op:'funded',room:state.room,walletSession:sessions[i],...IDENTIFIERS}));timers.push(setInterval(()=>{if(ws.readyState===1)ws.send('{"op":"ping"}');},2000));
  }
  await until(()=>messages.every(ms=>ms.some(m=>m.op==='session')));
  for(const ws of sockets)ws.send('{"op":"ready"}');
  const snapshot=(i:number)=>messages[i].filter((m):m is Extract<ServerMessage,{op:'snapshot'}>=>m.op==='snapshot').at(-1)!;
  await until(()=>[0,1].every(i=>snapshot(i)?.phase==='running'),45);
  for(let i=0;i<2;i++){const id=snapshot(i).observation.squads.find(s=>s.side===i)!.id;sockets[i].send(json({op:'command',id:'proof-shield-'+i,action:{kind:'shield',squadId:id}}));sockets[i].send(json({op:'command',id:'proof-move-'+i,action:{kind:'move',squadId:id,target:{x:i===0?23:25,z:16}}}));}
  sockets[0].send(json({op:'command',id:'proof-deploy',action:{kind:'deploy'}}));await new Promise(r=>setTimeout(r,6000));
  sockets[1].send(json({op:'command',id:'proof-concede',action:{kind:'surrender'}}));await until(()=>[0,1].every(i=>snapshot(i)?.phase==='finished'));
  if(json(snapshot(0).observation.result)!==json(snapshot(1).observation.result))throw Error('Clients disagree on authoritative outcome');
 }
 const authorization=await api('rooms/'+state.room+'/result',sessions[0],{});let mode='PUBLIC_TESTNET_SETTLED';
 if(!authorization.status.finalized){
  const e=new Contract(d.escrow,escrowABI,actors[0]);
  if(authorization.status.refundEligible){mode='PUBLIC_TESTNET_TIMEOUT_RECOVERED';await record('deadline refund',()=>e.refundExpired(status.offer.matchId));}
  else if(authorization.settlement)await record('settle authoritative result',()=>e.settle(authorization.settlement.result,authorization.settlement.signature));
  else throw Error('No terminal authorization or refund is available');
 }
 for(let i=0;i<2;i++){const e=new Contract(d.escrow,escrowABI,actors[i]);if(await e.claimable(actors[i].address)>0n)await record('claim participant '+i,()=>e.claim());}
 const historyFile=resolve(secretFolder,'proof-transactions.json'),history=existsSync(historyFile)?JSON.parse(readFileSync(historyFile,'utf8')) as {label:string;hash:string}[]:[];const confirmed=[];for(const tx of [...new Map(history.map(t=>[t.hash,t] as const)).values()]){const r=await provider.getTransactionReceipt(tx.hash);if(r?.status===1){const block=await provider.getBlock(r.blockNumber);if(block?.hash!==r.blockHash)throw Error('A proof transaction was reorganized');confirmed.push({label:tx.label,hash:r.hash,block:r.blockNumber,blockHash:r.blockHash,status:r.status});}}
 const report={mode,network:TESTNET,deployment:d,room:state.room,participants:actors.map(w=>w.address),result:authorization.settlement?.result??null,confirmationPolicy:'Two canonical L2 blocks, not Ethereum finality',receipts:confirmed,fundingProofs:authorization.status.proofs,balances:{playerA:String(await token.balanceOf(actors[0].address)),playerB:String(await token.balanceOf(actors[1].address)),supply:String(await token.totalSupply()),escrow:String(await token.balanceOf(d.escrow)),liability:String(await escrow.liabilities())},hackathonMockTokenEligibility:'UNCONFIRMED'};
 writeFileSync(resolve(root,'docs/evidence/testnet-match.json'),json(report)+'\n');console.log(json({mode,room:state.room,transactions:receipts.length,balances:report.balances}));
}catch(error){console.error((error as {code?:string}).code?'Testnet proof could not complete. Inspect saved public transaction hashes before retrying.':(error as Error).message);process.exitCode=1;}finally{for(const t of timers)clearInterval(t);for(const s of sockets)s.close();provider.destroy();}
