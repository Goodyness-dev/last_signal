import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import {RULES,MAP} from '@last-signal/sim';
import {MAX_BYTES,PROTOCOL} from '@last-signal/protocol';
import {TestnetService,type ChainOptions} from './testnet.ts';
import {testnetRoutes} from './testnet-routes.ts';
import {Rooms} from './rooms.ts';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
export async function buildServer(options:{database?:string;manual?:boolean;now?:()=>number;grace?:number;chain?:ChainOptions}={}){
 const app=Fastify({logger:false,bodyLimit:MAX_BYTES});
 const origins=new Set((process.env.ALLOWED_ORIGINS??'http://127.0.0.1:5174,http://localhost:5174').split(','));
 const database=options.database??resolve(import.meta.dirname,'../../../.runtime/rooms.sqlite');if(!options.database)mkdirSync(resolve(import.meta.dirname,'../../../.runtime'),{recursive:true});
 const rooms=new Rooms(database,options.now,options.grace);
 const testnet=new TestnetService(rooms,options.chain);
 await app.register(websocket,{options:{maxPayload:MAX_BYTES,perMessageDeflate:false},errorHandler:(_error,socket)=>socket.close(1011)});
 testnetRoutes(app,testnet,origins);
 app.get('/health',async()=>({status:'ok',service:'LAST SIGNAL',mode:'PRIVATE_UNFUNDED',multiplayer:true,public:false,rules:RULES.version,map:MAP.version,protocol:PROTOCOL,persistence:'SQLite',wallet:true,testnetConfigured:!!testnet.options}));
 app.get('/room',{websocket:true,preValidation:async(req,reply)=>{if(!req.headers.origin||!origins.has(req.headers.origin))return reply.code(403).send({error:'Origin denied'});}},(socket,req)=>{
  const client=rooms.connect({send:data=>{if(socket.readyState===1){if(socket.bufferedAmount>262144)socket.close(1008);else socket.send(data);}},close:code=>socket.close(code)},token=>testnet.auth.identify(token,req.headers.origin??''));
  socket.on('message',(raw,isBinary)=>{if(isBinary){socket.close(1003);return;}client.receive(raw.toString());});socket.on('close',client.close);socket.on('error',()=>{});
  const expiry=setInterval(()=>{if(client.expired?.()){socket.close(1008);clearInterval(expiry);}},1000);socket.on('close',()=>clearInterval(expiry));
 });
 const chainTimer=options.manual?null:setInterval(()=>{void testnet.poll();},4000);
 const timer=options.manual?null:setInterval(()=>rooms.tick(),1000/RULES.ticks);
 app.addHook('onClose',async()=>{if(timer)clearInterval(timer);if(chainTimer)clearInterval(chainTimer);testnet.close();rooms.close();});await app.ready();return {app,rooms,testnet};
}
