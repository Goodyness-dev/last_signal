const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),runtime=path.join(root,'.runtime');fs.mkdirSync(runtime,{recursive:true});
const cli=path.join(path.dirname(require.resolve('hardhat')),'cli.js');
const child=spawn(process.execPath,[cli,'node','--config',path.join(root,'packages/contracts/hardhat.config.ts'),'--hostname','127.0.0.1','--port','8545','--network','local'],{cwd:root,detached:true,windowsHide:true,stdio:'ignore'});
child.on('error',e=>{console.error(e.message);process.exitCode=1;});child.unref();fs.writeFileSync(path.join(runtime,'chain.pid'),String(child.pid));console.log('Disposable local EVM requested at http://127.0.0.1:8545. Account keys are not logged. PID '+child.pid);
