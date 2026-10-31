import Fastify from 'fastify';
import { RULES, MAP } from '@last-signal/sim';
const app = Fastify({ logger: true });
app.get('/health', async () => ({ status: 'ok', service: 'LAST SIGNAL', mode: 'LOCAL_PRACTICE', multiplayer: false, rules: RULES.version, map: MAP.version }));
await app.listen({ host: process.env.HOST ?? '127.0.0.1', port: Number(process.env.PORT ?? 3001) });
