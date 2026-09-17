export const SCORE_DIMENSIONS = Object.freeze([
  'timing',
  'exits',
  'discipline',
  'survival',
  'repeatability',
  'evidence'
]);

export function clampScore(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}
