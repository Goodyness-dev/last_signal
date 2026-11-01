import {Contract,JsonRpcProvider,Wallet,getAddress,parseEther,id,keccak256,toUtf8Bytes,type TypedDataDomain,type Signer} from 'ethers';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomBytes} from 'node:crypto';
import {TESTNET,rulesHash,offerTypes,resultTypes,json,type Offer,type Result,type Deployment} from '@last-signal/chain';
import {Rooms} from './rooms.ts';
import {WalletAuth} from './wallet-auth.ts';
import {loadRole} from '../../../packages/contracts/scripts/testnet-keys.ts';
export type ChainOptions={provider:JsonRpcProvider;signer:Signer;deployment:Deployment;confirmations:number;mode:'PUBLIC_TESTNET'|'LOCAL_TEST'};
const abi=(name:string)=>JSON.parse(readFileSync(resolve(import.meta.dirname,'../../../packages/contracts/abi',name+'.json'),'utf8'));
export class TestnetService{
 readonly auth:WalletAuth;readonly options:ChainOptions|null;private busy=false;private unavailableReason='Dedicated deployer needs free testnet ETH. No public deployment exists.';private setupStatus='NOT_DEPLOYED';
 constructor(readonly rooms:Rooms,options?:ChainOptions){
  rooms.db.exec('CREATE TABLE IF NOT EXISTS chain_matches(room TEXT PRIMARY KEY,matchId TEXT UNIQUE,offer TEXT,signature TEXT,deployment TEXT,fromBlock INTEGER,proofs TEXT); CREATE TABLE IF NOT EXISTS chain_results(identity TEXT PRIMARY KEY,payload TEXT,signature TEXT);');
  if(options)this.options=options;else{
   const file=resolve(import.meta.dirname,'../../../.runtime/testnet/deployment.json');
   if(existsSync(file)){try{const d=JSON.parse(readFileSync(file,'utf8')) as Deployment;if(d.chainId!==TESTNET.chainId)throw Error('Refusing a non testnet deployment');this.options={provider:new JsonRpcProvider(TESTNET.rpc,undefined,{cacheTimeout:-1,batchMaxCount:1}),signer:loadRole('settlement'),deployment:d,confirmations:TESTNET.confirmations,mode:'PUBLIC_TESTNET'};}catch{this.options=null;this.setupStatus='CONFIGURATION_ERROR';this.unavailableReason='Deployment metadata or dedicated signer cannot be loaded. Funding is disabled; use wallet recovery.';}}else this.options=null;
  }
  this.auth=new WalletAuth(rooms.db,this.options?.deployment.chainId??TESTNET.chainId);
 }
 private configured(){if(!this.options)throw Error(this.unavailableReason);return this.options;}
 async checked(){
  const o=this.configured(),p=o.provider,d=o.deployment;if((await p.getNetwork()).chainId!==BigInt(d.chainId))throw Error('RPC chain ID mismatch');
  if(o.mode==='PUBLIC_TESTNET'&&d.chainId!==TESTNET.chainId||o.mode==='LOCAL_TEST'&&d.chainId!==31337)throw Error('Unsupported chain');
  const [tc,ec]=await Promise.all([p.getCode(d.token),p.getCode(d.escrow)]);if(tc==='0x'||ec==='0x'||keccak256(tc)!==d.tokenCodeHash||keccak256(ec)!==d.escrowCodeHash)throw Error('Deployment code mismatch');
  const e=new Contract(d.escrow,abi('MatchEscrow'),p),token=new Contract(d.token,abi('TestWIF'),p);
  if(getAddress(await e.token())!==getAddress(d.token)||getAddress(await e.settlementSigner())!==getAddress(await o.signer.getAddress())||Number(await token.decimals())!==18)throw Error('Token or server signer mismatch');return {o,p,d,e,token};
 }
 async config(){
  if(!this.options)return {network:TESTNET,status:this.setupStatus,deployment:null,reason:this.unavailableReason,eligibility:'UNCONFIRMED'};
  try{const {o,d}=await this.checked();return {network:TESTNET,status:'READY',deployment:d,mode:o.mode,eligibility:'UNCONFIRMED'};}catch{return {network:TESTNET,status:'RPC_OR_DEPLOYMENT_ERROR',deployment:null,reason:'Cannot verify RPC, code or signer. Funding is disabled.',eligibility:'UNCONFIRMED'};}
 }
 private record(room:string,address:string){
  const r=this.rooms.db.prepare('SELECT * FROM chain_matches WHERE room=?').get(room);if(!r)throw Error('Funded room not found');const offer=JSON.parse(String(r.offer)) as Offer;
  if(![offer.playerA,offer.playerB].some(p=>p.toLowerCase()===address.toLowerCase()))throw Error('Wallet is not a participant');return {row:r,offer};
 }
 async create(address:string,opponent:string){
  address=getAddress(address);opponent=getAddress(opponent);if(address===opponent)throw Error('Choose a different opponent wallet');const {o,p,d}=await this.checked();
  const active=this.rooms.db.prepare('SELECT offer,room FROM chain_matches').all().filter(r=>{const g=this.rooms.rooms.get(String(r.room));return g&&!['finished','aborted'].includes(g.phase)&&String(r.offer).toLowerCase().includes(address.toLowerCase());});if(active.length>=2)throw Error('Finish or refund an existing challenge first');
  const pair=[address,opponent].sort((a,b)=>BigInt(a)<BigInt(b)?-1:1) as [string,string],head=(await p.getBlock('latest'))!;
  const offer:Offer={matchId:'0x'+randomBytes(32).toString('hex'),playerA:pair[0],playerB:pair[1],rulesHash,deposit:String(parseEther('100')),createdAt:String(head.timestamp),fundingExpiry:String(head.timestamp+600),nonce:'0'};
  const domain={name:'LAST SIGNAL MatchEscrow',version:'1',chainId:d.chainId,verifyingContract:d.escrow};const signature=await o.signer.signTypedData(domain,offerTypes,offer);
  let roomId='';this.rooms.db.exec('BEGIN IMMEDIATE');try{
   const room=this.rooms.createFunded({players:pair,chainId:d.chainId,matchId:offer.matchId,escrow:d.escrow});roomId=room.id;
   this.rooms.db.prepare('INSERT INTO chain_matches VALUES(?,?,?,?,?,?,?)').run(room.id,offer.matchId,json(offer),signature,json(d),head.number,'{}');this.rooms.db.exec('COMMIT');
  }catch(error){this.rooms.db.exec('ROLLBACK');if(roomId)this.rooms.rooms.delete(roomId);throw error;}
  return this.status(roomId,address);
 }
 async status(room:string,address:string,hint?:string){
  const {row,offer}=this.record(room,address),{o,p,d,e}=await this.checked();const saved=JSON.parse(String(row.deployment)) as Deployment;
  if(getAddress(saved.escrow)!==getAddress(d.escrow))throw Error('Deployment changed. Use saved wallet recovery metadata.');
  const state=await e.matches(offer.matchId),head=(await p.getBlock('latest'))!,proofs=JSON.parse(String(row.proofs)) as Record<string,{hash:string;block:number;blockHash:string}>;
  if(hint){if(!/^0x[a-fA-F0-9]{64}$/.test(hint))throw Error('Invalid transaction hash');const receipt=await p.getTransactionReceipt(hint);if(!receipt||receipt.status!==1||receipt.to?.toLowerCase()!==d.escrow.toLowerCase())throw Error('Funding receipt unavailable or unsuccessful');
   let found=false;for(const log of receipt.logs){if(log.address.toLowerCase()!==d.escrow.toLowerCase())continue;try{const event=e.interface.parseLog(log);if(event?.name==='Funded'&&event.args.matchId===offer.matchId&&event.args.amount===parseEther('100')){const owner=getAddress(event.args.participant);if(![offer.playerA,offer.playerB].includes(owner)||receipt.from.toLowerCase()!==owner.toLowerCase())continue;proofs[owner]={hash:receipt.hash,block:receipt.blockNumber,blockHash:receipt.blockHash};found=true;}}catch{}}
   if(!found)throw Error('Receipt does not prove this match deposit');
  }
  // Reconstruct deposit evidence from confirmed logs when a client has no transaction hint.
  if((state.fundedA&&!proofs[offer.playerA])||(state.fundedB&&!proofs[offer.playerB])){
   const topic=e.interface.getEvent('Funded')!.topicHash;
   for(let from=Number(row.fromBlock);from<=head.number;from+=500){
    const logs=await p.getLogs({address:d.escrow,topics:[topic,offer.matchId],fromBlock:from,toBlock:Math.min(head.number,from+499)});
    for(const log of logs){const event=e.interface.parseLog(log);if(event?.args.amount===parseEther('100')){const owner=getAddress(event.args.participant);if([offer.playerA,offer.playerB].includes(owner))proofs[owner]={hash:log.transactionHash,block:log.blockNumber,blockHash:log.blockHash};}}
   }
  }
  let reorg=false;const verified:boolean[]=[];
  for(const [owner,funded] of [[offer.playerA,state.fundedA],[offer.playerB,state.fundedB]] as [string,boolean][]){
   const proof=proofs[owner];if(!proof){verified.push(false);continue;}
   const [block,receipt]=await Promise.all([p.getBlock(proof.block),p.getTransactionReceipt(proof.hash)]);
   const canonical=!!block&&block.hash===proof.blockHash&&!!receipt&&receipt.status===1&&receipt.blockHash===proof.blockHash;
   if(!canonical){delete proofs[owner];reorg=true;}verified.push(canonical&&funded&&head.number-proof.block+1>=o.confirmations);
  }
  const full=state.fundedA&&state.fundedB;
  if(full&&(state.playerA!==offer.playerA||state.playerB!==offer.playerB||state.rulesHash!==rulesHash||state.offerHash!==await e.offerDigest(offer)))throw Error('Onchain match identity mismatch');
  this.rooms.db.prepare('UPDATE chain_matches SET proofs=? WHERE room=?').run(json(proofs),room);
  if(reorg)this.rooms.abortFunded(room,'Funding receipt reorganized. Match aborted; recover on chain.');
  const deadline=Number(full?state.refundDeadline:offer.fundingExpiry),eligible=head.timestamp>=deadline;
  if(eligible&&!state.finalized)this.rooms.abortFunded(room,'Chain refund deadline reached. Use wallet refund recovery.');
  this.rooms.setFundingVerified(room,verified.every(Boolean)&&!reorg&&!state.finalized&&!eligible);
  return {room,offer,signature:String(row.signature),deployment:d,verified,proofs,deadline,chainTimestamp:head.timestamp,refundEligible:eligible&&!state.finalized&&(state.fundedA||state.fundedB),finalized:state.finalized,phase:this.rooms.rooms.get(room)?.phase??'aborted',confirmationPolicy:`${o.confirmations} canonical L2 blocks. Soft confirmation, not Ethereum finality.`};
 }
 async result(room:string,address:string){
  const status=await this.status(room,address),{o,p,d,e}=await this.checked();if(status.finalized)return {status,settlement:null,reason:'Already finalized. Refresh claims.'};if(status.refundEligible)return {status,settlement:null,reason:'Deadline reached. Full timeout refunds are available.'};
  const game=this.rooms.rooms.get(room);if(!game||!['finished','aborted'].includes(game.phase))throw Error('A durable terminal match is required');
  if(!status.verified.every(Boolean))throw Error('Both funding proofs must remain canonical');
  const identity=d.chainId+':'+d.escrow.toLowerCase()+':'+status.offer.matchId;const old=this.rooms.db.prepare('SELECT * FROM chain_results WHERE identity=?').get(identity);
  if(old){const payload=JSON.parse(String(old.payload)) as Result;return {status,settlement:{result:payload,signature:String(old.signature)}};}
  const abort=game.phase==='aborted',g=game.game;if(!abort&&!g.result)throw Error('Terminal result is not provable');
  if(g.spent.some(s=>!Number.isSafeInteger(s)||s<0||s>100))throw Error('Unprovable spend ledger');
  const payload:Result={matchId:status.offer.matchId,playerA:status.offer.playerA,playerB:status.offer.playerB,rulesHash,spendA:String(abort?0n:BigInt(g.spent[0])*10n**18n),spendB:String(abort?0n:BigInt(g.spent[1])*10n**18n),outcome:abort?3:g.result!.winner===null?2:g.result!.winner,terminalTick:String(g.tick),resultHash:keccak256(toUtf8Bytes(json({room,tick:g.tick,result:g.result,spent:g.spent,scores:g.scores,order:game.order,phase:game.phase}))),nonce:status.offer.nonce,expiry:String(status.deadline)};
  const signature=await o.signer.signTypedData({name:'LAST SIGNAL MatchEscrow',version:'1',chainId:d.chainId,verifyingContract:d.escrow},resultTypes,payload);
  // First persisted canonical authorization wins even when simultaneous requests race.
  this.rooms.db.prepare('INSERT OR IGNORE INTO chain_results VALUES(?,?,?)').run(identity,json(payload),signature);
  const saved=this.rooms.db.prepare('SELECT payload,signature FROM chain_results WHERE identity=?').get(identity)!;
  return {status,settlement:{result:JSON.parse(String(saved.payload)) as Result,signature:String(saved.signature)}};
 }
 async poll(){if(this.busy||!this.options)return;this.busy=true;try{for(const row of this.rooms.db.prepare('SELECT room,offer FROM chain_matches').all()){
   const room=String(row.room),g=this.rooms.rooms.get(room);if(!g||['finished','aborted'].includes(g.phase))continue;
   try{await this.status(room,(JSON.parse(String(row.offer)) as Offer).playerA);}catch{this.rooms.setFundingVerified(room,false);}
  }}finally{this.busy=false;}}
 close(){this.options?.provider.destroy();}
}
