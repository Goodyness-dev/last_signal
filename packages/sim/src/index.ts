export * from './rules.ts';
import { RULES as R, HOMES, RELAYS, MAP, distance, quantize, legal, lineOfSight, path, type Point, type Side } from './rules.ts';
export type Aim = { x: number; y: number; z: number };
export type Squad = Point & { id: number; side: Side; hp: number; suppression: number; lastHit: number; shotAt: number; disabledUntil: number; shield: number; shieldUntil: number; coverId: number | null; coverSince: number; route: Point[]; rifleAt?: number; rifleAim?: Aim; drive?: Point; driveUntil?: number };
export type Relay = Point & { id: string; owner: Side | null; attacker: Side | null; progress: number; contested: boolean };
export type Command = { id: string; side: Side } & ({ kind: 'drive'; direction: Point; squadId: number } | { kind: 'fire'; direction: Aim; squadId: number } | { kind: 'move'; target: Point; squadId: number } | { kind: 'emp'; target: Point; squadId: number } | { kind: 'shield'; squadId: number } | { kind: 'retreat'; squadId: number } | { kind: 'deploy' } | { kind: 'surrender' });
export type GameEvent = { seq: number; tick: number; kind: string; from?: Point; to?: Point; side?: Side; text?: string; height?: number };
export type Game = { tick: number; countdown: number; squads: Squad[]; relays: Relay[]; budgets: [number, number]; scores: [number, number]; spent: [number, number]; lost: [number, number]; cooldowns: { deploy: number; shield: number; emp: number }[]; pending: { side: Side; at: number }[]; nextId: number; events: GameEvent[]; eventSeq: number; seen: Record<string, { ok: boolean; reason: string }>; result: null | { winner: Side | null; reason: string }; seed: number };
export type Observation = { tick: number; squads: Squad[]; relays: Relay[]; budgets: [number, number]; scores: [number, number]; cooldowns: Game['cooldowns']; pending: Game['pending']; result: Game['result']; seed: number };
export const isMoving = (s: Squad, tick: number) => s.route.length > 0 || ((s.driveUntil ?? -1) >= tick && Math.hypot(s.drive?.x ?? 0, s.drive?.z ?? 0) > 0);
function event(g: Game, e: Omit<GameEvent, 'seq' | 'tick'>) { g.events.push({ ...e, seq: ++g.eventSeq, tick: g.tick }); if (g.events.length > 100) g.events.shift(); }
function spawn(g: Game, side: Side) {
  const s: Squad = { id: g.nextId++, side, ...HOMES[side], hp: R.squadHp, suppression: 0, lastHit: -100, shotAt: -100, disabledUntil: 0, shield: 0, shieldUntil: 0, coverId: null, coverSince: 0, route: [] };
  g.squads.push(s); event(g, { kind: 'SquadSpawned', side, to: { x: s.x, z: s.z }, text: side === 0 ? 'Friendly squad ready' : 'Bot reinforcement' });
}
export function createGame(seed = 1): Game {
  const g: Game = { tick: 0, countdown: R.countdown, squads: [], relays: RELAYS.map(r => ({ ...r, owner: null, attacker: null, progress: 0, contested: false })), budgets: [100, 100], scores: [0, 0], spent: [0, 0], lost: [0, 0], cooldowns: [{ deploy: 0, shield: 0, emp: 0 }, { deploy: 0, shield: 0, emp: 0 }], pending: [], nextId: 1, events: [], eventSeq: 0, seen: {}, result: null, seed };
  spawn(g, 0); spawn(g, 1); return g;
}
// Explicit local drill fixture. Normal match spawning and costs are unchanged.
export function createCombatDrill(seed=1):Game {
  const g=createGame(seed);g.countdown=0;
  for(let wave=0;wave<2;wave++){
    for(const side of [0,1] as const)command(g,{id:`drill:${wave}`,side,kind:'deploy'});
    for(let tick=0;tick<(wave===0?R.deployCooldown:R.spawnDelay);tick++)step(g);
  }
  for(const side of [0,1] as const)g.squads.filter(s=>s.side===side).forEach((s,i)=>{s.x=side===0?21:27;s.z=RELAYS[i].z;});
  return g;
}
export const protectedHome = (s: Squad) => distance(s, HOMES[s.side]) <= R.homeRadius;
export function visible(g: Pick<Game, 'squads'>, side: Side, p: Point): boolean {
  return (distance(p, HOMES[side]) <= 6 && lineOfSight(HOMES[side], p)) || g.squads.some(s => s.side === side && distance(s, p) <= R.vision && lineOfSight(s, p));
}
export function observe(g: Game, side: Side): Observation {
  return structuredClone({ tick: g.tick, squads: g.squads.filter(s => s.side === side || visible(g, side, s)), relays: g.relays, budgets: side === 0 ? [g.budgets[0], -1] : [-1, g.budgets[1]], scores: g.scores, cooldowns: g.cooldowns.map((c, i) => i === side ? c : { deploy: 0, shield: 0, emp: 0 }), pending: g.pending.filter(p => p.side === side), result: g.result, seed: g.seed });
}
export function command(g: Game, c: Command): { ok: boolean; reason: string } {
  const key = `${c.side}:${c.id}`;
  if (g.seen[key]) return g.seen[key];
  const answer = (ok: boolean, reason: string) => g.seen[key] = { ok, reason };
  if (g.result) return answer(false, 'Match ended');
  if (g.countdown > 0) return answer(false, 'Stand by for deployment countdown');
  if (c.kind === 'surrender') { g.result = { winner: (1 - c.side) as Side, reason: 'Surrender' }; event(g, { kind: 'MatchEnded' }); return answer(true, 'Match conceded'); }
  const s = 'squadId' in c ? g.squads.find(s => s.id === c.squadId && s.side === c.side) : undefined;
  if (c.kind !== 'deploy' && !s) return answer(false, 'Select a living friendly squad');
  if (c.kind === 'drive') {
    const {x,z}=c.direction,length=Math.hypot(x,z);
    if(![x,z,length].every(Number.isFinite))return answer(false,'Invalid movement direction');
    s!.drive={x:x/Math.max(1,length),z:z/Math.max(1,length)};s!.driveUntil=g.tick+2;s!.route=[];
    return answer(true,'Direct movement');
  }
  if (c.kind === 'fire') {
    const { x, y, z } = c.direction, length = Math.hypot(x, y, z);
    if (![x, y, z, length].every(Number.isFinite) || length < .001) return answer(false, 'Invalid firing direction');
    if (s!.disabledUntil > g.tick) return answer(false, 'Rifle disabled by EMP');
    if (g.tick - (s!.rifleAt ?? -100) < R.rifleTicks) return answer(false, 'Cycling rifle bolt');
    s!.rifleAt = g.tick; s!.rifleAim = { x: x / length, y: y / length, z: z / length };
    return answer(true, 'Rifle fired');
  }
  if (c.kind === 'move' || c.kind === 'retreat') {
    const target = c.kind === 'retreat' ? { x: c.side === 0 ? 7.5 : 40.5, z: 16.5 } : c.target;
    const route = path(s!, target, c.side);
    if (!route) return answer(false, 'Destination blocked or inside enemy home');
    delete s!.drive;delete s!.driveUntil;s!.route = route; event(g, { kind: 'MoveAccepted', side: c.side, to: target }); return answer(true, c.kind === 'retreat' ? 'Retreat ordered. No healing or refund.' : 'Movement confirmed');
  }
  const cooldown = g.cooldowns[c.side];
  if (cooldown[c.kind] > g.tick) return answer(false, `${c.kind.toUpperCase()} cooling down`);
  const cost = c.kind === 'deploy' ? R.deployCost : c.kind === 'shield' ? R.shieldCost : R.empCost;
  if (g.budgets[c.side] < cost) return answer(false, 'Insufficient practice credits');
  if (c.kind === 'deploy') {
    if (g.squads.filter(s => s.side === c.side).length + g.pending.filter(p => p.side === c.side).length >= R.maxSquads) return answer(false, 'All three squad slots occupied');
    g.pending.push({ side: c.side, at: g.tick + R.spawnDelay }); cooldown.deploy = g.tick + R.deployCooldown;
    event(g, { kind: 'DeployAccepted', side: c.side, text: 'Reinforcement preparing for 2 seconds' });
  } else if (c.kind === 'shield') {
    if (s!.shield > 0 && s!.shieldUntil > g.tick) return answer(false, 'Shield already active');
    s!.shield = R.shieldCapacity; s!.shieldUntil = g.tick + R.shieldDuration; cooldown.shield = g.tick + R.shieldCooldown;
    event(g, { kind: 'ShieldStarted', side: c.side, to: { x: s!.x, z: s!.z }, text: 'Shield active. 30 capacity for 4 seconds.' });
  } else {
    if (!legal(c.target) || HOMES.some(h => distance(h, c.target) <= R.homeRadius)) return answer(false, 'EMP cannot target protected home zones');
    if (!g.squads.some(s => s.side === c.side && distance(s, c.target) <= R.empRange && lineOfSight(s, c.target))) return answer(false, 'EMP needs friendly line of sight within 10 units');
    for (const enemy of g.squads.filter(s => s.side !== c.side && distance(s, c.target) <= R.empRadius)) { enemy.shield = 0; enemy.disabledUntil = Math.max(enemy.disabledUntil, g.tick + R.empDuration); }
    cooldown.emp = g.tick + R.empCooldown; event(g, { kind: 'EmpTriggered', side: c.side, to: c.target, text: 'EMP pulse. Enemy weapons disabled for 2 seconds.' });
  }
  g.budgets[c.side] -= cost; g.spent[c.side] += cost;
  return answer(true, `${c.kind.toUpperCase()} confirmed. ${cost} practice credits spent.`);
}
export function step(g: Game) {
  if (g.result) return;
  if (g.countdown > 0) { g.countdown--; return; }
  g.tick++;
  for (const p of g.pending.filter(p => p.at <= g.tick)) spawn(g, p.side);
  g.pending = g.pending.filter(p => p.at > g.tick);
  for (const s of g.squads) {
    if (s.shieldUntil <= g.tick) s.shield = 0;
    if (g.tick - s.lastHit > R.suppressionDelay) s.suppression = Math.max(0, s.suppression - R.suppressionDecay);
    let remaining = R.speed / R.ticks * (s.suppression >= R.suppressionThreshold ? R.suppressionSpeed : 1) * (g.tick - s.shotAt < R.weaponTicks ? R.firingSpeed : 1);
    if(s.drive&&(s.driveUntil??0)>=g.tick){
      for(let i=0;i<4;i++){
        const next={x:quantize(s.x+s.drive.x*remaining/4),z:quantize(s.z+s.drive.z*remaining/4)};
        if(legal(next,s.side)){s.x=next.x;s.z=next.z;}
        else {if(legal({x:next.x,z:s.z},s.side))s.x=next.x;if(legal({x:s.x,z:next.z},s.side))s.z=next.z;}
      }
      remaining=0;
    }
    while (remaining > 0 && s.route.length) {
      const next = s.route[0], d = distance(s, next);
      if (d <= remaining) { s.x = next.x; s.z = next.z; s.route.shift(); remaining -= d; }
      else { s.x = quantize(s.x + (next.x - s.x) / d * remaining); s.z = quantize(s.z + (next.z - s.z) / d * remaining); remaining = 0; }
    }
    const cover = MAP.covers.find(c => Math.abs(s.x - c.x) <= 1.25 && Math.abs(s.z - c.z) <= 1.6);
    if ((cover?.id ?? null) !== s.coverId) { s.coverSince = g.tick; s.coverId = cover?.id ?? null; }
  }
  const attacks: { from: Squad; to: Squad; damage: number; rifle?: boolean }[] = [];
  for (const s of g.squads) {
    if (s.disabledUntil > g.tick || g.tick - s.shotAt < R.weaponTicks || protectedHome(s)) continue;
    const target = g.squads.filter(e => e.side !== s.side && !protectedHome(e) && distance(s, e) <= R.range && visible(g, s.side, e) && lineOfSight(s, e)).sort((a, b) => distance(s, a) - distance(s, b) || a.id - b.id)[0];
    if (target) attacks.push({ from: s, to: target, damage: R.volley });
  }
  for (const s of g.squads) {
    const aim = s.rifleAim; delete s.rifleAim;
    if (!aim || s.disabledUntil > g.tick) continue;
    const shot = traceRifle(g, s, aim);
    event(g, { kind: 'PlayerShot', side: s.side, from: { x: s.x, z: s.z }, to: shot.point, height: shot.height });
    if (shot.target) attacks.push({ from: s, to: shot.target, damage: R.rifleDamage, rifle: true });
  }
  for (const attack of attacks.sort((a, b) => a.from.id - b.from.id)) {
    const { from, to, rifle } = attack;
    if (!rifle) from.shotAt = g.tick;
    let damage = attack.damage;
    const absorbed = Math.min(to.shield, damage); to.shield -= absorbed; damage -= absorbed;
    if (damage > 0) {
      const cover = MAP.covers.find(c => c.id === to.coverId);
      if (cover && g.tick - to.coverSince >= R.coverTicks && (from.x - to.x) * cover.facing / distance(from, to) >= .5) damage *= R.coverReduction;
      to.hp -= damage; to.suppression = Math.min(100, to.suppression + R.suppressionHit); to.lastHit = g.tick;
    }
    event(g, { kind: rifle ? 'PlayerHit' : 'ShotFired', from: { x: from.x, z: from.z }, to: { x: to.x, z: to.z }, side: from.side });
  }
  for (const s of g.squads.filter(s => s.hp <= 0)) { g.lost[s.side]++; event(g, { kind: 'SquadDestroyed', side: s.side, to: { x: s.x, z: s.z }, text: s.side === 0 ? 'Friendly squad lost. Deployment cost is not returned.' : 'Hostile squad eliminated' }); }
  g.squads = g.squads.filter(s => s.hp > 0);
  for (const r of g.relays) {
    const inside = g.squads.filter(s => distance(s, r) <= R.captureRadius);
    const sides = new Set(inside.map(s => s.side)); r.contested = sides.size === 2;
    if (r.contested) continue;
    const attacker = inside.find(s => s.suppression < R.suppressionThreshold)?.side;
    if (attacker === undefined || attacker === r.owner) { r.progress = Math.max(0, r.progress - 1); if (r.progress === 0) r.attacker = null; continue; }
    if (r.attacker !== attacker) { r.attacker = attacker; r.progress = 0; }
    r.progress++;
    if (r.progress >= R.captureTicks) { r.owner = attacker; r.attacker = null; r.progress = 0; event(g, { kind: 'RelayCaptured', side: attacker, to: r, text: `Relay ${r.id} captured by ${attacker === 0 ? 'you' : 'Bot'}` }); }
  }
  if (g.tick % R.ticks === 0) for (const r of g.relays) if (r.owner !== null) g.scores[r.owner] += g.tick >= R.doubleAt && g.tick <= R.regulation ? 2 : 1;
  const winner = (): Side | null => g.scores[0] === g.scores[1] ? null : g.scores[0] > g.scores[1] ? 0 : 1;
  if (Math.max(...g.scores) >= R.victory || (g.tick >= R.regulation && winner() !== null) || g.tick >= R.regulation + R.overtime) {
    g.result = { winner: winner(), reason: Math.max(...g.scores) >= R.victory ? 'Signal threshold reached' : g.tick >= R.regulation + R.overtime ? 'Overtime complete' : 'Signal majority' };
    event(g, { kind: 'MatchEnded', text: g.result.reason });
  }
}
// A bounded ray against the same building volumes and aggregate squad bodies.
// Looking above, below or beside a squad misses; targets behind walls or homes are safe.
export function traceRifle(g: Pick<Game, 'squads'>, from: Squad, aim: Aim): { point: Point; height: number; target?: Squad } {
  let limit: number = R.range;
  if (aim.y < 0) limit = Math.min(limit, -1.64 / aim.y);
  for (const o of MAP.obstacles) {
    let near = 0, far = limit;
    for (const [origin, direction, low, high] of [[from.x, aim.x, o.x, o.x + o.w], [1.64, aim.y, 0, o.h], [from.z, aim.z, o.z, o.z + o.d]]) {
      if (Math.abs(direction) < 1e-8) { if (origin < low || origin > high) { far = -1; break; } }
      else { const a = (low - origin) / direction, b = (high - origin) / direction; near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b)); }
    }
    if (far >= near) limit = near;
  }
  let target: Squad | undefined;
  if (!protectedHome(from)) for (const enemy of g.squads) {
    if (enemy.side === from.side || protectedHome(enemy) || !visible(g, from.side, enemy) || !lineOfSight(from, enemy)) continue;
    const dx = enemy.x - from.x, dy = 1.05 - 1.64, dz = enemy.z - from.z;
    const along = dx * aim.x + dy * aim.y + dz * aim.z;
    const discriminant = .8 ** 2 - (dx * dx + dy * dy + dz * dz - along * along);
    if (discriminant < 0) continue;
    const hit = along - Math.sqrt(discriminant);
    if (hit >= 0 && hit < limit) { limit = hit; target = enemy; }
  }
  return { point: { x: from.x + aim.x * limit, z: from.z + aim.z * limit }, height: Math.max(0, 1.64 + aim.y * limit), target };
}
// Bot receives only its authorized observation. All actions pass through command().
export function botCommands(o: Observation, side: Side): Command[] {
  if (o.tick % R.botThink !== 0 || o.result) return [];
  const own = o.squads.filter(s => s.side === side), enemies = o.squads.filter(s => s.side !== side);
  const base = { id: `bot:${o.tick}`, side };
  const danger = own.find(s => s.hp <= 30 && !protectedHome(s) && s.route.length === 0);
  if (danger) return [{ ...base, kind: 'retreat', squadId: danger.id }];
  const threatened = own.find(s => s.hp < 80 && !s.shield && enemies.some(e => distance(e, s) <= R.range));
  if (threatened && o.budgets[side] >= 10 && o.cooldowns[side].shield <= o.tick) return [{ ...base, kind: 'shield', squadId: threatened.id }];
  if (own.length + o.pending.length < R.maxSquads && o.budgets[side] >= 40 && o.cooldowns[side].deploy <= o.tick) return [{ ...base, kind: 'deploy' }];
  for (let i = 0; i < own.length; i++) {
    const s = own[i];
    if (s.route.length || (s.hp <= 30 && protectedHome(s))) continue;
    const ordered = [...o.relays].sort((a, b) => {
      const value = (r: Relay) => (r.owner === side ? 20 : 0) + distance(s, r) * .3 + own.filter(other => other.id !== s.id && (distance(other, r) < 4 || distance(other.route.at(-1) ?? other, r) < 4)).length * 15;
      return value(a) - value(b) || a.id.localeCompare(b.id);
    });
    const r = ordered[0];
    if (distance(s, r) > 2) return [{ ...base, kind: 'move', squadId: s.id, target: { x: r.x + (side === 0 ? -1 : 1), z: r.z } }];
  }
  return [];
}
