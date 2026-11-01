import {readFileSync,statSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {Wallet} from 'ethers';
import {loadRole} from '../../../packages/contracts/scripts/testnet-keys.ts';
export function settlementSigner(){
 const path=process.env.SETTLEMENT_KEY_FILE;
 if(!path)return loadRole('settlement');
 try{
  if(!isAbsolute(path))throw Error();
  const info=statSync(path);if(!info.isFile()||info.size>128)throw Error();
  if(process.platform!=='win32'&&(info.mode&0o077)!==0)throw Error();
  const key=readFileSync(path,'utf8').trim();if(!/^0x[0-9a-fA-F]{64}$/.test(key))throw Error();
  return new Wallet(key);
 }catch{throw Error('Dedicated settlement secret file unavailable or permissions invalid');}
}
