import type {FastifyInstance,FastifyRequest} from 'fastify';
import {ArmoryService} from './armory.ts';
export function armoryRoutes(app:FastifyInstance,service:ArmoryService,origins:Set<string>){
 const buckets=new Map<string,{at:number;n:number}>();
 const origin=(r:FastifyRequest)=>r.headers.origin??'http://'+r.headers.host;
 const wallet=(r:FastifyRequest)=>{if(!origins.has(origin(r)))throw Error('Origin denied');const address=service.testnet.auth.identify(r.headers.authorization?.replace(/^Bearer /,'')??'',origin(r));if(!address)throw Error('Wallet login required');return address;};
 const body=(r:FastifyRequest,keys:string[])=>{const b=r.body;if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).sort().join(',')!==[...keys].sort().join(','))throw Error('Invalid request');return b as Record<string,unknown>;};
 const route=(method:'GET'|'POST',url:string,action:(r:FastifyRequest)=>unknown)=>app.route({method,url,handler:async(r,reply)=>{try{if(method==='POST'&&!origins.has(origin(r)))throw Error('Origin denied');const key=r.ip+':'+r.routeOptions.url,now=Date.now(),bucket=buckets.get(key);if(!bucket||now-bucket.at>60000)buckets.set(key,{at:now,n:1});else if(++bucket.n>60)throw Error('Rate limit');if(buckets.size>2000)for(const[k,v]of buckets)if(now-v.at>60000)buckets.delete(k);return await action(r);}catch(e){return reply.code(400).send({error:(e as {code?:string}).code?'Chain unavailable. No simulated wallet balance is substituted.':(e as Error).message});}}});
 const runId=(r:FastifyRequest)=>{const id=(r.params as {id:string}).id;if(!/^0x[0-9a-fA-F]{64}$/.test(id))throw Error('Invalid run ID');return id;};
 route('GET','/armory/config',()=>service.config());
 route('GET','/armory/locker',r=>{const value=(r.query as {wallet?:unknown}).wallet;if(typeof value!=='string')throw Error('A public wallet address is required');return service.publicLocker(value);});
 route('GET','/armory/guns/:tokenId',r=>service.publicToken((r.params as {tokenId:string}).tokenId));
 route('GET','/armory/account',r=>{const q=r.query as {ownedOffset?:string;marketStart?:string};return service.account(wallet(r),q.ownedOffset===undefined?0:Number(q.ownedOffset),q.marketStart===undefined?1:Number(q.marketStart));});
 route('POST','/armory/runs',r=>{const b=body(r,['tokenId']);if(typeof b.tokenId!=='string')throw Error('Owned token ID required');return service.start(wallet(r),b.tokenId);});
 route('GET','/armory/runs/:id',r=>service.status(runId(r),wallet(r)));
 route('POST','/armory/runs/:id/end',r=>{body(r,[]);return service.finish(runId(r),wallet(r));});
 route('POST','/armory/runs/:id/pause',r=>{const b=body(r,['paused']);if(typeof b.paused!=='boolean')throw Error('Pause flag required');return service.pause(runId(r),wallet(r),b.paused);});
 route('POST','/armory/runs/:id/claims',r=>{body(r,[]);return service.vouchers(runId(r),wallet(r));});
 route('POST','/armory/runs/:id/supply',r=>{const b=body(r,['hash']);if(typeof b.hash!=='string')throw Error('Confirmed receipt hash required');return service.supply(runId(r),wallet(r),b.hash);});
 app.get('/salvage',{websocket:true,preValidation:async(r,reply)=>{if(!r.headers.origin||!origins.has(r.headers.origin))return reply.code(403).send({error:'Origin denied'});}},(socket,r)=>{
  const client=service.connect({send:data=>{if(socket.readyState===1){if(socket.bufferedAmount>262144)socket.close(1008);else socket.send(data);}},close:code=>socket.close(code)},session=>service.testnet.auth.identify(session,r.headers.origin??''));
  socket.on('message',(raw,binary)=>{if(binary){socket.close(1003);return;}void client.receive(raw.toString());});socket.on('close',client.close);socket.on('error',()=>{});
  const expiry=setTimeout(()=>{if(!client.authenticated())socket.close(1008);},10000);socket.once('close',()=>clearTimeout(expiry));
 });
}
