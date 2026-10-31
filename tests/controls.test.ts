import { describe, expect, it } from 'vitest';
import { command, createGame, legal, step, traceRifle, RULES as R } from '@last-signal/sim';
import { PerspectiveCamera, Vector3 } from 'three';
import { FieldCamera } from '../apps/web/src/field-camera.ts';

function encounter() {
  const g=createGame();g.countdown=0;
  Object.assign(g.squads[0],{x:21,z:16});Object.assign(g.squads[1],{x:27,z:16});
  return g;
}
describe('player rifle and direct movement',()=>{
  it('strafes right relative to the view and looks both up and down',()=>{
    const camera=new PerspectiveCamera(),view=new FieldCamera(camera);view.setMode('eyes');
    expect(view.direction(1,0).x).toBeCloseTo(1);expect(view.direction(0,1).z).toBeCloseTo(1);
    view.rotate(0,-1000);view.update(undefined,.016,true,0);expect(camera.getWorldDirection(new Vector3()).y).toBeGreaterThan(.9);
    view.rotate(0,2000);view.update(undefined,.016,true,0);expect(camera.getWorldDirection(new Vector3()).y).toBeLessThan(-.9);
    view.aiming=true;view.update(undefined,.016,true,0);expect(camera.fov).toBe(49);
  });
  it('adds an aimed rifle hit while both squads keep automatic volleys',()=>{
    const g=encounter(),fire={id:'shot',side:0 as const,kind:'fire' as const,squadId:1,direction:{x:6,y:-.59,z:0}};
    expect(command(g,fire).ok).toBe(true);expect(command(g,fire).ok).toBe(true);
    step(g);
    expect(g.squads[1].hp).toBe(100-R.volley-R.rifleDamage);
    expect(g.squads[0].hp).toBe(100-R.volley);
    expect(g.events.filter(e=>e.kind==='PlayerShot')).toHaveLength(1);
    expect(g.events.filter(e=>e.kind==='PlayerHit')).toHaveLength(1);
    expect(command(g,{...fire,id:'too-fast'}).ok).toBe(false);
    expect(g.budgets).toEqual([100,100]);
  });
  it('misses above or beside an enemy and blocks shots through buildings',()=>{
    for(const direction of [{x:0,y:1,z:0},{x:0,y:0,z:1}]){
      const g=encounter();command(g,{id:'miss',side:0,kind:'fire',squadId:1,direction});step(g);
      expect(g.squads[1].hp).toBe(100-R.volley);expect(g.events.some(e=>e.kind==='PlayerHit')).toBe(false);
    }
    const g=encounter();Object.assign(g.squads[0],{x:10,z:8});Object.assign(g.squads[1],{x:18,z:8});
    command(g,{id:'wall',side:0,kind:'fire',squadId:1,direction:{x:8,y:-.59,z:0}});step(g);
    expect(g.squads[1].hp).toBe(100);expect(g.events.some(e=>e.kind==='PlayerHit')).toBe(false);
  });
  it('enforces ownership, finite aim, EMP, home safety, shield and cover',()=>{
    const g=encounter(),fire={id:'f',side:0 as const,kind:'fire' as const,squadId:1,direction:{x:6,y:-.59,z:0}};
    expect(command(g,{...fire,id:'enemy',squadId:2}).ok).toBe(false);
    expect(command(g,{...fire,id:'nan',direction:{x:NaN,y:0,z:0}}).ok).toBe(false);
    g.squads[0].disabledUntil=50;expect(command(g,{...fire,id:'emp'}).ok).toBe(false);g.squads[0].disabledUntil=0;
    g.squads[1].shield=30;g.squads[1].shieldUntil=100;command(g,fire);step(g);
    expect(g.squads[1].hp).toBe(100);expect(g.squads[1].shield).toBe(30-R.volley-R.rifleDamage);
    const home=createGame();home.countdown=0;Object.assign(home.squads[1],{x:10,z:16});
    expect(traceRifle(home,home.squads[0],{x:1,y:0,z:0}).target).toBeUndefined();
    const cover=encounter();cover.tick=30;Object.assign(cover.squads[0],{x:24,z:16});Object.assign(cover.squads[1],{x:30,z:16,coverId:3,coverSince:0});
    command(cover,fire);step(cover);expect(cover.squads[1].hp).toBeCloseTo(100-(R.volley+R.rifleDamage)*R.coverReduction);
  });
  it('moves continuously, stops immediately, expires input and cannot cross a wall',()=>{
    const g=createGame();g.countdown=0;
    command(g,{id:'walk',side:0,kind:'drive',squadId:1,direction:{x:1,z:0}});step(g);
    expect(g.squads[0].x).toBeCloseTo(4+R.speed/R.ticks,3);
    command(g,{id:'stop',side:0,kind:'drive',squadId:1,direction:{x:0,z:0}});const stopped=g.squads[0].x;step(g);expect(g.squads[0].x).toBe(stopped);
    command(g,{id:'expire',side:0,kind:'drive',squadId:1,direction:{x:1,z:0}});step(g);step(g);const expired=g.squads[0].x;step(g);expect(g.squads[0].x).toBe(expired);
    Object.assign(g.squads[0],{x:10.9,z:8});
    for(let i=0;i<30;i++){command(g,{id:`wall:${i}`,side:0,kind:'drive',squadId:1,direction:{x:1,z:0}});step(g);expect(legal(g.squads[0],0)).toBe(true);}
    expect(g.squads[0].x).toBeLessThan(11);
  });
});
