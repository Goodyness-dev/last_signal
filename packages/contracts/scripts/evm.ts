import {spawn,type ChildProcess} from 'node:child_process';
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {JsonRpcProvider} from 'ethers';
import {root} from './compile.ts';
const require=createRequire(import.meta.url);
export async function startEvm(port:number){
 const cli=resolve(dirname(require.resolve('hardhat')),'cli.js');
 let failure='';const child:ChildProcess=spawn(process.execPath,[cli,'node','--config',resolve(root,'hardhat.config.ts'),'--hostname','127.0.0.1','--port',String(port),'--network','local'],{cwd:root,windowsHide:true,stdio:['ignore','ignore','pipe']});
 child.stderr?.on('data',chunk=>{failure=(failure+String(chunk)).slice(-3000);});
 const url='http://127.0.0.1:'+port;
 for(let i=0;i<150;i++){
  if(child.exitCode!==null)throw Error('Local EVM failed: '+failure);
  try{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_chainId',params:[]}),signal:AbortSignal.timeout(300)});const data=await response.json() as {result:string};if(data.result==='0x7a69')return {child,url,provider:new JsonRpcProvider(url,undefined,{cacheTimeout:-1,pollingInterval:20,batchMaxCount:1}),stop:async()=>{child.kill();}};}catch{}
  await new Promise(r=>setTimeout(r,100));
 }
 child.kill();throw Error('Local EVM readiness timed out: '+failure);
}
