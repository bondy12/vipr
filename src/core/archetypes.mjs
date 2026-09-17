export function classifyArchetype(score) {
  const { metrics, dimensions } = score;
  if (score.evidenceLabel === 'low' || metrics.completeCount < 3) return 'UNKNOWN';
  if (metrics.roundtripRate >= 40) return 'ROUNDTRIPPER';
  if (dimensions.timing >= 82 && metrics.medianHoldMinutes <= 20) return 'SNIPER';
  if (dimensions.timing >= 78 && metrics.earlyHitRate >= 60) return 'FIRST WAVE';
  if (
    metrics.winnerHoldMinutes > metrics.loserHoldMinutes * 1.4 &&
    dimensions.exits >= 65
  ) return 'DIAMOND SCALES';
  if (dimensions.timing < 35) return 'LATE VENOM';
  return 'SCAVENGER';
}

export function assignBadges(score) {
  const badges = [];
  const { metrics, dimensions } = score;
  if (dimensions.timing >= 75 && metrics.completeCount >= 5) badges.push('EARLY BLOOD');
  if (
    metrics.winnerHoldMinutes > metrics.loserHoldMinutes * 1.4 &&
    dimensions.exits >= 65
  ) badges.push('DIAMOND SCALES');
  if (metrics.survivalRate >= 60 && metrics.completeCount >= 5) badges.push('RUG SURVIVOR');
  if (dimensions.evidence >= 90) badges.push('CLEAN RECEIPTS');
  if (metrics.roundtripRate >= 35) badges.push('ROUNDTRIPPER');
  if (metrics.maxConcentrationPct >= 55) badges.push('ONE BAG ENJOYER');
  return badges;
}
