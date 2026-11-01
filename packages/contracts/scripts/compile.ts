import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const solc=require('solc') as {version():string;compile(input:string,options:{import:(path:string)=>{contents?:string;error?:string}}):string};
export type Artifact={abi:import('ethers').InterfaceAbi;bytecode:string;compiler:string};
export const root=resolve(import.meta.dirname,'..');
export function compile(){
 const sources:Record<string,{content:string}>={};
 for(const dir of ['src','test'])for(const name of readdirSync(resolve(root,dir)))if(name.endsWith('.sol'))sources[dir+'/'+name]={content:readFileSync(resolve(root,dir,name),'utf8')};
 const input={language:'Solidity',sources,settings:{optimizer:{enabled:true,runs:200},evmVersion:'cancun',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}};
 const output=JSON.parse(solc.compile(JSON.stringify(input),{import:path=>{try{return {contents:readFileSync(require.resolve(path),'utf8')};}catch{return {error:'Import not found: '+path};}}})) as {errors?:{severity:string;formattedMessage:string}[];contracts:Record<string,Record<string,{abi:Artifact['abi'];evm:{bytecode:{object:string}}}>>};
 const errors=output.errors?.filter(e=>e.severity==='error')??[];if(errors.length)throw Error(errors.map(e=>e.formattedMessage).join('\n'));
 const artifacts:Record<string,Artifact>={};mkdirSync(resolve(root,'artifacts'),{recursive:true});
 for(const [file,contracts] of Object.entries(output.contracts))if(file.startsWith('src/')||file.startsWith('test/'))for(const [name,c] of Object.entries(contracts)){
  if(!c.evm.bytecode.object)continue;const artifact={abi:c.abi,bytecode:'0x'+c.evm.bytecode.object,compiler:solc.version()};artifacts[name]=artifact;writeFileSync(resolve(root,'artifacts',name+'.json'),JSON.stringify(artifact,null,2));if(['TestWIF','MatchEscrow','GunArmory'].includes(name)){mkdirSync(resolve(root,'abi'),{recursive:true});writeFileSync(resolve(root,'abi',name+'.json'),JSON.stringify(c.abi,null,2)+'\n');}
 }
 return artifacts;
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename))console.log('Compiled: '+Object.keys(compile()).join(', '));
