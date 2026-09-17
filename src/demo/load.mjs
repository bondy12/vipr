import { readFile } from 'node:fs/promises';

const fixtureUrl = new URL('../../data/demo-wallet.json', import.meta.url);

export async function loadDemoWallet() {
  const raw = await readFile(fixtureUrl, 'utf8');
  const data = JSON.parse(raw);
  if (data.synthetic !== true) throw new Error('Demo fixture must be explicitly synthetic');
  return data;
}
