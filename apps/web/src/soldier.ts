import * as T from 'three';

export function periodRifle(view=false):T.Group {
  const gun=new T.Group();gun.name='weapon';
  const wood=new T.MeshStandardMaterial({color:0x704429,roughness:.8,depthTest:!view});
  const steel=new T.MeshStandardMaterial({color:0x393e38,metalness:.7,roughness:.46,depthTest:!view});
  const brass=new T.MeshStandardMaterial({color:0x9e8b5f,metalness:.7,roughness:.4,depthTest:!view});
  const add=(geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number)=>{const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=!view;m.renderOrder=view?1000:0;gun.add(m);return m;};
  add(new T.BoxGeometry(.085,.11,.88),wood,0,-.025,.05);
  const butt=add(new T.BoxGeometry(.105,.18,.28),wood,0,-.07,-.49);butt.rotation.x=-.12;
  add(new T.BoxGeometry(.11,.19,.025),steel,0,-.08,-.635);
  add(new T.BoxGeometry(.075,.065,.31),steel,0,.052,-.1);
  const barrel=add(new T.CylinderGeometry(.023,.028,.79,10),steel,0,.065,.46);barrel.rotation.x=Math.PI/2;
  for(const z of [.15,.43])add(new T.BoxGeometry(.102,.125,.025),steel,0,-.005,z);
  add(new T.BoxGeometry(.018,.055,.035),steel,0,.11,.8);
  add(new T.BoxGeometry(.055,.025,.04),steel,0,.11,-.03);
  const bolt=add(new T.CylinderGeometry(.013,.013,.1,8),steel,.068,.04,-.17);bolt.rotation.z=Math.PI/2;bolt.name='bolt';
  add(new T.SphereGeometry(.023,8,6),steel,.12,.04,-.17);
  const trigger=add(new T.TorusGeometry(.045,.008,5,12,Math.PI*1.5),steel,0,-.11,-.23);trigger.rotation.y=Math.PI/2;
  for(const z of [-.5,.3])add(new T.SphereGeometry(.012,6,5),brass,.047,-.02,z);
  const flash=add(new T.ConeGeometry(.1,.38,6),new T.MeshBasicMaterial({color:0xffd58b,transparent:true,opacity:.95,depthTest:!view}),0,.065,1.02);flash.rotation.x=Math.PI/2;flash.name='flash';flash.visible=false;
  // A slack leather sling sits below the wooden fore end.
  const sling=new T.CatmullRomCurve3([new T.Vector3(0,-.1,-.45),new T.Vector3(.02,-.22,0),new T.Vector3(0,-.06,.4)]);
  add(new T.TubeGeometry(sling,12,.012,5,false),wood,0,0,0);
  return gun;
}

