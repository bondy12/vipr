import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = new URL('../src/', import.meta.url);
const banned = [
  'eth_sendRawTransaction',
  'eth_sendTransaction',
  'signTransaction',
  'signTypedData',
  'PRIVATE_KEY',
  'MNEMONIC',
  'SEED_PHRASE'
];

async function files(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await files(path));
    else out.push(path);
  }
  return out;
}

const rootPath = ROOT.pathname;
const violations = [];
for (const file of await files(rootPath)) {
  const content = await readFile(file, 'utf8');
  for (const token of banned) {
    if (content.includes(token)) violations.push(`${relative(rootPath, file)}: ${token}`);
  }
}

if (violations.length) {
  console.error('Read-only guard failed:');
  for (const v of violations) console.error(`- ${v}`);
  process.exit(1);
}
console.log(`Read-only guard passed (${banned.length} banned primitives absent from src/)`);
