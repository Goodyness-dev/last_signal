import {spawnSync} from 'node:child_process';
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {Wallet} from 'ethers';
export const secretFolder=resolve(import.meta.dirname,'../../../.runtime/testnet');
const legacyPath=resolve(secretFolder,'accounts.dpapi');
const roles=['deployer','settlement','playerA','playerB'] as const;
type Role=typeof roles[number];
export type Keys=Record<Role,Wallet>;
function dpapi(input:string,decrypt:boolean){
 if(process.platform!=='win32')throw Error('This key store requires Windows user encryption. Use a dedicated secret provider on other systems.');
 const command=decrypt?'$secure=ConvertTo-SecureString ([Console]::In.ReadToEnd()); $ptr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure); try {[Console]::Out.Write([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr))} finally {[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)}':'$secure=ConvertTo-SecureString ([Console]::In.ReadToEnd()) -AsPlainText -Force; [Console]::Out.Write(($secure | ConvertFrom-SecureString))';
 const result=spawnSync('pwsh.exe',['-NoProfile','-NonInteractive','-Command',command],{input,encoding:'utf8',windowsHide:true,maxBuffer:100000});
 if(result.status!==0||!result.stdout.trim())throw Error('Windows key protection failed. No credentials were printed.');return result.stdout.trim();
}
function valid(key:unknown):key is string{return typeof key==='string'&&/^0x[0-9a-fA-F]{64}$/.test(key);}
export function loadRole(role:Role):Wallet{
 if(!roles.includes(role))throw Error('Unknown test wallet role');const path=resolve(secretFolder,role+'.dpapi');if(!existsSync(path))throw Error('Dedicated encrypted role missing. Run testnet:prepare.');
 let key:string;try{key=dpapi(readFileSync(path,'utf8'),true);}catch{throw Error('Encrypted role cannot be read by this Windows user.');}if(!valid(key))throw Error('Encrypted role format is invalid');try{return new Wallet(key);}catch{throw Error('Encrypted role is not a valid wallet key.');}
}
export function loadKeys(create=false):Keys{
 mkdirSync(secretFolder,{recursive:true});
 if(create&&roles.some(role=>!existsSync(resolve(secretFolder,role+'.dpapi')))){
  let legacy:Record<string,string>|null=null;if(existsSync(legacyPath)){try{legacy=JSON.parse(dpapi(readFileSync(legacyPath,'utf8'),true)) as Record<string,string>;}catch{throw Error('Legacy encrypted credentials cannot be read. No new accounts were substituted.');}}
  if(!legacy&&existsSync(resolve(secretFolder,'deployment.json')))throw Error('A deployed role is missing. Recover its key rather than silently rotating it.');
  for(const role of roles){const path=resolve(secretFolder,role+'.dpapi');if(existsSync(path))continue;const key=legacy?.[role]??Wallet.createRandom().privateKey;if(!valid(key))throw Error('Encrypted credential format is invalid');writeFileSync(path,dpapi(key,false),{mode:0o600,flag:'wx'});}
 }
 const keys=Object.fromEntries(roles.map(role=>[role,loadRole(role)])) as Keys;if(new Set(Object.values(keys).map(w=>w.address)).size!==4)throw Error('Testnet wallet roles must differ');return keys;
}
