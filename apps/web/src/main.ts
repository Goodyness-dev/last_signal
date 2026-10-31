import './style.css';
import './immersive.css';
import './old-front.css';
import './guidance.css';
import { Battlefield } from './scene.ts';
import { createGame, createCombatDrill, step, command, observe, botCommands, visible, distance, MAP, RULES as R, type Command, type GameEvent, type Point } from '@last-signal/sim';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="masthead"><a class="brand" href="/" aria-label="LAST SIGNAL home"><span class="brand-mark">▥</span><span>LAST SIGNAL<small>TACTICAL OPERATIONS / 001</small></span></a><div class="sector"><i></i> KESTREL FRONT <span>06:42 / RAIN</span></div><div class="mode"><span class="status-dot"></span> LOCAL PRACTICE <small>NO WALLET REQUIRED</small></div><button class="icon-button" id="settings-button" aria-label="Open settings">☷</button></header>
  <main>
    <div class="matchbar"><div class="commander friendly"><span class="team-icon">◈</span><div><small>WEST COMMAND</small><strong>YOU <span>01</span></strong></div></div><div class="scoreboard"><span id="score-you">000</span><div class="match-time"><small id="phase">OPERATION STANDBY</small><strong id="timer">03:00</strong><div id="relay-status"><b>A</b><b>B</b><b>C</b></div></div><span id="score-bot">000</span></div><div class="commander hostile"><div><small>EAST COMMAND</small><strong>BOT <span>02</span></strong></div><span class="team-icon">◇</span></div></div>
    <section id="battlefield" aria-label="Interactive 3D battlefield. Select a friendly squad and choose Move or right click a destination." tabindex="0"><div class="vignette"></div><div class="scene-meta"><span>LIVE TACTICAL VIEW</span><small>48 × 32 / SECTOR 7</small></div><div class="scene-controls"><button id="view-squad" class="active">SQUAD</button><button id="view-eyes">EYE LEVEL</button><button id="view-tactical">COMMAND</button><button id="overlay" title="Tactical overlay. Hold Space.">◎ <span>TACTICAL</span></button><button id="zoom-out" aria-label="Zoom out">−</button><button id="zoom-in" aria-label="Zoom in">+</button><button id="reset-camera" aria-label="Reset camera">⤢</button></div><div class="relay-label"></div><div class="relay-label"></div><div class="relay-label"></div><div id="field-reticle"></div><div id="damage-feedback"></div><div class="field-readout"><small id="camera-label">SQUAD CAMERA</small><strong id="field-state">READY TO DEPLOY</strong><span>WASD MOVE · DRAG TO LOOK · V CHANGE VIEW</span></div><div class="objectives"><button data-relay="0">A <span>NORTH</span></button><button data-relay="1">B <span>CENTRAL</span></button><button data-relay="2">C <span>SOUTH</span></button></div><div class="minimap"><canvas id="minimap" width="192" height="128" aria-label="Tactical map. Click a point to move your selected squad."></canvas><small>TACTICAL MAP / CLICK TO MOVE</small></div><div class="map-home west">◈ WEST / HOME</div><div class="map-home east">EAST / HOME ◇</div><div id="toast" role="status" aria-live="polite">Select your squad. Hold the frequency.</div><div class="weather">↙  RAIN  /  12°C <span>VISIBILITY LIMITED</span></div><div class="map-coordinate">KESTREL // 07.24</div>
      <div class="briefing" id="briefing"><div class="eyebrow"><span>01</span> FIELD BRIEFING</div><h1>Hold the<br>line.</h1><p>A rain soaked front. Three field stations.<br>Keep the last signal alive.</p><div class="brief-rule"><b>01</b><span>Move squads into relay circles.<br>Hold ground to generate signal.</span></div><div class="brief-rule"><b>02</b><span>Use cover. Time your support.<br>Every credit is a decision.</span></div><button class="primary" id="start">ENTER THE FRONT <span>↗</span></button><button class="text-button" id="drill">QUICK COMBAT DRILL →</button><button class="text-button" id="tutorial">GUIDED FIRST MATCH →</button><small>Free practice against a local bot.<br>Credits are simulated. No token transactions.</small></div>
      <div id="countdown" hidden></div>
      <div id="order-hint" hidden role="status"><strong id="order-title"></strong><p id="order-copy"></p><button id="cancel-order">Cancel order · Esc</button></div>
      <div id="tutorial-card" hidden><small id="tutorial-step">FIELD TRAINING</small><strong id="tutorial-title"></strong><p id="tutorial-copy"></p><button id="tutorial-action"></button><button id="tutorial-details">Hide instructions to see map</button><button id="skip-tutorial">Skip guidance</button></div>
    </section>
    <section class="command-deck"><div class="squad-panel"><div class="panel-heading"><span>YOUR SQUADS</span><small id="slots">1 / 3 ACTIVE</small></div><div id="squad-cards"></div></div><div class="orders"><div class="panel-heading"><span>FIELD ORDERS</span><small id="selected-name">SELECT A SQUAD</small></div><div class="action-row"><button id="move" class="action"><span class="action-glyph">⌖</span><strong>MOVE</strong><small>FREE <kbd>M</kbd></small></button><button id="retreat" class="action"><span class="action-glyph">↶</span><strong>RETREAT</strong><small>FREE <kbd>R</kbd></small></button><button id="shield" class="action"><span class="action-glyph">⬡</span><strong>SHIELD</strong><small id="shield-cost">10 CR <kbd>Q</kbd></small></button><button id="emp" class="action"><span class="action-glyph">⌁</span><strong>EMP</strong><small id="emp-cost">15 CR <kbd>E</kbd></small></button></div></div><div class="reserve"><div class="panel-heading"><span>PRACTICE RESERVE</span><button id="ledger-button" aria-label="View spending ledger">↗</button></div><div class="budget"><strong id="budget">100</strong><span>CR<small>SIMULATED</small></span></div><button id="deploy">+ DEPLOY SQUAD <span>20 CR</span></button></div></section>
  </main><footer><span><i></i> OFFLINE READY <em> / </em> ORIGINAL PROCEDURAL WORLD</span><button id="help-button">HOW TO PLAY <span>?</span></button><span>TEST PROTOTYPE <em> / </em> v0.1</span></footer>
  <dialog id="settings"><div class="dialog-heading"><small>OPERATIONS</small><button data-close="settings" aria-label="Close settings">×</button></div><h2>Field settings</h2><label><span>Rain and combat effects</span><input type="checkbox" id="effects" checked></label><label><span>Reduced motion</span><input type="checkbox" id="motion"></label><label><span>Original synthesized audio</span><input type="checkbox" id="audio"></label><p>Low violence presentation uses sparks and dust. No blood assets are included in this slice.</p><button class="danger" id="surrender">Concede this practice match</button></dialog>
  <dialog id="help"><div class="dialog-heading"><small>COMMAND REFERENCE</small><button data-close="help" aria-label="Close help">×</button></div><h2>Ground is signal.</h2><p>Select a cyan squad. Right click to move, or press Move and tap a destination. WASD moves your selected squad. Drag to look. V cycles camera views. The minimap and A, B, C buttons issue movement orders. Keys 1 to 3 select squads. M moves, R retreats, Q shields, E targets EMP. Hold Space for the tactical overlay. Escape cancels targeting.</p><p>Hold a relay alone for 5 seconds to capture it. Each owned relay gives 1 point per second, doubled in the last 30 seconds. Reach 240 or lead at 3 minutes. A tie allows 20 seconds of overtime.</p><p>Owners keep scoring while a relay is contested. Additional squads do not capture faster. Suppressed squads cannot capture, but still contest. Cover protects its marked front after half a second. Retreat gives no healing or refund.</p><p>Shield absorbs 30 damage for 4 seconds. EMP disables enemy weapons and shields for 2 seconds within its radius. Target within 10 units and friendly sight. Each side has 100 simulated credits, no top ups, and at most 3 squads including preparing reinforcements.</p><p>Practice only. No multiplayer, blockchain, real balances, or settlement is connected.</p></dialog>
  <dialog id="ledger"><div class="dialog-heading"><small>LOCAL ACCOUNTING</small><button data-close="ledger" aria-label="Close ledger">×</button></div><h2>Practice reserve</h2><div id="ledger-content"></div><p>These credits have no monetary value. tWIF is a proposed mock token, not official WIF. No chain is connected.</p></dialog>
  <dialog id="result"><small>TRANSMISSION COMPLETE</small><h2 id="result-title"></h2><p id="result-reason"></p><div id="result-stats"></div><p id="result-observations"></p><p class="honesty">LOCAL PRACTICE / NO CHAIN SETTLEMENT</p><button class="primary" id="rematch">REDEPLOY <span>↗</span></button></dialog>`;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const dialog = (id: string) => el<HTMLDialogElement>(id);
let game = createGame(), started = false, selected: number | null = null;
let targeting: 'move' | 'emp' | null = null, seq = 0, accumulator = 0, lastFrame = performance.now(), lastHud = 0, lastNotice = 0, resultShown = false;
let drill=false;
let guided = false, tutorialStage = 0, tutorialFlankPhase = 0, tactical = false, paused = false;
let audio: AudioContext | null = null, sound = true;
let rainGain:GainNode|null=null;
const heldKeys=new Set<string>();
let soundEvent=0, lastStepSound=0;
const spending: { tick: number; action: string; cost: number }[] = [];
const toast = (message: string) => { el('toast').textContent = message; };
let scene: Battlefield;
try { scene = new Battlefield(el('battlefield'), [...document.querySelectorAll<HTMLElement>('.relay-label')]); }
catch { el('briefing').innerHTML = '<div class="eyebrow">RENDERER UNAVAILABLE</div><h1>WebGL 2 is required.</h1><p>Enable hardware acceleration in a current browser, then reload this page. No wallet or funds are needed.</p>'; throw new Error('WebGL initialization failed'); }
try {
  const saved = JSON.parse(localStorage.getItem('last-signal-settings') ?? '{}');
  scene.effectsEnabled = saved.effects ?? true; scene.reducedMotion = saved.motion ?? scene.reducedMotion;
} catch { /* Private storage may be unavailable. */ }
el<HTMLInputElement>('audio').checked = sound;
el<HTMLInputElement>('effects').checked = scene.effectsEnabled; el<HTMLInputElement>('motion').checked = scene.reducedMotion;
function saveSettings() { try { localStorage.setItem('last-signal-settings', JSON.stringify({ effects: scene.effectsEnabled, motion: scene.reducedMotion })); } catch { /* Settings remain valid in memory. */ } }
function tone(frequency: number, duration = .08) {
  if (!sound || !audio || document.hidden) return;
  const osc = audio.createOscillator(), gain = audio.createGain(); osc.frequency.value = frequency; osc.type = 'triangle'; gain.gain.setValueAtTime(.025, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration); osc.connect(gain).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
}
function gunSound() {
 if(!sound||!audio||document.hidden)return;
 const buffer=audio.createBuffer(1,Math.floor(audio.sampleRate*.11),audio.sampleRate),data=buffer.getChannelData(0);
 for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(audio.sampleRate*.018));
 const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=1800;gain.gain.value=.16;source.connect(filter).connect(gain).connect(audio.destination);source.start();
}
function ambience() {
  if(!audio)return;
  if(!rainGain){
    const buffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    const source=audio.createBufferSource(),filter=audio.createBiquadFilter();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=1100;rainGain=audio.createGain();source.connect(filter).connect(rainGain).connect(audio.destination);source.start();
  }
  rainGain.gain.value=(sound&&!document.hidden) ? .045 : 0;
}
function drawMap(o:ReturnType<typeof observe>) {
 const ctx=mapCanvas.getContext('2d')!;ctx.clearRect(0,0,192,128);ctx.fillStyle='#142022';ctx.fillRect(0,0,192,128);
 for(const obstacle of MAP.obstacles){ctx.fillStyle='#50605a';ctx.fillRect(obstacle.x*4,obstacle.z*4,obstacle.w*4,obstacle.d*4);}
 for(const r of o.relays){ctx.strokeStyle=r.owner===0?'#82d6cf':r.owner===1?'#e7b070':'#c3c7b1';ctx.beginPath();ctx.arc(r.x*4,r.z*4,10,0,Math.PI*2);ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.font='9px monospace';ctx.fillText(r.id,r.x*4-3,r.z*4+3);}
 for(const s of o.squads){ctx.fillStyle=s.side===0?'#82d6cf':'#e7b070';ctx.beginPath();ctx.arc(s.x*4,s.z*4,s.id===selected?3.5:2,0,Math.PI*2);ctx.fill();}
}
function issue(payload: Omit<Command, 'id' | 'side'> | Record<string, unknown>) {
  if (!started) return toast('Enter the compound to begin.');
  const c = { ...payload, id: `player:${++seq}`, side: 0 } as Command;
  const before = game.budgets[0], result = command(game, c); toast(result.reason);
  if (result.ok) {
    if (c.kind === 'move' || c.kind === 'emp' || c.kind === 'retreat') clearTarget();
    tone(c.kind === 'emp' ? 140 : 420);
    if (before > game.budgets[0]) spending.push({ tick: game.tick, action: c.kind.toUpperCase(), cost: before - game.budgets[0] });
    if (guided && c.kind === 'move' && tutorialStage === 1) tutorialStage = 2;
    if (guided && c.kind === 'deploy' && tutorialStage === 4) tutorialStage = 5;
    if (guided && c.kind === 'shield' && tutorialStage === 5) tutorialStage = 6;
  }
  updateHud();
}
function begin(training: boolean) {
  drill=false;
  game = createGame(); scene.resetMatch(); started = true; selected = 1; guided = training; tutorialStage = 0; tutorialFlankPhase = 0; targeting = null; resultShown = false; accumulator = 0; paused = false; lastNotice = 0; spending.length = 0;
  document.body.classList.add('in-match');
  clearTarget();
  el('tutorial-card').classList.remove('compact');
  if (training) changeView('tactical');
  if(sound){audio??=new AudioContext();void audio.resume();ambience();}
  soundEvent=0;
  el('briefing').hidden = true; dialog('result').close(); toast('Stand by. Deployment in three seconds.'); updateHud();
}
el('drill').onclick=()=>{
  begin(false);drill=true;game=createCombatDrill();
  spending.push({tick:0,action:'DEPLOY',cost:R.deployCost},{tick:R.deployCooldown,action:'DEPLOY',cost:R.deployCost});
  selected=game.squads.find(s=>s.side===0&&s.z===16)!.id;
  toast('COMBAT DRILL. Two reinforcements already paid: 60 credits remain. Weapons fire on contact.');updateHud();
};
el('start').onclick = () => begin(false); el('tutorial').onclick = () => begin(true); el('rematch').onclick = () => begin(guided);
function clearTarget() { targeting = null; el('battlefield').classList.remove('targeting'); document.body.dataset.orderMode = ''; el('order-hint').hidden = true; }
function target(kind: 'move' | 'emp') {
  if (!started || game.result || game.countdown > 0) return toast('Start practice and wait for the countdown first.');
  if (!game.squads.some(s => s.id === selected && s.side === 0)) return toast('Select a living friendly squad.');
  if (targeting === kind) { clearTarget(); updateHud(); return; }
  targeting = kind; el('battlefield').classList.add('targeting'); document.body.dataset.orderMode = kind;
  changeView('tactical');
  el('order-hint').hidden = false;
  el('order-title').textContent = kind === 'move' ? 'NOW CLICK THE GROUND' : 'NOW CLICK THE EMP TARGET';
  el('order-copy').textContent = kind === 'move' ? 'Move is waiting for a destination. Click open ground on the map and your squad will walk there. Or click GO TO CENTRE above to move straight to B.' : 'Click a visible point within range of your selected squad. A valid pulse costs 15 credits.';
  toast(kind === 'move' ? 'Choose where to go. Click open ground or a station button.' : 'Choose the EMP location.');
  updateHud();
}
el('cancel-order').onclick = () => { clearTarget(); updateHud(); };
el('move').onclick = () => target('move'); el('emp').onclick = () => target('emp');
el('shield').onclick = () => issue({ kind: 'shield', squadId: selected }); el('retreat').onclick = () => issue({ kind: 'retreat', squadId: selected }); el('deploy').onclick = () => issue({ kind: 'deploy' });
el('overlay').onclick = () => { tactical = !tactical; scene.setTactical(tactical); el('overlay').classList.toggle('active', tactical); };
el('zoom-in').onclick = () => scene.setZoom(.1); el('zoom-out').onclick = () => scene.setZoom(-.1); el('reset-camera').onclick = () => scene.resetCamera();
el('settings-button').onclick = () => dialog('settings').showModal(); el('help-button').onclick = () => dialog('help').showModal();
document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(button => { button.onclick = () => dialog(button.dataset.close!).close(); });
el('surrender').onclick = () => { if (started && !game.result) issue({ kind: 'surrender' }); dialog('settings').close(); };
el('skip-tutorial').onclick = () => { guided = false; updateHud(); };
function selectSquad(id: number) {
  if (game.result) return toast('This match is over. Choose REDEPLOY to play again.');
  if (!started) begin(true);
  const squad = game.squads.find(s => s.side === 0 && s.id === id);
  if (!squad) return toast('That squad is not available. Deploy another squad for 20 credits.');
  selected = squad.id;
  clearTarget();
  if (guided && tutorialStage === 0) tutorialStage = 1;
  el('battlefield').focus({ preventScroll: true });
  toast(`Squad ${friendlyName(selected)} selected. ${game.countdown ? 'Wait for the countdown, then click GO TO CENTRE.' : 'Click GO TO CENTRE to send it to station B.'}`);
  updateHud();
}
el('squad-cards').onclick = e => {
  const card = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-squad]');
  if (card) selectSquad(Number(card.dataset.squad));
};
el('tutorial-details').onclick = () => { el('tutorial-card').classList.toggle('compact'); updateHud(); };
el('tutorial-action').onclick = () => {
  if (tutorialStage === 0) { const first = game.squads.find(s => s.side === 0); if (first) selectSquad(first.id); }
  else if (tutorialStage === 1) { const r = game.relays[1]; issue({ kind: 'move', squadId: selected, target: { x: r.x - 1, z: r.z } }); }
  else if (tutorialStage === 4) issue({ kind: 'deploy' });
  else if (tutorialStage === 5) issue({ kind: 'shield', squadId: selected });
  else { changeView('tactical'); el('tutorial-card').classList.add('compact'); }
  updateHud();
};
el('ledger-button').onclick = () => {
  el('ledger-content').innerHTML = `<p>Starting reserve <b>100 CR</b></p>${spending.map(s => `<p>${Math.floor(s.tick / R.ticks)}s / ${s.action} <b>${s.cost} CR</b></p>`).join('')}<p>Spent <b>${game.spent[0]} CR</b></p><p>Remaining <b>${game.budgets[0]} CR</b></p>`; dialog('ledger').showModal();
};
el<HTMLInputElement>('effects').onchange = e => { scene.effectsEnabled = (e.target as HTMLInputElement).checked; saveSettings(); };
el<HTMLInputElement>('motion').onchange = e => { scene.reducedMotion = (e.target as HTMLInputElement).checked; saveSettings(); };
el<HTMLInputElement>('audio').onchange = () => { sound = el<HTMLInputElement>('audio').checked; if (sound) { audio ??= new AudioContext(); void audio.resume(); tone(380, .2); } ambience(); };

const canvas = scene.renderer.domElement;
changeView('eyes');
function changeView(mode:'squad'|'eyes'|'tactical') {
 scene.setView(mode);
 for(const name of ['squad','eyes','tactical']) el('view-'+name).classList.toggle('active',name===mode);
 el('camera-label').textContent=mode==='eyes'?'EYE LEVEL / SQUAD LEAD':mode==='squad'?'SQUAD CAMERA':'COMMAND CAMERA';
}
for(const mode of ['squad','eyes','tactical'] as const) el('view-'+mode).onclick=()=>changeView(mode);
document.querySelectorAll<HTMLButtonElement>('[data-relay]').forEach(b=>b.onclick=()=>{const r=game.relays[Number(b.dataset.relay)];issue({kind:'move',squadId:selected,target:{x:r.x-1,z:r.z}});});
const mapCanvas=el<HTMLCanvasElement>('minimap');
mapCanvas.onclick=e=>{const rect=mapCanvas.getBoundingClientRect();issue({kind:'move',squadId:selected,target:{x:(e.clientX-rect.left)/rect.width*48,z:(e.clientY-rect.top)/rect.height*32}});};
let pointerStart:{x:number;y:number}|null=null,dragged=false,previousPointer={x:0,y:0};
canvas.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY};previousPointer={x:e.clientX,y:e.clientY};dragged=false;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!pointerStart)return;if(Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>5)dragged=true;if(dragged)scene.view.rotate(e.clientX-previousPointer.x,e.clientY-previousPointer.y);previousPointer={x:e.clientX,y:e.clientY};});
canvas.addEventListener('pointerup',e=>{if(pointerStart&&!dragged)battlefieldClick(e);pointerStart=null;});
canvas.addEventListener('pointercancel',()=>{pointerStart=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();scene.setZoom(-e.deltaY*.0005);},{passive:false});
function battlefieldClick(e: PointerEvent) {
  if (!started || game.result || game.countdown > 0) return;
  const p = scene.pick(e.clientX, e.clientY); if (!p) return;
  if (e.button === 2 || targeting) {
    issue({ kind: targeting === 'emp' ? 'emp' : 'move', squadId: selected, target: p }); return;
  }
  const closest = game.squads.filter(s => s.side === 0 && distance(s, p) < 2.4).sort((a, b) => distance(a, p) - distance(b, p))[0];
  if (closest) selectSquad(closest.id);
  else if (selected && (e.pointerType === 'touch' || scene.viewMode!=='tactical')) issue({ kind: 'move', squadId: selected, target: p });
  else toast('Select a cyan squad or use the squad cards below.');
  updateHud();
}
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if ((e.target as HTMLElement).matches('input, textarea, select') || document.querySelector('dialog[open]') || e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.code === 'Space') { e.preventDefault(); scene.setTactical(true); }
  if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){e.preventDefault();heldKeys.add(e.code);}
  if (e.repeat) return;
  const key = e.key.toLowerCase();
  const squadKey = /^(?:Digit|Numpad)([123])$/.exec(e.code)?.[1] ?? (['1', '2', '3'].includes(key) ? key : null);
  if (squadKey) {
    e.preventDefault();
    const squad = game.squads.filter(s => s.side === 0)[Number(squadKey) - 1];
    if (squad) selectSquad(squad.id);
    else toast(`Squad ${squadKey} is not deployed. Use DEPLOY SQUAD first. Your current selection is unchanged.`);
  }
  if(key==='v'){scene.view.cycle();changeView(scene.viewMode);}
  if(key==='f')scene.resetCamera();
  if (key === 'm') target('move'); if (key === 'q') issue({ kind: 'shield', squadId: selected }); if (key === 'e') target('emp'); if (key === 'r') issue({ kind: 'retreat', squadId: selected });
  if (key === 'escape') { if (targeting) { clearTarget(); toast('Order cancelled. Your squad is still selected.'); } else { selected = null; toast('Selection cleared'); } updateHud(); }
});
window.addEventListener('keyup', e => { heldKeys.delete(e.code); if (e.code === 'Space') scene.setTactical(tactical); });
window.addEventListener('blur', () => {heldKeys.clear();scene.setTactical(tactical);});
document.addEventListener('visibilitychange', () => { paused = document.hidden; heldKeys.clear();ambience(); accumulator = 0; lastFrame = performance.now(); if (started && !game.result) toast(paused ? 'Practice paused while the tab is hidden.' : 'Practice resumed.'); });
const friendlyName = (id: number) => String(game.squads.filter(s => s.side === 0).findIndex(s => s.id === id) + 1).padStart(2, '0');
function updateHud() {
  const own = game.squads.filter(s => s.side === 0), remaining = Math.ceil(Math.max(0, R.regulation - game.tick) / R.ticks);
  if (selected !== null && !own.some(s => s.id === selected)) {
    clearTarget();
    selected = own[0]?.id ?? null;
    if (started && !game.result) toast(selected === null ? 'Your squad was lost. No soldiers remain. Deploy another squad if you have 20 credits.' : `Your selected squad was lost. Squad ${friendlyName(selected)} is now selected.`);
  }
  el('score-you').textContent = String(game.scores[0]).padStart(3, '0'); el('score-bot').textContent = String(game.scores[1]).padStart(3, '0');
  el('timer').textContent = game.tick > R.regulation ? `OT ${Math.ceil((R.regulation + R.overtime - game.tick) / R.ticks)}` : `${Math.floor(remaining / 60).toString().padStart(2, '0')}:${Math.ceil(remaining % 60).toString().padStart(2, '0')}`;
  el('phase').textContent = !started ? 'OPERATION STANDBY' : game.result ? 'TRANSMISSION ENDED' : paused ? 'PRACTICE PAUSED' : game.countdown ? 'DEPLOYMENT COUNTDOWN' : game.tick >= R.doubleAt ? 'SIGNAL ×2' : drill ? 'COMBAT DRILL / LOCAL' : 'RELAY CONTROL';
  el('budget').textContent = String(game.budgets[0]); el('slots').textContent = `${own.length} / 3 ACTIVE`;
  document.querySelector('.squad-panel .panel-heading > span')!.textContent = '1. YOUR TEAM · CLICK A SQUAD';
  document.body.dataset.trainingStep = guided && started && !game.result ? String(tutorialStage) : '';
  el('selected-name').textContent = selected && own.some(s => s.id === selected) ? `SQUAD ${friendlyName(selected)} SELECTED` : 'SELECT A SQUAD';
  const squadSignature = own.map(s => s.id).join('|') + ':' + game.pending.filter(p => p.side === 0).length;
  if (el('squad-cards').dataset.signature !== squadSignature) {
    el('squad-cards').dataset.signature = squadSignature;
    el('squad-cards').innerHTML = own.map((s, i) => `<button class="squad-card ${s.id === selected ? 'selected' : ''}" data-squad="${s.id}" aria-pressed="${s.id === selected}" aria-label="Select squad ${i + 1}, ${s.hp} health"><span><b>◈</b> SQUAD ${i + 1} <kbd>${i + 1}</kbd></span><div class="hp-track"><i style="width:${s.hp}%"></i></div><small>${s.id === selected ? '✓ SELECTED' : 'CLICK TO SELECT'} · ${s.hp} HP</small></button>`).join('') + (game.pending.some(p => p.side === 0) ? '<span class="preparing">PREPARING<br>REINFORCEMENT</span>' : own.length ? '' : '<span class="preparing">NO SQUADS LEFT<br>Use DEPLOY SQUAD if you have 20 credits.</span>');
  }
  el('squad-cards').querySelectorAll<HTMLButtonElement>('[data-squad]').forEach(card => {
    const squad = own.find(s => s.id === Number(card.dataset.squad))!;
    const active = squad.id === selected;
    card.classList.toggle('selected', active);
    card.setAttribute('aria-pressed', String(active));
    card.setAttribute('aria-label', `${started ? 'Select' : 'Start guided practice with'} squad ${friendlyName(squad.id)}, ${squad.hp} health`);
    card.querySelector<HTMLElement>('.hp-track i')!.style.width = `${squad.hp}%`;
    card.querySelector('small')!.textContent = `${!started ? 'CLICK TO START & SELECT' : active ? '✓ SELECTED' : 'CLICK TO SELECT'} · ${squad.hp} HP`;
  });
  el('selected-name').textContent = !started ? 'SELECT A SQUAD TO START PRACTICE' : selected && own.some(s => s.id === selected) ? `SQUAD ${friendlyName(selected)} · ${game.countdown ? 'READY AFTER COUNTDOWN' : 'CHOOSE A STATION ABOVE'}` : 'NO SQUAD SELECTED · CLICK A CARD';
  el('move').classList.toggle('active', targeting === 'move');
  el('move').querySelector('strong')!.textContent = targeting === 'move' ? 'PICK GROUND' : 'MOVE TO…';
  el('emp').classList.toggle('active', targeting === 'emp');
  el('relay-status').innerHTML = game.relays.map(r => `<b class="${r.owner === 0 ? 'friendly' : r.owner === 1 ? 'hostile' : ''}">${r.id}</b>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-relay]').forEach((b, i) => {
    const r = game.relays[i];
    b.innerHTML = `<b>${r.id}</b><span>GO TO ${['NORTH', 'CENTRE', 'SOUTH'][i]}<small>${r.contested ? 'CONTESTED' : r.owner === 0 ? 'YOURS · +1 POINT / SEC' : r.owner === 1 ? 'ENEMY STATION' : 'CAPTURE THIS STATION'}</small></span>`;
    b.disabled = !started || game.countdown > 0 || !!game.result || selected === null || !own.some(s => s.id === selected);
  });
  for (const kind of ['shield', 'emp', 'deploy'] as const) {
    const cooldown = Math.max(0, Math.ceil((game.cooldowns[0][kind] - game.tick) / R.ticks));
    const cost = kind === 'shield' ? R.shieldCost : kind === 'emp' ? R.empCost : R.deployCost;
    el<HTMLButtonElement>(kind).disabled = !started || game.countdown > 0 || !!game.result || cooldown > 0 || game.budgets[0] < cost || (kind === 'deploy' ? own.length + game.pending.filter(p => p.side === 0).length >= 3 : !own.some(s => s.id === selected));
    if (kind !== 'deploy') el(`${kind}-cost`).innerHTML = cooldown ? `${cooldown}s COOLDOWN` : `${cost} CR <kbd>${kind === 'shield' ? 'Q' : 'E'}</kbd>`;
    else el('deploy').innerHTML = cooldown ? `PREPARING / READY IN ${cooldown}s` : '+ DEPLOY SQUAD <span>20 CR</span>';
  }
  for (const key of ['move', 'retreat']) el<HTMLButtonElement>(key).disabled = !started || game.countdown > 0 || !!game.result || !own.some(s => s.id === selected);
  el('countdown').hidden = !started || game.countdown === 0; el('countdown').textContent = String(Math.ceil(game.countdown / R.ticks));
  if (guided && tutorialStage === 2 && game.relays.some(r => r.owner === 0)) tutorialStage = 3;
  if (guided && tutorialStage === 3 && observe(game, 0).squads.some(s => s.side === 1)) tutorialStage = 4;
  const guidance = [
    ['Choose your soldiers', 'Your team controls the cyan soldiers. The highlighted SQUAD 1 card is at the bottom left. Click it, press 1, or use the button here. You command the whole squad; its guns fire automatically.'],
    ['Send your squad to station B', 'A relay is a radio station inside a circle on the ground. Look for the large B marker in the middle of the map. Click GO TO CENTRE at the top, or SEND SQUAD TO B here. Your soldiers will walk there by themselves.'],
    ['Let your squad capture B', 'Your movement order is active. Wait for your soldiers to reach the B circle, then stay inside it for five seconds with no enemy present. You do not need to click again. The station turns cyan when captured and starts earning points.'],
    ['Watch the northern flank', 'The training bot is approaching through relay A. Buildings block sight, so its position appears only when visible.'],
    ['Bring more soldiers', 'An enemy is visible. Click DEPLOY SQUAD at the bottom right or use the button here. It costs 20 of your 100 practice credits. After two seconds a second squad and its selection card appear at home.'],
    ['Protect your selected squad', 'Click SHIELD in the bottom controls or use the button here. It protects the selected squad for four seconds, absorbs 30 damage and costs 10 credits.'],
    ['Now hold two stations', 'Select a squad card, then click GO TO NORTH or GO TO SOUTH to capture another station. Each station earns points. Reach 240 points, or lead when three minutes ends. WASD moves your squad; drag to look; V changes camera.'],
  ];
  el('tutorial-card').hidden = !guided || !started || !!game.result;
  if (el('tutorial-card').dataset.stage !== String(tutorialStage)) { el('tutorial-card').dataset.stage = String(tutorialStage); el('tutorial-card').classList.remove('compact'); }
  el('tutorial-details').textContent = el('tutorial-card').classList.contains('compact') ? 'Show instructions' : 'Hide instructions to see map';
  el('tutorial-title').textContent = guidance[tutorialStage][0]; el('tutorial-copy').textContent = guidance[tutorialStage][1];
  el('tutorial-step').textContent = `FIELD TRAINING · STEP ${tutorialStage + 1} OF 7`;
  const trainingAction = el<HTMLButtonElement>('tutorial-action');
  trainingAction.textContent = ['SELECT SQUAD 1', 'SEND SQUAD TO B', 'SHOW OVERHEAD MAP', 'SHOW OVERHEAD MAP', 'DEPLOY SECOND SQUAD · 20 CR', 'SHIELD SELECTED SQUAD · 10 CR', 'SHOW OVERHEAD MAP'][tutorialStage];
  trainingAction.disabled = tutorialStage === 1 ? game.countdown > 0 || selected === null : tutorialStage === 4 ? el<HTMLButtonElement>('deploy').disabled : tutorialStage === 5 ? el<HTMLButtonElement>('shield').disabled : false;
  if (game.result && !resultShown) {
    clearTarget();
    resultShown = true; el('result-title').textContent = game.result.winner === null ? 'Signal unresolved.' : game.result.winner === 0 ? 'Frequency secured.' : 'Transmission lost.';
    el('result-reason').textContent = `${game.result.reason}. You ${game.scores[0]} / Bot ${game.scores[1]}.`;
    el('result-stats').innerHTML = `<p>Relays held <b>${game.relays.filter(r => r.owner === 0).length} / 3</b></p><p>Squads lost <b>${game.lost[0]}</b></p><p>Reserve spent <b>${game.spent[0]} CR</b></p><p>Reserve remaining <b>${game.budgets[0]} CR</b></p>`;
    el('result-observations').textContent = `You used ${spending.filter(s => s.action === 'DEPLOY').length} paid reinforcements and ${spending.filter(s => s.action !== 'DEPLOY').length} support abilities. ${game.budgets[0]} of your 100 starting practice credits remained.`;
    try { const history = JSON.parse(localStorage.getItem('last-signal-results') ?? '[]'); history.unshift({ at: new Date().toISOString(), mode: 'LOCAL_PRACTICE', drill, result: game.result, scores: game.scores, spent: game.spent[0] }); localStorage.setItem('last-signal-results', JSON.stringify(history.slice(0, 10))); } catch { /* Match results work without persistence. */ }
    dialog('result').showModal();
  }
}
function frame(now: number) {
  const elapsed = Math.min((now - lastFrame) / 1000, .25); lastFrame = now;
  if (started && !paused && !game.result) {
    accumulator += elapsed;
    let catchup = 0;
    while (accumulator >= 1 / R.ticks && catchup++ < 5) {
      if(game.tick%4===0&&game.countdown===0&&heldKeys.size&&!document.querySelector('dialog[open]')) {
 const squad=game.squads.find(s=>s.id===selected&&s.side===0);
 if(squad){const d=scene.view.direction(Number(heldKeys.has('KeyW'))-Number(heldKeys.has('KeyS')),Number(heldKeys.has('KeyD'))-Number(heldKeys.has('KeyA')));
 if(d.x||d.z){const accepted=command(game,{id:'keys:'+ ++seq,side:0,kind:'move',squadId:squad.id,target:{x:squad.x+d.x*1.8,z:squad.z+d.z*1.8}});if(accepted.ok&&guided&&tutorialStage===1)tutorialStage=2;}}
 }
 step(game);
      if(game.countdown===0&&game.tick===0)toast('WASD to move. Choose B CENTRAL for contact. Weapons fire automatically.');
      if (game.countdown === 0) {
        const observation = observe(game, 1);
        if (!guided || tutorialStage >= 6) {
          for (const c of botCommands(observation, 1)) command(game, c);
        } else if (tutorialStage >= 3 && game.tick % 60 === 0) {
          // The scripted training route uses ordinary commands and only known map geometry.
          // It waits for the first player capture, then approaches from the north.
          const botSquad = observation.squads.find(s => s.side === 1);
          if (botSquad && !botSquad.route.length) {
            if (distance(botSquad, { x: 26, z: 7 }) < 1) tutorialFlankPhase = 1;
            command(game, { id: `training:${game.tick}`, side: 1, kind: 'move', squadId: botSquad.id, target: tutorialFlankPhase === 0 ? { x: 26, z: 7 } : { x: 26, z: 16 } });
          }
        }
      }
      accumulator -= 1 / R.ticks;
    }
  }
  const events: GameEvent[] = game.events.filter(e => !(e.kind === 'DeployAccepted' && e.side !== 0) && (!e.from || visible(game, 0, e.from)) && (!e.to || e.side === 0 || visible(game, 0, e.to)));
  for (const e of events) if (e.seq > lastNotice && e.text && e.kind !== 'SquadSpawned') { if (started) toast(e.text); }
  lastNotice = game.eventSeq;
  const observation=observe(game,0);
 scene.update(observation,selected,events,elapsed);
 const ownSelected=observation.squads.find(s=>s.id===selected);
 if(ownSelected){const state=ownSelected.disabledUntil>game.tick?'WEAPONS DISABLED':ownSelected.suppression>=60?'UNDER FIRE / SUPPRESSED':game.tick-ownSelected.shotAt<20?'ENGAGING HOSTILES':ownSelected.route.length?'MOVING TO POSITION':ownSelected.coverId!==null?'HOLDING COVER':'HOLDING POSITION';el('field-state').textContent=ownSelected.hp+' HP / '+state;el('damage-feedback').style.opacity=String(scene.reducedMotion?0:Math.max(0,1-(game.tick-ownSelected.lastHit)/12)*.7);}else{el('field-state').textContent=started?'SELECT A LIVING SQUAD':'READY TO DEPLOY';el('damage-feedback').style.opacity='0';}
 drawMap(observation);
 for(const event of events)if(event.seq>soundEvent){if(event.kind==='ShotFired')gunSound();if(event.kind==='RelayCaptured')tone(640,.18);}
 soundEvent=game.eventSeq;
 if(ownSelected?.route.length&&now-lastStepSound>330){tone(75,.035);lastStepSound=now;}
  if (now - lastHud > 100) { updateHud(); lastHud = now; }
  requestAnimationFrame(frame);
}
updateHud(); requestAnimationFrame(frame);
window.addEventListener('pagehide', () => { scene.dispose(); void audio?.close(); }, { once: true });
