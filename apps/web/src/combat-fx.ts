import * as T from 'three';
import type { Point } from '@last-signal/sim';
type Effect = { mesh: T.Object3D; born: number; life: number; velocity?: T.Vector3; gravity?: number; spin?: number; expand?: number };
export class CombatFX {
  private effects: Effect[]=[];
  constructor(private scene:T.Scene) {}
  private add(e:Effect) { if(this.effects.length>=160) this.remove(this.effects.shift()!); this.effects.push(e); this.scene.add(e.mesh); }
  private remove(e:Effect) { this.scene.remove(e.mesh); e.mesh.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Line){o.geometry.dispose(); const mats=Array.isArray(o.material)?o.material:[o.material]; mats.forEach(m=>m.dispose());}}); }
  shot(from:Point,to:Point,side:number,time:number,rounds=3,height=1.05) {
    for(let i=0;i<rounds;i++) {
      const start=new T.Vector3(from.x+(rounds===1?0:(i-1)*.3),rounds===1?1.64:1.15,from.z+(rounds===1?0:(i-1)*.3)),end=new T.Vector3(to.x,height,to.z);
      const tracer=new T.Line(new T.BufferGeometry().setFromPoints([start,end]),new T.LineBasicMaterial({color:side===0?0xffe8b6:0xffad6a,transparent:true,opacity:.85}));
      this.add({mesh:tracer,born:time+i*.07,life:.065});
      const casing=new T.Mesh(new T.CylinderGeometry(.018,.018,.07,5),new T.MeshStandardMaterial({color:0xbca16c,metalness:.8,roughness:.3})); casing.position.copy(start);
      this.add({mesh:casing,born:time+i*.07,life:.75,velocity:new T.Vector3((i-1)*1.1+.8,1.6,.7),gravity:7,spin:9});
    }
    this.burst(to,height,0xf6cf96,time,10);
    const light=new T.PointLight(0xffcb85,4,3,2); light.position.set(from.x,1.3,from.z); this.add({mesh:light,born:time,life:.065});
  }
  burst(at:Point,height:number,color:number,time:number,count=8) {
    for(let i=0;i<count;i++) {
      const angle=i*2.4, speed=.5+(i%3)*.45;
      const spark=new T.Mesh(new T.BoxGeometry(.025,.025,.09),new T.MeshBasicMaterial({color,transparent:true,opacity:1})); spark.position.set(at.x,height,at.z);
      this.add({mesh:spark,born:time,life:.2+(i%4)*.09,velocity:new T.Vector3(Math.sin(angle)*speed,.6+(i%3)*.3,Math.cos(angle)*speed),gravity:4,spin:4});
    }
    const dust=new T.Mesh(new T.SphereGeometry(.18,7,5),new T.MeshBasicMaterial({color:0x889187,transparent:true,opacity:.22,depthWrite:false})); dust.position.set(at.x,height,at.z);
    this.add({mesh:dust,born:time,life:.55,velocity:new T.Vector3(0,.2,0),expand:2});
  }
  splash(at:Point,time:number) {
    const ring=new T.Mesh(new T.RingGeometry(.03,.06,12),new T.MeshBasicMaterial({color:0xa7c3c6,transparent:true,opacity:.4,side:T.DoubleSide,depthWrite:false})); ring.rotation.x=-Math.PI/2; ring.position.set(at.x,.025,at.z);
    this.add({mesh:ring,born:time,life:.3,expand:7});
  }
  update(time:number,dt:number) {
    for(const e of this.effects) {
      const age=time-e.born; e.mesh.visible=age>=0;
      if(age<0) continue;
      if(e.velocity){if(e.gravity)e.velocity.y-=e.gravity*dt;e.mesh.position.addScaledVector(e.velocity,dt);e.mesh.position.y=Math.max(.03,e.mesh.position.y);}
      if(e.spin)e.mesh.rotation.z+=dt*e.spin;
      if(e.expand)e.mesh.scale.setScalar(1+age*e.expand);
      if(e.mesh instanceof T.Mesh||e.mesh instanceof T.Line) {const m=e.mesh.material as T.Material & {opacity:number};m.opacity=Math.max(0,1-age/e.life)*(e.expand?.22:1);}
    }
    this.effects=this.effects.filter(e=>{if(time-e.born>=e.life){this.remove(e);return false;}return true;});
  }
  reset(){this.effects.forEach(e=>this.remove(e));this.effects=[];}
}
