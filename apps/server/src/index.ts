import {buildServer} from './app.ts';
const {app}=await buildServer();
await app.listen({host:process.env.HOST??'127.0.0.1',port:Number(process.env.PORT??3001)});
console.log('LAST SIGNAL service ready at '+app.listeningOrigin);
let closing=false;
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{
 if(closing)return;closing=true;
 const deadline=setTimeout(()=>process.exit(1),10000);deadline.unref();
 void app.close().then(()=>clearTimeout(deadline),()=>{process.exitCode=1;clearTimeout(deadline);});
});
