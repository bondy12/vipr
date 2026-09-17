import { loadDemoWallet } from '../src/demo/load.mjs';
import { scoreWallet } from '../src/core/score.mjs';
import { classifyArchetype, assignBadges } from '../src/core/archetypes.mjs';

export default async function handler(req, res) {
  try {
    const wallet = await loadDemoWallet();
    const score = scoreWallet(wallet);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      wallet: { address: wallet.address, label: wallet.label, synthetic: true },
      score,
      archetype: classifyArchetype(score),
      badges: assignBadges(score),
      observedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error?.message ?? String(error) });
  }
}
