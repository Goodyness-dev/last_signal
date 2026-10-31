import {describe,it,expect} from 'vitest';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Rooms,type Peer} from '../apps/server/src/rooms.ts';
import {buildServer} from '../apps/server/src/app.ts';
import {IDENTIFIERS,parseClient,type ServerMessage} from '@last-signal/protocol';
import {RULES} from '@last-signal/sim';
class Client implements Peer{
 messages:ServerMessage[]=[];closed=false;
 send(s:string){this.messages.push(JSON.parse(s));}
 close(){this.closed=true;}
 last<T extends ServerMessage['op']>(op:T){return this.messages.filter((m):m is Extract<ServerMessage,{op:T}>=>m.op===op).at(-1)!;}
}
const request=(c:ReturnType<Rooms['connect']>,m:unknown)=>c.receive(JSON.stringify(m));
function fixture(database=':memory:'){
 let now=1000;const rooms=new Rooms(database,()=>now,1000),a=new Client(),b=new Client(),ca=rooms.connect(a),cb=rooms.connect(b);
 request(ca,{op:'create',...IDENTIFIERS});const sa=a.last('session');request(cb,{op:'join',room:sa.room,...IDENTIFIERS});
 const sb=b.last('session');
 const pulse=(n=1)=>{for(let i=0;i<n;i++){now+=50;request(ca,{op:'ping'});request(cb,{op:'ping'});rooms.tick();}};
 const start=()=>{request(ca,{op:'ready'});request(cb,{op:'ready'});pulse(RULES.countdown);};
 return {rooms,a,b,ca,cb,sa,sb,pulse,start,setNow:(n:number)=>{now=n;},getNow:()=>now};
}
describe('authoritative private rooms',()=>{
 it('validates bounded envelopes, forbids client side identity and rejects nonfinite geometry',()=>{
  expect(()=>parseClient(JSON.stringify({op:'command',id:'x',action:{kind:'deploy',side:1}}))).toThrow();
  expect(()=>parseClient(JSON.stringify({op:'command',id:'x',action:{kind:'move',squadId:1,target:{x:null,z:4}}}))).toThrow();
  expect(()=>parseClient('x'.repeat(2049))).toThrow('large');expect(()=>parseClient(JSON.stringify({op:'create',...IDENTIFIERS,rules:'wrong'}))).toThrow('Version');
 });
 it('readies two seats, runs server ticks and moves only authorized squads',()=>{
  const f=fixture();try{
   expect(f.a.last('snapshot').observation.squads.map(s=>s.id)).toEqual([1]);expect(f.b.last('snapshot').observation.squads.map(s=>s.id)).toEqual([2]);
   f.start();request(f.ca,{op:'command',id:'move',action:{kind:'move',squadId:1,target:{x:18,z:16}}});f.pulse(20);
   expect(f.a.last('ack').ok).toBe(true);expect(f.a.last('snapshot').observation.squads[0].x).toBeGreaterThan(4);
   request(f.ca,{op:'command',id:'spoof',action:{kind:'move',squadId:2,target:{x:28,z:16}}});expect(f.a.last('ack').ok).toBe(false);
   expect(f.rooms.rooms.get(f.sa.room)!.game.squads.find(s=>s.id===2)!.route).toHaveLength(0);
  }finally{f.rooms.close();}
 });
 it('commits spending and persistent deduplication atomically and rejects changed replays',()=>{
  const dir=mkdtempSync(join(tmpdir(),'last-signal-')),path=join(dir,'rooms.sqlite');const f=fixture(path);
  f.start();const msg={op:'command',id:'paid',action:{kind:'deploy'}};request(f.ca,msg);const ack=f.a.last('ack');request(f.ca,msg);
  expect(f.a.last('ack')).toEqual(ack);expect(f.rooms.rooms.get(f.sa.room)!.game.budgets[0]).toBe(80);
  request(f.ca,{...msg,action:{kind:'surrender'}});expect(f.a.last('error').reason).toContain('different');
  const tick=f.rooms.rooms.get(f.sa.room)!.game.tick;f.rooms.close();
  const recovered=new Rooms(path,()=>f.getNow(),1000),a=new Client(),b=new Client(),ca=recovered.connect(a),cb=recovered.connect(b);
  try{
   request(ca,{op:'resume',room:f.sa.room,token:f.sa.token,...IDENTIFIERS});request(cb,{op:'resume',room:f.sb.room,token:f.sb.token,...IDENTIFIERS});
   expect(a.last('session').side).toBe(0);expect(recovered.rooms.get(f.sa.room)!.game.tick).toBe(tick);
   request(ca,msg);expect(a.last('ack')).toEqual(ack);expect(recovered.rooms.get(f.sa.room)!.game.budgets[0]).toBe(80);
  }finally{recovered.close();rmSync(dir,{recursive:true,force:true});}
 });
 it('filters coordinates, nested event positions and enemy intent before transport',()=>{
  const f=fixture();try{
   f.start();const r=f.rooms.rooms.get(f.sa.room)!;
   r.game.squads[0].x=21;r.game.squads[1].x=27;r.game.squads[1].route=[{x:40,z:30}];
   r.game.events.push({seq:++r.game.eventSeq,tick:r.game.tick,kind:'Reloaded',side:1,to:r.game.squads[1]});f.pulse(2);
   const packet=f.a.last('snapshot'),enemy=packet.observation.squads.find(s=>s.side===1)!;
   expect(enemy.route).toEqual([]);expect(enemy.reserveAmmo).toBe(0);expect(Object.keys(packet.events.find(e=>e.kind==='Reloaded')!.to!)).toEqual(['x','z']);
   r.game.squads[1].x=43;r.game.squads[1].z=30;r.game.squads[1].route=[];
   r.game.events.push({seq:++r.game.eventSeq,tick:r.game.tick,kind:'ShotFired',side:1,from:{x:43,z:30},to:{x:42,z:30}});f.pulse(2);
   expect(f.a.last('snapshot').observation.squads.every(s=>s.side===0)).toBe(true);expect(f.a.last('snapshot').events.some(e=>e.from?.x===43)).toBe(false);
   expect(f.a.last('snapshot').observation.budgets[1]).toBe(-1);
  }finally{f.rooms.close();}
 });
 it('does not acknowledge or retain spending when the durable insert fails',()=>{
  const f=fixture();try{
   f.start();f.rooms.db.exec("CREATE TRIGGER reject_command BEFORE INSERT ON commands BEGIN SELECT RAISE(FAIL,'Test persistence failure'); END;");
   request(f.ca,{op:'command',id:'uncommitted',action:{kind:'deploy'}});
   expect(f.a.last('ack')).toBeUndefined();expect(f.rooms.rooms.get(f.sa.room)!.game.budgets[0]).toBe(100);
   expect(f.rooms.rooms.get(f.sa.room)!.phase).toBe('aborted');expect(f.b.last('snapshot').phase).toBe('aborted');
   expect(f.rooms.db.prepare('SELECT count(*) AS n FROM commands').get()!.n).toBe(0);
  }finally{f.rooms.close();}
 });
 it('pauses without advancing, resumes matching credentials, then forfeits one absent player',()=>{
  const f=fixture();try{
   f.start();f.cb.close();const r=f.rooms.rooms.get(f.sa.room)!,tick=r.game.tick;f.pulse(5);expect(r.game.tick).toBe(tick);
   const b=new Client(),cb=f.rooms.connect(b);request(cb,{op:'resume',room:f.sb.room,token:f.sb.token,...IDENTIFIERS});f.rooms.tick();expect(r.game.tick).toBe(tick+1);
   cb.close();f.setNow(f.getNow()+1100);request(f.ca,{op:'ping'});f.rooms.tick();expect(r.phase).toBe('finished');expect(r.game.result?.winner).toBe(0);
  }finally{f.rooms.close();}
 });
 it('aborts both disconnected or corrupt recovery instead of assigning a winner',()=>{
  const f=fixture();f.start();f.ca.close();f.cb.close();f.setNow(f.getNow()+1100);f.rooms.tick();expect(f.rooms.rooms.get(f.sa.room)!.phase).toBe('aborted');expect(f.rooms.rooms.get(f.sa.room)!.game.result).toBeNull();f.rooms.close();
  const dir=mkdtempSync(join(tmpdir(),'last-signal-')),path=join(dir,'rooms.sqlite'),g=fixture(path);g.rooms.db.prepare('UPDATE rooms SET digest=?').run('broken');g.rooms.close();const restored=new Rooms(path);
  expect(restored.rooms.get(g.sa.room)!.phase).toBe('aborted');expect(restored.rooms.get(g.sa.room)!.game.result).toBeNull();restored.close();rmSync(dir,{recursive:true,force:true});
 });
 it('does not let a failed credential or already connected resume control the victim seat',()=>{
  const f=fixture();try{f.start();const attacker=new Client(),c=f.rooms.connect(attacker);
   request(c,{op:'resume',room:f.sa.room,token:'0'.repeat(64),...IDENTIFIERS});request(c,{op:'command',id:'attack',action:{kind:'surrender'}});expect(attacker.last('error').reason).toContain('Authenticate');
   request(c,{op:'resume',room:f.sa.room,token:f.sa.token,...IDENTIFIERS});request(c,{op:'command',id:'attack2',action:{kind:'surrender'}});expect(attacker.last('error').reason).toContain('Authenticate');expect(f.rooms.rooms.get(f.sa.room)!.game.result).toBeNull();
  }finally{f.rooms.close();}
 });
 it('aborts restart if a checkpoint cannot be reconciled with its durable commands',()=>{
  const dir=mkdtempSync(join(tmpdir(),'last-signal-')),path=join(dir,'rooms.sqlite'),f=fixture(path);
  f.start();request(f.ca,{op:'command',id:'paid',action:{kind:'deploy'}});
  f.rooms.db.exec('DELETE FROM commands');f.rooms.close();const restored=new Rooms(path);
  try{expect(restored.rooms.get(f.sa.room)!.phase).toBe('aborted');expect(restored.rooms.get(f.sa.room)!.game.result).toBeNull();}
  finally{restored.close();rmSync(dir,{recursive:true,force:true});}
 });
 it('finishes a full relay match with one shared result and rate limits floods',()=>{
  const f=fixture();try{
   f.start();request(f.ca,{op:'command',id:'north',action:{kind:'move',squadId:1,target:{x:24,z:7}}});
   request(f.cb,{op:'command',id:'south',action:{kind:'move',squadId:2,target:{x:24,z:25}}});
   f.pulse(5400);const r=f.rooms.rooms.get(f.sa.room)!;expect(r.phase).toBe('finished');expect(f.a.last('snapshot').observation.result).toEqual(f.b.last('snapshot').observation.result);expect(r.game.scores[0]).toBeGreaterThanOrEqual(240);
   const attacker=new Client(),c=f.rooms.connect(attacker);for(let i=0;i<62;i++)request(c,{op:'ping'});expect(attacker.closed).toBe(true);
  }finally{f.rooms.close();}
 });
 it('enforces the WebSocket origin and payload size at the transport',async()=>{
  const {app}=await buildServer({database:':memory:',manual:true});try{
   const denied=await app.inject({method:'GET',url:'/room',headers:{origin:'https://evil.invalid'}});expect(denied.statusCode).toBe(403);
   const ws=await app.injectWS('/room',{headers:{origin:'http://127.0.0.1:5174'}});ws.on('error',()=>{});
   const code=new Promise<number>(resolve=>ws.on('close',resolve));ws.send('x'.repeat(3000));expect(await code).toBe(1009);
  }finally{await app.close();}
 });
});
