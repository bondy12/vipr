# Architecture

VIPR separates observations from interpretation so a provider outage or attribution bug cannot silently become a reputation claim.

```text
public RPC / indexers
        ↓
provider adapters ──────→ live evidence tape
        ↓
normalized observations
        ↓
wallet tape → positions → metrics → evidence gate → dimensions → archetype/badges
                                                        ↓
                                      CLI / browser / JSON receipts
```

## Browser desk

`src/web/server.mjs` uses Node's built-in HTTP server and serves `web/public/`. No runtime web framework is required.

Endpoints:

- `GET /api/demo` — deterministic full profile from the bundled fixture;
- `GET /api/health` — read-only Robinhood Chain ID / latest block probe;
- `GET /api/inspect?wallet=0x…` — recent ERC-20 transfer tape, native balance and evidence availability.

The live inspect endpoint intentionally returns `scoreStatus: not-scored`. A recent transfer window does not prove entry cost, market age, peak value, complete exits or swap provenance.

## Providers

Read public chain/indexer data and emit normalized observations. Providers do not calculate a VIPR score.

## Core

Pure deterministic functions. Core modules accept already-normalized wallet history and produce metrics, dimensions and classifications.

## Reports

Render the same profile as text or JSON. Presentation does not alter scoring.

## Read-only rule

The current live adapter uses only read methods such as `eth_chainId`, `eth_blockNumber`, `eth_getBalance` and `eth_getLogs`. Transaction-writing and signing primitives are outside this repository's product boundary.
