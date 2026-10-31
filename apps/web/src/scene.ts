import * as T from 'three';
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
  private lastEvent = 0;
  private time = 0;
  private resizeObserver: ResizeObserver;
  private zoom = 1;
  effectsEnabled = true;
  reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private materials = new Map<string, T.MeshStandardMaterial>();
  constructor(readonly container: HTMLElement, private labels: HTMLElement[]) {
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.25;
    container.prepend(this.renderer.domElement);
    this.scene.background = new T.Color(0x151f25); this.scene.fog = new T.FogExp2(0x253038, .008);
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
    ctx.strokeStyle = '#89908a'; ctx.lineWidth = 2;
    for (let x = 0; x < 1536; x += 128) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1024); ctx.stroke(); }
    for (let y = 0; y < 1024; y += 128) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1536, y); ctx.stroke(); }
    ctx.fillStyle = '#30393b'; ctx.fillRect(0, 430, 1536, 164); ctx.fillRect(700, 0, 136, 1024);
    ctx.strokeStyle = '#a6a08a'; ctx.lineWidth = 4; ctx.setLineDash([24, 30]); ctx.beginPath(); ctx.moveTo(0, 512); ctx.lineTo(1536, 512); ctx.stroke();
    ctx.strokeStyle = '#626865'; ctx.setLineDash([]); ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, 1504, 992);
    for (let i = 0; i < 70; i++) { ctx.fillStyle = '#2c363970'; ctx.beginPath(); ctx.ellipse(this.random(i + 5) * 1536, this.random(i + 99) * 1024, 8 + this.random(i) * 60, 4 + this.random(i + 4) * 15, this.random(i + 3) * 2, 0, Math.PI * 2); ctx.fill(); }
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const floor = new T.Mesh(new T.BoxGeometry(48, .55, 32), new T.MeshStandardMaterial({ map: texture, roughness: .38, metalness: .22 })); floor.position.set(24, -.3, 16); floor.receiveShadow = true; this.scene.add(floor);
    this.box(50, .8, 34, 24, -.9, 16, 0x1b2426);
    for (let i = 0; i < 24; i++) {
      const puddle = new T.Mesh(new T.CircleGeometry(.5 + this.random(i + 15) * 1.4, 16), new T.MeshStandardMaterial({ color: 0x70888b, roughness: .08, metalness: .75, transparent: true, opacity: .27 }));
      puddle.rotation.x = -Math.PI / 2; puddle.scale.y = .35; puddle.position.set(this.random(i + 200) * 46 + 1, .004, this.random(i + 400) * 30 + 1); this.scene.add(puddle);
    }
  }
  private buildEnvironment() {
    for (const o of MAP.obstacles) {
      this.box(o.w, o.h, o.d, o.x + o.w / 2, o.h / 2, o.z + o.d / 2, 0x626a64);
      this.box(o.w + .15, .16, o.d + .15, o.x + o.w / 2, o.h, o.z + o.d / 2, 0x424b49);
      for (let j = 0; j < o.w; j++) { this.box(.7, .55, .035, o.x + j + .5, o.h * .58, o.z + o.d + .025, 0x223237); this.box(.04, .6, .1, o.x + j + .5, o.h * .58, o.z + o.d + .04, 0x88918a); }
      this.box(1.3, .5, .9, o.x + .9, o.h + .25, o.z + 1, 0x7e8174);
      for (let j = 0; j < 3; j++) this.box(.12, .08, .85, o.x + .55 + j * .3, o.h + .54, o.z + 1, 0x303c3c);
      this.box(.12, o.h, .12, o.x + .2, o.h / 2, o.z + .05, 0x8e9589);
    }
    for (const c of MAP.covers) {
      for (let i = 0; i < 4; i++) this.box(.55, .65, .7, c.x + c.facing * .7, .34, c.z + (i - 1.5) * .65, 0x7a7b62);
      this.box(.12, .06, 2.7, c.x - c.facing * .55, .025, c.z, 0x73b9b1);
    }
    HOMES.forEach((h, i) => {
      const ring = this.ring(4, i === 0 ? CYAN : AMBER, .04); ring.position.set(h.x, .025, h.z); this.scene.add(ring);
      this.box(2.2, .6, 1.5, h.x, .3, h.z, 0x354844);
      this.box(.12, 4, .12, h.x, 2, h.z, 0x8b9b96);
      const lamp = new T.Mesh(new T.BoxGeometry(.7, .2, .2), new T.MeshStandardMaterial({ color: 0xffffff, emissive: i === 0 ? CYAN : AMBER, emissiveIntensity: 2 })); lamp.position.set(h.x, 3.6, h.z); this.scene.add(lamp);
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
  private soldier(side: number, offset: number) {
    const g = new T.Group(); g.position.set(Math.sin(offset * 2.1) * .45, 0, Math.cos(offset * 2.1) * .45);
    const armor = side === 0 ? 0x526e6b : 0x79715a;
    this.box(.32, .45, .2, 0, .72, 0, armor, g);
    this.box(.25, .24, .25, 0, 1.06, 0, 0x818777, g);
    this.box(.21, .07, .04, 0, 1.08, .14, side === 0 ? CYAN : AMBER, g);
    this.box(.23, .3, .14, 0, .76, -.17, 0x2e3c36, g);
    for (const x of [-.11, .11]) { const leg = this.box(.13, .4, .15, x, .27, 0, 0x303b35, g); leg.name = 'leg'; this.box(.11, .3, .13, x * 2, .7, .1, armor, g); }
    this.box(.09, .09, .55, .2, .73, .37, 0x202d2d, g);
    return g;
  }
  private unit(s: Squad) {
    const group = new T.Group(); for (let i = 0; i < 3; i++) group.add(this.soldier(s.side, i));
    const ring = this.ring(.95, s.side === 0 ? CYAN : AMBER, .04); ring.name = 'unitRing'; group.add(ring);
    const shield = new T.Mesh(new T.SphereGeometry(1.1, 20, 12), new T.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: .13, wireframe: true, depthWrite: false })); shield.position.y = .6; shield.name = 'shield'; group.add(shield);
    const hp = this.box(1, .08, .08, 0, 1.55, 0, s.side === 0 ? CYAN : AMBER, group); hp.name = 'hp';
    group.position.set(s.x, 0, s.z); this.scene.add(group); this.units.set(s.id, group); return group;
  }
  setZoom(delta: number) { this.zoom = T.MathUtils.clamp(this.zoom + delta, .75, 1.4); this.camera.zoom = this.zoom; this.camera.updateProjectionMatrix(); }
  resetCamera() { this.zoom = 1; this.camera.zoom = 1; this.camera.updateProjectionMatrix(); }
  resetMatch() { this.lastEvent = 0; for (const e of this.effects) { this.scene.remove(e.object); this.disposeObject(e.object); } this.effects = []; }
  setTactical(on: boolean) { this.tactical.visible = on; }
  pick(clientX: number, clientY: number): Point | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new T.Vector2((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1), this.camera);
    const p = new T.Vector3(); if (!this.ray.ray.intersectPlane(this.plane, p)) return null; return { x: p.x, z: p.z };
  }
  resize() {
    const { width, height } = this.container.getBoundingClientRect(); this.renderer.setSize(width, height); this.camera.aspect = width / height;
    this.camera.fov = width / height < 1.2 ? 56 : 34; this.camera.position.set(24, width / height < 1.2 ? 59 : 43, width / height < 1.2 ? 62 : 51); this.camera.lookAt(24, 0, 16); this.camera.updateProjectionMatrix();
  }
  update(o: Observation, selected: number | null, events: GameEvent[], dt: number) {
    this.time += dt;
    const ids = new Set(o.squads.map(s => s.id));
    for (const [id, group] of this.units) if (!ids.has(id)) { this.scene.remove(group); this.disposeObject(group); this.units.delete(id); }
    for (const s of o.squads) {
      const group = this.units.get(s.id) ?? this.unit(s);
      group.position.lerp(new T.Vector3(s.x, 0, s.z), this.reducedMotion ? 1 : Math.min(1, dt * 18));
      const target = s.route[0]; if (target) group.rotation.y = Math.atan2(target.x - s.x, target.z - s.z);
      group.children.slice(0, 3).forEach((soldier, index) => {
        soldier.position.y = target && !this.reducedMotion ? Math.abs(Math.sin(this.time * 12 + index)) * .055 : 0;
        soldier.children.filter(c => c.name === 'leg').forEach((leg, j) => { leg.rotation.x = target && !this.reducedMotion ? Math.sin(this.time * 12 + j * Math.PI + index) * .45 : 0; });
      });
      group.getObjectByName('shield')!.visible = s.shield > 0;
      group.getObjectByName('hp')!.scale.x = Math.max(.01, s.hp / 100);
    }
    const s = o.squads.find(s => s.id === selected);
    this.selection.visible = !!s;
    if (s) this.selection.position.set(s.x, .06, s.z);
    this.destination.visible = !!s?.route.length;
    this.clearGroup(this.paths);
    if (s?.route.length) {
      const end = s.route.at(-1)!; this.destination.position.set(end.x, .07, end.z);
      const points = [s, ...s.route].map(p => new T.Vector3(p.x, .08, p.z)); const line = new T.Line(new T.BufferGeometry().setFromPoints(points), new T.LineDashedMaterial({ color: CYAN, dashSize: .35, gapSize: .25, transparent: true, opacity: .65 })); line.computeLineDistances(); this.paths.add(line);
    }
    o.relays.forEach((r, i) => {
      const color = r.owner === 0 ? CYAN : r.owner === 1 ? AMBER : 0xb9bca2;
      (this.rings[i].material as T.MeshBasicMaterial).color.setHex(color);
      const mat = (this.towers[i].getObjectByName('core') as T.Mesh).material as T.MeshStandardMaterial; mat.emissive.setHex(color); mat.color.setHex(color);
      const projected = new T.Vector3(r.x, 3.7, r.z).project(this.camera);
      const el = this.labels[i]; el.style.left = `${(projected.x + 1) * .5 * this.container.clientWidth}px`; el.style.top = `${(1 - projected.y) * .5 * this.container.clientHeight}px`;
      el.className = `relay-label ${r.owner === 0 ? 'friendly' : r.owner === 1 ? 'hostile' : ''}`;
      el.innerHTML = `<strong>${r.id}</strong><span>${r.contested ? 'CONTESTED' : r.progress ? `CAPTURE ${Math.round(r.progress)}%` : r.owner === null ? 'NEUTRAL' : r.owner === 0 ? 'FRIENDLY' : 'HOSTILE'}</span>`;
    });
    for (const e of events) {
      if (e.seq <= this.lastEvent) continue; this.lastEvent = e.seq;
      if (!this.effectsEnabled) continue;
      if (e.kind === 'ShotFired' && e.from && e.to) {
        const line = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(e.from.x, .8, e.from.z), new T.Vector3(e.to.x, .6, e.to.z)]), new T.LineBasicMaterial({ color: e.side === 0 ? 0xacf5ef : 0xffd59a, transparent: true, opacity: .9 }));
        this.scene.add(line); this.effects.push({ object: line, until: this.time + .12, born: this.time, kind: 'shot' });
      } else if (e.kind === 'EmpTriggered' && e.to) { const ring = this.ring(3, 0xc3e2fc, .2); ring.position.set(e.to.x, .15, e.to.z); this.scene.add(ring); this.effects.push({ object: ring, until: this.time + .7, born: this.time, kind: 'emp' }); }
    }
    for (const effect of this.effects) {
      if (effect.kind === 'emp') effect.object.scale.setScalar(Math.min(1, (this.time - effect.born) / .5));
      if (effect.until < this.time) { this.scene.remove(effect.object); this.disposeObject(effect.object); }
    }
    this.effects = this.effects.filter(e => e.until >= this.time);
    this.rain.visible = this.effectsEnabled && !this.reducedMotion;
    if (this.rain.visible) { for (let i = 0; i < this.rainPositions.length; i += 6) { this.rainPositions[i + 1] -= dt * 12; this.rainPositions[i + 4] -= dt * 12; if (this.rainPositions[i + 1] < 0) { this.rainPositions[i + 1] = 16; this.rainPositions[i + 4] = 16.65; } } this.rain.geometry.attributes.position.needsUpdate = true; }
    this.flames.forEach((f, i) => { f.scale.y = this.reducedMotion ? 1 : .8 + Math.sin(this.time * 7 + i * 2) * .25; });
    this.renderer.render(this.scene, this.camera);
  }
  private clearGroup(group: T.Group) { for (const child of [...group.children]) { group.remove(child); this.disposeObject(child); } }
  private disposeObject(object: T.Object3D) { object.traverse(child => { if (child instanceof T.Mesh || child instanceof T.Line) { child.geometry.dispose(); const mats = Array.isArray(child.material) ? child.material : [child.material]; for (const mat of mats) if (![...this.materials.values()].includes(mat as T.MeshStandardMaterial)) mat.dispose(); } }); }
  dispose() { this.resizeObserver.disconnect(); this.disposeObject(this.scene); this.materials.forEach(m => { m.map?.dispose(); m.dispose(); }); this.renderer.dispose(); }
}
