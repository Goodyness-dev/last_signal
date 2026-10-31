import {MAP,RULES,type Command,type Observation,type GameEvent,type Side} from '@last-signal/sim';
export const PROTOCOL='private-1';
export const IDENTIFIERS={protocol:PROTOCOL,rules:RULES.version,map:MAP.version};
export const MAX_BYTES=2048;
export type Action=Command extends infer C?C extends Command?Omit<C,'id'|'side'>:never:never;
export type ClientMessage=({op:'create'}|{op:'join';room:string}|{op:'resume';room:string;token:string})&typeof IDENTIFIERS|{op:'ready'}|{op:'ping'}|{op:'command';id:string;action:Action};
export type Phase='lobby'|'countdown'|'running'|'finished'|'aborted';
export type ServerMessage={op:'session';room:string;token:string;side:Side}&typeof IDENTIFIERS|{op:'error';reason:string}|{op:'ack';id:string;ok:boolean;reason:string;tick:number;order:number}|{op:'snapshot';room:string;side:Side;phase:Phase;paused:boolean;reason:string;ready:boolean[];connected:boolean[];countdown:number;observation:Observation;events:GameEvent[]}&typeof IDENTIFIERS;
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k));
const number=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const point=(v:unknown)=>record(v)&&exact(v,['x','z'])&&number(v.x,.5,47.5)&&number(v.z,.5,31.5);
export function parseClient(text:string):ClientMessage{
 if(new TextEncoder().encode(text).length>MAX_BYTES)throw Error('Message too large');
 const m:unknown=JSON.parse(text);if(!record(m))throw Error('Invalid message');
 if(['create','join','resume'].includes(String(m.op))){
  if(m.protocol!==PROTOCOL||m.rules!==RULES.version||m.map!==MAP.version)throw Error('Version mismatch');
  const keys=['op','protocol','rules','map',...(m.op==='create'?[]:['room']),...(m.op==='resume'?['token']:[])];
  if(!exact(m,keys)||m.op!=='create'&&(typeof m.room!=='string'||!/^[a-f0-9]{16}$/.test(m.room))||m.op==='resume'&&(typeof m.token!=='string'||!/^[a-f0-9]{64}$/.test(m.token)))throw Error('Invalid session request');
 }else if(m.op==='ping'||m.op==='ready'){if(!exact(m,['op']))throw Error('Unexpected fields');}
 else if(m.op==='command'){
  if(!exact(m,['op','id','action'])||typeof m.id!=='string'||!/^[a-zA-Z0-9:_.-]{1,96}$/.test(m.id)||!record(m.action))throw Error('Invalid command');
  const a=m.action,kind=a.kind;let keys=['kind'];
  if(kind!=='deploy'&&kind!=='surrender'){keys.push('squadId');if(!number(a.squadId,1,1000000)||!Number.isInteger(a.squadId))throw Error('Invalid squad');}
  if(kind==='move'||kind==='emp'){keys.push('target');if(!point(a.target))throw Error('Invalid target');}
  else if(kind==='drive'||kind==='fire'){
   keys.push('direction');const d=a.direction,names=kind==='fire'?['x','y','z']:['x','z'];
   if(!record(d)||!exact(d,names)||!names.every(k=>number(d[k],-1,1)))throw Error('Invalid direction');
  }else if(kind==='focus'){keys.push('targetId');if(!number(a.targetId,1,1000000)||!Number.isInteger(a.targetId))throw Error('Invalid target');}
  else if(!['deploy','surrender','reload','switchWeapon','retreat','shield'].includes(String(kind)))throw Error('Unsupported command');
  if(!exact(a,keys))throw Error('Unexpected command fields');
 }else throw Error('Unknown message');
 return m as ClientMessage;
}
