import {buildServer} from './app.ts';
const {app}=await buildServer();
await app.listen({host:process.env.HOST??'127.0.0.1',port:Number(process.env.PORT??3001)});
console.log('LAST SIGNAL private unfunded service ready on loopback port 3001');
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{void app.close();});
