import { inspectWallet } from '../src/web/live-inspect.mjs';

export default async function handler(req, res) {
  try {
    const wallet = Array.isArray(req.query?.wallet) ? req.query.wallet[0] : req.query?.wallet;
    const result = await inspectWallet(wallet, { rpcUrl: process.env.VIPR_RPC_URL });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error?.message ?? String(error) });
  }
}