// Original articulated geometry. Three figures illustrate one authoritative squad.
export function createSoldier(side: number, index: number): T.Group {
  const root = new T.Group();
  root.position.set((index - 1) * .95, 0, index === 1 ? .45 : -.55);
  const cloth = new T.MeshStandardMaterial({ color: side === 0 ? 0x7b7850 : 0x73786e, roughness: .97 });
  const armor = new T.MeshStandardMaterial({ color: 0x4d3926, roughness: .85, metalness: .02 });
  const canvas = new T.MeshStandardMaterial({color:0x9a8d64,roughness:.98});
  const skin = new T.MeshStandardMaterial({ color: 0x9b8065, roughness: .8 });
  const metal = new T.MeshStandardMaterial({ color: 0x202827, metalness: .65, roughness: .45 });
  const marker = new T.MeshStandardMaterial({ color: side === 0 ? 0xb8c49e : 0xb38c61, roughness:.98 });
  function box(parent: T.Object3D, size: number[], position: number[], material: T.Material) {
    const geometry=material===cloth&&size[1]>size[0]*1.8
      ?new T.CapsuleGeometry(Math.min(size[0],size[2])*.5,size[1]-Math.min(size[0],size[2]),4,8)
      :new T.BoxGeometry(...size as [number,number,number]);
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(...position as [number,number,number]); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  const rig = new T.Group(); rig.name = 'rig'; root.add(rig);
  box(rig, [.37,.49,.23], [0,1.12,0], cloth);
  box(rig, [.4,.24,.27], [0,.85,0], cloth);
  for (let j = 0; j < 3; j++) box(rig,[.085,.13,.07],[(j-1)*.12,.96,.18],armor);
  box(rig,[.31,.34,.17],[0,1.11,-.21],canvas);
  const bedroll=new T.Mesh(new T.CylinderGeometry(.095,.095,.4,10),canvas);bedroll.rotation.z=Math.PI/2;bedroll.position.set(0,1.35,-.19);bedroll.castShadow=true;rig.add(bedroll);
  for(const x of [-.11,.11])box(rig,[.035,.36,.025],[x,1.13,-.31],armor);
  box(rig,[.38,.045,.28],[0,.92,0],armor);
  const strap=box(rig,[.045,.46,.025],[0,1.16,.145],armor);strap.rotation.z=-.55;
  for(let i=0;i<3;i++)box(rig,[.025,.025,.018],[.025,1.31-i*.11,.145],metal);
  const bottle=new T.Mesh(new T.CylinderGeometry(.07,.07,.19,10),metal);bottle.position.set(-.25,.85,-.1);rig.add(bottle);
  const head = new T.Mesh(new T.SphereGeometry(.145,12,10),skin); head.scale.set(1,1.2,.95); head.position.y=1.54; head.castShadow=true; rig.add(head);
  const helmet = new T.Mesh(new T.SphereGeometry(.18,14,8,0,Math.PI*2,0,Math.PI*.6),metal); helmet.position.y=1.65;helmet.scale.y=.65; helmet.castShadow=true; rig.add(helmet);
  const brim=new T.Mesh(new T.CylinderGeometry(.235,.235,.022,18),metal);brim.position.y=1.62;brim.castShadow=true;rig.add(brim);
  box(rig,[.055,.055,.045],[0,1.52,.14],skin);
  for(const x of [-.055,.055])box(rig,[.027,.018,.016],[x,1.57,.137],armor);
  const chin=box(rig,[.012,.16,.015],[.13,1.53,.04],armor);chin.rotation.x=.15;
  for (const side of [-1,1]) {
    const leg = new T.Group(); leg.name=side===-1?'legL':'legR'; leg.position.set(side*.105,.84,0); rig.add(leg);
    box(leg,[.16,.37,.17],[0,-.18,0],cloth);
    const shin = new T.Group(); shin.name='shin'; shin.position.y=-.36; leg.add(shin);
    box(shin,[.14,.32,.15],[0,-.15,.01],cloth);
    box(shin,[.18,.12,.28],[0,-.33,.07],armor);
    for(let wrap=0;wrap<3;wrap++)box(shin,[.15,.02,.17],[0,-.08-wrap*.065,.01],canvas);
    const arm = new T.Group(); arm.name=side===-1?'armL':'armR'; arm.position.set(side*.245,1.31,.03); arm.rotation.x=-.65; rig.add(arm);
    box(arm,[.13,.28,.14],[0,-.12,0],cloth);
    const forearm = new T.Group(); forearm.position.y=-.25; forearm.rotation.x=-1.05; arm.add(forearm);
    box(forearm,[.115,.25,.12],[0,-.1,0],cloth); box(forearm,[.115,.09,.12],[0,-.24,0],skin);
    box(arm,[.14,.08,.03],[0,-.03,.09],marker);
  }
  const weapon=periodRifle();weapon.position.set(.18,1.13,.38);rig.add(weapon);
  root.userData.index=index;
  return root;
}

export function animateSoldier(root: T.Object3D, time: number, moving: boolean, crouch: boolean, firing: number, reduced: boolean) {
  const index = root.userData.index as number;
  const phase=time*10+index*.8, stride=moving&&!reduced?Math.sin(phase):0;
  const rig=root.getObjectByName('rig')!;
  rig.position.y=crouch?-.26:0;
  rig.rotation.x=(moving?.1:0)+(firing>0&&!reduced?-firing*.055:0);
  root.position.y=reduced?0:moving?Math.abs(Math.sin(phase))*.045:Math.sin(time*1.8+index)*.008;
  for (const [name,sign] of [['legL',1],['legR',-1]] as const) {
    const leg=rig.getObjectByName(name)!; leg.rotation.x=stride*.65*sign+(crouch?-.55:0);
    leg.getObjectByName('shin')!.rotation.x=Math.max(0,-stride*sign)*.8+(crouch?1.1:0);
  }
  const weapon=rig.getObjectByName('weapon')!; weapon.position.z=.38-firing*.07;
  weapon.getObjectByName('bolt')!.position.z=-.17+firing*.08;
  weapon.getObjectByName('flash')!.visible=firing>.6;
}

export function createViewWeapon():T.Group {
  const root=new T.Group();root.position.set(.32,-.34,-.65);
  const cloth=new T.MeshStandardMaterial({color:0x7b7850,roughness:.97,depthTest:false});
  const skin=new T.MeshStandardMaterial({color:0x9b8065,roughness:.9,depthTest:false});
  function part(geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.renderOrder=1000;root.add(m);return m;}
  const rifle=periodRifle(true);rifle.rotation.y=Math.PI;rifle.scale.setScalar(.8);rifle.position.z=-.17;root.add(rifle);
  const right=part(new T.CapsuleGeometry(.075,.38,4,8),cloth,.09,-.16,.06);right.rotation.x=.9;
  right.name='rightSleeve';
  const left=part(new T.CapsuleGeometry(.075,.4,4,8),cloth,-.2,-.2,-.15);left.rotation.z=-.65;left.rotation.x=-.6;
  part(new T.SphereGeometry(.075,8,6),skin,-.06,-.08,-.4);
  part(new T.SphereGeometry(.07,8,6),skin,.04,-.08,-.05).name='boltHand';
  return root;
}
