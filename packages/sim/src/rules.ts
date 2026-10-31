export const RULES = Object.freeze({
  version: 'practice-4-squad-survival', ticks: 20, countdown: 60, regulation: 3600, overtime: 400,
  victory: 240, doubleAt: 3000, budget: 100, squadHp: 100, speed: 3,
  range: 8, vision: 12, volley: 10, weaponTicks: 20, firingSpeed: .75,
  rifleDamage: 20, rifleTicks: 5, rifleRange: 14, magazine: 20, reserveAmmo: 80, maxReserveAmmo:180, reloadTicks: 30,
  heroDamageScale:.5, heroHitGraceTicks:10,
  lootTokens: 5, lootRange: 2, dodgeCooldown: 60, dodgeDuration: 10,
  maxSquads: 3, deployCost: 20, deployCooldown: 100, spawnDelay: 40,
  shieldCost: 10, shieldCapacity: 30, shieldDuration: 80, shieldCooldown: 360,
  empCost: 15, empRange: 10, empRadius: 3, empDuration: 40, empCooldown: 440,
  captureRadius: 3, captureTicks: 100, homeRadius: 4,
  coverTicks: 10, coverReduction: .6, suppressionHit: 25,
  suppressionThreshold: 60, suppressionDelay: 40, suppressionDecay: 1, suppressionSpeed: .6,
  botThink: 15,
});
export type Side = 0 | 1;
export type Point = { x: number; z: number };
export const HOMES: Point[] = [{ x: 4, z: 16 }, { x: 44, z: 16 }];
export const RELAYS = [{ id: 'A', x: 24, z: 7 }, { id: 'B', x: 24, z: 16 }, { id: 'C', x: 24, z: 25 }];
export const MAP = {
  version: 'compound-1', width: 48, depth: 32,
  obstacles: [
    { x: 11, z: 7, w: 6, d: 4, h: 2.4 }, { x: 31, z: 7, w: 6, d: 4, h: 2.4 },
    { x: 11, z: 21, w: 6, d: 4, h: 2.4 }, { x: 31, z: 21, w: 6, d: 4, h: 2.4 },
    { x: 20, z: 11, w: 3, d: 2, h: 1.6 }, { x: 25, z: 11, w: 3, d: 2, h: 1.6 },
    { x: 20, z: 19, w: 3, d: 2, h: 1.6 }, { x: 25, z: 19, w: 3, d: 2, h: 1.6 },
  ],
  covers: [
    { id: 0, x: 18, z: 6, facing: 1 }, { id: 1, x: 30, z: 6, facing: -1 },
    { id: 2, x: 18, z: 16, facing: 1 }, { id: 3, x: 30, z: 16, facing: -1 },
    { id: 4, x: 18, z: 26, facing: 1 }, { id: 5, x: 30, z: 26, facing: -1 },
  ],
};
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);
export const quantize = (n: number) => Math.round(n * 10000) / 10000;
export function legal(p: Point, side?: Side): boolean {
  return Number.isFinite(p.x) && Number.isFinite(p.z) && p.x >= .5 && p.x <= 47.5 && p.z >= .5 && p.z <= 31.5
    && !MAP.obstacles.some(o => p.x >= o.x && p.x <= o.x + o.w && p.z >= o.z && p.z <= o.z + o.d)
    && (side === undefined || distance(p, HOMES[1 - side]) > RULES.homeRadius);
}
export function lineOfSight(a: Point, b: Point): boolean {
  const steps = Math.ceil(distance(a, b) * 8);
  for (let i = 1; i < steps; i++) {
    if (!legal({ x: a.x + (b.x - a.x) * i / steps, z: a.z + (b.z - a.z) * i / steps })) return false;
  }
  return true;
}
// Stable four neighbor breadth first search on an authored one unit grid.
export function path(from: Point, to: Point, side: Side): Point[] | null {
  if (!legal(to, side)) return null;
  const cell = (p: Point) => Math.floor(p.z) * 48 + Math.floor(p.x);
  const point = (n: number): Point => ({ x: n % 48 + .5, z: Math.floor(n / 48) + .5 });
  const start = cell(from), end = cell(to);
  const queue = [start], previous = new Map<number, number>([[start, -1]]);
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (current === end) break;
    const p = point(current);
    for (const d of [{ x: 1, z: 0 }, { x: 0, z: 1 }, { x: -1, z: 0 }, { x: 0, z: -1 }]) {
      const next = { x: p.x + d.x, z: p.z + d.z }, id = cell(next);
      if (legal(next, side) && !previous.has(id)) { previous.set(id, current); queue.push(id); }
    }
  }
  if (!previous.has(end)) return null;
  const result: Point[] = [to];
  for (let c = end; c !== start; c = previous.get(c)!) result.unshift(point(c));
  return result;
}
