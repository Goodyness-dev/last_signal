import './style.css';
import { Battlefield } from './scene.ts';
import { createGame, step, command, observe, botCommands, visible, distance, RULES as R, type Command, type GameEvent, type Point } from '@last-signal/sim';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="masthead"><a class="brand" href="/" aria-label="LAST SIGNAL home"><span class="brand-mark">▥</span><span>LAST SIGNAL<small>TACTICAL OPERATIONS / 001</small></span></a><div class="sector"><i></i> KESTREL COMPOUND <span>06:42 / RAIN</span></div><div class="mode"><span class="status-dot"></span> LOCAL PRACTICE <small>NO WALLET REQUIRED</small></div><button class="icon-button" id="settings-button" aria-label="Open settings">☷</button></header>
  <main>
    <div class="matchbar"><div class="commander friendly"><span class="team-icon">◈</span><div><small>WEST COMMAND</small><strong>YOU <span>01</span></strong></div></div><div class="scoreboard"><span id="score-you">000</span><div class="match-time"><small id="phase">OPERATION STANDBY</small><strong id="timer">03:00</strong><div id="relay-status"><b>A</b><b>B</b><b>C</b></div></div><span id="score-bot">000</span></div><div class="commander hostile"><div><small>EAST COMMAND</small><strong>BOT <span>02</span></strong></div><span class="team-icon">◇</span></div></div>
    <section id="battlefield" aria-label="Interactive 3D battlefield. Select a friendly squad and choose Move or right click a destination." tabindex="0"><div class="vignette"></div><div class="scene-meta"><span>LIVE TACTICAL VIEW</span><small>48 × 32 / SECTOR 7</small></div><div class="scene-controls"><button id="overlay" title="Tactical overlay. Hold Space.">◎ <span>TACTICAL</span></button><button id="zoom-out" aria-label="Zoom out">−</button><button id="zoom-in" aria-label="Zoom in">+</button><button id="reset-camera" aria-label="Reset camera">⤢</button></div><div class="relay-label"></div><div class="relay-label"></div><div class="relay-label"></div><div class="map-home west">◈ WEST / HOME</div><div class="map-home east">EAST / HOME ◇</div><div id="toast" role="status" aria-live="polite">Select your squad. Hold the frequency.</div><div class="weather">↙  RAIN  /  12°C <span>VISIBILITY LIMITED</span></div><div class="map-coordinate">KESTREL // 07.24</div>
      <div class="briefing" id="briefing"><div class="eyebrow"><span>01</span> FIELD BRIEFING</div><h1>Hold the<br>frequency.</h1><p>Three relays. Three minutes.<br>One last signal out.</p><div class="brief-rule"><b>01</b><span>Move squads into relay circles.<br>Hold ground to generate signal.</span></div><div class="brief-rule"><b>02</b><span>Use cover. Time your support.<br>Every credit is a decision.</span></div><button class="primary" id="start">ENTER THE COMPOUND <span>↗</span></button><button class="text-button" id="tutorial">GUIDED FIRST MATCH →</button><small>Free practice against a local bot.<br>Credits are simulated. No token transactions.</small></div>
      <div id="countdown" hidden></div>
      <div id="tutorial-card" hidden><small>FIELD TRAINING</small><strong id="tutorial-title"></strong><p id="tutorial-copy"></p><button id="skip-tutorial">Skip guidance</button></div>
    </section>
    <section class="command-deck"><div class="squad-panel"><div class="panel-heading"><span>YOUR SQUADS</span><small id="slots">1 / 3 ACTIVE</small></div><div id="squad-cards"></div></div><div class="orders"><div class="panel-heading"><span>FIELD ORDERS</span><small id="selected-name">SELECT A SQUAD</small></div><div class="action-row"><button id="move" class="action"><span class="action-glyph">⌖</span><strong>MOVE</strong><small>FREE <kbd>M</kbd></small></button><button id="retreat" class="action"><span class="action-glyph">↶</span><strong>RETREAT</strong><small>FREE <kbd>R</kbd></small></button><button id="shield" class="action"><span class="action-glyph">⬡</span><strong>SHIELD</strong><small id="shield-cost">10 CR <kbd>Q</kbd></small></button><button id="emp" class="action"><span class="action-glyph">⌁</span><strong>EMP</strong><small id="emp-cost">15 CR <kbd>E</kbd></small></button></div></div><div class="reserve"><div class="panel-heading"><span>PRACTICE RESERVE</span><button id="ledger-button" aria-label="View spending ledger">↗</button></div><div class="budget"><strong id="budget">100</strong><span>CR<small>SIMULATED</small></span></div><button id="deploy">+ DEPLOY SQUAD <span>20 CR</span></button></div></section>
  </main><footer><span><i></i> OFFLINE READY <em> / </em> ORIGINAL PROCEDURAL WORLD</span><button id="help-button">HOW TO PLAY <span>?</span></button><span>TEST PROTOTYPE <em> / </em> v0.1</span></footer>
  <dialog id="settings"><div class="dialog-heading"><small>OPERATIONS</small><button data-close="settings" aria-label="Close settings">×</button></div><h2>Field settings</h2><label><span>Rain and combat effects</span><input type="checkbox" id="effects" checked></label><label><span>Reduced motion</span><input type="checkbox" id="motion"></label><label><span>Original synthesized audio</span><input type="checkbox" id="audio"></label><p>Low violence presentation uses sparks and dust. No blood assets are included in this slice.</p><button class="danger" id="surrender">Concede this practice match</button></dialog>
  <dialog id="help"><div class="dialog-heading"><small>COMMAND REFERENCE</small><button data-close="help" aria-label="Close help">×</button></div><h2>Ground is signal.</h2><p>Select a cyan squad. Right click to move, or press Move and tap a destination. Keys 1 to 3 select squads. M moves, R retreats, Q shields, E targets EMP. Hold Space for the tactical overlay. Escape cancels targeting.</p><p>Hold a relay alone for 5 seconds to capture it. Each owned relay gives 1 point per second, doubled in the last 30 seconds. Reach 240 or lead at 3 minutes. A tie allows 20 seconds of overtime.</p><p>Owners keep scoring while a relay is contested. Additional squads do not capture faster. Suppressed squads cannot capture, but still contest. Cover protects its marked front after half a second. Retreat gives no healing or refund.</p><p>Shield absorbs 30 damage for 4 seconds. EMP disables enemy weapons and shields for 2 seconds within its radius. Target within 10 units and friendly sight. Each side has 100 simulated credits, no top ups, and at most 3 squads including preparing reinforcements.</p><p>Practice only. No multiplayer, blockchain, real balances, or settlement is connected.</p></dialog>
  <dialog id="ledger"><div class="dialog-heading"><small>LOCAL ACCOUNTING</small><button data-close="ledger" aria-label="Close ledger">×</button></div><h2>Practice reserve</h2><div id="ledger-content"></div><p>These credits have no monetary value. tWIF is a proposed mock token, not official WIF. No chain is connected.</p></dialog>
  <dialog id="result"><small>TRANSMISSION COMPLETE</small><h2 id="result-title"></h2><p id="result-reason"></p><div id="result-stats"></div><p id="result-observations"></p><p class="honesty">LOCAL PRACTICE / NO CHAIN SETTLEMENT</p><button class="primary" id="rematch">REDEPLOY <span>↗</span></button></dialog>`;

const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const dialog = (id: string) => el<HTMLDialogElement>(id);
let game = createGame(), started = false, selected: number | null = 1;
let targeting: 'move' | 'emp' | null = null, seq = 0, accumulator = 0, lastFrame = performance.now(), lastHud = 0, lastNotice = 0, resultShown = false;
let guided = false, tutorialStage = 0, tutorialFlankPhase = 0, tactical = false, paused = false;
let audio: AudioContext | null = null, sound = false;
const spending: { tick: number; action: string; cost: number }[] = [];
const toast = (message: string) => { el('toast').textContent = message; };
let scene: Battlefield;
try { scene = new Battlefield(el('battlefield'), [...document.querySelectorAll<HTMLElement>('.relay-label')]); }
catch { el('briefing').innerHTML = '<div class="eyebrow">RENDERER UNAVAILABLE</div><h1>WebGL 2 is required.</h1><p>Enable hardware acceleration in a current browser, then reload this page. No wallet or funds are needed.</p>'; throw new Error('WebGL initialization failed'); }
try {
  const saved = JSON.parse(localStorage.getItem('last-signal-settings') ?? '{}');
  scene.effectsEnabled = saved.effects ?? true; scene.reducedMotion = saved.motion ?? scene.reducedMotion;
} catch { /* Private storage may be unavailable. */ }
el<HTMLInputElement>('effects').checked = scene.effectsEnabled; el<HTMLInputElement>('motion').checked = scene.reducedMotion;
function saveSettings() { try { localStorage.setItem('last-signal-settings', JSON.stringify({ effects: scene.effectsEnabled, motion: scene.reducedMotion })); } catch { /* Settings remain valid in memory. */ } }
function tone(frequency: number, duration = .08) {
  if (!sound || !audio || document.hidden) return;
  const osc = audio.createOscillator(), gain = audio.createGain(); osc.frequency.value = frequency; osc.type = 'triangle'; gain.gain.setValueAtTime(.025, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration); osc.connect(gain).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
}
function issue(payload: Omit<Command, 'id' | 'side'> | Record<string, unknown>) {
  if (!started) return toast('Enter the compound to begin.');
  const c = { ...payload, id: `player:${++seq}`, side: 0 } as Command;
  const before = game.budgets[0], result = command(game, c); toast(result.reason);
  if (result.ok) {
    tone(c.kind === 'emp' ? 140 : 420);
    if (before > game.budgets[0]) spending.push({ tick: game.tick, action: c.kind.toUpperCase(), cost: before - game.budgets[0] });
    if (guided && c.kind === 'move' && tutorialStage === 1) tutorialStage = 2;
    if (guided && c.kind === 'deploy' && tutorialStage === 4) tutorialStage = 5;
    if (guided && c.kind === 'shield' && tutorialStage === 5) tutorialStage = 6;
  }
  updateHud();
}
function begin(training: boolean) {
  game = createGame(); scene.resetMatch(); started = true; selected = 1; guided = training; tutorialStage = 0; tutorialFlankPhase = 0; targeting = null; resultShown = false; accumulator = 0; paused = false; lastNotice = 0; spending.length = 0;
  el('briefing').hidden = true; dialog('result').close(); toast('Stand by. Deployment in three seconds.'); updateHud();
}
el('start').onclick = () => begin(false); el('tutorial').onclick = () => begin(true); el('rematch').onclick = () => begin(guided);
function target(kind: 'move' | 'emp') { if (!game.squads.some(s => s.id === selected && s.side === 0)) return toast('Select a living friendly squad.'); targeting = kind; el('battlefield').classList.add('targeting'); toast(kind === 'emp' ? 'EMP targeting: tap a point. 15 credits on valid confirmation. Escape cancels.' : 'Tap a legal destination. Move is free.'); }
el('move').onclick = () => target('move'); el('emp').onclick = () => target('emp');
el('shield').onclick = () => issue({ kind: 'shield', squadId: selected }); el('retreat').onclick = () => issue({ kind: 'retreat', squadId: selected }); el('deploy').onclick = () => issue({ kind: 'deploy' });
el('overlay').onclick = () => { tactical = !tactical; scene.setTactical(tactical); el('overlay').classList.toggle('active', tactical); };
el('zoom-in').onclick = () => scene.setZoom(.1); el('zoom-out').onclick = () => scene.setZoom(-.1); el('reset-camera').onclick = () => scene.resetCamera();
el('settings-button').onclick = () => dialog('settings').showModal(); el('help-button').onclick = () => dialog('help').showModal();
document.querySelectorAll<HTMLButtonElement>('[data-close]').forEach(button => { button.onclick = () => dialog(button.dataset.close!).close(); });
el('surrender').onclick = () => { if (started && !game.result) issue({ kind: 'surrender' }); dialog('settings').close(); };
el('skip-tutorial').onclick = () => { guided = false; updateHud(); };
el('ledger-button').onclick = () => {
  el('ledger-content').innerHTML = `<p>Starting reserve <b>100 CR</b></p>${spending.map(s => `<p>${Math.floor(s.tick / R.ticks)}s / ${s.action} <b>${s.cost} CR</b></p>`).join('')}<p>Spent <b>${game.spent[0]} CR</b></p><p>Remaining <b>${game.budgets[0]} CR</b></p>`; dialog('ledger').showModal();
};
el<HTMLInputElement>('effects').onchange = e => { scene.effectsEnabled = (e.target as HTMLInputElement).checked; saveSettings(); };
el<HTMLInputElement>('motion').onchange = e => { scene.reducedMotion = (e.target as HTMLInputElement).checked; saveSettings(); };
el<HTMLInputElement>('audio').onchange = () => { sound = el<HTMLInputElement>('audio').checked; if (sound) { audio ??= new AudioContext(); void audio.resume(); tone(380, .2); } };

const canvas = scene.renderer.domElement;
function battlefieldClick(e: PointerEvent) {
  if (!started || game.result || game.countdown > 0) return;
  const p = scene.pick(e.clientX, e.clientY); if (!p) return;
  if (e.button === 2 || targeting) {
    issue({ kind: targeting === 'emp' ? 'emp' : 'move', squadId: selected, target: p }); targeting = null; el('battlefield').classList.remove('targeting'); return;
  }
  const closest = game.squads.filter(s => s.side === 0 && distance(s, p) < 2.4).sort((a, b) => distance(a, p) - distance(b, p))[0];
  if (closest) { selected = closest.id; if (guided && tutorialStage === 0) tutorialStage = 1; toast(`Squad ${friendlyName(selected)} selected. Right click or choose Move.`); }
  else if (e.pointerType === 'touch' && selected) issue({ kind: 'move', squadId: selected, target: p });
  else toast('Select a cyan squad or use the squad cards below.');
  updateHud();
}
canvas.addEventListener('pointerdown', battlefieldClick); canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if ((e.target as HTMLElement).matches('input, textarea, select') || document.querySelector('dialog[open]') || e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.code === 'Space') { e.preventDefault(); scene.setTactical(true); }
  if (e.repeat) return;
  const key = e.key.toLowerCase();
  if (['1', '2', '3'].includes(key)) { selected = game.squads.filter(s => s.side === 0)[Number(key) - 1]?.id ?? null; if (guided && tutorialStage === 0 && selected) tutorialStage = 1; updateHud(); }
  if (key === 'm') target('move'); if (key === 'q') issue({ kind: 'shield', squadId: selected }); if (key === 'e') target('emp'); if (key === 'r') issue({ kind: 'retreat', squadId: selected });
  if (key === 'escape') { targeting = null; selected = null; el('battlefield').classList.remove('targeting'); toast('Selection cleared'); updateHud(); }
});
window.addEventListener('keyup', e => { if (e.code === 'Space') scene.setTactical(tactical); });
window.addEventListener('blur', () => scene.setTactical(tactical));
document.addEventListener('visibilitychange', () => { paused = document.hidden; accumulator = 0; lastFrame = performance.now(); if (started && !game.result) toast(paused ? 'Practice paused while the tab is hidden.' : 'Practice resumed.'); });
const friendlyName = (id: number) => String(game.squads.filter(s => s.side === 0).findIndex(s => s.id === id) + 1).padStart(2, '0');
function updateHud() {
  const own = game.squads.filter(s => s.side === 0), remaining = Math.ceil(Math.max(0, R.regulation - game.tick) / R.ticks);
  el('score-you').textContent = String(game.scores[0]).padStart(3, '0'); el('score-bot').textContent = String(game.scores[1]).padStart(3, '0');
  el('timer').textContent = game.tick > R.regulation ? `OT ${Math.ceil((R.regulation + R.overtime - game.tick) / R.ticks)}` : `${Math.floor(remaining / 60).toString().padStart(2, '0')}:${Math.ceil(remaining % 60).toString().padStart(2, '0')}`;
  el('phase').textContent = !started ? 'OPERATION STANDBY' : game.result ? 'TRANSMISSION ENDED' : paused ? 'PRACTICE PAUSED' : game.countdown ? 'DEPLOYMENT COUNTDOWN' : game.tick >= R.doubleAt ? 'SIGNAL ×2' : 'RELAY CONTROL';
  el('budget').textContent = String(game.budgets[0]); el('slots').textContent = `${own.length} / 3 ACTIVE`;
  el('selected-name').textContent = selected && own.some(s => s.id === selected) ? `SQUAD ${friendlyName(selected)} SELECTED` : 'SELECT A SQUAD';
  const squadSignature = own.map(s => `${s.id}:${s.hp}:${s.suppression}:${s.shield}:${s.disabledUntil > game.tick}:${s.coverId}:${s.id === selected}`).join('|') + game.pending.filter(p => p.side === 0).length;
  if (el('squad-cards').dataset.signature !== squadSignature) {
    el('squad-cards').dataset.signature = squadSignature;
    el('squad-cards').innerHTML = own.map((s, i) => `<button class="squad-card ${s.id === selected ? 'selected' : ''}" data-squad="${s.id}" aria-label="Select squad ${i + 1}, ${s.hp} health"><span><b>◈</b> ${String(i + 1).padStart(2, '0')} <kbd>${i + 1}</kbd></span><div class="hp-track"><i style="width:${s.hp}%"></i></div><small>${s.hp} HP / ${s.disabledUntil > game.tick ? 'DISABLED' : s.suppression >= 60 ? 'SUPPRESSED' : s.shield ? 'SHIELDED' : s.coverId !== null && game.tick - s.coverSince >= R.coverTicks ? 'IN COVER' : 'READY'}</small></button>`).join('') + (game.pending.some(p => p.side === 0) ? '<span class="preparing">PREPARING<br>REINFORCEMENT</span>' : '');
    el('squad-cards').querySelectorAll<HTMLButtonElement>('[data-squad]').forEach(b => { b.onclick = () => { selected = Number(b.dataset.squad); if (guided && tutorialStage === 0) tutorialStage = 1; updateHud(); }; });
  }
  el('relay-status').innerHTML = game.relays.map(r => `<b class="${r.owner === 0 ? 'friendly' : r.owner === 1 ? 'hostile' : ''}">${r.id}</b>`).join('');
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
    ['Select your squad', 'Click your cyan soldiers, press 1, or choose the squad card below.'],
    ['Give a movement order', 'Choose MOVE and tap inside relay B. Cyan strips beside barriers mark cover.'],
    ['Hold the relay', 'Keep a squad in the circle for five uncontested seconds. Watch the bot approaches.'],
    ['Watch the northern flank', 'The training bot is approaching through relay A. Buildings block sight, so its position appears only when visible.'],
    ['Bring reinforcements', 'The flanking squad is now visible. Deploy a squad for 20 practice credits. It prepares at home for two seconds.'],
    ['Time a shield', 'Select a squad and use SHIELD. It costs 10 credits and absorbs 30 damage.'],
    ['You have command', 'Capture, flank and preserve your reserve. A destroyed squad stays destroyed.'],
  ];
  el('tutorial-card').hidden = !guided || !started || !!game.result;
  el('tutorial-title').textContent = guidance[tutorialStage][0]; el('tutorial-copy').textContent = guidance[tutorialStage][1];
  if (game.result && !resultShown) {
    resultShown = true; el('result-title').textContent = game.result.winner === null ? 'Signal unresolved.' : game.result.winner === 0 ? 'Frequency secured.' : 'Transmission lost.';
    el('result-reason').textContent = `${game.result.reason}. You ${game.scores[0]} / Bot ${game.scores[1]}.`;
    el('result-stats').innerHTML = `<p>Relays held <b>${game.relays.filter(r => r.owner === 0).length} / 3</b></p><p>Squads lost <b>${game.lost[0]}</b></p><p>Reserve spent <b>${game.spent[0]} CR</b></p><p>Reserve remaining <b>${game.budgets[0]} CR</b></p>`;
    el('result-observations').textContent = `You used ${spending.filter(s => s.action === 'DEPLOY').length} paid reinforcements and ${spending.filter(s => s.action !== 'DEPLOY').length} support abilities. ${game.budgets[0]} of your 100 starting practice credits remained.`;
    try { const history = JSON.parse(localStorage.getItem('last-signal-results') ?? '[]'); history.unshift({ at: new Date().toISOString(), mode: 'LOCAL_PRACTICE', result: game.result, scores: game.scores, spent: game.spent[0] }); localStorage.setItem('last-signal-results', JSON.stringify(history.slice(0, 10))); } catch { /* Match results work without persistence. */ }
    dialog('result').showModal();
  }
}
function frame(now: number) {
  const elapsed = Math.min((now - lastFrame) / 1000, .25); lastFrame = now;
  if (started && !paused && !game.result) {
    accumulator += elapsed;
    let catchup = 0;
    while (accumulator >= 1 / R.ticks && catchup++ < 5) {
      step(game);
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
  scene.update(observe(game, 0), selected, events, elapsed);
  if (now - lastHud > 100) { updateHud(); lastHud = now; }
  requestAnimationFrame(frame);
}
updateHud(); requestAnimationFrame(frame);
window.addEventListener('pagehide', () => { scene.dispose(); void audio?.close(); }, { once: true });
