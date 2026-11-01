import './private.css';
import {Battlefield} from './scene.ts';
import {IDENTIFIERS,type Action,type ServerMessage} from '@last-signal/protocol';
import {RULES,type Observation,type GameEvent,type Side} from '@last-signal/sim';
const app=document.querySelector<HTMLElement>('#app')!;
app.innerHTML=`<main id="private-app"><header><a href="/">▥ LAST SIGNAL</a><b>PRIVATE ROOM · NO FUNDS</b><a href="/">LOCAL PRACTICE</a></header><section id="connection"><h1>Meet at the front.</h1><p>Two players. One server controlled battlefield. Capture radio stations to reach 240 signal. Your squads fire automatically. No wallet or real tokens.</p><button id="create-room">CREATE PRIVATE ROOM</button><label>Room code <input id="room-code" maxlength="16" autocomplete="off" placeholder="Paste the 16 character code"></label><button id="join-room">JOIN ROOM</button><button id="resume-room" hidden>RECONNECT TO MY ROOM</button><p id="connection-note" role="status">Local service required on port 3001.</p></section><section id="private-play" hidden><div id="room-bar"><span>ROOM <b id="room-id"></b></span><span id="seat-name"></span><span id="match-state" role="status"></span><button id="ready">READY</button><button id="reconnect">RECONNECT</button><button id="concede">CONCEDE</button><button id="new-room" hidden>NEW ROOM</button></div><div id="battlefield"><div class="relay-label"></div><div class="relay-label"></div><div class="relay-label"></div><div id="private-score">YOU <b id="you-score">0</b> / <b id="opponent-score">0</b> OPPONENT</div><div id="match-result" hidden role="status"></div></div><nav id="private-controls"><div id="squads"></div><button data-station="0">GO TO A</button><button data-station="1">GO TO B</button><button data-station="2">GO TO C</button><button data-view="tactical">COMMAND VIEW</button><button data-view="eyes">EYE LEVEL</button><button id="deploy-private">DEPLOY · 20 CR</button><button id="shield-private">SHIELD · 10 CR</button><button id="reload-private">RELOAD · R</button><button id="fire-private">FIRE</button><span id="private-budget"></span></nav><p id="order-status" role="status">Ready both players. Click ground to move. WASD drives your selected squad. In eye level, hold right mouse and drag to look; hold left mouse to fire. P does not pause a multiplayer match.</p><small>Unfunded private relay mode. No local bot, WIF inventory, wallet or escrow. Both connections are required. A lost connection pauses the server for up to 60 seconds.</small></section></main>`;
const el=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
let socket:WebSocket|null=null,session:{room:string;token:string}|null=null,snapshot:Extract<ServerMessage,{op:'snapshot'}>|null=null,selected:number|null=null,sequence=0,stopped=false,lastFrame=performance.now(),driveAt=0,fireAt=0,trigger=false,looking=false,lastPointer:{x:number;y:number}|null=null;
const fundedRoom=new URLSearchParams(location.search).get('funded');
const walletAuth=()=>{try{return JSON.parse(sessionStorage.getItem('last-signal-testnet-auth')??'null') as {session:string;expires:number;address:string}|null;}catch{return null;}};
const held=new Set<string>(),prefix=crypto.randomUUID();
const scene=new Battlefield(el('battlefield'),[...document.querySelectorAll<HTMLElement>('.relay-label')]);scene.setView('tactical');
const note=(text:string)=>{el('connection-note').textContent=text;el('order-status').textContent=text;};
try{session=JSON.parse(sessionStorage.getItem('last-signal-private')??'null');if(session)el('resume-room').hidden=false;}catch{/* Keep room play available without browser storage. */}
function send(message:unknown){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(message));else note('Connection unavailable. Choose RECONNECT.');}
function connect(first:unknown){
 socket?.close();snapshot=null;el('match-result').hidden=true;stopped=false;held.clear();trigger=false;
 socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/room`);const current=socket;
 current.onopen=()=>current.send(JSON.stringify(first));
 current.onerror=()=>note('Cannot reach the private service. Start npm run server, then reconnect.');
 current.onclose=()=>{if(socket===current){stopped=true;held.clear();trigger=false;note('Disconnected. Match pauses on the server. Reconnect within 60 seconds.');el('match-state').textContent='DISCONNECTED';for(const id of ['deploy-private','shield-private','reload-private','fire-private'])el<HTMLButtonElement>(id).disabled=true;}};
 current.onmessage=e=>{
  if(socket!==current)return;const m=JSON.parse(String(e.data)) as ServerMessage;
  if(m.op==='error'){note(m.reason);return;}
  if(m.op==='session'){
   if(m.protocol!==IDENTIFIERS.protocol||m.rules!==IDENTIFIERS.rules||m.map!==IDENTIFIERS.map){current.close();note('Version mismatch. Reload both clients.');return;}
   session={room:m.room,token:m.token};try{sessionStorage.setItem('last-signal-private',JSON.stringify(session));}catch{/* Credentials remain in this tab memory. */}
   note('Connected. Ready both players, then choose a station or move directly.');el('connection').hidden=true;el('private-play').hidden=false;el('room-id').textContent=m.room;el('seat-name').textContent='PLAYER '+(m.side+1);el('resume-room').hidden=false;scene.resetMatch();scene.setView('tactical');if(m.side===1)scene.view.rotate(Math.PI/.0026,0);return;
  }
  if(m.op==='ack'){note(m.reason+' · server tick '+m.tick+' · order '+m.order);return;}
  snapshot=m;stopped=m.paused||m.phase!=='running';el('new-room').hidden=!['finished','aborted'].includes(m.phase);el<HTMLButtonElement>('concede').disabled=stopped;
  const own=m.observation.squads.filter(s=>s.side===m.side);if(!own.some(s=>s.id===selected))selected=own[0]?.id??null;
  el('match-state').textContent=['finished','aborted'].includes(m.phase)?m.phase.toUpperCase():m.paused?'PAUSED · '+m.reason:m.phase==='countdown'?'START IN '+Math.ceil(m.countdown/RULES.ticks)+'s':m.phase.toUpperCase();
  el<HTMLButtonElement>('ready').disabled=m.phase!=='lobby'||m.ready[m.side];el('ready').textContent=m.ready[m.side]?'READY ✓':'READY';
  el('you-score').textContent=String(m.observation.scores[m.side]);el('opponent-score').textContent=String(m.observation.scores[1-m.side]);
  el('private-budget').textContent=m.observation.budgets[m.side]+(fundedRoom?' tWIF BATTLE ALLOCATION · SERVER TRACKED':' SIMULATED CR');
  const signature=own.map(s=>s.id+':'+Math.ceil(s.hp)+':'+(s.id===selected)).join('|');
  if(el('squads').dataset.signature!==signature){el('squads').dataset.signature=signature;el('squads').replaceChildren(...own.map((s,i)=>{const b=document.createElement('button');b.textContent='SQUAD '+(i+1)+' · '+Math.ceil(s.hp)+' HP';b.classList.toggle('selected',s.id===selected);b.onclick=()=>{selected=s.id;el('squads').dataset.signature='';};return b;}));}
  for(const id of ['deploy-private','shield-private','reload-private','fire-private'])el<HTMLButtonElement>(id).disabled=stopped;
  if(m.phase==='aborted'||m.observation.result){const r=m.observation.result;el('match-result').hidden=false;el('match-result').textContent=m.phase==='aborted'?'ROOM ABORTED · '+m.reason:r?.winner===null?'DRAW · '+r.reason:(r?.winner===m.side?'YOU WON':'OPPONENT WON')+' · '+r?.reason;note(fundedRoom?'Battle ended. Return to the testnet token panel to settle or recover. Chain settlement is separate.':'Shared server result. Return to LOCAL PRACTICE or create a new room.');}
 };
}
const withVersions=(m:object)=>({...m,...IDENTIFIERS});
el('create-room').onclick=()=>connect(withVersions({op:'create'}));el('new-room').onclick=()=>{if(fundedRoom)location.href='/testnet.html';else connect(withVersions({op:'create'}));};
el('join-room').onclick=()=>{const room=el<HTMLInputElement>('room-code').value.trim().toLowerCase();if(!/^[a-f0-9]{16}$/.test(room))return note('Enter the full 16 character room code.');connect(withVersions({op:'join',room}));};
const resume=async()=>{if(fundedRoom){const a=walletAuth();if(!a||a.expires<=Date.now())return note('Wallet login required. Return to the testnet token panel.');const eth=(window as Window&{ethereum?:{request:(input:{method:string})=>Promise<unknown>}}).ethereum;if(!eth)return note('An EVM wallet is required for this funded match. Return to the token panel.');try{const chain=await eth.request({method:'eth_chainId'}),accounts=await eth.request({method:'eth_accounts'}) as string[];if(BigInt(String(chain))!==46630n||accounts[0]?.toLowerCase()!==a.address.toLowerCase()){sessionStorage.removeItem('last-signal-testnet-auth');return note('Wallet account or network differs from login. Reauthenticate on Robinhood Chain Testnet.');}}catch{return note('Wallet access unavailable. Reauthenticate in the token panel.');}connect(withVersions({op:'funded',room:fundedRoom,walletSession:a.session}));return;}if(session)connect(withVersions({op:'resume',...session}));else note('No room credential is saved in this tab.');};el('resume-room').onclick=resume;el('reconnect').onclick=resume;
el('ready').onclick=()=>send({op:'ready'});
function order(action:Action){if(stopped||!snapshot)return note('Waiting for a running server match.');send({op:'command',id:prefix+':'+ ++sequence,action});}
el('concede').onclick=()=>order({kind:'surrender'});
document.querySelectorAll<HTMLButtonElement>('[data-station]').forEach(b=>b.onclick=()=>{if(selected!==null&&snapshot){const r=snapshot.observation.relays[Number(b.dataset.station)];order({kind:'move',squadId:selected,target:{x:r.x+(snapshot.side===0?-1:1),z:r.z}});}});
el('deploy-private').onclick=()=>order({kind:'deploy'});el('shield-private').onclick=()=>{if(selected!==null)order({kind:'shield',squadId:selected});};
function fire(){if(selected!==null){order({kind:'fire',squadId:selected,direction:scene.aimDirection()});scene.fireWeapon();}}
el('fire-private').onclick=fire;
function reload(){if(selected!==null)order({kind:'reload',squadId:selected});}el('reload-private').onclick=reload;
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.onclick=()=>{scene.setView(b.dataset.view as 'eyes'|'tactical');held.clear();trigger=false;});
const canvas=scene.renderer.domElement;
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{if((e.target as HTMLElement).tagName!=='CANVAS')return;lastPointer={x:e.clientX,y:e.clientY};if(scene.viewMode==='eyes'){looking=e.button===2;trigger=e.button===0;if(trigger)fire();}else if(selected!==null){const target=scene.pick(e.clientX,e.clientY);if(target)order({kind:'move',squadId:selected,target});}});
canvas.addEventListener('pointermove',e=>{if(looking&&lastPointer)scene.view.rotate(e.clientX-lastPointer.x,e.clientY-lastPointer.y);lastPointer={x:e.clientX,y:e.clientY};});
const release=()=>{trigger=false;looking=false;held.clear();};window.addEventListener('pointerup',()=>{trigger=false;looking=false;});window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);
window.addEventListener('keydown',e=>{if((e.target as HTMLElement).matches('input'))return;if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){e.preventDefault();held.add(e.code);}if(e.code==='KeyR'&&!e.repeat)reload();});
window.addEventListener('keyup',e=>{held.delete(e.code);if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)&&!held.size&&selected!==null&&!stopped)order({kind:'drive',squadId:selected,direction:{x:0,z:0}});});
setInterval(()=>{if(socket?.readyState===WebSocket.OPEN)send({op:'ping'});},2000);
function localView(m:Extract<ServerMessage,{op:'snapshot'}>):{o:Observation;events:GameEvent[]}{
 const o=structuredClone(m.observation),side=m.side,flip=(s:Side)=>(side===0?s:1-s) as Side;
 for(const s of o.squads)s.side=flip(s.side);for(const r of o.relays){if(r.owner!==null)r.owner=flip(r.owner);if(r.attacker!==null)r.attacker=flip(r.attacker);}
 if(side===1){o.budgets.reverse();o.scores.reverse();o.cooldowns.reverse();}return {o,events:m.events.map(e=>({...e,side:e.side===undefined?undefined:flip(e.side)}))};
}
function frame(now:number){const dt=Math.min(.1,(now-lastFrame)/1000);lastFrame=now;
 if(snapshot){const {o,events}=localView(snapshot);scene.update(o,selected,events,dt);if(!stopped&&selected!==null){
  if(held.size&&now-driveAt>=70){driveAt=now;order({kind:'drive',squadId:selected,direction:scene.view.direction(Number(held.has('KeyW'))-Number(held.has('KeyS')),Number(held.has('KeyD'))-Number(held.has('KeyA')))});}
  if(trigger&&now-fireAt>=250){fireAt=now;fire();}
 }}requestAnimationFrame(frame);
}requestAnimationFrame(frame);

if(fundedRoom){document.querySelector('header b')!.textContent='TESTNET ESCROW MATCH';const link=document.createElement('a');link.href='/testnet.html';link.textContent='RETURN TO TOKENS / CLAIMS';document.querySelector('header')!.append(link);const eth=(window as Window&{ethereum?:{on?:(event:string,fn:()=>void)=>void}}).ethereum;const changed=()=>{socket?.close();sessionStorage.removeItem('last-signal-testnet-auth');note('Wallet changed. Reauthenticate in the testnet token panel.');};eth?.on?.('accountsChanged',changed);eth?.on?.('chainChanged',changed);document.querySelector('#private-play>small')!.textContent='Testnet escrow is separate from combat. Server tracked allocation is not a wallet balance. Return to the token panel for actual chain reads, settlement and refunds.';resume();}
