import {describe,it,expect} from 'vitest';
import {operation} from '../apps/server/src/operation.ts';
import {buildServer} from '../apps/server/src/app.ts';
import {settlementSigner} from '../apps/server/src/signer.ts';
import {mkdtempSync,writeFileSync,rmSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Wallet} from 'ethers';
describe('operation boundaries',()=>{
 it('loads only the dedicated mounted signer and sanitizes invalid secret errors',()=>{
  const dir=mkdtempSync(join(tmpdir(),'last-signal-secret-')),path=join(dir,'settlement'),before=process.env.SETTLEMENT_KEY_FILE,wallet=Wallet.createRandom();
  try{
   process.env.SETTLEMENT_KEY_FILE=path;writeFileSync(path,wallet.privateKey,{mode:0o600});expect(settlementSigner().address).toBe(wallet.address);
   writeFileSync(path,'not a private key');expect(()=>settlementSigner()).toThrow('secret file unavailable');
   if(process.platform!=='win32'){writeFileSync(path,wallet.privateKey);chmodSync(path,0o644);expect(()=>settlementSigner()).toThrow('permissions invalid');}
  }finally{if(before===undefined)delete process.env.SETTLEMENT_KEY_FILE;else process.env.SETTLEMENT_KEY_FILE=before;rmSync(dir,{recursive:true,force:true});}
 });
 it('refuses public operation without explicit TLS origins and durable storage',()=>{
  expect(()=>operation({PUBLIC_OPERATION:'true'})).toThrow('HTTPS');
  const env={PUBLIC_OPERATION:'true',ALLOWED_ORIGINS:'https://game.example',TLS_TERMINATED:'true'};
  expect(()=>operation(env)).toThrow('persistent');
  expect(()=>operation({...env,DATABASE_PATH:'/data/rooms.sqlite',PERSISTENT_STORAGE_CONFIRMED:'true',TLS_TERMINATED:'false'})).toThrow('TLS');
  expect(operation({...env,DATABASE_PATH:'/data/rooms.sqlite',PERSISTENT_STORAGE_CONFIRMED:'true'}).publicOperation).toBe(true);
  expect(()=>operation({ALLOWED_ORIGINS:'https://game.example/path'})).toThrow('exact');
 });
 it('publishes versioned health without credentials and closes an open transport',async()=>{
  const {app}=await buildServer({database:':memory:',manual:true});
  const response=await app.inject('/health'),health=response.json();
  expect(health.version).toBe('0.1.0');expect(health.protocol).toBeTruthy();expect(health.revision).toBeTruthy();expect(health.public).toBe(false);expect(response.headers['cache-control']).toBe('no-store');
  const ws=await app.injectWS('/room',{headers:{origin:'http://127.0.0.1:5174'}});ws.on('error',()=>{});
  const closed=new Promise<number>(resolve=>ws.on('close',resolve));await app.close();expect(await closed).toBe(1001);
 });
});
