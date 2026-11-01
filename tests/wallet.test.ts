import {describe,it,expect} from 'vitest';
import {Wallet} from 'ethers';
import {DatabaseSync} from 'node:sqlite';
import {WalletAuth} from '../apps/server/src/wallet-auth.ts';
import {Rooms,type Peer} from '../apps/server/src/rooms.ts';
import {IDENTIFIERS,type ServerMessage} from '@last-signal/protocol';
import {RULES} from '@last-signal/sim';
describe('wallet authentication and funded room gate',()=>{
 it('binds readable one use login challenges to wallet, origin, chain and expiry',async()=>{
  const db=new DatabaseSync(':memory:');let now=1000;const auth=new WalletAuth(db,46630,()=>now),wallet=Wallet.createRandom(),other=Wallet.createRandom(),origin='http://127.0.0.1:5174';
  try{
   const c=auth.challenge(wallet.address,origin);expect(c.message).toContain('Chain ID: 46630');expect(c.message).toContain('not a transaction or settlement');const sig=await wallet.signMessage(c.message),awaitedSignature=await other.signMessage(c.message),otherSig=await other.signMessage('wrong purpose');
   expect(()=>auth.verify(c.nonce,sig,'http://localhost:5174')).toThrow();expect(()=>auth.verify(c.nonce,awaitedSignature,origin)).toThrow();
   const login=auth.verify(c.nonce,sig,origin);expect(auth.identify(login.session,origin)).toBe(wallet.address);expect(auth.identify(login.session,'http://localhost:5174')).toBeNull();expect(()=>auth.verify(c.nonce,sig,origin)).toThrow();
   const expired=auth.challenge(wallet.address,origin);now+=300001;expect(()=>auth.verify(expired.nonce,sig,origin)).toThrow();now+=3600000;expect(auth.identify(login.session,origin)).toBeNull();
   const wrong=auth.challenge(wallet.address,origin);expect(()=>auth.verify(wrong.nonce,otherSig,origin)).toThrow();
  }finally{db.close();}
 });
 it('requires authenticated participant wallets and both fresh funding proofs before running',()=>{
  let now=1000;const rooms=new Rooms(':memory:',()=>now),a=Wallet.createRandom(),b=Wallet.createRandom();const pair=[a.address,b.address].sort((x,y)=>BigInt(x)<BigInt(y)?-1:1) as [string,string];
  const r=rooms.createFunded({players:pair,chainId:31337,escrow:'0x'+'1'.repeat(40),matchId:'0x'+'2'.repeat(64)}),messages:ServerMessage[]=[];
  now+=61000;rooms.tick();expect(r.phase).toBe('lobby');
  const peer:Peer={send:s=>messages.push(JSON.parse(s)),close:()=>{}};const c=rooms.connect(peer,t=>t==='a'.repeat(64)?pair[0]:null);
  const send=(m:unknown)=>c.receive(JSON.stringify(m));try{
   send({op:'join',room:r.id,...IDENTIFIERS});expect(messages.at(-1)?.op).toBe('error');
   send({op:'funded',room:r.id,walletSession:'b'.repeat(64),...IDENTIFIERS});expect(messages.at(-1)?.op).toBe('error');
   send({op:'funded',room:r.id,walletSession:'a'.repeat(64),...IDENTIFIERS});expect(messages.at(-2)?.op).toBe('session');
   send({op:'ready'});expect(messages.at(-1)).toMatchObject({op:'error',reason:'Waiting for two verified testnet deposits'});expect(r.seats[0]?.ready).toBe(false);
   const p2:Peer={send:()=>{},close:()=>{}};const c2=rooms.connect(p2,t=>t==='b'.repeat(64)?pair[1]:null);c2.receive(JSON.stringify({op:'funded',room:r.id,walletSession:'b'.repeat(64),...IDENTIFIERS}));
   rooms.setFundingVerified(r.id,true);send({op:'ready'});c2.receive('{"op":"ready"}');for(let i=0;i<RULES.countdown;i++)rooms.tick();expect(r.phase).toBe('running');
   const tick=r.game.tick;now+=9000;send({op:'ping'});c2.receive('{"op":"ping"}');rooms.tick();expect(r.game.tick).toBe(tick);
  }finally{rooms.close();}
 });
});
