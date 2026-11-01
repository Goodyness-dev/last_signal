import {isAbsolute,resolve} from 'node:path';
export function operation(env:NodeJS.ProcessEnv=process.env){
 const publicOperation=env.PUBLIC_OPERATION==='true';
 const origins=(env.ALLOWED_ORIGINS??'http://127.0.0.1:5174,http://localhost:5174').split(',').map(s=>s.trim()).filter(Boolean);
 for(const origin of origins){const u=new URL(origin);if(u.origin!==origin||!['http:','https:'].includes(u.protocol))throw Error('Allowed origins must be exact HTTP origins');}
 const database=env.DATABASE_PATH??resolve(import.meta.dirname,'../../../.runtime/rooms.sqlite');
 if(publicOperation){
  if(!env.ALLOWED_ORIGINS||!origins.length||origins.some(s=>!s.startsWith('https://')))throw Error('Public operation requires explicit HTTPS allowed origins');
  if(!env.DATABASE_PATH||!isAbsolute(database)||env.PERSISTENT_STORAGE_CONFIRMED!=='true')throw Error('Public operation requires an absolute database path on confirmed persistent storage');
  if(env.TLS_TERMINATED!=='true')throw Error('Public operation requires TLS termination at the reverse proxy');
 }
 const revision=env.BUILD_REVISION??'development';
 if(!/^[a-zA-Z0-9._-]{1,64}$/.test(revision))throw Error('Invalid build revision');
 return {publicOperation,origins:new Set(origins),database,revision};
}
