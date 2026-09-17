# Architecture

VIPR separates observations from interpretation so a provider outage or attribution bug cannot silently become a reputation claim.

```text
provider adapters -> normalized observations -> wallet tape -> metrics -> evidence gate -> dimensions -> archetype/badges -> reports
```

## Boundaries

### Providers
Read public chain/indexer data and emit normalized observations. Providers do not calculate a VIPR score.

### Core
Pure deterministic functions. Core modules accept already-normalized wallet history and produce metrics, dimensions and classifications.

### Reports
Render the same profile as text or JSON. Presentation does not alter scoring.

## Read-only rule

The intended live adapter may use `eth_chainId`, `eth_blockNumber`, `eth_getLogs`, `eth_getTransactionReceipt` and `eth_call`. Transaction-writing and signing primitives are outside this repository's product boundary.
