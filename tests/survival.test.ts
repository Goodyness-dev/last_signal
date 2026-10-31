import {describe,it,expect} from 'vitest';
import {createGame,createCombatDrill,command,step,observe,botCommands,distance,legal,RULES as R,WEAPONS,type Game} from '@last-signal/sim';
const advance=(g:Game,ticks:number)=>{for(let i=0;i<ticks;i++)step(g);};
const practice=()=>{const g=createGame(1,{untimed:true,hero:true});g.countdown=0;return g;};
describe('untimed survival practice',()=>{
  it('has no regulation, overtime or late match double score deadline',()=>{
    const g=practice();g.tick=R.regulation-1;g.scores=[3,1];step(g);expect(g.result).toBeNull();
    g.tick=R.regulation+R.overtime;step(g);expect(g.result).toBeNull();
    g.tick=R.doubleAt-1;g.scores=[0,0];g.relays[0].owner=0;step(g);expect(g.scores[0]).toBe(1);
    g.scores[0]=R.victory-1;g.tick=R.regulation*3-1;step(g);expect(g.result?.winner).toBe(0);
  });
  it('ends the run when the main character dies even with surviving allies',()=>{
    const g=createCombatDrill(1,{untimed:true,hero:true}),hero=g.squads.find(s=>s.id===g.hero!.squadId)!;
    hero.hp=10;step(g);
    expect(g.hero!.alive).toBe(false);expect(g.result?.reason).toBe('Your main character was killed');
    expect(g.squads.some(s=>s.side===0)).toBe(true);const tick=g.tick;step(g);expect(g.tick).toBe(tick);
    expect(command(g,{id:'after-death',side:0,kind:'fire',squadId:g.squads.find(s=>s.side===0)!.id,direction:{x:1,y:0,z:0}}).ok).toBe(false);
  });
  it('uses real finite bullets and transfers only available reserve on reload',()=>{
    const g=practice(),hero=g.squads[0];
    for(let i=0;i<R.magazine;i++){g.tick=i*R.rifleTicks;expect(command(g,{id:'shot:'+i,side:0,kind:'fire',squadId:hero.id,direction:{x:0,y:1,z:0}}).ok).toBe(true);step(g);}
    expect(hero.ammo).toBe(0);expect(hero.reserveAmmo).toBe(24);
    expect(command(g,{id:'dry',side:0,kind:'fire',squadId:1,direction:{x:0,y:1,z:0}}).ok).toBe(false);
    expect(command(g,{id:'reload',side:0,kind:'reload',squadId:1}).ok).toBe(true);
    advance(g,R.reloadTicks-1);expect(hero.ammo).toBe(0);step(g);expect(hero.ammo).toBe(6);expect(hero.reserveAmmo).toBe(18);
    hero.ammo=0;hero.reserveAmmo=2;command(g,{id:'partial',side:0,kind:'reload',squadId:1});advance(g,R.reloadTicks);
    expect(hero.ammo).toBe(2);expect(hero.reserveAmmo).toBe(0);
    hero.ammo=0;expect(command(g,{id:'empty-reserve',side:0,kind:'reload',squadId:1}).ok).toBe(false);
  });
  it('drops loot on a real kill, requires proximity and collects each gun and practice WIF once',()=>{
    const g=practice(),hero=g.squads[0],enemy=g.squads[1];Object.assign(hero,{x:21,z:16});Object.assign(enemy,{x:23,z:16,hp:20});
    const enemyTemplate=structuredClone(enemy);
    command(g,{id:'kill',side:0,kind:'fire',squadId:1,direction:{x:2,y:-.59,z:0}});step(g);
    expect(g.squads.some(s=>s.id===2)).toBe(false);expect(g.loot).toHaveLength(1);expect(g.hero!.alive).toBe(true);
    hero.x=19;expect(command(g,{id:'far',side:0,kind:'loot',squadId:1,lootId:2}).ok).toBe(false);expect(g.hero!.tokens).toBe(0);
    hero.x=21;const pickup={id:'pickup',side:0 as const,kind:'loot' as const,squadId:1,lootId:2};
    expect(command(g,pickup).ok).toBe(true);expect(command(g,pickup).ok).toBe(true);
    expect(g.hero!.tokens).toBe(R.lootTokens);expect(g.loot).toHaveLength(0);expect(hero.weapon).toBe('carbine');expect(hero.weapons).toContain('rifle');expect(g.budgets[0]).toBe(100);
    expect(command(g,{...pickup,id:'already-taken'}).ok).toBe(false);
    const bullets=hero.ammo+hero.reserveAmmo;
    command(g,{id:'switch-a',side:0,kind:'switchWeapon',squadId:1});command(g,{id:'switch-b',side:0,kind:'switchWeapon',squadId:1});
    expect(hero.ammo+hero.reserveAmmo).toBe(bullets);expect(hero.weapon).toBe('carbine');
    g.squads.push({...enemyTemplate,id:99,x:25,z:16,hp:100,disabledUntil:10000});g.tick+=WEAPONS.carbine.ticks;
    expect(command(g,{id:'carbine-shot',side:0,kind:'fire',squadId:1,direction:{x:4,y:-.59,z:0}}).ok).toBe(true);step(g);
    expect(g.squads.find(s=>s.id===99)!.hp).toBe(100-WEAPONS.carbine.damage);
  });
  it('never exposes unseen loot and rejects control of another soldier as the hero',()=>{
    const g=practice();g.loot.push({id:90,x:43,z:30,weapon:'rifle',ammo:12,tokens:5});expect(observe(g,0).loot).toHaveLength(0);
    command(g,{id:'reinforce',side:0,kind:'deploy'});advance(g,R.spawnDelay);const other=g.squads.find(s=>s.side===0&&s.id!==g.hero!.squadId)!;
    expect(command(g,{id:'wrong-player',side:0,kind:'fire',squadId:other.id,direction:{x:1,y:0,z:0}}).ok).toBe(false);
  });
  it('coordinates visible targets and distinct flanks, and physically evades after damage',()=>{
    const g=createCombatDrill();g.tick=150;let observation=observe(g,1);let orders=botCommands(observation,1);
    const focuses=orders.filter(c=>c.kind==='focus');expect(focuses).toHaveLength(3);expect(new Set(focuses.map(c=>c.kind==='focus'?c.targetId:0)).size).toBe(1);
    const moves=orders.filter(c=>c.kind==='move');expect(moves.length).toBeGreaterThan(0);expect(new Set(moves.map(c=>c.kind==='move'?c.target.x+':'+c.target.z:'')).size).toBe(moves.length);
    const enemy=g.squads.find(s=>s.side===1)!;enemy.hp=60;enemy.lastHit=g.tick;enemy.dodgeAt=g.tick-R.dodgeCooldown;
    observation=observe(g,1);orders=botCommands(observation,1);const evade=orders.find(c=>c.kind==='evade'&&c.squadId===enemy.id)!;
    expect(evade).toBeDefined();const before={x:enemy.x,z:enemy.z};expect(command(g,evade).ok).toBe(true);step(g);
    expect(distance(before,enemy)).toBeGreaterThan(0);expect(legal(enemy,1)).toBe(true);
    expect(command(g,{...evade,id:'no-spam'}).ok).toBe(false);
  });
});
