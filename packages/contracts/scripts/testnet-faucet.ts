import {JsonRpcProvider,formatEther,getAddress} from 'ethers';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {TESTNET,json} from '@last-signal/chain';
import {loadRole,secretFolder} from './testnet-keys.ts';
const provider=new JsonRpcProvider(TESTNET.rpc,undefined,{cacheTimeout:-1,batchMaxCount:1,pollingInterval:1000});
const reportFile=resolve(import.meta.dirname,'../../../docs/evidence/testnet-faucet.json');
try{
 const key=process.env.BLOCKVECTRA_API_KEY;if(!key||/your_|placeholder/i.test(key))throw Error('A real BLOCKVECTRA_API_KEY is required in the ignored root .env file.');
 if(BigInt(await provider.send('eth_chainId',[]))!==BigInt(TESTNET.chainId))throw Error('Wrong chain. Faucet request refused.');
 const address=loadRole('deployer').address,before=await provider.getBalance(address),journalFile=resolve(secretFolder,'faucet-claim.json');
 const report:Record<string,unknown>={checkedAt:new Date().toISOString(),mode:'PUBLIC_TESTNET_FREE_FAUCET',chainId:TESTNET.chainId,address,balanceBefore:formatEther(before),provider:'BlockVectra',endpoint:'https://api.blockvectra.com/v1/faucet/robinhood_testnet',credentialRecorded:false};
 let hash:string|undefined;
 if(existsSync(journalFile)){
  const prior=JSON.parse(readFileSync(journalFile,'utf8')) as {address:string;chainId:number;hash:string};if(prior.address!==address||prior.chainId!==TESTNET.chainId||!/^0x[0-9a-fA-F]{64}$/.test(prior.hash))throw Error('Existing faucet journal needs inspection. No new claim sent.');hash=prior.hash;report.resumed=true;
 }else{
  const response=await fetch('https://api.blockvectra.com/v1/faucet/robinhood_testnet',{method:'POST',headers:{'content-type':'application/json','x-api-key':key},body:JSON.stringify({address}),signal:AbortSignal.timeout(30000)});
  const data=await response.json() as {tx_hash?:string;address?:string;chain_id?:number;amount_wei?:string;next_eligible_at?:string;error?:{code?:string;data?:{scope?:string;next_eligible_at?:string}}};
  report.httpStatus=response.status;
  if(response.status!==202){report.status='NOT_FUNDED';report.errorCode=String(data.error?.code??'unexpected_response').replace(/[^a-zA-Z0-9_]/g,'').slice(0,80);report.retryAfter=response.headers.get('retry-after');report.scope=data.error?.data?.scope;report.nextEligibleAt=data.error?.data?.next_eligible_at;writeFileSync(reportFile,json(report)+'\n');console.log(json(report));process.exitCode=2;}
  else{
   if(!data.tx_hash||!/^0x[0-9a-fA-F]{64}$/.test(data.tx_hash)||data.chain_id!==TESTNET.chainId||getAddress(data.address??'')!==address||data.amount_wei!=='1000000000000000')throw Error('Faucet acceptance identity mismatch. Do not retry blindly.');
   hash=data.tx_hash;writeFileSync(journalFile,json({chainId:TESTNET.chainId,address,hash,nextEligibleAt:data.next_eligible_at}));report.status='ACCEPTED_UNCONFIRMED';report.hash=hash;writeFileSync(reportFile,json(report)+'\n');
  }
 }
 if(hash){
  const receipt=await provider.waitForTransaction(hash,TESTNET.confirmations,120000);if(!receipt||receipt.status!==1)throw Error('Faucet transaction not confirmed successfully. Existing hash retained.');
  const block=await provider.getBlock(receipt.blockNumber);if(block?.hash==receipt.blockHash)throw Error('Faucet receipt is not canonical');
  const balance=await provider.getBalance(address),tx=await provider.getTransaction(hash);report.status='RECEIPT_CONFIRMED';report.hash=hash;report.receipt={status:receipt.status,block:receipt.blockNumber,blockHash:receipt.blockHash};report.transfer={to:tx?.to,value:tx?formatEther(tx.value):null};report.balanceAfter=formatEther(balance);report.directTransferVerified=tx?.to===address&&tx.value===1000000000000000n;
  writeFileSync(reportFile,json(report)+'\n');console.log(json(report));if(!report.directTransferVerified)process.exitCode=2;
 }
}catch{console.error('Free testnet faucet operation could not complete. No secret or raw response is printed. Inspect the public report and local claim journal before retrying.');process.exitCode=1;}finally{provider.destroy();}
