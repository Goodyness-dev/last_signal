import {buildServer} from '../apps/server/src/app.ts';
import {IDENTIFIERS,type ServerMessage} from '@last-signal/protocol';
import {WebSocket} from 'ws';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import assert from 'node:assert/strict';
const dir=mkdtempSync(join(tmpdir(),'last-signal-operation-')),database=join(dir,'rooms.sqlite'),origin='http://127.0.0.1:5174';
let current:Awaited<ReturnType<typeof buildServer>>|null=null;
const sockets:WebSocket[]=[];
async function client(url:string){
 const ws=new WebSocket(url.replace('http:','ws:')+'/room',{origin}),messages:ServerMessage[]=[];sockets.push(ws);
 ws.on('message',raw=>messages.push(JSON.parse(raw.toString())));ws.on('error',()=>{});
 await new Promise<void>((yes,no)=>{const timer=setTimeout(()=>no(Error('Transport open timed out')),15000);ws.once('open',()=>{clearTimeout(timer);yes();});ws.once('error',()=>{clearTimeout(timer);no(Error('Transport open failed'));});});
 const wait=async<T extends ServerMessage['op']>(op:T,predicate:(m:Extract<ServerMessage,{op:T}>)=>boolean=()=>true)=>{const start=Date.now();while(Date.now()-start<15000){const m=messages.filter((m):m is Extract<ServerMessage,{op:T}>=>m.op===op).findLast(predicate);if(m)return m;await new Promise(r=>setTimeout(r,20));}throw Error('Expected '+op+' did not arrive');};
 return {ws,messages,wait,send:(value:unknown)=>ws.send(JSON.stringify(value))};
}
try{
 current=await buildServer({database});const address=await current.app.listen({host:'127.0.0.1',port:0});
 const a=await client(address),b=await client(address);a.send({op:'create',...IDENTIFIERS});const sa=await a.wait('session');b.send({op:'join',room:sa.room,...IDENTIFIERS});const sb=await b.wait('session');
 a.send({op:'ready'});b.send({op:'ready'});await a.wait('snapshot',m=>m.phase==='running');
 const paid={op:'command',id:'operation-paid-once',action:{kind:'deploy'}};a.send(paid);const ack=await a.wait('ack',m=>m.id===paid.id);assert.equal(ack.ok,true);await a.wait('snapshot',m=>m.observation.budgets[0]===80);
 const tickBefore=current.rooms.rooms.get(sa.room)!.game.tick;
 const closedA=new Promise<number>(yes=>a.ws.once('close',yes)),closedB=new Promise<number>(yes=>b.ws.once('close',yes));await current.app.close();current=null;
 const codes=await Promise.all([closedA,closedB]);assert.deepEqual(codes,[1001,1001]);
 current=await buildServer({database});await current.app.listen({host:'127.0.0.1',port:Number(new URL(address).port)});
 const c=await client(address),d=await client(address);c.send({op:'resume',room:sa.room,token:sa.token,...IDENTIFIERS});d.send({op:'resume',room:sb.room,token:sb.token,...IDENTIFIERS});
 assert.equal((await c.wait('session')).side,0);assert.equal((await d.wait('session')).side,1);
 const recovered=await c.wait('snapshot',m=>m.observation.budgets[0]===80);assert.ok(recovered.observation.tick>=tickBefore);
 c.send(paid);const duplicate=await c.wait('ack',m=>m.id===paid.id);assert.deepEqual(duplicate,ack);assert.equal(current.rooms.rooms.get(sa.room)!.game.budgets[0],80);
 c.send({op:'command',id:'operation-concede',action:{kind:'surrender'}});const ra=await c.wait('snapshot',m=>m.phase==='finished'),rb=await d.wait('snapshot',m=>m.phase==='finished');assert.deepEqual(ra.observation.result,rb.observation.result);assert.equal(ra.observation.result?.winner,1);
 const report={checkedAt:new Date().toISOString(),mode:'LOCAL_UNFUNDED_OPERATIONAL_DRILL',transport:'Actual TCP loopback WebSocket clients',clients:2,closeCodes:codes,tickBeforeShutdown:tickBefore,recoveredTick:recovered.observation.tick,recoveredBudget:80,duplicatePaidCommand:'same acknowledgement, one 20 credit spend',sharedResult:ra.observation.result,public:false,chainTransactions:0,credentialsRecorded:false};
 writeFileSync(resolve(import.meta.dirname,'../docs/evidence/gate6-operation.json'),JSON.stringify(report,null,2)+'\n');console.log('Local network restart, reconnect, duplicate spending and shared result verified.');
}finally{for(const ws of sockets)ws.terminate();if(current)await current.app.close();rmSync(dir,{recursive:true,force:true});}
