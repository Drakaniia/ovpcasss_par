/**
 * `beforeDevCommand` for the desktop shell (tauri.conf.json).
 *
 * The shell needs web on :5173 and the API on :8787, but it does not have to own
 * them. `pnpm dev` runs all three packages at once, so this hook probes first and
 * reuses whatever is already listening — two `wrangler dev --remote` sessions on
 * one Worker race its asset upload and preview token.
 *
 * Under `turbo run dev` the three tasks start together and the shell's cargo build
 * lands between Vite binding :5173 and Wrangler binding :8787, so seeing one half
 * up means a launcher is mid-flight, not that it is finished: wait for the pair
 * before claiming a session of our own. Tauri waits for `devUrl` itself, so a
 * hook that exits as soon as both answer is correct.
 */
import { spawn, spawnSync } from 'node:child_process';
import { connect } from 'node:net';

const WEB_PORT = 5173;
const API_PORT = 8787;
const PROBE_TIMEOUT_MS = 400;
/** Time a half that another launcher is starting gets to bind before we start our own. */
const PEER_WAIT_MS = 60_000;
const PEER_POLL_MS = 500;

function canConnect(port, host) {
  return new Promise((resolve) => {
    const socket = connect({ port, host });
    const settle = (open) => {
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(PROBE_TIMEOUT_MS, () => settle(false));
    socket.once('connect', () => settle(true));
    socket.once('error', () => settle(false));
  });
}

/** `localhost` resolves to one family only, while Vite and Wrangler may bind the other. */
async function listening(port) {
  if (await canConnect(port, '127.0.0.1')) return true;
  return canConnect(port, '::1');
}

async function probe() {
  return Promise.all([listening(WEB_PORT), listening(API_PORT)]);
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let [webUp, apiUp] = await probe();

function reused(message) {
  console.log(`[dev] ${message}`);
  process.exit(0);
}

if (webUp && apiUp) {
  reused('reusing the web and API servers already on :5173 and :8787');
}

if (webUp || apiUp) {
  const up = webUp ? `:${WEB_PORT}` : `:${API_PORT}`;
  console.log(
    `[dev] ${up} is up, waiting up to ${PEER_WAIT_MS / 1000} s for the other half before starting one`,
  );

  const deadline = Date.now() + PEER_WAIT_MS;
  while (!(webUp && apiUp) && Date.now() < deadline) {
    await delay(PEER_POLL_MS);
    [webUp, apiUp] = await probe();
  }

  if (webUp && apiUp) {
    reused('reusing the web and API servers that came up on :5173 and :8787');
  }
}

const filters = [];
if (!webUp) filters.push('--filter', '@par/web');
if (!apiUp) filters.push('--filter', '@par/api');

const child = spawn(['pnpm', ...filters, 'dev'].join(' '), { stdio: 'inherit', shell: true });

let stopping = false;

function stop() {
  if (stopping || child.exitCode !== null || child.signalCode !== null) return;
  stopping = true;

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    stop();
    process.exit(0);
  });
}

process.on('exit', stop);

child.on('exit', (code) => process.exit(code ?? 0));
