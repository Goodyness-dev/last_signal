import type {FastifyInstance,FastifyRequest} from 'fastify';
import {TestnetService} from './testnet.ts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function testnetRoutes(app:FastifyInstance,service:TestnetService,origins:Set<string>){
 const buckets=new Map<string,{at:number;count:number}>();
 const origin=(req:FastifyRequest)=>{const value=req.headers.origin??'http://'+req.headers.host;if(!origins.has(value))throw Error('Origin denied');return value;};
 const limit=(req:FastifyRequest,cap=20)=>{const key=req.ip+':'+req.routeOptions.url,now=Date.now(),old=buckets.get(key);if(!old||now-old.at>60000)buckets.set(key,{at:now,count:1});else if(++old.count>cap)throw Error('Request limit reached. Try again later.');if(buckets.size>2000)for(const[k,v]of buckets)if(now-v.at>60000)buckets.delete(k);};
 const identity=(req:FastifyRequest)=>{const token=req.headers.authorization?.replace(/^Bearer /,'')??'',address=service.auth.identify(token,origin(req));if(!address)throw Error('Wallet login required');return address;};
 const body=(req:FastifyRequest,keys:string[])=>{if(!object(req.body)||Object.keys(req.body).length!==keys.length||Object.keys(req.body).some(k=>!keys.includes(k)))throw Error('Invalid request');return req.body;};
 const route=(method:'GET'|'POST',url:string,handler:(r:FastifyRequest)=>Promise<unknown>|unknown)=>app.route({method,url,handler:async(req,reply)=>{try{if(method==='POST')origin(req);limit(req,method==='GET'?60:20);return await handler(req);}catch(error){const e=error as {code?:string;shortMessage?:string;message?:string};return reply.code(e.message==='Origin denied'?403:400).send({error:e.code?'Chain or wallet request failed. Refresh state before retrying.':e.message??'Request failed'});}}});
 route('GET','/testnet/config',()=>service.config());
 route('POST','/testnet/challenge',req=>{const b=body(req,['address','chainId']);if(typeof b.address!=='string'||b.chainId!==service.auth.chainId)throw Error('Select the configured testnet first');return service.auth.challenge(b.address,origin(req));});
 route('POST','/testnet/login',req=>{const b=body(req,['nonce','signature']);if(typeof b.nonce!=='string'||!/^[a-f0-9]{64}$/.test(b.nonce)||typeof b.signature!=='string'||!/^0x[a-fA-F0-9]{130}$/.test(b.signature))throw Error('Invalid wallet proof');return service.auth.verify(b.nonce,b.signature,origin(req));});
 route('POST','/testnet/rooms',req=>{const b=body(req,['opponent']);if(typeof b.opponent!=='string')throw Error('Opponent wallet required');return service.create(identity(req),b.opponent);});
 route('GET','/testnet/rooms/:room',req=>service.status((req.params as {room:string}).room,identity(req)));
 route('POST','/testnet/rooms/:room/verify',req=>{const b=body(req,['transactionHash']);if(typeof b.transactionHash!=='string')throw Error('Funding receipt required');return service.status((req.params as {room:string}).room,identity(req),b.transactionHash);});
 route('POST','/testnet/rooms/:room/result',req=>{body(req,[]);return service.result((req.params as {room:string}).room,identity(req));});
}
