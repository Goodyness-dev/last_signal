// Use the invoking Node runtime, including when the system Node installation is unavailable.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const runtime = path.join(root, '.runtime');
fs.mkdirSync(runtime, { recursive: true });
const stdout = fs.openSync(path.join(runtime, 'web.log'), 'a');
const stderr = fs.openSync(path.join(runtime, 'web-error.log'), 'a');
const child = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5174', '--strictPort'], {
  cwd: path.join(root, 'apps/web'), detached: true, windowsHide: true,
  stdio: ['ignore', stdout, stderr],
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.unref();
fs.writeFileSync(path.join(runtime, 'web.pid'), String(child.pid));
fs.closeSync(stdout); fs.closeSync(stderr);
console.log('Preview requested at http://127.0.0.1:5174/ with PID ' + child.pid + '. Check .runtime/web.log for readiness.');
