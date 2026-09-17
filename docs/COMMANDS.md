# Commands

```bash
vipr terminal
vipr web
vipr demo
vipr profile demo
vipr profile demo --json
vipr rules
vipr doctor
```

## `vipr terminal`

Opens the interactive local terminal. `Tab` switches between the reputation profile and evidence ledger; `r` redraws and `q` exits. The bundled view is explicitly synthetic.

## `vipr web`

Starts the browser desk on `http://127.0.0.1:4317` by default. Set `PORT` or `HOST` to override.

The browser has two honest modes:

- **synthetic demo** — runs the complete scoring pipeline;
- **live wallet tape** — reads a short recent transfer window from Robinhood Chain's public RPC and withholds the reputation score until complete attribution, cost basis and market-age evidence are available.

`demo` and `profile demo` are fully offline and deterministic.
