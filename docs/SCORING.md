# Scoring

VIPR exposes a 0–100 score for each dimension and a 0–1000 public rank. The public rank is a weighted summary with an evidence gate; it should never replace the dimensions that produced it.

| Dimension | Weight | Meaning |
| --- | ---: | --- |
| Timing | 20% | repeated entry timing relative to observable market age |
| Exits | 18% | preservation of realized gains and completed exits |
| Discipline | 17% | concentration and round-trip behavior |
| Survival | 13% | capital recovery across failed / illiquid observations |
| Repeatability | 17% | number of independent complete samples |
| Evidence | 15% | provenance coverage and sample completeness |

## Evidence gate

A weak evidence score reduces the final rank even if the behavior dimensions look strong.

- evidence `< 40`: `0.68x`
- evidence `40–64`: `0.84x`
- evidence `65+`: `1.00x`

Unknown is not zero. Missing market birth, ambiguous recipient attribution or an incomplete sell tape should reduce evidence rather than manufacture a negative behavior event.

## Archetypes

Archetypes compress recurring behavior into a label. They are not claims about identity, intent, insider status or legality.
