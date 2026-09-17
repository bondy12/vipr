# Contributing

Keep changes small, auditable and evidence-first.

1. Fork / branch from `main`.
2. Add or update deterministic tests.
3. Run `npm run check`.
4. Document new metrics and provider assumptions.
5. Open a PR with the exact behavior change and its evidence boundary.

Provider additions must fail soft, preserve unknown values as unknown, and must not add signing or transaction submission.
