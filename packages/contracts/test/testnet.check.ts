import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JsonRpcProvider,keccak256,parseEther,Contract} from 'ethers';
import {startEvm} from '../scripts/evm.ts';
import {fixture,receipt,as} from '../scripts/shared.ts';
import {buildServer} from '../../../apps/server/src/app.ts';
import {IDENTIFIERS,type ServerMessage} from '@last-signal/protocol';
const origin='http://127.0.0.1:5174';
test('two wallet authenticated, chain funded participants finish an authoritative match and settle exactly once',{timeout:120000},async()=>{
 const evm=await startEvm(18546),p=evm.provider;let server:Awaited<ReturnType<typeof buildServer>>|null=null;
 try{
  const f=await fixture(p),deployment={chainId:31337,rpc:evm.url,token:await f.token.getAddress(),escrow:await f.escrow.getAddress(),settlementSigner:f.authority.address,deploymentBlock:0,tokenCodeHash:keccak256(await p.getCode(f.token.target)),escrowCodeHash:keccak256(await p.getCode(f.escrow.target))};
  server=await buildServer({database:':memory:',manual:true,chain:{provider:p,signer:f.authority,deployment,confirmations:2,mode:'LOCAL_TEST'}});const {app,rooms,testnet}=server;
  const login=async(wallet:typeof f.a)=>{const c=(await app.inject({method:'POST',url:'/testnet/challenge',headers:{origin},payload:{address:wallet.address,chainId:31337}})).json();const response=await app.inject({method:'POST',url:'/testnet/login',headers:{origin},payload:{nonce:c.nonce,signature:await wallet.signMessage(c.message)}});assert.equal(response.statusCode,200);return response.json().session as string;};
  const ta=await login(f.a),tb=await login(f.b),ha={origin,authorization:'Bearer '+ta},hb={origin,authorization:'Bearer '+tb};
  const created=await app.inject({method:'POST',url:'/testnet/rooms',headers:ha,payload:{opponent:f.b.address}});assert.equal(created.statusCode,200);const status=created.json();assert.deepEqual(status.verified,[false,false]);
  const aMessages:ServerMessage[]=[],bMessages:ServerMessage[]=[];
  const ca=await app.injectWS('/room',{headers:{origin}}),cb=await app.injectWS('/room',{headers:{origin}});ca.on('message',data=>aMessages.push(JSON.parse(data.toString())));cb.on('message',data=>bMessages.push(JSON.parse(data.toString())));
  const send=async(c:typeof ca,m:unknown)=>{c.send(JSON.stringify(m));await new Promise(r=>setTimeout(r,20));};await send(ca,{op:'funded',room:status.room,walletSession:ta,...IDENTIFIERS});await send(cb,{op:'funded',room:status.room,walletSession:tb,...IDENTIFIERS});await send(ca,{op:'ready'});assert.equal(aMessages.at(-1)?.op,'error');
  const fa=await receipt(as(f.escrow,f.a).fundMatch(status.offer,status.signature),'fund A');await p.send('evm_mine',[]);
  const verifiedA=await app.inject({method:'POST',url:'/testnet/rooms/'+status.room+'/verify',headers:ha,payload:{transactionHash:fa.hash}});assert.deepEqual(verifiedA.json().verified,[true,false]);await send(ca,{op:'ready'});assert.equal(aMessages.at(-1)?.op,'error');
  const fb=await receipt(as(f.escrow,f.b).fundMatch(status.offer,status.signature),'fund B');await p.send('evm_mine',[]);
  const verifiedB=await app.inject({method:'POST',url:'/testnet/rooms/'+status.room+'/verify',headers:hb,payload:{transactionHash:fb.hash}});assert.equal(verifiedB.statusCode,200);assert.deepEqual(verifiedB.json().verified,[true,true]);
  const notTerminal=await app.inject({method:'POST',url:'/testnet/rooms/'+status.room+'/result',headers:ha,payload:{}});assert.equal(notTerminal.statusCode,400);
  await send(ca,{op:'ready'});await send(cb,{op:'ready'});for(let i=0;i<60;i++)rooms.tick();
  await send(ca,{op:'command',id:'deploy',action:{kind:'deploy'}});for(let i=0;i<40;i++)rooms.tick();await send(cb,{op:'command',id:'concede',action:{kind:'surrender'}});
  const ra=await app.inject({method:'POST',url:'/testnet/rooms/'+status.room+'/result',headers:ha,payload:{}}),rb=await app.inject({method:'POST',url:'/testnet/rooms/'+status.room+'/result',headers:hb,payload:{}});assert.equal(ra.statusCode,200);assert.deepEqual(ra.json().settlement,rb.json().settlement);assert.equal(rooms.db.prepare('SELECT count(*) AS n FROM chain_results').get()!.n,1);
  const settlement=ra.json().settlement;assert.equal(settlement.result.spendA,String(parseEther('20')));assert.equal(settlement.result.spendB,'0');assert.equal(settlement.result.outcome,0);
  await receipt(as(f.escrow,f.b).settle(settlement.result,settlement.signature),'settle server result');await receipt(as(f.escrow,f.a).claim(),'claim A');await receipt(as(f.escrow,f.b).claim(),'claim B');assert.equal(await f.token.balanceOf(f.a.address),parseEther('98'));assert.equal(await f.token.balanceOf(f.b.address),parseEther('100'));assert.equal(await f.token.totalSupply(),parseEther('198'));assert.equal(await f.escrow.liabilities(),0n);
 }finally{if(server)await server.app.close();else p.destroy();await evm.stop();}
});
test('funding receipt reorganization aborts rather than authorizing an unprovable result',{timeout:120000},async()=>{
 const evm=await startEvm(18547),p=evm.provider;let server:Awaited<ReturnType<typeof buildServer>>|null=null;
 try{
  const f=await fixture(p),deployment={chainId:31337,rpc:evm.url,token:await f.token.getAddress(),escrow:await f.escrow.getAddress(),settlementSigner:f.authority.address,deploymentBlock:0,tokenCodeHash:keccak256(await p.getCode(f.token.target)),escrowCodeHash:keccak256(await p.getCode(f.escrow.target))};
  server=await buildServer({database:':memory:',manual:true,chain:{provider:p,signer:f.authority,deployment,confirmations:2,mode:'LOCAL_TEST'}});
  const created=await server.testnet.create(f.a.address,f.b.address),checkpoint=await p.send('evm_snapshot',[]);
  await receipt(as(f.escrow,f.a).fundMatch(created.offer,created.signature),'fund A');await receipt(as(f.escrow,f.b).fundMatch(created.offer,created.signature),'fund B');await p.send('evm_mine',[]);
  const ready=await server.testnet.status(created.room,f.a.address);assert.deepEqual(ready.verified,[true,true]);
  const original=p.getNetwork.bind(p);p.getNetwork=async()=>{throw Error('Test RPC outage');};await server.testnet.poll();assert.equal(server.rooms.rooms.get(created.room)!.fundingReady,false);p.getNetwork=original;
  await p.send('evm_revert',[checkpoint]);const reorg=await server.testnet.status(created.room,f.a.address);assert.deepEqual(reorg.verified,[false,false]);assert.equal(server.rooms.rooms.get(created.room)!.phase,'aborted');assert.equal(server.rooms.rooms.get(created.room)!.game.result,null);assert.equal(reorg.refundEligible,false);assert.equal(await f.token.balanceOf(f.a.address),parseEther('100'));
  await assert.rejects(()=>server!.testnet.result(created.room,f.a.address));assert.equal(server.rooms.db.prepare('SELECT count(*) AS n FROM chain_results').get()!.n,0);
 }finally{if(server)await server.app.close();else p.destroy();await evm.stop();}
});
