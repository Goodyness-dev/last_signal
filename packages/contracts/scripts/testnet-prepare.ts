import {JsonRpcProvider,formatEther} from 'ethers';
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {TESTNET,json} from '@last-signal/chain';
import {loadKeys} from './testnet-keys.ts';
const keys=loadKeys(true),p=new JsonRpcProvider(TESTNET.rpc,undefined,{cacheTimeout:-1,batchMaxCount:1});
try{
 const chainId=BigInt(await p.send('eth_chainId',[]));if(chainId!==BigInt(TESTNET.chainId))throw Error('Official testnet chain ID mismatch. No transactions sent.');
 const roles=Object.fromEntries(await Promise.all(Object.entries(keys).map(async([role,w])=>[role,{address:w.address,testEth:formatEther(await p.getBalance(w.address))}])));
 const block=await p.getBlock('latest');const report={mode:'PUBLIC_TESTNET_READS_ONLY',checkedAt:new Date().toISOString(),sources:['https://docs.robinhood.com/chain/connecting/','https://docs.robinhood.com/chain/transaction-finality/'],network:TESTNET,observedChainId:chainId,head:{number:block!.number,hash:block!.hash,timestamp:block!.timestamp},roles,deployments:[],transactions:[],faucetStatus:'Official page loaded but request form blank in the available browser. No faucet claim made.',hackathonMockTokenEligibility:'UNCONFIRMED'};
 const folder=resolve(import.meta.dirname,'../../../docs/evidence');mkdirSync(folder,{recursive:true});writeFileSync(resolve(folder,'testnet-preflight.json'),json(report)+'\n');console.log(json({chainId,roles,credentialStorage:'Windows user encrypted, separate ignored .runtime/testnet/*.dpapi role files',fundingNeeded:roles.deployer}));
}finally{p.destroy();}
