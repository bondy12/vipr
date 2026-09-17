import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDemoWallet } from '../src/demo/load.mjs';
import { scoreWallet } from '../src/core/score.mjs';
import { assignBadges, classifyArchetype } from '../src/core/archetypes.mjs';

const wallet = await loadDemoWallet();

test('demo score stays inside the public 0–1000 range', () => {
  const score = scoreWallet(wallet);
  assert.ok(score.rank >= 0 && score.rank <= 1000);
});

test('demo has high evidence and an early archetype', () => {
  const score = scoreWallet(wallet);
  assert.equal(score.evidenceLabel, 'high');
  assert.ok(['FIRST WAVE', 'SNIPER'].includes(classifyArchetype(score)));
});

test('evidence quality falls when provenance disappears', () => {
  const low = structuredClone(wallet);
  low.positions = low.positions.map((p) => ({ ...p, provenance: 'unknown' }));
  const score = scoreWallet(low);
  assert.equal(score.evidenceLabel, 'low');
  assert.ok(score.rank < scoreWallet(wallet).rank);
});

test('demo earns evidence badge', () => {
  const score = scoreWallet(wallet);
  assert.ok(assignBadges(score).includes('CLEAN RECEIPTS'));
});
