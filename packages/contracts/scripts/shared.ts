import {Contract,ContractFactory,Wallet,parseEther,id,keccak256,toUtf8Bytes,type Signer,type JsonRpcProvider,type TransactionReceipt,type TransactionResponse,type TypedDataDomain} from 'ethers';
import {compile,type Artifact} from './compile.ts';
import {RULES,MAP,createGame,command,step} from '@last-signal/sim';
export const DEPOSIT=parseEther('100');
export const rulesHash=id(JSON.stringify({rules:RULES,map:MAP.version,mode:'PRIVATE_RELAY_UNTIMED'}));
export const offerTypes={Offer:[{name:'matchId',type:'bytes32'},{name:'playerA',type:'address'},{name:'playerB',type:'address'},{name:'rulesHash',type:'bytes32'},{name:'deposit',type:'uint256'},{name:'createdAt',type:'uint256'},{name:'fundingExpiry',type:'uint256'},{name:'nonce',type:'uint256'}]};
export const resultTypes={Result:[{name:'matchId',type:'bytes32'},{name:'playerA',type:'address'},{name:'playerB',type:'address'},{name:'rulesHash',type:'bytes32'},{name:'spendA',type:'uint256'},{name:'spendB',type:'uint256'},{name:'outcome',type:'uint8'},{name:'terminalTick',type:'uint256'},{name:'resultHash',type:'bytes32'},{name:'nonce',type:'uint256'},{name:'expiry',type:'uint256'}]};
export type Offer={matchId:string;playerA:string;playerB:string;rulesHash:string;deposit:bigint;createdAt:bigint;fundingExpiry:bigint;nonce:bigint};
export type Result={matchId:string;playerA:string;playerB:string;rulesHash:string;spendA:bigint;spendB:bigint;outcome:number;terminalTick:bigint;resultHash:string;nonce:bigint;expiry:bigint};
export type Receipt={label:string;hash:string;block:number;status:number|null;gasUsed:string;logs:{address:string;topics:readonly string[];data:string}[]};
export const as=(c:Contract,signer:Signer)=>new Contract(c.target,c.interface,signer);
export async function receipt(tx:Promise<TransactionResponse>|TransactionResponse,label:string,receipts:Receipt[]=[]){const r=await (await tx).wait();if(!r||r.status!==1)throw Error(label+' failed');receipts.push({label,hash:r.hash,block:r.blockNumber,status:r.status,gasUsed:r.gasUsed.toString(),logs:r.logs.map(l=>({address:l.address,topics:l.topics,data:l.data}))});return r;}
export async function deploy(artifact:Artifact,signer:Signer,args:unknown[]=[],receipts:Receipt[]=[],label='deploy'){
 const c=await new ContractFactory(artifact.abi,artifact.bytecode,signer).deploy(...args);await receipt(c.deploymentTransaction()!,label,receipts);return new Contract(await c.getAddress(),artifact.abi,signer);
}
export async function timestamp(provider:JsonRpcProvider){return BigInt((await provider.getBlock('latest'))!.timestamp);}
export async function at(provider:JsonRpcProvider,time:bigint){await provider.send('evm_setNextBlockTimestamp',[Number(time)]);}
export async function fixture(provider:JsonRpcProvider,artifacts=compile(),tokenName='TestWIF'){
 if((await provider.getNetwork()).chainId!==31337n)throw Error('Local chain only');
 const deployer=await provider.getSigner(0),actors=[await provider.getSigner(1),await provider.getSigner(2)];
 actors.sort((a,b)=>BigInt(a.address)<BigInt(b.address)?-1:1);const [a,b]=actors,authority=Wallet.createRandom(),receipts:Receipt[]=[];
 const token=await deploy(artifacts[tokenName],deployer,[],receipts,'deploy token');
 const escrow=await deploy(artifacts.MatchEscrow,deployer,[await token.getAddress(),authority.address],receipts,'deploy escrow');
 if(tokenName==='TestWIF'){await receipt(as(token,a).faucet(),'faucet A',receipts);await receipt(as(token,b).faucet(),'faucet B',receipts);}
 else{await receipt(token.mint(a.address,DEPOSIT),'mint test A');await receipt(token.mint(b.address,DEPOSIT),'mint test B');}
 await receipt(as(token,a).approve(escrow.target,DEPOSIT),'approve A exactly 100',receipts);await receipt(as(token,b).approve(escrow.target,DEPOSIT),'approve B exactly 100',receipts);
 const domain:TypedDataDomain={name:'LAST SIGNAL MatchEscrow',version:'1',chainId:31337n,verifyingContract:await escrow.getAddress()};
 const offer=async(label='match'):Promise<Offer>=>{const createdAt=await timestamp(provider);return {matchId:id(label),playerA:a.address,playerB:b.address,rulesHash,deposit:DEPOSIT,createdAt,fundingExpiry:createdAt+600n,nonce:0n};};
 const signOffer=(o:Offer,d:TypedDataDomain=domain)=>authority.signTypedData(d,offerTypes,o);
 const fund=async(o:Offer)=>{const signature=await signOffer(o);await receipt(as(escrow,a).fundMatch(o,signature),'fund A',receipts);await receipt(as(escrow,b).fundMatch(o,signature),'fund B',receipts);};
 const result=async(o:Offer,patch:Partial<Result>={}):Promise<Result>=>{const m=await escrow.matches(o.matchId);return {matchId:o.matchId,playerA:o.playerA,playerB:o.playerB,rulesHash:o.rulesHash,spendA:parseEther('45'),spendB:parseEther('60'),outcome:0,terminalTick:5000n,resultHash:id('terminal fixture'),nonce:o.nonce,expiry:BigInt(m.refundDeadline),...patch};};
 const signResult=(r:Result,d:TypedDataDomain=domain)=>authority.signTypedData(d,resultTypes,r);
 return {provider,deployer,a,b,authority,token,escrow,domain,offer,signOffer,fund,result,signResult,receipts,artifacts};
}
export function terminalFixture(){
 const g=createGame(7,{untimed:true});g.countdown=0;
 const accepted=(side:0|1,action:object)=>{const r=command(g,{...action,id:'fixture:'+g.tick+':'+JSON.stringify(action),side} as Parameters<typeof command>[1]);if(!r.ok)throw Error(r.reason);};
 accepted(0,{kind:'deploy'});accepted(0,{kind:'shield',squadId:1});accepted(0,{kind:'emp',squadId:1,target:{x:9,z:16}});
 accepted(1,{kind:'deploy'});accepted(1,{kind:'shield',squadId:2});
 // Authored terminal fixture: A captures north, B stays at home. Both spend through normal commands.
 accepted(0,{kind:'move',squadId:1,target:{x:24,z:7}});
 for(let i=0;i<6500&&!g.result;i++){if(g.tick===100)accepted(1,{kind:'deploy'});if(g.tick===360)accepted(1,{kind:'shield',squadId:2});step(g);}
 if(!g.result)throw Error('Fixture did not terminate');
 const data={rulesHash,tick:g.tick,winner:g.result.winner,scores:g.scores,spent:g.spent,reason:g.result.reason};
 return {data,resultHash:keccak256(toUtf8Bytes(JSON.stringify(data)))};
}
