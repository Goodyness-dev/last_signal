import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import {RULES,MAP} from '@last-signal/sim';
import {MAX_BYTES,PROTOCOL} from '@last-signal/protocol';
import {TestnetService,type ChainOptions} from './testnet.ts';
import {testnetRoutes} from './testnet-routes.ts';
import {Rooms} from './rooms.ts';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {operation} from './operation.ts';
import {ArmoryService,type ArmoryOptions} from './armory.ts';
import {armoryRoutes} from './armory-routes.ts';
export async function buildServer(options:{database?:string;manual?:boolean;now?:()=>number;grace?:number;chain?:ChainOptions;armory?:ArmoryOptions}={}){
 const app=Fastify({logger:false,bodyLimit:MAX_BYTES});
 let closing=false;
 const config=operation(),origins=config.origins;
 const database=options.database??config.database;if(database!==':memory:')mkdirSync(dirname(database),{recursive:true});
 const rooms=new Rooms(database,options.now,options.grace);
 const testnet=new TestnetService(rooms,options.chain);
 const armory=new ArmoryService(testnet,options.armory,options.now);
 await app.register(websocket,{options:{maxPayload:MAX_BYTES,perMessageDeflate:false},errorHandler:(_error,socket)=>socket.close(1011),preClose:done=>{closing=true;for(const socket of app.websocketServer.clients){socket.close(1001,'Service restarting');const deadline=setTimeout(()=>socket.terminate(),1000);deadline.unref();socket.once('close',()=>clearTimeout(deadline));}app.websocketServer.close();done();}});
 testnetRoutes(app,testnet,origins);
 armoryRoutes(app,armory,origins);
 app.get('/health',async(_req,reply)=>{reply.header('Cache-Control','no-store');return {status:'ok',service:'LAST SIGNAL',version:'0.1.0',revision:config.revision,uptimeSeconds:Math.floor(process.uptime()),mode:'PRIVATE_UNFUNDED',multiplayer:true,publicOperation:config.publicOperation,public:false,rules:RULES.version,map:MAP.version,protocol:PROTOCOL,persistence:'SQLite',wallet:true,testnetConfigured:!!testnet.options};});
 app.get('/room',{websocket:true,preValidation:async(req,reply)=>{if(!req.headers.origin||!origins.has(req.headers.origin))return reply.code(403).send({error:'Origin denied'});}},(socket,req)=>{
  const client=rooms.connect({send:data=>{if(socket.readyState===1){if(socket.bufferedAmount>262144)socket.close(1008);else socket.send(data);}},close:code=>socket.close(code)},token=>testnet.auth.identify(token,req.headers.origin??''));
  socket.on('message',(raw,isBinary)=>{if(closing)return;if(isBinary){socket.close(1003);return;}client.receive(raw.toString());});socket.on('close',client.close);socket.on('error',()=>{});
  const expiry=setInterval(()=>{if(client.expired?.()){socket.close(1008);clearInterval(expiry);}},1000);socket.on('close',()=>clearInterval(expiry));
 });
 const chainTimer=options.manual?null:setInterval(()=>{void testnet.poll();void armory.poll();},4000);
 const timer=options.manual?null:setInterval(()=>{rooms.tick();armory.tick();},1000/RULES.ticks);
 app.addHook('preClose',async()=>{if(timer)clearInterval(timer);if(chainTimer)clearInterval(chainTimer);armory.close();rooms.disconnectAll();});
 app.addHook('onClose',async()=>{testnet.close();rooms.close();});await app.ready();return {app,rooms,testnet,armory};
}
