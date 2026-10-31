import {describe,it,expect} from 'vitest';
import {createGame,createLootTraining,createEndless,command,step,observe,botCommands,squadMembers,legal,RULES as R,type Game} from '@last-signal/sim';
const advance=(g:Game,n:number)=>{for(let i=0;i<n;i++)step(g);};
const fire=(g:Game,id:string)=>{
  const hero=g.squads.find(s=>s.id===g.hero!.squadId)!,enemy=g.squads.find(s=>s.side===1)!;
  return command(g,{id,side:0,kind:'fire',squadId:hero.id,direction:{x:enemy.x-hero.x,y:-.59,z:enemy.z-hero.z}});
};
describe('recovery and endless front',()=>{
  it('waits five seconds, regenerates at eight HP per second and never revives helpers',()=>{
    const g=createLootTraining(),hero=g.squads[0];hero.hp=30;hero.lastHit=0;
    advance(g,R.regenDelay-1);expect(hero.hp).toBe(30);expect(squadMembers(hero)).toBe(1);
    advance(g,R.ticks);expect(hero.hp).toBeCloseTo(38);
    advance(g,200);expect(hero.hp).toBe(100);expect(squadMembers(hero)).toBe(1);
    expect(g.events.filter(e=>e.kind==='SoldierFallen')).toHaveLength(0);
  });
  it('a new damaging hit delays recovery again, and a dead hero cannot heal',()=>{
    const g=createLootTraining(),hero=g.squads[0],enemy=g.squads[1];hero.hp=50;hero.lastHit=0;
    advance(g,R.regenDelay);expect(hero.hp).toBe(50.4);
    enemy.disabledUntil=0;enemy.shotAt=-100;step(g);const wounded=hero.hp;
    expect(wounded).toBeLessThan(50.4);enemy.disabledUntil=100000;
    advance(g,R.regenDelay-1);expect(hero.hp).toBe(wounded);step(g);expect(hero.hp).toBeCloseTo(wounded+.4);
    hero.hp=1;enemy.disabledUntil=0;enemy.shotAt=-100;g.hero!.lastDamageAt=-100;step(g);
    expect(g.hero!.alive).toBe(false);const tick=g.tick;advance(g,400);expect(g.tick).toBe(tick);expect(g.squads.some(s=>s.id===hero.id)).toBe(false);
  });
  it('spends finite WIF exactly once, rejects invalid requests and respects caps',()=>{
    const g=createLootTraining(),hero=g.squads[0];
    const buy={id:'supply',side:0 as const,kind:'supply' as const,squadId:hero.id,supply:'ammo' as const};
    expect(command(g,buy).ok).toBe(false);expect(hero.reserveAmmo).toBe(R.reserveAmmo);
    g.hero!.tokens=15;
    expect(command(g,{...buy,id:'valid'}).ok).toBe(true);expect(command(g,{...buy,id:'valid'}).ok).toBe(true);
    expect(hero.reserveAmmo).toBe(R.reserveAmmo+40);expect(g.hero!.tokens).toBe(10);expect(g.budgets).toEqual([100,100]);
    hero.reserveAmmo=R.maxReserveAmmo;expect(command(g,{...buy,id:'full'}).ok).toBe(false);expect(g.hero!.tokens).toBe(10);
    expect(command(g,{...buy,id:'shield',supply:'shield'}).ok).toBe(true);expect(hero.shield).toBe(R.shieldCapacity);
    expect(command(g,{...buy,id:'shield-again',supply:'shield'}).ok).toBe(false);expect(g.hero!.tokens).toBe(5);
    expect(command(g,{...buy,id:'enemy',side:1,squadId:g.squads[1].id}).ok).toBe(false);
  });
  it('replacements require safety, restore one helper and health, and stay within three men',()=>{
    const g=createLootTraining(),hero=g.squads[0];hero.hp=30;hero.members=1;hero.lastHit=0;g.hero!.tokens=30;
    const buy={id:'recruit',side:0 as const,kind:'supply' as const,squadId:hero.id,supply:'recruit' as const};
    expect(command(g,buy).ok).toBe(false);expect(g.hero!.tokens).toBe(30);
    advance(g,R.regenDelay);expect(command(g,{...buy,id:'safe'}).ok).toBe(true);
    expect(hero.hp).toBe(100);expect(squadMembers(hero)).toBe(2);expect(g.hero!.tokens).toBe(20);
    expect(command(g,{...buy,id:'third'}).ok).toBe(true);expect(squadMembers(hero)).toBe(3);
    expect(command(g,{...buy,id:'fourth'}).ok).toBe(false);expect(g.hero!.tokens).toBe(10);
  });
  it('ordinary kills clear a wave, pay once, keep loot and start the next wave after the break',()=>{
    const g=createEndless(),enemy=g.squads.find(s=>s.side===1)!;enemy.disabledUntil=100000;enemy.route=[];
    for(let i=0;i<6&&g.squads.some(s=>s.side===1);i++){expect(fire(g,'kill:'+i).ok).toBe(true);advance(g,R.rifleTicks);}
    expect(g.endless!.cleared).toBe(1);expect(g.hero!.tokens).toBe(R.waveReward);expect(g.loot).toHaveLength(1);expect(g.result).toBeNull();
    const next=g.endless!.nextWaveAt!;advance(g,next-g.tick-1);expect(g.squads.filter(s=>s.side===1)).toHaveLength(0);expect(g.hero!.tokens).toBe(R.waveReward);
    step(g);expect(g.endless!.wave).toBe(2);expect(g.squads.filter(s=>s.side===1)).toHaveLength(2);expect(g.endless!.nextWaveAt).toBeNull();
    for(const s of g.squads)expect(legal(s,s.side)).toBe(true);
    g.scores[0]=R.victory;step(g);expect(g.result).toBeNull();
  });
  it('runs consecutive bounded waves, preserves one reward per clear and ends on death or concession',()=>{
    const g=createEndless();
    for(let i=1;i<=12;i++){
      // Fixture removes enemies to exercise the long running wave scheduler without combat noise.
      g.squads=g.squads.filter(s=>s.side===0);step(g);expect(g.endless!.cleared).toBe(i);
      advance(g,R.waveBreak);expect(g.endless!.wave).toBe(i+1);expect(g.squads.filter(s=>s.side===1)).toHaveLength(Math.min(3,i+1));
    }
    expect(g.hero!.tokens).toBe(12*R.waveReward);expect(g.events.length).toBeLessThanOrEqual(100);expect(g.result).toBeNull();
    command(g,{id:'quit',side:0,kind:'surrender'});expect(g.result!.reason).toBe('Surrender');const wave=g.endless!.wave;advance(g,1000);expect(g.endless!.wave).toBe(wave);
    const fresh=createEndless();expect(fresh.hero!.tokens).toBe(0);expect(fresh.endless!.wave).toBe(1);
  });
  it('endless bots use authorized observations to pursue combat and do not buy extra waves',()=>{
    const g=createEndless();g.tick=R.botThink;const o=observe(g,1),orders=botCommands(o,1);
    expect(orders.some(c=>c.kind==='deploy')).toBe(false);expect(orders.some(c=>c.kind==='focus')).toBe(true);
    for(const c of orders)expect(command(g,c).ok).toBe(true);
    expect(observe(createGame(),0).endless).toBeNull();
  });
});
