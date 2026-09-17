import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDemoWallet } from '../demo/load.mjs';
import { scoreWallet } from '../core/score.mjs';
import { classifyArchetype, assignBadges } from '../core/archetypes.mjs';
import { chainHealth, inspectWallet } from './live-inspect.mjs';

const root = fileURLToPath(new URL('../../web/public/', import.meta.url));
const assetRoot = fileURLToPath(new URL('../../assets/', import.meta.url));
const port = Number(process.env.PORT || 4317);
const host = process.env.HOST || '127.0.0.1';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8'
};

function demoProfile(wallet) {
  const score = scoreWallet(wallet);
  return {
    wallet: { address: wallet.address, label: wallet.label, synthetic: true },
    score,
    archetype: classifyArchetype(score),
    badges: assignBadges(score),
    observedAt: new Date().toISOString()
  };
}

function sendJson(res, status, body) {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(raw)
  });
  res.end(raw);
}

async function serveFile(res, base, path) {
  const safe = normalize(path).replace(/^([.][.][/\\])+/, '');
  const full = join(base, safe);
  try {
    const body = await readFile(full);
    res.writeHead(200, {
      'content-type': mime[extname(full)] || 'application/octet-stream',
      'cache-control': extname(full) === '.html' ? 'no-cache' : 'public, max-age=3600'
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

export const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/demo') {
    return sendJson(res, 200, demoProfile(await loadDemoWallet()));
  }
  if (url.pathname === '/api/health') {
    try { return sendJson(res, 200, await chainHealth({ rpcUrl: process.env.VIPR_RPC_URL })); }
    catch (error) { return sendJson(res, 503, { ok: false, error: error.message }); }
  }
  if (url.pathname === '/api/inspect') {
    try {
      const wallet = url.searchParams.get('wallet');
      const result = await inspectWallet(wallet, { rpcUrl: process.env.VIPR_RPC_URL });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }
  if (url.pathname.startsWith('/assets/')) {
    return serveFile(res, assetRoot, url.pathname.slice('/assets/'.length));
  }
  if (url.pathname === '/terminal' || url.pathname === '/terminal/') {
    return serveFile(res, root, 'terminal.html');
  }
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return serveFile(res, root, 'index.html');
  }
  return serveFile(res, root, url.pathname.slice(1));
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(port, host, () => {
    console.log(`VIPR desk listening on http://${host}:${port}`);
  });
}
