const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const DEFAULT_RPC = 'https://rpc.mainnet.chain.robinhood.com';

export const DEFAULT_SCAN_BLOCKS = 12000;

export function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || ''));
}

function topicAddress(address) {
  return `0x${'0'.repeat(24)}${address.slice(2).toLowerCase()}`;
}

async function rpc(url, method, params = [], fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(body.error.message || 'RPC error');
  return body.result;
}

export async function chainHealth({ rpcUrl = DEFAULT_RPC, fetchImpl = fetch } = {}) {
  const [chainHex, blockHex] = await Promise.all([
    rpc(rpcUrl, 'eth_chainId', [], fetchImpl),
    rpc(rpcUrl, 'eth_blockNumber', [], fetchImpl)
  ]);
  const chainId = Number.parseInt(chainHex, 16);
  const blockNumber = Number.parseInt(blockHex, 16);
  return {
    ok: chainId === 4663,
    chainId,
    blockNumber,
    rpc: rpcUrl,
    observedAt: new Date().toISOString()
  };
}

export async function inspectWallet(address, {
  rpcUrl = DEFAULT_RPC,
  scanBlocks = DEFAULT_SCAN_BLOCKS,
  fetchImpl = fetch
} = {}) {
  if (!isAddress(address)) throw new Error('Enter a valid EVM wallet address.');
  const normalized = address.toLowerCase();
  const latestHex = await rpc(rpcUrl, 'eth_blockNumber', [], fetchImpl);
  const latest = Number.parseInt(latestHex, 16);
  const from = Math.max(0, latest - scanBlocks);
  const fromHex = `0x${from.toString(16)}`;
  const toHex = `0x${latest.toString(16)}`;
  const walletTopic = topicAddress(normalized);

  const [balanceHex, incoming, outgoing] = await Promise.all([
    rpc(rpcUrl, 'eth_getBalance', [normalized, 'latest'], fetchImpl),
    rpc(rpcUrl, 'eth_getLogs', [{
      fromBlock: fromHex,
      toBlock: toHex,
      topics: [TRANSFER_TOPIC, null, walletTopic]
    }], fetchImpl).catch(() => []),
    rpc(rpcUrl, 'eth_getLogs', [{
      fromBlock: fromHex,
      toBlock: toHex,
      topics: [TRANSFER_TOPIC, walletTopic]
    }], fetchImpl).catch(() => [])
  ]);

  const all = [...incoming.map((x) => ({ ...x, side: 'IN' })), ...outgoing.map((x) => ({ ...x, side: 'OUT' }))]
    .sort((a, b) => Number.parseInt(b.blockNumber, 16) - Number.parseInt(a.blockNumber, 16));
  const tokenCounts = new Map();
  for (const log of all) {
    const key = log.address.toLowerCase();
    const row = tokenCounts.get(key) || { token: key, in: 0, out: 0 };
    if (log.side === 'IN') row.in += 1; else row.out += 1;
    tokenCounts.set(key, row);
  }

  return {
    mode: 'live-tape',
    wallet: normalized,
    chainId: 4663,
    latestBlock: latest,
    scannedFromBlock: from,
    scannedBlocks: latest - from,
    nativeBalanceEth: Number(BigInt(balanceHex)) / 1e18,
    transferEvents: all.length,
    incomingTransfers: incoming.length,
    outgoingTransfers: outgoing.length,
    distinctTokens: tokenCounts.size,
    topTokens: [...tokenCounts.values()]
      .sort((a, b) => (b.in + b.out) - (a.in + a.out))
      .slice(0, 8),
    recent: all.slice(0, 12).map((log) => ({
      side: log.side,
      token: log.address.toLowerCase(),
      block: Number.parseInt(log.blockNumber, 16),
      tx: log.transactionHash
    })),
    scoreStatus: 'not-scored',
    scoreReason: 'A short public-RPC transfer window is useful evidence, but it is not enough to reconstruct entry cost, exits, market age, peak value or swap provenance honestly.',
    evidence: {
      transferWindow: true,
      swapProvenance: false,
      completePositionBook: false,
      marketBirth: false,
      exitCostBasis: false
    },
    observedAt: new Date().toISOString()
  };
}
