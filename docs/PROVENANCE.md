# Provenance

A reputation system is only as good as its attribution.

Every normalized position should preserve enough source metadata to answer:

1. Which chain observation supports this row?
2. Was the wallet the economic actor, the recipient, or merely present in a transfer?
3. Is the tape complete enough to calculate an exit?
4. What block/time range was observed?
5. Which provider supplied token and market context?

The foundation fixture uses `provenance: verified` only because it is synthetic. A live adapter must earn that state from explicit rules and should quarantine ambiguous rows instead of guessing.
