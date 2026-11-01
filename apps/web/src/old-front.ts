import * as T from 'three';
import { MAP, HOMES } from '@last-signal/sim';

// Original fictional period setting. Decoration preserves the canonical navigation map.
export class OldFront {
  private flags:T.Mesh[]=[];
  private flames:T.Mesh[]=[];
  private smoke:{mesh:T.Mesh;x:number;z:number;phase:number}[]=[];
  private lamps:T.PointLight[]=[];
  private materials:T.Material[]=[];
  private textures:T.Texture[]=[];
  private staticParts:{mesh:T.Mesh;shape:'box'|'cylinder'}[]=[];
  private readonly soil=this.material(0x62503a,.98);
  private readonly timber=this.material(0x57402a,.92);
  private readonly darkWood=this.material(0x322a20,.95);
  private readonly iron=this.material(0x393b32,.65,.35);
  private readonly canvas=this.material(0x928363,.95);
  private readonly bagMaterial=this.material(0x998968,.96);
  constructor(private scene:T.Scene){this.sky();this.ground();this.structures();this.cover();this.dressing();this.batchStatic();}
  private random(n:number){const x=Math.sin(n*127.1+81.7)*43758.5453;return x-Math.floor(x);}
  private material(color:number,roughness=.8,metalness=.05){const m=new T.MeshStandardMaterial({color,roughness,metalness});this.materials.push(m);return m;}
  private box(w:number,h:number,d:number,x:number,y:number,z:number,mat:T.Material=this.timber,parent:T.Object3D=this.scene){const m=new T.Mesh(new T.BoxGeometry(1,1,1),mat);m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);this.staticParts.push({mesh:m,shape:'box'});return m;}
  private cylinder(r:number,h:number,x:number,y:number,z:number,mat:T.Material=this.iron){const m=new T.Mesh(new T.CylinderGeometry(1,1,1,12),mat);m.scale.set(r,h,r);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);this.staticParts.push({mesh:m,shape:'cylinder'});return m;}
  private batchStatic(){
    this.scene.updateMatrixWorld(true);
    const groups=new Map<string,typeof this.staticParts>();
    for(const part of this.staticParts){const key=part.shape+':'+(part.mesh.material as T.Material).uuid;const list=groups.get(key)??[];list.push(part);groups.set(key,list);}
    for(const parts of groups.values()){
      const first=parts[0],geometry=first.mesh.geometry.clone();
      const batch=new T.InstancedMesh(geometry,first.mesh.material,parts.length);batch.castShadow=true;batch.receiveShadow=true;
      parts.forEach(({mesh},i)=>{batch.setMatrixAt(i,mesh.matrixWorld);mesh.removeFromParent();mesh.geometry.dispose();});
      batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();this.scene.add(batch);
    }
    this.staticParts=[];
  }
  private sky(){
    const c=document.createElement('canvas');c.width=1024;c.height=512;const p=c.getContext('2d')!;
    const gradient=p.createLinearGradient(0,0,0,512);gradient.addColorStop(0,'#59635d');gradient.addColorStop(.6,'#ada081');gradient.addColorStop(1,'#d4b383');p.fillStyle=gradient;p.fillRect(0,0,1024,512);
    const light=p.createRadialGradient(230,330,4,230,330,210);light.addColorStop(0,'#ffdfa565');light.addColorStop(1,'#ffdfa500');p.fillStyle=light;p.fillRect(0,0,1024,512);
    for(let i=0;i<65;i++){const x=this.random(i+1)*1024,y=this.random(i+4)*370;p.save();p.translate(x,y);p.scale(3,1);const cloud=p.createRadialGradient(0,0,0,0,0,50);cloud.addColorStop(0,'#353f3820');cloud.addColorStop(1,'#353f3800');p.fillStyle=cloud;p.fillRect(-50,-50,100,100);p.restore();}
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;this.textures.push(t);this.scene.background=t;
  }
  private texture(kind:'mud'|'brick'|'wood'){
    const c=document.createElement('canvas');c.width=1024;c.height=1024;const p=c.getContext('2d')!;
    p.fillStyle=kind==='mud'?'#66543a':kind==='brick'?'#976e50':'#796044';p.fillRect(0,0,1024,1024);
    if(kind==='brick'){
      for(let row=0;row<25;row++)for(let col=-1;col<13;col++){
        const x=col*88+(row%2)*44,y=row*42,v=Math.floor(this.random(row*17+col)*28);
        p.fillStyle=`rgb(${122+v},${80+v},${52+v})`;p.fillRect(x+2,y+3,83,36);
        p.fillStyle='#c0a27c70';p.fillRect(x+3,y+3,81,2);p.fillStyle='#342c2390';p.fillRect(x+3,y+36,81,3);
      }
    }
    if(kind==='wood')for(let i=0;i<600;i++){p.strokeStyle=i%3?'#2e231329':'#b8a17c30';p.lineWidth=1+this.random(i)*3;p.beginPath();const x=this.random(i+4)*1024;p.moveTo(x,0);p.bezierCurveTo(x+10,300,x-9,700,x+4,1024);p.stroke();}
    for(let i=0;i<40000;i++){const v=40+Math.floor(this.random(i)*95);p.fillStyle=`rgba(${v+15},${v+6},${v-8},.14)`;p.fillRect(this.random(i+60000)*1024,this.random(i+90000)*1024,1+this.random(i+3)*5,1+this.random(i+7)*4);}
    if(kind==='mud'){
      for(let i=0;i<400;i++){p.fillStyle=i%3?'#30291e38':'#99805b35';p.beginPath();p.ellipse(this.random(i)*1024,this.random(i+2)*1024,2+this.random(i+5)*13,1+this.random(i+6)*6,this.random(i+9)*3,0,Math.PI*2);p.fill();}
      p.strokeStyle='#2e281b80';p.lineWidth=12;
      for(const z of [470,550]){p.beginPath();p.moveTo(0,z);p.bezierCurveTo(300,z-10,700,z+14,1024,z);p.stroke();}
      for(let x=0;x<1024;x+=14){p.fillStyle='#9b80513d';p.fillRect(x,466,3,11);p.fillRect(x+4,546,3,11);}
    }
    // Water stains and soot vary the surface, rather than a uniform clean finish.
    if(kind==='brick')for(let i=0;i<90;i++){const g=p.createLinearGradient(0,0,0,700);g.addColorStop(0,'#1c211a60');g.addColorStop(1,'#20281b00');p.fillStyle=g;p.fillRect(this.random(i+40)*1024,0,3+this.random(i)*27,700);}
    const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;this.textures.push(t);return t;
  }
  private ground(){
    const mud=this.material(0xb6a382,.87,.08);mud.map=this.texture('mud');
    this.box(48,.32,32,24,-.18,16,mud);this.box(210,.25,180,24,-.42,16,this.soil);
    this.timber.map=this.texture('wood');
    // Shallow communication lanes, duckboards and wheel ruts are cosmetic ground dressing.
    for(const z of [7,16,25]){
      this.box(39,.012,2.8,24,.005,z,this.material(0x423824,.98));
      for(let x=5;x<44;x+=.6){
        if(MAP.obstacles.some(o=>x>o.x&&x<o.x+o.w&&z>o.z&&z<o.z+o.d))continue;
        const plank=this.box(.42,.06,1.1+this.random(x+z)*.22,x,.025,z,this.timber);plank.rotation.y=(this.random(x*3+z)-.5)*.09;
        if(Math.round(x*10)%3===0){for(const dz of [-.4,.4])this.cylinder(.021,.008,x,.06,z+dz,this.iron);}
      }
    }
    const water=this.material(0x948d72,.08,.6);water.transparent=true;water.opacity=.5;
    for(let i=0;i<45;i++){
      const pool=new T.Mesh(new T.CircleGeometry(.3+this.random(i+3)*1.2,18),water);pool.rotation.x=-Math.PI/2;pool.scale.y=.35+this.random(i)*.3;pool.position.set(1+this.random(i+100)*46,.012,1+this.random(i+900)*30);this.scene.add(pool);
    }
    const craterMat=this.material(0x352d20,.98);
    for(const [x,z] of [[7,4],[40,5],[6,27],[41,28],[22,30],[27,2]]){
      const crater=new T.Mesh(new T.RingGeometry(.55,1.25,18),this.soil);crater.rotation.x=-Math.PI/2;crater.position.set(x,.018,z);this.scene.add(crater);
      const dark=new T.Mesh(new T.CircleGeometry(.61,18),craterMat);dark.rotation.x=-Math.PI/2;dark.position.set(x,.019,z);this.scene.add(dark);
    }
  }
  private structures(){
    const brick=this.material(0xc3a48a,.95);brick.map=this.texture('brick');
    const plaster=this.material(0xc6b68e,.95),soot=this.material(0x322d24,.97);
    for(const [index,o] of MAP.obstacles.entries()){
      this.box(o.w,o.h,o.d,o.x+o.w/2,o.h/2,o.z+o.d/2,brick);
      this.box(o.w+.12,.17,o.d+.12,o.x+o.w/2,.12,o.z+o.d/2,this.darkWood);
      // Chipped plaster, shuttered windows, lintels, sill wear and a braced timber door.
      this.box(o.w*.37,o.h*.38,.018,o.x+o.w*.25,o.h*.55,o.z+o.d+.02,plaster);
      for(let j=0;j<Math.floor(o.w/1.5);j++){
        const x=o.x+.75+j*1.5,z=o.z+o.d+.04;
        this.box(.64,.77,.06,x,o.h*.58,z,soot);
        for(const dx of [-.37,.37])this.box(.075,.9,.12,x+dx,o.h*.58,z,this.darkWood);
        this.box(.88,.08,.2,x,o.h*.58-.42,z+.04,this.timber);
        const board=this.box(.77,.13,.09,x,o.h*.58,z+.08,this.timber);board.rotation.z=index%2?.22:-.17;
      }
      this.box(.75,1.65,.07,o.x+o.w-.6,.84,o.z+o.d+.05,this.darkWood);
      for(let n=0;n<4;n++)this.box(.16,1.6,.04,o.x+o.w-.88+n*.18,.85,o.z+o.d+.1,this.timber);
      const brace=this.box(.78,.1,.055,o.x+o.w-.6,.92,o.z+o.d+.14,this.timber);brace.rotation.z=.75;
      if(o.w>3){
        // Exposed rafters and a surviving pitched roof section preserve the solid wall footprint.
        for(let x=o.x+.2;x<o.x+o.w;x+=.8){
          for(const side of [-1,1]){const beam=this.box(.1,.1,o.d*.61,x,o.h+.55,o.z+o.d/2+side*o.d*.23,this.darkWood);beam.rotation.x=side*.45;}
        }
        const roof=this.box(o.w*.46,.12,o.d*.6,o.x+o.w*.24,o.h+.58,o.z+o.d*.27,this.material(0x4e5142,.9));roof.rotation.x=-.42;
        this.box(.62,1.5,.62,o.x+o.w-.9,o.h+.6,o.z+.8,brick);
        this.box(.75,.12,.75,o.x+o.w-.9,o.h+1.4,o.z+.8,soot);
      }
      for(let j=0;j<6;j++){const r=this.box(.22,.11,.12,o.x+.3+this.random(j+index*9)*(o.w-.6),o.h+.05,o.z+this.random(j+index*19)*o.d,brick);r.rotation.y=j*.9;}
    }
  }
  private cover(){
    const bags=new T.InstancedMesh(new T.SphereGeometry(1,9,6),this.bagMaterial,144);let n=0;const dummy=new T.Object3D();
    for(const c of MAP.covers){
      for(let row=0;row<3;row++)for(let j=0;j<6;j++){
        dummy.position.set(c.x+c.facing*.7,row*.22+.15,c.z+(j-2.5)*.48+(row%2)*.12);dummy.scale.set(.3,.15,.29);dummy.rotation.set(0,this.random(n)*.25,0);dummy.updateMatrix();bags.setMatrixAt(n++,dummy.matrix);
      }
      for(let j=0;j<5;j++)this.box(.12,.7,.46,c.x+c.facing*.95,.3,c.z+(j-2)*.52,this.darkWood);
    }
    bags.count=n;bags.castShadow=true;bags.receiveShadow=true;this.scene.add(bags);
  }
  private crate(x:number,z:number,scale=1){
    const g=new T.Group();g.position.set(x,0,z);g.scale.setScalar(scale);this.scene.add(g);
    this.box(.8,.65,.65,0,.325,0,this.timber,g);
    for(const y of [.1,.55])this.box(.85,.07,.71,0,y,0,this.darkWood,g);
    for(const dx of [-.29,.29])this.box(.08,.68,.69,dx,.34,0,this.darkWood,g);
    return g;
  }
  private lantern(x:number,y:number,z:number,light=false){
    const glow=this.material(0xf0ba68,.3);glow.emissive.setHex(0xf0a64b);glow.emissiveIntensity=1.7;
    this.cylinder(.12,.27,x,y,z,glow);this.cylinder(.18,.045,x,y-.16,z);this.cylinder(.17,.06,x,y+.17,z);
    if(light){const l=new T.PointLight(0xffb663,12,7,2);l.position.set(x,y,z);this.scene.add(l);this.lamps.push(l);}
  }
  private dressing(){
    HOMES.forEach((h,i)=>{
      this.box(1.5,.8,.8,h.x,.4,h.z+2.5,this.timber);this.crate(h.x+1.3,h.z+2.8,.65);
      this.box(1.8,.08,.95,h.x,.85,h.z+2.5,this.darkWood);
      this.lantern(h.x-.5,1.1,h.z+2.5,true);
      const paper=this.material(0xcabb90,.98);this.box(.5,.008,.4,h.x+.2,.91,h.z+2.4,paper);
      this.cylinder(.12,.2,h.x+.5,1,h.z+2.6,this.iron);
      this.box(.08,3,.08,h.x,1.5,h.z+3.4,this.darkWood);
      const flag=new T.Mesh(new T.PlaneGeometry(1.1,.6,12,5),this.material(i===0?0x9baf87:0xa77754,.92));(flag.material as T.MeshStandardMaterial).side=T.DoubleSide;flag.position.set(h.x+.55,2.6,h.z+3.4);this.scene.add(flag);this.flags.push(flag);
    });
    for(const [i,o] of MAP.obstacles.entries()){
      this.crate(o.x+.6,o.z+o.d+.22,.65);this.crate(o.x+1.3,o.z+o.d+.22,.5);
      this.cylinder(.22,.65,o.x+o.w-.45,.33,o.z+o.d+.22,this.timber);
      for(const y of [.14,.51])this.cylinder(.232,.035,o.x+o.w-.45,y,o.z+o.d+.22,this.iron);
      if(i<4)this.lantern(o.x+o.w-.6,1.6,o.z+o.d+.2);
    }
    // Wire lies beyond the legal map edge. It is not a concealed collision or damage rule.
    for(const z of [-.7,32.7])for(let x=0;x<49;x+=3){
      this.box(.11,1.2,.11,x,.5,z,this.darkWood);
      const points:T.Vector3[]=[];for(let k=0;k<=30;k++){const a=k/30*Math.PI*8;points.push(new T.Vector3(x+k*.1,.5+Math.sin(a)*.28,z+Math.cos(a)*.28));}
      this.scene.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0x514a39})));
    }
    const grass=new T.InstancedMesh(new T.ConeGeometry(.12,.45,3),this.material(0x6c7047,.96),700);const d=new T.Object3D();
    for(let i=0;i<700;i++){let x=this.random(i+800)*70-11,z=this.random(i+1200)*56-12;if(x>1&&x<47&&z>2&&z<30){z=i%2?31:-1;}
      d.position.set(x,.1,z);d.scale.set(1,.5+this.random(i)*1.5,1);d.rotation.set(0,i*2.4,.1);d.updateMatrix();grass.setMatrixAt(i,d.matrix);}
    this.scene.add(grass);
    for(let i=0;i<26;i++){
      const x=this.random(i+54)*80-16,z=-7-this.random(i+90)*16,h=4+this.random(i+42)*5;
      const trunk=this.cylinder(.17,h,x,h/2,z,this.darkWood);trunk.rotation.z=(this.random(i)-.5)*.25;
      for(let j=0;j<3;j++){const b=this.box(.13,.13,1.5,x,h*.5+j*.7,z,this.darkWood);b.rotation.x=.7;b.rotation.y=i+j;}
    }
    const rubble=new T.InstancedMesh(new T.BoxGeometry(.22,.12,.13),this.material(0x8d6347,.96),160);
    for(let i=0;i<160;i++){const o=MAP.obstacles[i%MAP.obstacles.length];d.position.set(o.x+this.random(i+16)*o.w,.07,o.z+this.random(i+400)*o.d);d.rotation.set(this.random(i)*.3,i*.8,.1);d.scale.setScalar(.6+this.random(i+3));d.updateMatrix();rubble.setMatrixAt(i,d.matrix);}rubble.castShadow=true;this.scene.add(rubble);
    for(const [x,z] of [[3,4],[45,28]]){
      const wreck=this.box(2,.35,1.1,x,.25,z,this.darkWood);wreck.rotation.z=.12;
      for(let j=0;j<4;j++){const wheel=new T.Mesh(new T.TorusGeometry(.4,.065,6,14),this.timber);wheel.position.set(x+(j%2?-.65:.65),.38,z+(j<2?-.6:.6));wheel.rotation.y=Math.PI/2;this.scene.add(wheel);}
      for(let j=0;j<6;j++){const f=new T.Mesh(new T.ConeGeometry(.15,.85,6),new T.MeshBasicMaterial({color:j%2?0xf4be67:0xd97539,transparent:true,opacity:.8}));f.position.set(x+(j-2.5)*.18,.7,z);this.scene.add(f);this.flames.push(f);}
      for(let j=0;j<10;j++){const mesh=new T.Mesh(new T.SphereGeometry(.5,7,5),new T.MeshBasicMaterial({color:0x4b4335,transparent:true,opacity:.12,depthWrite:false}));this.scene.add(mesh);this.smoke.push({mesh,x,z,phase:j/10});}
    }
  }
  update(time:number,reduced:boolean,effects:boolean){
    for(const flag of this.flags){const a=flag.geometry.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i);a.setZ(i,reduced?0:Math.sin(time*2.3+x*5)*.055*(x+.55));}a.needsUpdate=true;}
    this.flames.forEach((f,i)=>{f.visible=effects;f.scale.y=reduced?1:.75+Math.sin(time*6+i)*.25;});
    for(const p of this.smoke){p.mesh.visible=effects;const age=reduced?p.phase:(time*.13+p.phase)%1;p.mesh.position.set(p.x+age*2.7,.6+age*5,p.z-age*.9);p.mesh.scale.setScalar(.3+age*2.3);(p.mesh.material as T.MeshBasicMaterial).opacity=.13*(1-age);}
    this.lamps.forEach((l,i)=>l.intensity=reduced?12:11.5+Math.sin(time*3+i)*.5);
  }
  dispose(){this.textures.forEach(t=>t.dispose());this.materials.forEach(m=>m.dispose());}
}
