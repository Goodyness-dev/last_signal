import * as T from 'three';

// Original articulated geometry. Three figures illustrate one authoritative squad.
export function createSoldier(side: number, index: number): T.Group {
  const root = new T.Group();
  root.position.set((index - 1) * .95, 0, index === 1 ? .45 : -.55);
  const cloth = new T.MeshStandardMaterial({ color: side === 0 ? 0x586250 : 0x766752, roughness: .85 });
  const armor = new T.MeshStandardMaterial({ color: 0x303a34, roughness: .55, metalness: .25 });
  const skin = new T.MeshStandardMaterial({ color: 0x9b8065, roughness: .8 });
  const metal = new T.MeshStandardMaterial({ color: 0x202827, metalness: .65, roughness: .45 });
  const marker = new T.MeshStandardMaterial({ color: side === 0 ? 0x78d8d0 : 0xeab47b, emissive: side === 0 ? 0x438f88 : 0x936035, emissiveIntensity: .5 });
  function box(parent: T.Object3D, size: number[], position: number[], material: T.Material) {
    const geometry=material===cloth&&size[1]>size[0]*1.8
      ?new T.CapsuleGeometry(Math.min(size[0],size[2])*.5,size[1]-Math.min(size[0],size[2]),4,8)
      :new T.BoxGeometry(...size as [number,number,number]);
    const mesh = new T.Mesh(geometry, material);
    mesh.position.set(...position as [number,number,number]); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  const rig = new T.Group(); rig.name = 'rig'; root.add(rig);
  box(rig, [.37,.49,.23], [0,1.12,0], cloth);
  box(rig, [.4,.35,.12], [0,1.14,.15], armor);
  for (let j = 0; j < 3; j++) box(rig,[.09,.15,.08],[(j-1)*.12,1.06,.24],cloth);
  box(rig,[.33,.4,.19],[0,1.12,-.21],armor);
  box(rig,[.04,.35,.03],[-.16,1.55,-.22],metal);
  box(rig,[.36,.12,.25],[0,.84,0],armor);
  const head = new T.Mesh(new T.SphereGeometry(.145,12,10),skin); head.scale.set(1,1.2,.95); head.position.y=1.54; head.castShadow=true; rig.add(head);
  const helmet = new T.Mesh(new T.SphereGeometry(.17,12,8,0,Math.PI*2,0,Math.PI*.6),cloth); helmet.position.y=1.6; helmet.castShadow=true; rig.add(helmet);
  box(rig,[.25,.065,.04],[0,1.57,.14],metal);
  box(rig,[.045,.09,.035],[-.17,1.6,0],marker);
  for (const side of [-1,1]) {
    const leg = new T.Group(); leg.name=side===-1?'legL':'legR'; leg.position.set(side*.105,.84,0); rig.add(leg);
    box(leg,[.16,.37,.17],[0,-.18,0],cloth);
    const shin = new T.Group(); shin.name='shin'; shin.position.y=-.36; leg.add(shin);
    box(shin,[.14,.32,.15],[0,-.15,.01],cloth);
    box(shin,[.18,.12,.28],[0,-.33,.07],armor);
    box(shin,[.17,.14,.06],[0,-.015,.1],armor);
    const arm = new T.Group(); arm.name=side===-1?'armL':'armR'; arm.position.set(side*.245,1.31,.03); arm.rotation.x=-.65; rig.add(arm);
    box(arm,[.13,.28,.14],[0,-.12,0],cloth);
    const forearm = new T.Group(); forearm.position.y=-.25; forearm.rotation.x=-1.05; arm.add(forearm);
    box(forearm,[.115,.25,.12],[0,-.1,0],cloth); box(forearm,[.115,.09,.12],[0,-.24,0],skin);
    box(arm,[.14,.08,.03],[0,-.03,.09],marker);
  }
  const weapon = new T.Group(); weapon.name='weapon'; weapon.position.set(.18,1.13,.38); rig.add(weapon);
  box(weapon,[.08,.14,.42],[0,0,0],metal); box(weapon,[.065,.065,.37],[0,.01,.33],metal);
  box(weapon,[.06,.16,.09],[0,-.14,-.02],metal); box(weapon,[.07,.07,.16],[0,.115,-.04],metal);
  box(weapon,[.11,.14,.17],[0,-.005,-.28],armor);
  const flash = new T.Mesh(new T.ConeGeometry(.13,.45,6),new T.MeshBasicMaterial({color:0xffdb93,transparent:true,opacity:.95}));
  flash.rotation.x=Math.PI/2; flash.position.z=.65; flash.name='flash'; flash.visible=false; weapon.add(flash);
  root.userData.index=index;
  return root;
}

export function animateSoldier(root: T.Object3D, time: number, moving: boolean, crouch: boolean, firing: number, reduced: boolean) {
  const index = root.userData.index as number;
  const phase=time*10+index*.8, stride=moving&&!reduced?Math.sin(phase):0;
  const rig=root.getObjectByName('rig')!;
  rig.position.y=crouch?-.26:0;
  rig.rotation.x=(moving?.1:0)+(firing>0&&!reduced?-firing*.055:0);
  root.position.y=moving&&!reduced?Math.abs(Math.sin(phase))*.045:Math.sin(time*1.8+index)*.008;
  for (const [name,sign] of [['legL',1],['legR',-1]] as const) {
    const leg=rig.getObjectByName(name)!; leg.rotation.x=stride*.65*sign+(crouch?-.55:0);
    leg.getObjectByName('shin')!.rotation.x=Math.max(0,-stride*sign)*.8+(crouch?1.1:0);
  }
  const weapon=rig.getObjectByName('weapon')!; weapon.position.z=.38-firing*.07;
  weapon.getObjectByName('flash')!.visible=firing>.6;
}

export function createViewWeapon():T.Group {
  const root=new T.Group();root.position.set(.32,-.34,-.65);
  const steel=new T.MeshStandardMaterial({color:0x26302c,metalness:.65,roughness:.42,depthTest:false});
  const cloth=new T.MeshStandardMaterial({color:0x4e5c45,roughness:.85,depthTest:false});
  const skin=new T.MeshStandardMaterial({color:0x9b8065,roughness:.9,depthTest:false});
  function part(geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.renderOrder=1000;root.add(m);return m;}
  part(new T.BoxGeometry(.105,.14,.52),steel,0,0,-.22);
  part(new T.BoxGeometry(.055,.06,.38),steel,0,.02,-.61);
  part(new T.BoxGeometry(.07,.16,.1),steel,0,-.13,-.17);
  part(new T.BoxGeometry(.07,.06,.14),steel,0,.115,-.2);
  part(new T.BoxGeometry(.1,.12,.16),steel,0,-.01,.09);
  const right=part(new T.CapsuleGeometry(.075,.38,4,8),cloth,.09,-.16,.06);right.rotation.x=.9;
  const left=part(new T.CapsuleGeometry(.075,.4,4,8),cloth,-.2,-.2,-.15);left.rotation.z=-.65;left.rotation.x=-.6;
  part(new T.SphereGeometry(.075,8,6),skin,-.06,-.08,-.4);
  part(new T.SphereGeometry(.07,8,6),skin,.04,-.08,-.05);
  const flash=part(new T.ConeGeometry(.1,.35,6),new T.MeshBasicMaterial({color:0xffd58b,depthTest:false}),0,.02,-.88);flash.rotation.x=-Math.PI/2;flash.name='flash';flash.visible=false;
  return root;
}
