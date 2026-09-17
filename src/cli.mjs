import process from 'node:process';
import { loadDemoWallet } from './demo/load.mjs';
import { scoreWallet, WEIGHTS } from './core/score.mjs';
import { assignBadges, classifyArchetype } from './core/archetypes.mjs';
import { providerPlan } from './providers/robinhood.mjs';
import { renderJson, renderText } from './reports/render.mjs';

function buildProfile(wallet) {
  const score = scoreWallet(wallet);
  return {
    wallet: {
      address: wallet.address,
      label: wallet.label,
      synthetic: wallet.synthetic === true
    },
    score,
    archetype: classifyArchetype(score),
    badges: assignBadges(score)
  };
}

export async function run(args) {
  const [command = 'help', subject, ...rest] = args;
  if (command === 'demo') {
    console.log(renderText(buildProfile(await loadDemoWallet())));
    return;
  }
  if (command === 'profile') {
    if (subject !== 'demo') {
      throw new Error('Live wallet profiling is not implemented yet. Use: vipr profile demo');
    }
    const profile = buildProfile(await loadDemoWallet());
    console.log(rest.includes('--json') ? renderJson(profile) : renderText(profile));
    return;
  }
  if (command === 'rules') {
    console.log('VIPR score dimensions');
    for (const [name, weight] of Object.entries(WEIGHTS)) {
      console.log(`${name.padEnd(15)} ${(weight * 100).toFixed(0)}%`);
    }
    console.log('\nEvidence gate: <40 => 0.68x, 40–64 => 0.84x, 65+ => 1.00x');
    return;
  }
  if (command === 'doctor') {
    const plan = providerPlan();
    console.log(`node           ${process.version}`);
    console.log(`mode           ${plan.mode}`);
    console.log(`chain          ${plan.chainId}`);
    console.log(`rpc reads      ${plan.reads.join(', ')}`);
    console.log(`write methods  ${plan.writes.length}`);
    return;
  }
  console.log('VIPR — Every wallet leaves tracks.\n');
  console.log('Commands:');
  console.log('  vipr demo');
  console.log('  vipr profile demo [--json]');
  console.log('  vipr rules');
  console.log('  vipr doctor');
}
