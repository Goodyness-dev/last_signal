import {loadKeys} from './testnet-keys.ts';
import {readdirSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const keys=Object.values(loadKeys()).map(w=>w.privateKey.slice(2).toLowerCase()),folder=resolve(import.meta.dirname,'../../../apps/web/dist');
function check(dir:string){for(const item of readdirSync(dir,{withFileTypes:true})){const p=resolve(dir,item.name);if(item.isDirectory())check(p);else{const text=readFileSync(p).toString('utf8').toLowerCase();if(keys.some(k=>text.includes(k)))throw Error('Dedicated secret detected in browser output');}}}check(folder);console.log('Dedicated testnet keys are absent from the browser build.');
