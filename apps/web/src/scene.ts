import * as T from 'three';
import { createSoldier, animateSoldier, createViewWeapon } from './soldier.ts';
import { FieldCamera, type ViewMode } from './field-camera.ts';
import { CombatFX } from './combat-fx.ts';
import { MAP, HOMES, RULES, distance, type Observation, type Point, type Squad, type GameEvent } from '@last-signal/sim';
const CYAN = 0x6ad6d4, AMBER = 0xe5a45b;
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
  private flames: T.Mesh[] = [];
  private smoke: {mesh:T.Mesh;x:number;z:number;phase:number}[]=[];
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
  effectsEnabled = true;
  reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private materials = new Map<string, T.MeshStandardMaterial>();
  constructor(readonly container: HTMLElement, private labels: HTMLElement[]) {
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.4));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.25;
    container.prepend(this.renderer.domElement);
    this.camera.add(this.viewWeapon);this.scene.add(this.camera);
    this.scene.background = new T.Color(0x64727a); this.scene.fog = new T.FogExp2(0x64727a, .018);
    this.camera.position.set(24, 43, 51); this.camera.lookAt(24, 0, 16);
    this.scene.add(new T.HemisphereLight(0xb4d2e5, 0x303327, 2.7));
    const sun = new T.DirectionalLight(0xc1d4e5, 3.1); sun.position.set(-10, 30, 0); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -38, right: 38, top: 35, bottom: -35, far: 100 }); sun.shadow.bias = -.0008; this.scene.add(sun);
    this.buildTerrain(); this.buildEnvironment();
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
  private buildTerrain() {
    const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 1024;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#414a49'; ctx.fillRect(0, 0, 1536, 1024);
    for (let i = 0; i < 37000; i++) { const v = 45 + Math.floor(this.random(i) * 45); ctx.fillStyle = `rgba(${v},${v + 4},${v + 3},.35)`; const x = this.random(i + 40000) * 1536, y = this.random(i + 80000) * 1024; ctx.fillRect(x, y, this.random(i + 3) * 5, 2); }
    ctx.strokeStyle = '#505957'; ctx.lineWidth = 1;
    for (let x = 0; x < 1536; x += 128) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1024); ctx.stroke(); }
    for (let y = 0; y < 1024; y += 128) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1536, y); ctx.stroke(); }
    ctx.fillStyle = '#30393b'; ctx.fillRect(0, 430, 1536, 164); ctx.fillRect(700, 0, 136, 1024);
    ctx.strokeStyle = '#a6a08a'; ctx.lineWidth = 4; ctx.setLineDash([24, 30]); ctx.beginPath(); ctx.moveTo(0, 512); ctx.lineTo(1536, 512); ctx.stroke();
    ctx.strokeStyle = '#626865'; ctx.setLineDash([]); ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, 1504, 992);
    for (let i = 0; i < 70; i++) { ctx.fillStyle = '#2c363970'; ctx.beginPath(); ctx.ellipse(this.random(i + 5) * 1536, this.random(i + 99) * 1024, 8 + this.random(i) * 60, 4 + this.random(i + 4) * 15, this.random(i + 3) * 2, 0, Math.PI * 2); ctx.fill(); }
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const floor = new T.Mesh(new T.BoxGeometry(48, .55, 32), new T.MeshStandardMaterial({ map: texture, roughness: .38, metalness: .22 })); floor.position.set(24, -.3, 16); floor.receiveShadow = true; this.scene.add(floor);
    this.box(180, .3, 160, 24, -.75, 16, 0x343d36);
    for(let i=0;i<85;i++) {
      const x=this.random(i+788)*48,z=this.random(i+889)*32;
      const points=[new T.Vector3(x,.01,z),new T.Vector3(x+.3,.01,z+.4),new T.Vector3(x+.15,.01,z+.9)];
      this.scene.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0x252e2e,transparent:true,opacity:.55})));
    }
    for (let i = 0; i < 24; i++) {
      const puddle = new T.Mesh(new T.CircleGeometry(.5 + this.random(i + 15) * 1.4, 16), new T.MeshStandardMaterial({ color: 0x70888b, roughness: .08, metalness: .75, transparent: true, opacity: .27 }));
      puddle.rotation.x = -Math.PI / 2; puddle.scale.y = .35; puddle.position.set(this.random(i + 200) * 46 + 1, .004, this.random(i + 400) * 30 + 1); this.scene.add(puddle);
    }
  }
  private buildEnvironment() {
    const wall=document.createElement('canvas');wall.width=512;wall.height=512;
    const paint=wall.getContext('2d')!;paint.fillStyle='#a1a397';paint.fillRect(0,0,512,512);
    for(let i=0;i<22000;i++){const v=80+this.random(i+555)*80;paint.fillStyle=`rgba(${v},${v+2},${v-4},.18)`;paint.fillRect(this.random(i)*512,this.random(i+88)*512,2+this.random(i+1)*5,2);}
    for(let i=0;i<45;i++){paint.fillStyle='#26392b15';paint.fillRect(this.random(i+91)*512,0,2+this.random(i)*16,100+this.random(i+7)*390);}
    for(let y=70;y<512;y+=110){paint.strokeStyle='#454c4555';paint.lineWidth=2;paint.beginPath();paint.moveTo(0,y);paint.lineTo(512,y);paint.stroke();}
    for(let i=0;i<14;i++){const x=this.random(i+8)*512,y=this.random(i+73)*512;paint.strokeStyle='#252d3050';paint.lineWidth=1;paint.beginPath();paint.moveTo(x,y);paint.lineTo(x+14,y+23);paint.lineTo(x+5,y+47);paint.stroke();}
    const concrete=new T.CanvasTexture(wall);concrete.colorSpace=T.SRGBColorSpace;concrete.anisotropy=8;
    this.mat(0x626a64).map=concrete;
    for (const o of MAP.obstacles) {
      this.box(o.w, o.h, o.d, o.x + o.w / 2, o.h / 2, o.z + o.d / 2, 0x626a64);
      this.box(o.w + .15, .16, o.d + .15, o.x + o.w / 2, o.h, o.z + o.d / 2, 0x424b49);
      for (let j = 0; j < o.w; j++) { this.box(.7, .55, .035, o.x + j + .5, o.h * .58, o.z + o.d + .025, 0x223237); this.box(.04, .6, .1, o.x + j + .5, o.h * .58, o.z + o.d + .04, 0x88918a); }
      this.box(1.3, .5, .9, o.x + .9, o.h + .25, o.z + 1, 0x7e8174);
      for (let j = 0; j < 3; j++) this.box(.12, .08, .85, o.x + .55 + j * .3, o.h + .54, o.z + 1, 0x303c3c);
      this.box(.12, o.h, .12, o.x + .2, o.h / 2, o.z + .05, 0x8e9589);
      this.box(.8,1.8,.04,o.x+o.w-.65,.9,o.z+o.d+.04,0x34413c);
      this.box(.04,1.85,.08,o.x+o.w-1.08,.925,o.z+o.d+.07,0x828476);
      this.box(.12,.03,.07,o.x+o.w-.87,.9,o.z+o.d+.09,0xb4aa88);
      this.box(o.w,.18,.12,o.x+o.w/2,.16,o.z+o.d+.04,0x414d46);
      const conduit=new T.CatmullRomCurve3([new T.Vector3(o.x+.3,o.h+.12,o.z+.2),new T.Vector3(o.x+o.w/2,o.h+.18,o.z+.4),new T.Vector3(o.x+o.w-.3,o.h+.12,o.z+.2)]);
      const cable=new T.Mesh(new T.TubeGeometry(conduit,12,.025,5,false),this.mat(0x242d29));this.scene.add(cable);
    }
    for (const c of MAP.covers) {
      for (let i = 0; i < 4; i++) this.box(.55, .65, .7, c.x + c.facing * .7, .34, c.z + (i - 1.5) * .65, 0x7a7b62);
      this.box(.12, .06, 2.7, c.x - c.facing * .55, .025, c.z, 0x73b9b1);
    }
    HOMES.forEach((h, i) => {
      const ring = this.ring(4, i === 0 ? CYAN : AMBER, .04); ring.position.set(h.x, .025, h.z); this.scene.add(ring);
      this.box(2.2, .6, 1.5, h.x, .3, h.z+2.5, 0x354844);
      this.box(.12, 4, .12, h.x, 2, h.z+2.5, 0x8b9b96);
      const lamp = new T.Mesh(new T.BoxGeometry(.7, .2, .2), new T.MeshStandardMaterial({ color: 0xffffff, emissive: i === 0 ? CYAN : AMBER, emissiveIntensity: 2 })); lamp.position.set(h.x, 3.6, h.z+2.5); this.scene.add(lamp);
      const light = new T.PointLight(i === 0 ? CYAN : AMBER, 13, 10, 2); light.position.set(h.x, 2.8, h.z); this.scene.add(light);
    });
    // Perimeter, concrete dividers, original skyline and utility details.
    for (let x = 0; x <= 48; x += 3) for (const z of [-.5, 32.5]) { this.box(.15, 1.8, .15, x, .9, z, 0x5b6a66); this.box(2.9, .06, .05, x + 1.5, 1.65, z, 0x7c8c82); }
    for (let i = 0; i < 35; i++) {
      const x = this.random(i + 12) * 68 - 10, z = -8 - this.random(i + 61) * 15, h = 3 + this.random(i + 17) * 12;
      this.box(2 + this.random(i + 33) * 4, h, 3, x, h / 2 - 1, z, 0x29383e);
    }
    for (const x of [8, 40]) {
      this.box(.15, 6.5, .15, x, 3.25, 1, 0x80918b);
      this.box(2, .12, .2, x, 6.3, 1, 0x435354);
      for (const dx of [-.7, .7]) { const light = new T.Mesh(new T.BoxGeometry(.55, .25, .4), new T.MeshStandardMaterial({ color: 0xf8e8be, emissive: 0xf8dcaa, emissiveIntensity: 3 })); light.position.set(x + dx, 6.2, 1); this.scene.add(light); }
    }
    for (let i = 0; i < 55; i++) {
      const x = this.random(i + 300) * 46 + 1, z = this.random(i + 600) * 30 + 1;
      if (distance({ x, z }, { x: 24, z: 16 }) < 6) continue;
      const rubble = this.box(.15 + this.random(i) * .35, .1 + this.random(i + 1) * .3, .2 + this.random(i + 2) * .3, x, .1, z, 0x7b7b6b); rubble.rotation.y = i * 1.7;
    }
    for (const [x, z] of [[2, 3], [46, 29]]) {
      this.box(2.3, .75, 1.1, x, .4, z, 0x323e38);
      const glow = new T.PointLight(0xff9d4b, 22, 9, 2); glow.position.set(x, 1.4, z); this.scene.add(glow);
      for (let j = 0; j < 5; j++) { const flame = new T.Mesh(new T.ConeGeometry(.23, 1.2, 5), new T.MeshBasicMaterial({ color: j % 2 ? 0xf4b963 : 0xe8783c, transparent: true, opacity: .75 })); flame.position.set(x + (j - 2) * .25, 1, z); this.scene.add(flame); this.flames.push(flame); }
      for(let j=0;j<10;j++){const mesh=new T.Mesh(new T.SphereGeometry(.5,7,5),new T.MeshBasicMaterial({color:0x333b39,transparent:true,opacity:.09,depthWrite:false}));this.scene.add(mesh);this.smoke.push({mesh,x,z,phase:j/10});}
    }
  }
  private relay(i: number) {
    const r = [{ x: 24, z: 7 }, { x: 24, z: 16 }, { x: 24, z: 25 }][i];
    const group = new T.Group(); group.position.set(r.x, 0, r.z); this.scene.add(group); this.towers.push(group);
    this.box(1.8, .22, 1.8, 0, .11, 0, 0x6b746c, group);
    this.box(.7, 1.3, .7, 0, .8, 0, 0x38474b, group);
    this.box(.1, 2.4, .1, 0, 2, 0, 0xa4b5ae, group);
    this.box(1.5, .1, .1, 0, 2.7, 0, 0x91a29e, group);
    const core = new T.Mesh(new T.CylinderGeometry(.18, .18, 1.1, 10), new T.MeshStandardMaterial({ color: 0xd5d8bf, emissive: 0xafa990, emissiveIntensity: 1.5 })); core.position.y = 1.8; core.name = 'core'; group.add(core);
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
  resetMatch() {
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
      const target=s.route[0], fireAge=this.time-(group.userData.fireAt??-100);
      const face=(fireAge<.7?group.userData.aim as Point|undefined:undefined)??target;
      if(face){const angle=Math.atan2(face.x-s.x,face.z-s.z);const delta=Math.atan2(Math.sin(angle-group.rotation.y),Math.cos(angle-group.rotation.y));group.rotation.y+=delta*Math.min(1,dt*14);}
      const firing=fireAge<.24?Math.max(0,Math.cos(fireAge*65)):0;
      group.children.slice(0,3).forEach(soldier=>animateSoldier(soldier,this.time,!!target,s.suppression>=RULES.suppressionThreshold||(s.coverId!==null&&o.tick-s.coverSince>=RULES.coverTicks),firing,this.reducedMotion));
      const cameraId=o.squads.find(unit=>unit.id===selected)?.id??o.squads.find(unit=>unit.side===0)?.id;
      group.children[1].visible=!(this.viewMode==='eyes'&&s.id===cameraId);
      group.getObjectByName('shield')!.visible = s.shield > 0;
      group.getObjectByName('hp')!.scale.x = Math.max(.01, s.hp / 100);
    }
    const s = o.squads.find(s => s.id === selected)??o.squads.find(s=>s.side===0);
    this.view.update(s,dt,this.reducedMotion,this.time);
    this.viewWeapon.visible=this.viewMode==='eyes'&&!!s;
    const kick=this.reducedMotion?0:Math.max(0,1-(this.time-this.ownFireAt)/.2);
    this.viewWeapon.position.z=-.65+kick*.09;
    this.viewWeapon.position.y=-.34+(!this.reducedMotion&&s?.route.length?Math.sin(this.time*10)*.012:0);
    this.viewWeapon.getObjectByName('flash')!.visible=this.effectsEnabled&&this.time-this.ownFireAt<.055;
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
      const projected = new T.Vector3(r.x, 3.7, r.z).project(this.camera);
      const el = this.labels[i]; el.style.left = `${(projected.x + 1) * .5 * this.container.clientWidth}px`; el.style.top = `${(1 - projected.y) * .5 * this.container.clientHeight}px`;
      el.hidden=projected.z>1||projected.x < -1.1||projected.x>1.1||projected.y < -1||projected.y>1;
      el.className = `relay-label ${r.owner === 0 ? 'friendly' : r.owner === 1 ? 'hostile' : ''}`;
      el.innerHTML = `<strong>${r.id}</strong><span>${r.contested ? 'CONTESTED' : r.progress ? `CAPTURE ${Math.round(r.progress)}%` : r.owner === null ? 'NEUTRAL' : r.owner === 0 ? 'FRIENDLY' : 'HOSTILE'}</span>`;
    });
    for (const e of events) {
      if (e.seq <= this.lastEvent) continue; this.lastEvent = e.seq;
      if (!this.effectsEnabled) continue;
      if (e.kind === 'ShotFired' && e.from && e.to) {
        this.fx.shot(e.from,e.to,e.side??0,this.time);
        if(s&&distance(s,e.from)<.6)this.ownFireAt=this.time;
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
    this.flames.forEach((f, i) => { f.scale.y = this.reducedMotion ? 1 : .8 + Math.sin(this.time * 7 + i * 2) * .25; });
    for(const puff of this.smoke){puff.mesh.visible=this.effectsEnabled;const age=this.reducedMotion?puff.phase:(this.time*.15+puff.phase)%1;puff.mesh.position.set(puff.x+age*2,1+age*5,puff.z-age*.6);puff.mesh.scale.setScalar(.4+age*2);(puff.mesh.material as T.MeshBasicMaterial).opacity=.11*(1-age);}
    this.renderer.shadowMap.autoUpdate=false;
    this.renderer.shadowMap.needsUpdate=this.renderFrame++%4===0;
    this.renderer.render(this.scene, this.camera);
  }
  private clearGroup(group: T.Group) { for (const child of [...group.children]) { group.remove(child); this.disposeObject(child); } }
  private disposeObject(object: T.Object3D) { object.traverse(child => { if (child instanceof T.Mesh || child instanceof T.Line) { child.geometry.dispose(); const mats = Array.isArray(child.material) ? child.material : [child.material]; for (const mat of mats) if (![...this.materials.values()].includes(mat as T.MeshStandardMaterial)) mat.dispose(); } }); }
  dispose() { this.fx.reset(); this.resizeObserver.disconnect(); this.disposeObject(this.scene); this.materials.forEach(m => { m.map?.dispose(); m.dispose(); }); this.renderer.dispose(); }
}
