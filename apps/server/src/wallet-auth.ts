import {createHash,randomBytes} from 'node:crypto';
import {getAddress,verifyMessage} from 'ethers';
import type {DatabaseSync} from 'node:sqlite';
export class WalletAuth{
 constructor(private db:DatabaseSync,readonly chainId:number,private now:()=>number=Date.now){db.exec('CREATE TABLE IF NOT EXISTS wallet_challenges(nonce TEXT PRIMARY KEY,address TEXT,origin TEXT,message TEXT,expires INTEGER,used INTEGER); CREATE TABLE IF NOT EXISTS wallet_sessions(hash TEXT PRIMARY KEY,address TEXT,origin TEXT,expires INTEGER);');}
 challenge(address:string,origin:string){
  address=getAddress(address);const nonce=randomBytes(32).toString('hex'),expires=this.now()+300000;
  const message=`LAST SIGNAL wallet login\nDomain: ${new URL(origin).host}\nURI: ${origin}\nAddress: ${address}\nChain ID: ${this.chainId}\nNonce: ${nonce}\nExpires: ${new Date(expires).toISOString()}\nPurpose: Authenticate to a test token match. This is not a transaction or settlement signature.`;
  this.db.prepare('DELETE FROM wallet_challenges WHERE expires<?').run(this.now());this.db.prepare('DELETE FROM wallet_sessions WHERE expires<?').run(this.now());
  this.db.prepare('INSERT INTO wallet_challenges VALUES(?,?,?,?,?,0)').run(nonce,address,origin,message,expires);return {nonce,message,expires};
 }
 verify(nonce:string,signature:string,origin:string){
  const r=this.db.prepare('SELECT * FROM wallet_challenges WHERE nonce=?').get(nonce);
  if(!r||r.used||Number(r.expires)<=this.now()||r.origin!==origin)throw Error('Login challenge expired, used or invalid');
  if(getAddress(verifyMessage(String(r.message),signature))!==r.address)throw Error('Wallet signature does not match challenge');
  const token=randomBytes(32).toString('hex'),hash=createHash('sha256').update(token).digest('hex'),expires=this.now()+3600000;
  this.db.exec('BEGIN IMMEDIATE');try{
   if(this.db.prepare('UPDATE wallet_challenges SET used=1 WHERE nonce=? AND used=0').run(nonce).changes!==1)throw Error('Challenge already used');
   this.db.prepare('INSERT INTO wallet_sessions VALUES(?,?,?,?)').run(hash,String(r.address),origin,expires);this.db.exec('COMMIT');
  }catch(error){this.db.exec('ROLLBACK');throw error;}return {session:token,address:r.address,expires};
 }
 identify(token:string,origin:string){if(!/^[a-f0-9]{64}$/.test(token))return null;const r=this.db.prepare('SELECT * FROM wallet_sessions WHERE hash=?').get(createHash('sha256').update(token).digest('hex'));return r&&Number(r.expires)>this.now()&&r.origin===origin?String(r.address):null;}
}
