import {Contract,ContractFactory,JsonRpcProvider,NonceManager,keccak256,formatEther} from 'ethers';
import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {TESTNET,json,type Deployment} from '@last-signal/chain';
import {compile} from './compile.ts';
import {loadKeys,secretFolder} from './testnet-keys.ts';
const p=new JsonRpcProvider(TESTNET.rpc,undefined,{cacheTimeout:-1,batchMaxCount:1,pollingInterval:1000});
try{
 if(BigInt(await p.send('eth_chainId',[]))!==BigInt(TESTNET.chainId))throw Error('Refusing wrong chain. No transactions sent.');
 const keys=loadKeys(),deployer=new NonceManager(keys.deployer.connect(p)),artifacts=compile();
 if(keys.deployer.address===keys.settlement.address)throw Error('Deployment and settlement roles must differ');
 const journalFile=resolve(secretFolder,'deploy-journal.json');type Entry={hash:string;address?:string};
 const journal=existsSync(journalFile)?JSON.parse(readFileSync(journalFile,'utf8')) as {chainId:number;signer:string;token?:Entry;escrow?:Entry}:{chainId:TESTNET.chainId,signer:keys.settlement.address};
 if(journal.chainId!==TESTNET.chainId||journal.signer!==keys.settlement.address)throw Error('Deployment journal identity mismatch');
 const confirmed=[];
 for(const name of ['token','escrow'] as const){
  const a=name==='token'?artifacts.TestWIF:artifacts.MatchEscrow,args=name==='token'?[]:[journal.token!.address,keys.settlement.address];
  if(!journal[name]){
   const factory=new ContractFactory(a.abi,a.bytecode,deployer),request=await factory.getDeployTransaction(...args),gas=await p.estimateGas({...request,from:keys.deployer.address}),fees=await p.getFeeData(),price=fees.maxFeePerGas??fees.gasPrice;
   if(!price)throw Error('Cannot obtain testnet gas price');const balance=await p.getBalance(keys.deployer.address),needed=gas*price*12n/10n;
   if(balance<needed){console.log(json({status:'NEEDS_FREE_TESTNET_ETH',address:keys.deployer.address,balance:formatEther(balance),estimatedRequired:formatEther(needed),faucet:TESTNET.faucet,transactionsSent:false}));process.exitCode=2;break;}
   const contract=await factory.deploy(...args),tx=contract.deploymentTransaction()!;journal[name]={hash:tx.hash};writeFileSync(journalFile,json(journal));
  }
  const entry=journal[name]!;const receipt=await p.waitForTransaction(entry.hash,TESTNET.confirmations,120000);if(!receipt||receipt.status!==1||!receipt.contractAddress)throw Error('Deployment pending or unsuccessful. Inspect journal; do not blindly redeploy.');
  entry.address=receipt.contractAddress;writeFileSync(journalFile,json(journal));const code=await p.getCode(entry.address);if(code==='0x')throw Error('Deployment has empty code');confirmed.push({name,hash:receipt.hash,address:entry.address,block:receipt.blockNumber,blockHash:receipt.blockHash,status:receipt.status,codeHash:keccak256(code)});
 }
 if(journal.token?.address&&journal.escrow?.address){
  const escrow=new Contract(journal.escrow.address,artifacts.MatchEscrow.abi,p),token=new Contract(journal.token.address,artifacts.TestWIF.abi,p);
  if(await escrow.settlementSigner()!==keys.settlement.address||await escrow.token()!==journal.token.address||Number(await token.decimals())!==18)throw Error('Deployment verification failed');
  const deployment:Deployment={chainId:TESTNET.chainId,rpc:TESTNET.rpc,token:journal.token.address,escrow:journal.escrow.address,settlementSigner:keys.settlement.address,deploymentBlock:Math.min(...confirmed.map(r=>r.block)),tokenCodeHash:keccak256(await p.getCode(journal.token.address)),escrowCodeHash:keccak256(await p.getCode(journal.escrow.address))};
  writeFileSync(resolve(secretFolder,'deployment.json'),json(deployment));const publicFolder=resolve(import.meta.dirname,'../../../apps/web/public');mkdirSync(publicFolder,{recursive:true});writeFileSync(resolve(publicFolder,'testnet-deployment.json'),json(deployment));
  const report={mode:'PUBLIC_TESTNET_DEPLOYMENT',network:TESTNET,deployment,deployer:keys.deployer.address,compiler:artifacts.TestWIF.compiler,receipts:confirmed,balances:{deployerTestEth:formatEther(await p.getBalance(keys.deployer.address)),tokenSupply:String(await token.totalSupply()),escrowTokens:String(await token.balanceOf(deployment.escrow))},confirmationPolicy:'Two canonical L2 blocks, soft confirmation only. Not Ethereum finality.',hackathonMockTokenEligibility:'UNCONFIRMED'};
  writeFileSync(resolve(import.meta.dirname,'../../../docs/evidence/testnet-deployment.json'),json(report)+'\n');console.log(json({status:'DEPLOYED_AND_READ_BACK',deployment,receipts:confirmed.map(r=>r.hash)}));
 }
}catch(error){console.error((error as {code?:string}).code?'Testnet operation failed. Inspect the public transaction journal before retrying.':(error as Error).message);process.exitCode=1;}finally{p.destroy();}
