import * as T from 'three';
import { MAP, isMoving, type Point, type Squad } from '@last-signal/sim';
export type ViewMode = 'squad' | 'eyes' | 'tactical';
export class FieldCamera {
  mode: ViewMode = 'squad';
  private yaw = Math.PI / 2;
  private pitch = .035;
  aiming = false;
  private distance = 5.4;
  private focus = new T.Vector3(4,1,16);
  private initialized = false;
  constructor(readonly camera: T.PerspectiveCamera) {}
  setMode(mode: ViewMode) { this.mode=mode; this.initialized=false; this.camera.zoom=1; this.camera.updateProjectionMatrix(); }
  cycle() { this.setMode(this.mode==='squad'?'eyes':this.mode==='eyes'?'tactical':'squad'); }
  reset() { this.yaw=Math.PI/2; this.pitch=.035; this.distance=5.4; this.initialized=false; this.aiming=false; }
  rotate(dx: number, dy: number) { const sensitivity=this.aiming?.0013:.0026; this.yaw-=dx*sensitivity; this.pitch=T.MathUtils.clamp(this.pitch+dy*sensitivity,-1.4,1.4); }
  zoom(delta: number) { this.distance=T.MathUtils.clamp(this.distance-delta*8,2.2,15); }
  direction(forward: number, strafe: number): Point {
    const x=Math.sin(this.yaw)*forward-Math.cos(this.yaw)*strafe;
    const z=Math.cos(this.yaw)*forward+Math.sin(this.yaw)*strafe;
    const d=Math.hypot(x,z)||1; return {x:x/d,z:z/d};
  }
  update(squad: Squad | undefined, dt: number, reduced: boolean, time: number, tick=0) {
    const c=this.camera;
    if (this.mode==='tactical') {
      c.zoom=T.MathUtils.clamp(5.4/this.distance,.7,2.1);c.fov=c.aspect<1.2?56:38; c.position.set(24,c.aspect<1.2?59:43,c.aspect<1.2?62:51); c.lookAt(24,0,16); c.updateProjectionMatrix(); this.initialized=false; return;
    }
    if(squad) this.focus.set(squad.x,1.25,squad.z);
    c.zoom=1;
    const forward=new T.Vector3(Math.sin(this.yaw),0,Math.cos(this.yaw));
    const eye=this.mode==='eyes';
    const desired=this.focus.clone().addScaledVector(forward,eye?0:-this.distance);
    desired.y=eye?1.64:2.4+this.pitch*5;
    // Keep the camera out of the collision volumes without changing gameplay.
    if(!eye)for (const o of MAP.obstacles) if(desired.x>o.x-.4&&desired.x<o.x+o.w+.4&&desired.z>o.z-.4&&desired.z<o.z+o.d+.4) desired.y=Math.max(desired.y,o.h+.55);
    const bob=squad&&isMoving(squad,tick)&&!reduced?Math.sin(time*10)*.022:0; desired.y+=bob;
    c.position.lerp(desired,this.initialized&&!reduced?1-Math.exp(-dt*10):1); this.initialized=true;
    const look=this.focus.clone().addScaledVector(forward,eye?15:2.5);
    look.y=1.15-this.pitch*2;
    if(eye) look.copy(c.position).add(new T.Vector3(forward.x*Math.cos(this.pitch),-Math.sin(this.pitch),forward.z*Math.cos(this.pitch)).multiplyScalar(15));
    c.fov=eye?(this.aiming?49:T.MathUtils.clamp(76-(5.4-this.distance)*6,48,94)):65; c.lookAt(look); c.updateProjectionMatrix();
  }
}
