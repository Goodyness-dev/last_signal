import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {createGame,command,step,observe,visible,RULES,MAP,type Game,type Side,type Command} from '@last-signal/sim';
import {parseClient,IDENTIFIERS,type Phase,type ServerMessage,type Action} from '@last-signal/protocol';
export interface Peer{send(data:string):void;close(code?:number):void}
type Seat={hash:string;ready:boolean;peer:Peer|null;seen:number;cursor:number};
export type FundedRoom={players:[string,string];chainId:number;matchId:string;escrow:string};
type Room={id:string;game:Game;phase:Phase;seats:(Seat|null)[];order:number;reason:string;funded?:FundedRoom;fundingReady?:boolean;fundingCheckedAt?:number};
type Saved={id:string;game:Game;phase:Phase;seats:({hash:string;ready:boolean}|null)[];order:number;reason:string;identifiers:typeof IDENTIFIERS;funded?:FundedRoom};
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const fresh=()=>randomBytes(32).toString('hex');
export class Rooms{
 readonly rooms=new Map<string,Room>();
 readonly db:DatabaseSync;
 private clients=new Set<Peer>();
 constructor(path:string,private now:()=>number=Date.now,private grace=60000){
  this.db=new DatabaseSync(path);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS rooms(id TEXT PRIMARY KEY,state TEXT NOT NULL,digest TEXT NOT NULL); CREATE TABLE IF NOT EXISTS commands(room TEXT,side INTEGER,id TEXT,payload TEXT,ack TEXT,PRIMARY KEY(room,side,id));');
  for(const row of this.db.prepare('SELECT * FROM rooms').all()){
   try{
    const data=String(row.state),s=JSON.parse(data) as Saved;
    if(hash(data)!==row.digest||JSON.stringify(s.identifiers)!==JSON.stringify(IDENTIFIERS)||s.id!==row.id||!Number.isSafeInteger(s.game.tick)||!Array.isArray(s.game.squads)||!Array.isArray(s.seats)||s.seats.length!==2)throw Error('Unprovable checkpoint');
    const ledger=this.db.prepare("SELECT count(*) AS n,max(json_extract(ack,'$.order')) AS last,max(json_extract(ack,'$.tick')) AS tick FROM commands WHERE room=?").get(s.id)!;
    if(ledger.n!==s.order||(s.order>0&&(ledger.last!==s.order||Number(ledger.tick)>s.game.tick)))throw Error('Command history cannot prove checkpoint');
    this.rooms.set(s.id,{...s,fundingReady:false,seats:s.seats.map(p=>p?{...p,peer:null,seen:this.now(),cursor:s.game.eventSeq}:null)});
   }catch{
    const game=createGame();this.rooms.set(String(row.id),{id:String(row.id),game,phase:'aborted',seats:[null,null],order:0,reason:'Checkpoint cannot be verified. Room aborted without a result.'});
   }
  }
 }
 private saved(r:Room):Saved{return {id:r.id,game:r.game,phase:r.phase,seats:r.seats.map(p=>p?{hash:p.hash,ready:p.ready}:null),order:r.order,reason:r.reason,funded:r.funded,identifiers:IDENTIFIERS};}
 private write(r:Room){const data=JSON.stringify(this.saved(r));this.db.prepare('INSERT OR REPLACE INTO rooms VALUES(?,?,?)').run(r.id,data,hash(data));}
 private send(p:Peer,m:ServerMessage){p.send(JSON.stringify(m));}
 private fail(p:Peer,reason:string){this.send(p,{op:'error',reason});}
 createFunded(funded:FundedRoom){
  if([...this.rooms.values()].filter(r=>!['finished','aborted'].includes(r.phase)).length>=16)throw Error('Local room limit reached');
  const id=randomBytes(8).toString('hex'),r:Room={id,game:createGame(1,{untimed:true}),phase:'lobby',seats:[0,1].map(()=>({hash:hash(fresh()),ready:false,peer:null,seen:this.now(),cursor:0})),order:0,reason:'Waiting for confirmed testnet deposits',funded,fundingReady:false};this.rooms.set(id,r);this.write(r);return r;
 }
 setFundingVerified(id:string,ready:boolean){const r=this.rooms.get(id);if(r){r.fundingReady=ready;r.fundingCheckedAt=this.now();}}
 abortFunded(id:string,reason:string){const r=this.rooms.get(id);if(r&&r.phase!=='finished'&&r.phase!=='aborted'){r.phase='aborted';r.game.result=null;r.reason=reason;this.write(r);this.broadcast(r);}}
 connect(peer:Peer,walletIdentity?:(token:string)=>string|null){
  if(this.clients.size>=64){peer.close(1013);return {receive:(_:string)=>{},close:()=>{}};}
  this.clients.add(peer);let seat:Seat|null=null,room:Room|null=null,side:Side=0,walletSession='',window=this.now(),count=0,createdAt=this.now();
  const receive=(raw:string)=>{
   if(this.now()-window>=1000){window=this.now();count=0;}if(++count>60){this.fail(peer,'Rate limit exceeded');peer.close(1008);return;}
   try{
    const m=parseClient(raw);
    if(m.op==='create'||m.op==='join'||m.op==='resume'||m.op==='funded'){
     if(seat)throw Error('Session already authenticated');
     let token:string;
     if(m.op==='create'){
      if([...this.rooms.values()].filter(r=>!['finished','aborted'].includes(r.phase)).length>=16)throw Error('Local room limit reached');
      token=fresh();const id=randomBytes(8).toString('hex');
      room={id,game:createGame(1,{untimed:true}),phase:'lobby',seats:[null,null],order:0,reason:'Waiting for two players to ready'};side=0;
      seat={hash:hash(token),ready:false,peer,seen:this.now(),cursor:0};room.seats[0]=seat;this.rooms.set(id,room);
     }else{
      room=this.rooms.get(m.room)??null;if(!room)throw Error('Room not found');
      if(room.phase==='aborted'&&room.seats.every(s=>s===null))throw Error(room.reason);
      if(m.op==='funded'){
       const address=walletIdentity?.(m.walletSession);if(!address||!room.funded)throw Error('Valid wallet authentication required');
       const index=room.funded.players.findIndex(p=>p.toLowerCase()===address.toLowerCase());if(index<0)throw Error('Wallet is not a match participant');
       side=index as Side;const candidate=room.seats[side];if(!candidate)throw Error('Unprovable room. Use chain refund recovery.');if(candidate.peer)throw Error('Session is already connected');
       walletSession=m.walletSession;token=fresh();seat=candidate;seat.hash=hash(token);seat.peer=peer;seat.seen=this.now();seat.cursor=room.game.eventSeq;
      }else if(m.op==='resume'){
       if(room.funded)throw Error('Funded rooms require wallet authentication');
       const digest=hash(m.token),index=room.seats.findIndex(s=>s&&timingSafeEqual(Buffer.from(s.hash),Buffer.from(digest)));
       if(index<0)throw Error('Invalid session credential');side=index as Side;const candidate=room.seats[side]!;
       if(candidate.peer)throw Error('Session is already connected');seat=candidate;token=m.token;seat.peer=peer;seat.seen=this.now();seat.cursor=room.game.eventSeq;
      }else{
       if(room.funded)throw Error('Funded rooms require wallet authentication');
       if(room.phase!=='lobby'||room.seats[1])throw Error('Room is full or already started');
       token=fresh();side=1;seat={hash:hash(token),ready:false,peer,seen:this.now(),cursor:room.game.eventSeq};room.seats[1]=seat;
      }
     }
     this.write(room);this.send(peer,{op:'session',room:room.id,token,side,...IDENTIFIERS});this.broadcast(room);return;
    }
    if(!seat||!room||seat.peer!==peer)throw Error('Authenticate first');if(room.funded&&!walletIdentity?.(walletSession))throw Error('Wallet login expired. Reauthenticate.');seat.seen=this.now();
    if(m.op==='ping')return;
    if(m.op==='ready'){
     if(room.phase!=='lobby')throw Error('Match already started');if(room.funded&&!this.fundedActive(room))throw Error('Waiting for two verified testnet deposits');seat.ready=true;
     if(room.seats.every(s=>s?.ready)){room.phase='countdown';room.reason='Both ready. Server countdown';}
     this.write(room);this.broadcast(room);return;
    }
    const payload=JSON.stringify(m.action),old=this.db.prepare('SELECT payload,ack FROM commands WHERE room=? AND side=? AND id=?').get(room.id,side,m.id);
    if(old){if(old.payload!==payload)throw Error('Command ID already used with different content');peer.send(String(old.ack));return;}
    if(room.phase!=='running'||!this.active(room))throw Error('Match is not running. Waiting for both players.');
    const backup=structuredClone(room.game),oldOrder=room.order;
    let ack:Extract<ServerMessage,{op:'ack'}>;
    try{
     this.db.exec('BEGIN IMMEDIATE');
     const result=command(room.game,{...m.action,id:m.id,side} as Command);room.game.seen={};if(room.game.result){room.phase='finished';room.reason=room.game.result.reason;}
     ack={op:'ack' as const,id:m.id,...result,tick:room.game.tick,order:++room.order};
     this.write(room);this.db.prepare('INSERT INTO commands VALUES(?,?,?,?,?)').run(room.id,side,m.id,payload,JSON.stringify(ack));
     this.db.exec('COMMIT');
    }catch(error){try{this.db.exec('ROLLBACK');}catch{}room.game=backup;room.order=oldOrder;room.phase='aborted';room.game.result=null;room.reason='Persistence failed. No result can be proved.';this.broadcast(room);throw error;}
    this.send(peer,ack);this.broadcast(room);
   }catch(error){this.fail(peer,error instanceof Error?error.message:'Request rejected');}
  };
  return {receive,close:()=>{this.clients.delete(peer);if(seat?.peer===peer){seat.peer=null;seat.seen=this.now();if(room)this.broadcast(room);}},expired:()=>!seat&&this.now()-createdAt>10000};
 }
 private fundedActive(r:Room){return !r.funded||!!r.fundingReady&&this.now()-(r.fundingCheckedAt??0)<8000;}
 private active(r:Room){return this.fundedActive(r)&&r.seats.every(s=>s?.peer&&this.now()-s.seen<6000);}
 private broadcast(r:Room){for(const side of [0,1] as const){
  const seat=r.seats[side];if(!seat?.peer)continue;
  const o=observe(r.game,side);
  // Enemy intent and inventory are never sent, even when its body is visible.
  for(const s of o.squads.filter(s=>s.side!==side)){s.route=[];delete s.drive;delete s.driveUntil;delete s.focusId;delete s.rifleAim;s.ammo=0;s.reserveAmmo=0;s.weapons=[];}
  const events=r.game.events.filter(e=>e.seq>seat.cursor&&e.kind!=='DeployAccepted'&&(!e.from||visible(r.game,side,e.from))&&(!e.to||visible(r.game,side,e.to))).map(e=>({...e,from:e.from?{x:e.from.x,z:e.from.z}:undefined,to:e.to?{x:e.to.x,z:e.to.z}:undefined}));
  seat.cursor=r.game.eventSeq;
  this.send(seat.peer,{op:'snapshot',room:r.id,side,phase:r.phase,paused:!this.active(r),reason:r.phase==='aborted'?r.reason:!this.fundedActive(r)?'Waiting for confirmed funding or RPC recovery':!this.active(r)?'Waiting for both connections. Match paused.':r.reason,ready:r.seats.map(s=>s?.ready??false),connected:r.seats.map(s=>!!s?.peer),countdown:r.game.countdown,observation:o,events,...IDENTIFIERS});
 }}
 tick(){for(const r of this.rooms.values()){
  if(r.phase==='finished'||r.phase==='aborted')continue;
  for(const s of r.seats)if(s?.peer&&this.now()-s.seen>=6000){const p=s.peer;s.peer=null;p.close(1001);}
  if(!this.active(r)){
   const missing=r.seats.map((s,i)=>!s?.peer&&this.now()-(s?.seen??this.now())>this.grace?i:-1).filter(i=>i>=0);
   if(missing.length&&r.phase==='lobby'&&!r.funded){r.phase='aborted';r.reason='Lobby connection grace expired';this.write(r);}
   else if(missing.length&&r.phase!=='lobby'){
    if(r.seats.filter(s=>s?.peer).length===1){const winner=r.seats[0]?.peer?0:1;r.game.result={winner,reason:'Opponent connection grace expired'};r.phase='finished';}
    else {r.phase='aborted';r.reason='Both players disconnected. No winner assigned.';}
    this.write(r);
   }
   this.broadcast(r);continue;
  }
  if(r.phase==='lobby'){this.broadcast(r);continue;}
  step(r.game);r.phase=r.game.result?'finished':r.game.countdown?'countdown':'running';r.reason=r.game.result?.reason??'Server authoritative private match';
  try{this.write(r);}catch{r.phase='aborted';r.reason='Checkpoint failed. No result assigned.';r.game.result=null;}
  if(r.game.tick%2===0||r.phase==='finished'||r.phase==='aborted'||r.game.countdown>0)this.broadcast(r);
 }}
 disconnectAll(){for(const r of this.rooms.values())for(const s of r.seats)s?.peer?.close(1001);}
 close(){this.disconnectAll();this.db.close();}
}
