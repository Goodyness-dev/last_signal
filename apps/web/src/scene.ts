import * as T from 'three';
import { createSoldier, animateSoldier, createViewWeapon, periodRifle } from './soldier.ts';
import { FieldCamera, type ViewMode } from './field-camera.ts';
import { CombatFX } from './combat-fx.ts';
import { OldFront } from './old-front.ts';
import { MAP, HOMES, RULES, distance, isMoving, type Observation, type Point, type Squad, type GameEvent } from '@last-signal/sim';
const CYAN = 0xa7bea0, AMBER = 0xcda471;
export class Battlefield {
  readonly renderer: T.WebGLRenderer;
  private scene = new T.Scene();
  private camera = new T.PerspectiveCamera(44, 1, .1, 200);
  private ray = new T.Raycaster();
  private plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  private units = new Map<number, T.Group>();
  private towers: T.Group[] = [];
  private rings: T.Mesh[] = [];
  private selection: T.Mesh;
  private destination: T.Mesh;
  private paths = new T.Group();
  private tactical = new T.Group();
  private rain: T.LineSegments;
  private rainPositions: Float32Array;
  private effects: { object: T.Object3D; until: number; born: number; kind: string }[] = [];
  private front:OldFront;
  private lastEvent = 0;
  private time = 0;
  private resizeObserver: ResizeObserver;
  readonly view = new FieldCamera(this.camera);
  private fx = new CombatFX(this.scene);
  private corpses: {group:T.Group;born:number}[]=[];
  private splashAt=0;
  private pathSignature='';
  private renderFrame=0;
  private viewWeapon=createViewWeapon();
  private ownFireAt=-100;
  private lootMeshes=new Map<number,T.Group>();
  effectsEnabled = true;
  reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private materials = new Map<string, T.MeshStandardMaterial>();
  constructor(readonly container: HTMLElement, private labels: HTMLElement[]) {
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.4));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = T.PCFShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.25;
    container.prepend(this.renderer.domElement);
    this.camera.add(this.viewWeapon);this.scene.add(this.camera);
    this.scene.background = new T.Color(0x9a8c70); this.scene.fog = new T.FogExp2(0x9a8c70, .012);
    this.camera.position.set(24, 43, 51); this.camera.lookAt(24, 0, 16);
    this.scene.add(new T.HemisphereLight(0xd1ccb0, 0x493421, 2.3));
    const sun = new T.DirectionalLight(0xffcf91, 3.2); sun.position.set(-20, 18, 15); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 35, bottom: -35, far: 100 }); sun.shadow.bias = -.0008; this.scene.add(sun);
    this.front=new OldFront(this.scene);
    for (let i = 0; i < 3; i++) this.relay(i);
    this.selection = this.ring(1.25, CYAN, .07); this.selection.visible = false; this.scene.add(this.selection);
    this.destination = this.ring(.45, 0xe9d4a3, .08); this.destination.visible = false; this.scene.add(this.destination);
    this.scene.add(this.paths, this.tactical);
    for (const c of MAP.covers) {
      const zone = this.ring(1.6, CYAN, .025); zone.position.set(c.x, .035, c.z); this.tactical.add(zone);
      const arrow = new T.ArrowHelper(new T.Vector3(c.facing, 0, 0), new T.Vector3(c.x, .1, c.z), 2, CYAN, .4, .3); this.tactical.add(arrow);
    }
    this.tactical.visible = false;
    this.rainPositions = new Float32Array(900 * 6);
    for (let i = 0; i < 900; i++) { const x = this.random(i * 3) * 64 - 8, z = this.random(i * 3 + 1) * 48 - 8, y = this.random(i * 3 + 2) * 16; this.rainPositions.set([x, y, z, x - .15, y + .65, z - .05], i * 6); }
    const rainGeometry = new T.BufferGeometry(); rainGeometry.setAttribute('position', new T.BufferAttribute(this.rainPositions, 3));
    this.rain = new T.LineSegments(rainGeometry, new T.LineBasicMaterial({ color: 0xa7c2d5, transparent: true, opacity: .18, depthWrite: false })); this.scene.add(this.rain);
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container); this.resize();
  }
  private random(i: number) { const x = Math.sin(i * 127.1 + 76.7) * 43758.5453; return x - Math.floor(x); }
  private mat(color: number, roughness = .7, metalness = .1) {
    const key = `${color}:${roughness}:${metalness}`;
    if (!this.materials.has(key)) this.materials.set(key, new T.MeshStandardMaterial({ color, roughness, metalness }));
    return this.materials.get(key)!;
  }
  private box(w: number, h: number, d: number, x: number, y: number, z: number, color: number, parent: T.Object3D = this.scene, roughness = .7) {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), this.mat(color, roughness)); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  private ring(radius: number, color: number, thickness: number) {
    const m = new T.Mesh(new T.RingGeometry(radius - thickness, radius, 64), new T.MeshBasicMaterial({ color, transparent: true, opacity: .8, side: T.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = .05; return m;
  }
  private relay(i: number) {
    const r = [{ x: 24, z: 7 }, { x: 24, z: 16 }, { x: 24, z: 25 }][i];
    const group = new T.Group(); group.position.set(r.x, 0, r.z); this.scene.add(group); this.towers.push(group);
    // A timber wireless table and slim aerial replace the luminous modern tower.
    this.box(1.1,.09,.65,.45,.8,.45,0x655033,group);
    for(const x of [0,.9])for(const z of [.18,.72])this.box(.08,.8,.08,x,.4,z,0x463523,group);
    this.box(.62,.38,.34,.45,1.02,.45,0x4b4a35,group);
    this.box(.55,.29,.018,.45,1.02,.63,0x292c23,group);
    for(const x of [.3,.52]){const dial=new T.Mesh(new T.CylinderGeometry(.055,.055,.03,12),this.mat(0xb5a679));dial.rotation.x=Math.PI/2;dial.position.set(x,1.04,.66);group.add(dial);}
    for(let j=0;j<4;j++)this.box(.025,.11,.02,.18+j*.05,1.02,.65,0x8c8766,group);
    this.box(.06,2.5,.06,1.05,1.25,.55,0x5c4730,group);
    const wire=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(.7,1.2,.45),new T.Vector3(1.05,2.5,.55),new T.Vector3(-.7,.04,-.5)]),new T.LineBasicMaterial({color:0x514732}));group.add(wire);
    const core = new T.Mesh(new T.SphereGeometry(.055,10,8), new T.MeshStandardMaterial({ color: 0xd5b578, emissive: 0xbca05f, emissiveIntensity: .6 })); core.position.set(.68,1.12,.65); core.name = 'core'; group.add(core);
    const ring = this.ring(3, 0xb9bca2, .055); ring.position.set(r.x, .035, r.z); this.scene.add(ring); this.rings.push(ring);
  }
  private unit(s: Squad) {
    const group = new T.Group(); for (let i = 0; i < 3; i++) group.add(createSoldier(s.side, i));
    group.rotation.y=s.side===0?Math.PI/2:-Math.PI/2;
    const ring = this.ring(.95, s.side === 0 ? CYAN : AMBER, .04); ring.name = 'unitRing'; group.add(ring);
    const shield = new T.Mesh(new T.SphereGeometry(1.1, 20, 12), new T.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: .13, wireframe: true, depthWrite: false })); shield.position.y = .6; shield.name = 'shield'; group.add(shield);
    const hp = this.box(1, .08, .08, 0, 2.1, 0, s.side === 0 ? CYAN : AMBER, group); hp.name = 'hp';
    group.position.set(s.x, 0, s.z); this.scene.add(group); this.units.set(s.id, group); return group;
  }
  get viewMode(): ViewMode { return this.view.mode; }
  setView(mode:ViewMode) {this.view.setMode(mode);this.container.dataset.view=mode;}
  setZoom(delta: number) {this.view.zoom(delta);}
  resetCamera() {this.view.reset();}
  aimDirection() { const d=this.camera.getWorldDirection(new T.Vector3()); return {x:d.x,y:d.y,z:d.z}; }
  fireWeapon() { this.ownFireAt=this.time; }
  screenPoint(at:Point,height:number){
    const p=new T.Vector3(at.x,height,at.z).project(this.camera);
    return {x:(p.x+1)*.5*this.container.clientWidth,y:(1-p.y)*.5*this.container.clientHeight,visible:p.z>-1&&p.z<1&&Math.abs(p.x)<.96&&Math.abs(p.y)<.94};
  }
  resetMatch() {
    for(const group of this.lootMeshes.values()){this.scene.remove(group);this.disposeObject(group);}this.lootMeshes.clear();
    this.lastEvent=0;this.ownFireAt=-100;this.fx.reset();this.view.reset();
    for(const group of this.units.values()){this.scene.remove(group);this.disposeObject(group);}this.units.clear();
    this.clearGroup(this.paths);this.pathSignature='';
    for(const e of this.effects){this.scene.remove(e.object);this.disposeObject(e.object);}this.effects=[];
    for(const c of this.corpses){this.scene.remove(c.group);this.disposeObject(c.group);}this.corpses=[];
  }
  setTactical(on: boolean) { this.tactical.visible = on; }
  pick(clientX: number, clientY: number): Point | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new T.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), this.camera);
    const p = new T.Vector3(); if (!this.ray.ray.intersectPlane(this.plane, p)) return null; return { x: p.x, z: p.z };
  }
  resize() {
    const { width, height } = this.container.getBoundingClientRect(); this.renderer.setSize(width, height); this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  update(o: Observation, selected: number | null, events: GameEvent[], dt: number) {
    this.time += dt;
    const ids = new Set(o.squads.map(s => s.id));
    for (const [id, group] of this.units) if (!ids.has(id)) {
      const died=events.some(e=>e.seq>this.lastEvent&&e.kind==='SquadDestroyed'&&e.to&&distance(e.to,{x:group.position.x,z:group.position.z})<1);
      if(died&&this.effectsEnabled){group.getObjectByName('hp')!.visible=false;group.getObjectByName('unitRing')!.visible=false;group.getObjectByName('shield')!.visible=false;this.corpses.push({group,born:this.time});}
      else{this.scene.remove(group);this.disposeObject(group);}this.units.delete(id);
    }
    for (const s of o.squads) {
      const group = this.units.get(s.id) ?? this.unit(s);
      group.position.lerp(new T.Vector3(s.x, 0, s.z), this.reducedMotion ? 1 : Math.min(1, dt * 18));
      const driving=s.drive&&(s.driveUntil??0)>=o.tick&&(s.drive.x!==0||s.drive.z!==0);
      const target=driving?{x:s.x+s.drive!.x,z:s.z+s.drive!.z}:s.route[0], fireAge=this.time-(group.userData.fireAt??-100);
      const face=(fireAge<.7?group.userData.aim as Point|undefined:undefined)??target;
      if(face){const angle=Math.atan2(face.x-s.x,face.z-s.z);const delta=Math.atan2(Math.sin(angle-group.rotation.y),Math.cos(angle-group.rotation.y));group.rotation.y+=delta*Math.min(1,dt*14);}
      const firing=fireAge<.24?Math.max(0,Math.cos(fireAge*65)):0;
      group.children.slice(0,3).forEach(soldier=>animateSoldier(soldier,this.time,!!target,s.suppression>=RULES.suppressionThreshold||(s.coverId!==null&&o.tick-s.coverSince>=RULES.coverTicks),firing,this.reducedMotion));
      const cameraId=o.squads.find(unit=>unit.id===selected)?.id??o.squads.find(unit=>unit.side===0)?.id;
      group.children[1].visible=!(this.viewMode==='eyes'&&s.id===cameraId);
      group.getObjectByName('shield')!.visible = s.shield > 0;
      group.getObjectByName('hp')!.scale.x = Math.max(.01, s.hp / 100);
    }
    const cameraId=this.viewMode==='eyes'&&o.hero?o.hero.squadId:selected;
    const s = o.squads.find(s => s.id === cameraId)??(o.hero&&this.viewMode==='eyes'?undefined:o.squads.find(s=>s.side===0));
    this.view.update(s,dt,this.reducedMotion,this.time,o.tick);
    this.viewWeapon.visible=this.viewMode==='eyes'&&!!s;
    const kick=this.reducedMotion?0:Math.max(0,1-(this.time-this.ownFireAt)/.2);
    this.viewWeapon.position.x=this.view.aiming?0:.32;
    this.viewWeapon.position.z=(this.view.aiming?-.5:-.65)+kick*.09;
    this.viewWeapon.getObjectByName('bolt')!.position.z=-.17+kick*.08;
    this.viewWeapon.position.y=(this.view.aiming?-.22:-.34)+(!this.reducedMotion&&s&&isMoving(s,o.tick)?Math.sin(this.time*10)*.012:0);
    const reloading=!!s&&s.reloadUntil>o.tick;
    const reloadDip=reloading?Math.sin(Math.PI*(1-(s!.reloadUntil-o.tick)/RULES.reloadTicks)):0;
    this.viewWeapon.rotation.z=this.reducedMotion?0:-reloadDip*.5;
    this.viewWeapon.rotation.x=this.reducedMotion?0:reloadDip*.25;
    this.viewWeapon.position.y-=this.reducedMotion?0:reloadDip*.3;
    this.viewWeapon.getObjectByName('bolt')!.position.z+=reloadDip*.15;
    this.viewWeapon.getObjectByName('flash')!.visible=this.effectsEnabled&&this.time-this.ownFireAt<.055;
    this.viewWeapon.getObjectByName('weapon')!.scale.set(.8,.8,s?.weapon==='carbine'?.58:.8);
    for(const [id,mesh] of this.lootMeshes)if(!o.loot.some(l=>l.id===id)){this.scene.remove(mesh);this.disposeObject(mesh);this.lootMeshes.delete(id);}
    for(const drop of o.loot){
      let group=this.lootMeshes.get(drop.id);
      if(!group){group=new T.Group();const gun=periodRifle();gun.rotation.set(0,.5,Math.PI/2);gun.position.y=.3;group.add(gun);const beacon=this.ring(.7,0xffdc76,.1);group.add(beacon);this.scene.add(group);this.lootMeshes.set(drop.id,group);}
      group.position.set(drop.x,.05+Math.sin(this.time*2)*.025,drop.z);
    }
    this.selection.visible = !!s;
    if (s) this.selection.position.set(s.x, .06, s.z);
    this.destination.visible = !!s?.route.length;
    const signature=`${s?.id}:${s?.route.length}:${s?.route.at(-1)?.x}:${s?.route.at(-1)?.z}`;
    if(signature!==this.pathSignature){
    this.pathSignature=signature;this.clearGroup(this.paths);
    if (s?.route.length) {
      const end = s.route.at(-1)!; this.destination.position.set(end.x, .07, end.z);
      const points = [s, ...s.route].map(p => new T.Vector3(p.x, .08, p.z)); const line = new T.Line(new T.BufferGeometry().setFromPoints(points), new T.LineDashedMaterial({ color: CYAN, dashSize: .35, gapSize: .25, transparent: true, opacity: .65 })); line.computeLineDistances(); this.paths.add(line);
    }
    }
    o.relays.forEach((r, i) => {
      const color = r.owner === 0 ? CYAN : r.owner === 1 ? AMBER : 0xb9bca2;
      (this.rings[i].material as T.MeshBasicMaterial).color.setHex(color);
      const mat = (this.towers[i].getObjectByName('core') as T.Mesh).material as T.MeshStandardMaterial; mat.emissive.setHex(color); mat.color.setHex(color);
      const projected = new T.Vector3(r.x+.5, 2.9, r.z).project(this.camera);
      const el = this.labels[i]; el.style.left = `${(projected.x + 1) * .5 * this.container.clientWidth}px`; el.style.top = `${(1 - projected.y) * .5 * this.container.clientHeight}px`;
      el.hidden=projected.z>1||projected.x < -1.1||projected.x>1.1||projected.y < -1||projected.y>1;
      el.className = `relay-label ${r.owner === 0 ? 'friendly' : r.owner === 1 ? 'hostile' : ''}`;
      el.innerHTML = `<strong>${r.id}</strong><span>${r.contested ? 'CONTESTED' : r.progress ? `CAPTURE ${Math.round(r.progress)}%` : r.owner === null ? 'NEUTRAL' : r.owner === 0 ? 'FRIENDLY' : 'HOSTILE'}</span>`;
    });
    for (const e of events) {
      if (e.seq <= this.lastEvent) continue; this.lastEvent = e.seq;
      if (!this.effectsEnabled) continue;
      if ((e.kind === 'ShotFired' || e.kind === 'PlayerShot') && e.from && e.to) {
        this.fx.shot(e.from,e.to,e.side??0,this.time,e.kind==='PlayerShot'?1:3,e.height);
        const shooter=[...this.units.values()].find(g=>distance({x:g.position.x,z:g.position.z},e.from!)<.6);
        if(shooter){shooter.userData.fireAt=this.time;shooter.userData.aim=e.to;}
      } else if (e.kind === 'EmpTriggered' && e.to) { const ring = this.ring(3, 0xc3e2fc, .2); ring.position.set(e.to.x, .15, e.to.z); this.scene.add(ring); this.effects.push({ object: ring, until: this.time + .7, born: this.time, kind: 'emp' }); }
    }
    for (const effect of this.effects) {
      if (effect.kind === 'emp') effect.object.scale.setScalar(Math.min(1, (this.time - effect.born) / .5));
      if (effect.until < this.time) { this.scene.remove(effect.object); this.disposeObject(effect.object); }
    }
    this.effects = this.effects.filter(e => e.until >= this.time);
    for(const c of this.corpses){c.group.children.slice(0,3).forEach((soldier,i)=>{soldier.rotation.z=this.reducedMotion?-Math.PI/2:-Math.min(Math.PI/2,(this.time-c.born)*3+i*.1);soldier.position.y=.12;});if(this.time-c.born>6){this.scene.remove(c.group);this.disposeObject(c.group);}}
    this.corpses=this.corpses.filter(c=>this.time-c.born<=6);
    while(this.corpses.length>6){const old=this.corpses.shift()!;this.scene.remove(old.group);this.disposeObject(old.group);}
    if(this.effectsEnabled&&this.time-this.splashAt>.17){for(const unit of o.squads)if(unit.route.length)this.fx.splash(unit,this.time);this.splashAt=this.time;}
    this.fx.update(this.time,dt);
    this.rain.visible = this.effectsEnabled && !this.reducedMotion;
    if (this.rain.visible) { for (let i = 0; i < this.rainPositions.length; i += 6) { this.rainPositions[i + 1] -= dt * 12; this.rainPositions[i + 4] -= dt * 12; if (this.rainPositions[i + 1] < 0) { this.rainPositions[i + 1] = 16; this.rainPositions[i + 4] = 16.65; } } this.rain.geometry.attributes.position.needsUpdate = true; }
    this.front.update(this.time,this.reducedMotion,this.effectsEnabled);
    this.renderer.shadowMap.autoUpdate=false;
    this.renderer.shadowMap.needsUpdate=this.renderFrame++%4===0;
    this.renderer.render(this.scene, this.camera);
  }
  private clearGroup(group: T.Group) { for (const child of [...group.children]) { group.remove(child); this.disposeObject(child); } }
  private disposeObject(object: T.Object3D) { object.traverse(child => { if (child instanceof T.Mesh || child instanceof T.Line) { child.geometry.dispose(); const mats = Array.isArray(child.material) ? child.material : [child.material]; for (const mat of mats) if (![...this.materials.values()].includes(mat as T.MeshStandardMaterial)) mat.dispose(); } }); }
  dispose() { this.front.dispose(); this.fx.reset(); this.resizeObserver.disconnect(); this.disposeObject(this.scene); this.materials.forEach(m => { m.map?.dispose(); m.dispose(); }); this.renderer.dispose(); }
}
