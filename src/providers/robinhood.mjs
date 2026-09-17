export const ROBINHOOD_CHAIN_ID = 4663;

export function providerPlan() {
  return {
    mode: 'read-only',
    chainId: ROBINHOOD_CHAIN_ID,
    reads: [
      'eth_chainId',
      'eth_blockNumber',
      'eth_getLogs',
      'eth_getTransactionReceipt',
      'eth_call'
    ],
    writes: []
  };
}

export async function probeRpc(url, fetchImpl = fetch) {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_chainId',
    params: []
  };
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`RPC returned HTTP ${response.status}`);
  const json = await response.json();
  const chainId = Number.parseInt(json.result, 16);
  return { ok: chainId === ROBINHOOD_CHAIN_ID, chainId };
}
