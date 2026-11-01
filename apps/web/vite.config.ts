import {defineConfig} from 'vite';
import {resolve} from 'node:path';
const proxy={'/api':{target:'http://127.0.0.1:3001',ws:true,rewrite:(path:string)=>path.replace(/^\/api/,'')}};
export default defineConfig({server:{proxy,fs:{deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/.runtime/**','**/*.dpapi']}},preview:{proxy},build:{manifest:true,rolldownOptions:{output:{codeSplitting:{groups:[{name:"renderer",test:/node_modules[\\/]three[\\/]/,maxSize:260000}]}},input:{armory:resolve(import.meta.dirname,"armory.html"),main:resolve(import.meta.dirname,'index.html'),private:resolve(import.meta.dirname,'private.html'),testnet:resolve(import.meta.dirname,'testnet.html')}}}});
