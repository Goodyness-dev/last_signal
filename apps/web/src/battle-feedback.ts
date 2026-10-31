import {WEAPONS,RULES,distance,lineOfSight,type Observation,type GameEvent,type Point} from '@last-signal/sim';
type Projection=(at:Point,height:number)=>{x:number;y:number;visible:boolean};
export class BattleFeedback {
  private health=new Map<number,HTMLElement>();
  private loot=new Map<number,HTMLElement>();
  private numbers:{node:HTMLElement;at:Point;born:number}[]=[];
  private lastEvent=0;
  constructor(private host:HTMLElement,private project:Projection){}
  reset(){this.host.replaceChildren();this.health.clear();this.loot.clear();this.numbers=[];this.lastEvent=0;}
  private place(node:HTMLElement,at:Point,height:number){const p=this.project(at,height);node.hidden=!p.visible;node.style.left=p.x+'px';node.style.top=p.y+'px';}
  update(o:Observation,events:GameEvent[],now:number){
    const enemies=o.squads.filter(s=>s.side===1);
    for(const [id,node] of this.health)if(!enemies.some(s=>s.id===id)){node.remove();this.health.delete(id);}
    for(const s of enemies){
      let node=this.health.get(s.id);
      if(!node){node=document.createElement('div');node.className='enemy-vital';node.innerHTML='<b>ENEMY</b><strong></strong><div><i></i></div><small></small>';this.host.append(node);this.health.set(s.id,node);}
      node.querySelector('strong')!.textContent=Math.max(0,Math.ceil(s.hp))+' / 100 HP';
      node.querySelector<HTMLElement>('i')!.style.width=Math.max(0,s.hp)+'%';
      node.querySelector('small')!.textContent=s.disabledUntil>o.tick?'WEAPONS DISABLED':s.evadeUntil>o.tick?'DODGING':s.shield?'SHIELD '+s.shield:s.hp<30?'WOUNDED':s.route.length?'ADVANCING':'FIRING POSITION';
      this.place(node,s,2.6);
    }
    for(const [id,node] of this.loot)if(!o.loot.some(l=>l.id===id)){node.remove();this.loot.delete(id);}
    for(const drop of o.loot){
      let node=this.loot.get(drop.id);if(!node){node=document.createElement('div');node.className='loot-marker';node.innerHTML='<b></b><small>G · PICK UP WHEN NEAR</small>';this.host.append(node);this.loot.set(drop.id,node);}
      const hero=o.squads.find(s=>s.id===o.hero?.squadId),metres=hero?distance(hero,drop):Infinity,near=metres<=RULES.lootRange&&!!hero&&lineOfSight(hero,drop);
      node.classList.toggle('near',near);node.querySelector('small')!.textContent=near?'G · TAKE GUN + AMMO + PRACTICE WIF':Number.isFinite(metres)?Math.ceil(metres)+' m · MOVE CLOSER':'G · PICK UP WHEN NEAR';
      node.querySelector('b')!.textContent=WEAPONS[drop.weapon].name+' · '+drop.tokens+' PRACTICE WIF';this.place(node,drop,.9);
    }
    for(const e of events){if(e.seq<=this.lastEvent)continue;this.lastEvent=e.seq;
      if(e.kind==='PlayerHit'&&e.side===0&&e.to){const node=document.createElement('div');node.className='damage-number';node.textContent=e.damage?'-'+Math.round(e.damage)+' HP':'SHIELD';this.host.append(node);this.numbers.push({node,at:e.to,born:now});}
    }
    this.numbers=this.numbers.filter(n=>{if(now-n.born>900){n.node.remove();return false;}this.place(n.node,n.at,2+(now-n.born)/650);return true;});
  }
}
