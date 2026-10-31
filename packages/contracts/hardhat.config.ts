import {defineConfig} from 'hardhat/config';
import {Wallet} from 'ethers';
// Fresh disposable accounts on every local node startup. Never exported or committed.
export default defineConfig({paths:{sources:'./src'},networks:{local:{type:'edr-simulated',chainType:'l1',chainId:31337,accounts:{mnemonic:Wallet.createRandom().mnemonic!.phrase,count:8,accountsBalance:1000n*10n**18n}}}});
