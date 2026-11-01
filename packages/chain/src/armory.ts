import {id} from 'ethers';
import {RULES,MAP} from '@last-signal/sim';
export const salvageRulesHash=id(JSON.stringify({rules:RULES,map:MAP.version,mode:'WALLET_SALVAGE_V1',maxLoot:3,starter:'OWNED_GUN',currency:'MOCK_TWIF'}));
export const lootTypes={Claim:[{name:'dropId',type:'bytes32'},{name:'runId',type:'bytes32'},{name:'recipient',type:'address'},{name:'kind',type:'uint8'},{name:'rulesHash',type:'bytes32'},{name:'expiry',type:'uint256'}]};
export type LootClaim={dropId:string;runId:string;recipient:string;kind:number;rulesHash:string;expiry:string};
export type ArmoryDeployment={chainId:number;armory:string;token:string;gameplaySigner:string;rulesHash:string;codeHash:string;deploymentBlock:number;transactionHash:string};
