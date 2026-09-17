# Safety boundary

VIPR is an intelligence layer, not an executor.

The source tree intentionally excludes private-key handling, seed phrases, transaction signing, approvals and transaction submission. `npm run verify:readonly` checks for a small explicit set of prohibited primitives.

The guard is not a formal security proof. Reviewers should still inspect provider additions and dependency changes manually.

Do not commit API keys, private RPC credentials or wallet secrets. Use `.env` locally and keep `.env` ignored.
