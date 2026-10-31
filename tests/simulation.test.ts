import { describe, it, expect } from 'vitest';
import { createGame, command, step, observe, botCommands, path, distance, RULES as R, MAP, type Game, type Side } from '@last-signal/sim';
const ready = () => { const g = createGame(); g.countdown = 0; return g; };
const advance = (g: Game, n: number) => { for (let i = 0; i < n; i++) step(g); };
describe('finite budgets and legal commands', () => {
  it('deduplicates spending and reserves preparing squad slots', () => {
    const g = ready(); const c = { id: 'paid-1', side: 0 as Side, kind: 'deploy' as const };
    expect(command(g, c).ok).toBe(true); expect(command(g, c).ok).toBe(true); expect(g.budgets[0]).toBe(80);
    advance(g, 100); expect(g.squads.filter(s => s.side === 0)).toHaveLength(2);
    expect(command(g, { ...c, id: 'paid-2' }).ok).toBe(true); advance(g, 100);
    expect(command(g, { ...c, id: 'paid-3' }).ok).toBe(false); expect(g.budgets[0]).toBe(60);
  });
  it('rejects overspend, enemy ownership and invalid geometry without charging', () => {
    const g = ready(); g.budgets[0] = 9;
    expect(command(g, { id: 's', side: 0, kind: 'shield', squadId: 1 }).ok).toBe(false);
    expect(command(g, { id: 'm', side: 0, kind: 'move', squadId: 2, target: { x: 24, z: 16 } }).ok).toBe(false);
    expect(command(g, { id: 'n', side: 0, kind: 'move', squadId: 1, target: { x: NaN, z: 16 } }).ok).toBe(false);
    expect(command(g, { id: 'h', side: 0, kind: 'move', squadId: 1, target: { x: 44, z: 16 } }).ok).toBe(false);
    expect(g.budgets[0]).toBe(9);
  });
  it('waits three seconds and freezes commands after a result', () => {
    const g = createGame(); expect(command(g, { id: 'a', side: 0, kind: 'deploy' }).ok).toBe(false);
    advance(g, 60); expect(g.tick).toBe(0); step(g); expect(g.tick).toBe(1);
    command(g, { id: 'end', side: 0, kind: 'surrender' }); const before = JSON.stringify(g.squads);
    advance(g, 100); expect(JSON.stringify(g.squads)).toBe(before); expect(command(g, { id: 'late', side: 0, kind: 'deploy' }).ok).toBe(false);
  });
});
describe('navigation, observation and combat', () => {
  it('has equal mirrored relay routes and avoids obstacle cells', () => {
    for (const z of [7, 16, 25]) {
      const a = path({ x: 4, z: 16 }, { x: 24, z }, 0)!;
      const b = path({ x: 44, z: 16 }, { x: 24, z }, 1)!;
      expect(Math.abs(a.length - b.length)).toBeLessThanOrEqual(1);
      for (const p of a) expect(MAP.obstacles.some(o => p.x >= o.x && p.x <= o.x + o.w && p.z >= o.z && p.z <= o.z + o.d)).toBe(false);
    }
  });
  it('omits hidden enemy coordinates from bot observations', () => {
    const g = ready(); expect(observe(g, 0).squads.map(s => s.side)).toEqual([0]); expect(observe(g, 1).squads.map(s => s.side)).toEqual([1]);
    expect(observe(g, 0).budgets[1]).toBe(-1);
  });
  it('resolves simultaneous lethal volleys and keeps protected homes safe', () => {
    const g = ready(); Object.assign(g.squads[0], { x: 23, z: 16, hp: 10 }); Object.assign(g.squads[1], { x: 25, z: 16, hp: 10 });
    step(g); expect(g.squads).toHaveLength(0); expect(g.lost).toEqual([1, 1]);
    const h = ready(); Object.assign(h.squads[1], { x: 9, z: 16 }); advance(h, 100); expect(h.squads[0].hp).toBe(100);
  });
  it('absorbs shield damage without suppression, expires and cannot stack', () => {
    const g = ready(); Object.assign(g.squads[0], { x: 23, z: 16 }); Object.assign(g.squads[1], { x: 25, z: 16 });
    command(g, { id: 'shield', side: 0, kind: 'shield', squadId: 1 }); step(g);
    expect(g.squads[0].hp).toBe(100); expect(g.squads[0].shield).toBe(20); expect(g.squads[0].suppression).toBe(0);
    expect(command(g, { id: 'stack', side: 0, kind: 'shield', squadId: 1 }).ok).toBe(false);
    g.squads[1].x = 44; advance(g, 80); expect(g.squads[0].shield).toBe(0);
  });
  it('applies cover only through the front after settling and suppression at 60', () => {
    const g = ready(); Object.assign(g.squads[0], { x: 18, z: 16 }); Object.assign(g.squads[1], { x: 24, z: 16, shotAt: 0 }); g.squads[0].shotAt = 100;
    advance(g, 20); expect(g.squads[0].hp).toBe(94);
    advance(g, 40); expect(g.squads[0].suppression).toBe(75);
    g.squads[1].x = 44; advance(g, 61); expect(g.squads[0].suppression).toBe(54);
  });
  it('EMP validates sight and range, disables firing and deals no damage', () => {
    const g = ready(); Object.assign(g.squads[0], { x: 23, z: 16 }); Object.assign(g.squads[1], { x: 25, z: 16, shield: 30, shieldUntil: 100 });
    expect(command(g, { id: 'bad', side: 0, kind: 'emp', squadId: 1, target: { x: 44, z: 16 } }).ok).toBe(false);
    expect(command(g, { id: 'pulse', side: 0, kind: 'emp', squadId: 1, target: { x: 25, z: 16 } }).ok).toBe(true);
    expect(g.squads[1].hp).toBe(100); expect(g.squads[1].shield).toBe(0); step(g); expect(g.squads[0].hp).toBe(100);
    expect(command(g, { id: 'again', side: 0, kind: 'emp', squadId: 1, target: { x: 25, z: 16 } }).ok).toBe(false);
    expect(g.budgets[0]).toBe(85);
  });
});
describe('capture, scoring and terminal boundaries', () => {
  it('requires 100 ticks, pauses with suppressed enemies and decays when empty', () => {
    const g = ready(); Object.assign(g.squads[0], { x: 24, z: 7 }); advance(g, 99); expect(g.relays[0].owner).toBeNull();
    step(g); expect(g.relays[0].owner).toBe(0);
    g.relays[0].owner = 1; advance(g, 25); const progress = g.relays[0].progress;
    Object.assign(g.squads[1], { x: 25, z: 7, suppression: 100, lastHit: g.tick + 1000, disabledUntil: 1000 }); g.squads[0].disabledUntil = 1000;
    advance(g, 10); expect(g.relays[0].contested).toBe(true); expect(g.relays[0].progress).toBe(progress);
    g.squads[0].x = 4; g.squads[1].x = 44; advance(g, 10); expect(g.relays[0].progress).toBe(progress - 10);
  });
  it('scores the existing owner during capture and doubles in last 30 seconds', () => {
    const g = ready(); g.relays[0].owner = 1; Object.assign(g.squads[0], { x: 24, z: 7 }); advance(g, 20); expect(g.scores[1]).toBe(1);
    g.tick = R.doubleAt - 1; g.relays[0].owner = 0; step(g); expect(g.scores[0]).toBe(2);
  });
  it('ends at 240 and provides regulation, overtime and draw behavior', () => {
    const g = ready(); g.scores[0] = 239; g.relays[0].owner = 0; advance(g, 20); expect(g.result?.winner).toBe(0);
    const a = ready(); a.tick = R.regulation - 1; a.scores = [10, 9]; step(a); expect(a.result?.winner).toBe(0);
    const b = ready(); b.tick = R.regulation - 1; step(b); expect(b.result).toBeNull(); b.relays[1].owner = 1; advance(b, 20); expect(b.result?.winner).toBe(1);
    const c = ready(); c.tick = R.regulation; advance(c, R.overtime); expect(c.result?.winner).toBeNull(); expect(c.result?.reason).toBe('Overtime complete');
  });
  it('replays bot matches deterministically with equal budgets and legal invariants', () => {
    const play = () => {
      const g = ready();
      for (let i = 0; i < 4100 && !g.result; i++) {
        for (const side of [0, 1] as Side[]) for (const c of botCommands(observe(g, side), side)) command(g, c);
        step(g);
        expect(g.budgets.every(n => n >= 0)).toBe(true);
        for (const side of [0, 1]) expect(g.squads.filter(s => s.side === side).length + g.pending.filter(p => p.side === side).length).toBeLessThanOrEqual(3);
        expect(g.squads.every(s => Number.isFinite(s.x) && Number.isFinite(s.z))).toBe(true);
      }
      expect(g.result).not.toBeNull(); return g;
    };
    const a = play(), b = play(); expect(a).toEqual(b);
    console.log('Deterministic bot match:', { tick: a.tick, scores: a.scores, spent: a.spent, result: a.result });
  });
});
