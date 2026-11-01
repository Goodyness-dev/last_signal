import {describe,it,expect} from 'vitest';
import {parseClient} from '../packages/protocol/src/index.ts';
import {buildServer} from '../apps/server/src/app.ts';
describe('salvage transport boundaries',()=>{
 it('bounds loot IDs and refuses injected ownership or token credits',()=>{
  expect(parseClient(JSON.stringify({op:'command',id:'loot-1',action:{kind:'loot',squadId:1,lootId:2}})).op).toBe('command');
  for(const action of [{kind:'loot',squadId:1,lootId:-1},{kind:'loot',squadId:1,lootId:2,recipient:'attacker'},{kind:'loot',squadId:1,lootId:2,tokens:100},{kind:'supply',squadId:1,supply:'ammo'}])expect(()=>parseClient(JSON.stringify({op:'command',id:'bad',action}))).toThrow();
 });
 it('requires wallet login and a permitted origin for armory state and mutations',async()=>{
  const {app}=await buildServer({database:':memory:',manual:true});try{
   const denied=await app.inject({method:'POST',url:'/armory/runs',headers:{origin:'https://evil.invalid'},payload:{tokenId:'1'}});expect(denied.statusCode).toBe(400);
   const noWallet=await app.inject({method:'GET',url:'/armory/account',headers:{origin:'http://127.0.0.1:5174'}});expect(noWallet.statusCode).toBe(400);expect(noWallet.json().error).toContain('Wallet login');
   expect((await app.inject({method:'GET',url:'/salvage',headers:{origin:'https://evil.invalid'}})).statusCode).toBe(403);
  }finally{await app.close();}
 });
});
