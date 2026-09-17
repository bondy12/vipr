import { clampScore } from '../types.mjs';

export const WEIGHTS = Object.freeze({
  timing: 0.20,
  exits: 0.18,
  discipline: 0.17,
  survival: 0.13,
  repeatability: 0.17,
  evidence: 0.15
});

function pct(numerator, denominator, fallback = 0) {
  return denominator > 0 ? (numerator / denominator) * 100 : fallback;
}

function average(values) {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((a, b) => a + b, 0) / clean.length : 0;
}

export function deriveMetrics(wallet) {
  const positions = Array.isArray(wallet.positions) ? wallet.positions : [];
  const complete = positions.filter((p) => p.entry && p.exit);
  const early = complete.filter((p) => p.entry.marketAgeMinutes <= 30);
  const fullExits = complete.filter((p) => p.exit.closedFraction >= 0.95);
  const roundtrips = complete.filter((p) =>
    Number.isFinite(p.maxMultiple) &&
    Number.isFinite(p.exit.multiple) &&
    p.maxMultiple >= 2 &&
    p.exit.multiple <= 1.2
  );
  const failed = complete.filter((p) => p.market?.failed === true);
  const recovered = failed.filter((p) => p.exit.multiple >= 0.75);
  const winners = complete.filter((p) => p.exit.multiple > 1);
  const losers = complete.filter((p) => p.exit.multiple <= 1);

  return {
    positionCount: positions.length,
    completeCount: complete.length,
    earlyHitRate: pct(early.length, complete.length),
    fullExitRate: pct(fullExits.length, complete.length),
    roundtripRate: pct(roundtrips.length, complete.length),
    survivalRate: pct(recovered.length, failed.length, failed.length ? 0 : 50),
    medianHoldMinutes: median(complete.map((p) => p.exit.holdMinutes).filter(Number.isFinite)),
    winnerHoldMinutes: average(winners.map((p) => p.exit.holdMinutes)),
    loserHoldMinutes: average(losers.map((p) => p.exit.holdMinutes)),
    maxConcentrationPct: Math.max(0, ...positions.map((p) => Number(p.capitalSharePct) || 0)),
    provenanceCoverage: pct(positions.filter((p) => p.provenance === 'verified').length, positions.length),
    independentSamples: complete.filter((p) => p.provenance === 'verified').length
  };
}

export function scoreWallet(wallet) {
  const metrics = deriveMetrics(wallet);
  const sampleFactor = Math.min(1, metrics.independentSamples / 10);

  const timing = clampScore(metrics.earlyHitRate * 0.9 + sampleFactor * 10);
  const exitPreservation = 100 - metrics.roundtripRate;
  const exits = clampScore(exitPreservation * 0.65 + metrics.fullExitRate * 0.35);
  const concentrationPenalty = Math.max(0, metrics.maxConcentrationPct - 25) * 1.5;
  const discipline = clampScore(100 - metrics.roundtripRate * 0.7 - concentrationPenalty);
  const survival = clampScore(metrics.survivalRate);
  const repeatability = clampScore(sampleFactor * 100);
  const evidence = clampScore(metrics.provenanceCoverage * 0.75 + sampleFactor * 25);

  const dimensions = { timing, exits, discipline, survival, repeatability, evidence };
  const raw = Object.entries(WEIGHTS).reduce(
    (sum, [key, weight]) => sum + dimensions[key] * weight,
    0
  );
  const evidenceGate = evidence < 40 ? 0.68 : evidence < 65 ? 0.84 : 1;
  const rank = Math.round(raw * 10 * evidenceGate);

  return {
    rank,
    evidenceLabel: evidence >= 80 ? 'high' : evidence >= 60 ? 'medium' : 'low',
    dimensions,
    metrics
  };
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
