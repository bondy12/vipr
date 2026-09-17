import { chainHealth } from '../src/web/live-inspect.mjs';

export default async function handler(req, res) {
  try {
    const health = await chainHealth({ rpcUrl: process.env.VIPR_RPC_URL });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({ ok: false, error: error?.message ?? String(error) });
  }
}
