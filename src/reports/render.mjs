function shortAddress(address) {
  if (!address || address.length < 12) return address ?? 'unknown';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function renderText(profile) {
  const d = profile.score.dimensions;
  const m = profile.score.metrics;
  return [
    'VIPR / WALLET RECEIPT',
    shortAddress(profile.wallet.address),
    profile.wallet.synthetic ? 'SYNTHETIC DEMO' : 'LIVE OBSERVATION',
    '',
    `RANK          ${profile.score.rank} / 1000`,
    `ARCHETYPE     ${profile.archetype}`,
    `EVIDENCE      ${profile.score.evidenceLabel}`,
    '',
    `TIMING        ${d.timing}`,
    `EXITS         ${d.exits}`,
    `DISCIPLINE    ${d.discipline}`,
    `SURVIVAL      ${d.survival}`,
    `REPEAT        ${d.repeatability}`,
    `EVIDENCE      ${d.evidence}`,
    '',
    `MEDIAN HOLD   ${Math.round(m.medianHoldMinutes)}m`,
    `ROUNDTRIPS    ${m.roundtripRate.toFixed(0)}%`,
    `EARLY HITS    ${m.earlyHitRate.toFixed(0)}%`,
    `MAX CONC.     ${m.maxConcentrationPct.toFixed(0)}%`,
    '',
    `BADGES        ${profile.badges.length ? profile.badges.join(' · ') : 'none'}`
  ].join('\n');
}

export function renderJson(profile) {
  return JSON.stringify(profile, null, 2);
}
