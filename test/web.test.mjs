import test from 'node:test';
import assert from 'node:assert/strict';
import { server } from '../src/web/server.mjs';
import { isAddress } from '../src/web/live-inspect.mjs';

async function withServer(fn) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try { await fn(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test('wallet address validation is strict', () => {
  assert.equal(isAddress('0x6900000000000000000000000000000000000420'), true);
  assert.equal(isAddress('0x1234'), false);
});

test('browser desk serves the demo API and terminal', async () => {
  await withServer(async (base) => {
    const demo = await fetch(`${base}/api/demo`).then((r) => r.json());
    assert.equal(demo.score.rank, 982);
    assert.equal(demo.wallet.synthetic, true);
    const terminal = await fetch(`${base}/terminal`).then((r) => r.text());
    assert.match(terminal, /VIPR Terminal/);
    assert.match(terminal, /BEHAVIOR TAPE/);
  });
});
