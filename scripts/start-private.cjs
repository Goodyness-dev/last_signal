const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),runtime=path.join(root,'.runtime');fs.mkdirSync(runtime,{recursive:true});
const out=fs.openSync(path.join(runtime,'server.log'),'a'),err=fs.openSync(path.join(runtime,'server-error.log'),'a');
const child=spawn(process.execPath,['--import','tsx',path.join(root,'apps/server/src/index.ts')],{cwd:root,detached:true,windowsHide:true,stdio:['ignore',out,err]});
child.on('error',e=>{console.error(e.message);process.exitCode=1;});child.unref();fs.writeFileSync(path.join(runtime,'server.pid'),String(child.pid));fs.closeSync(out);fs.closeSync(err);console.log('Private service requested on http://127.0.0.1:3001. Logs in .runtime. PID '+child.pid);
