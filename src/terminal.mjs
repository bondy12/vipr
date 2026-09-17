import readline from 'node:readline';
import process from 'node:process';
import { loadDemoWallet } from './demo/load.mjs';
import { scoreWallet } from './core/score.mjs';
import { classifyArchetype, assignBadges } from './core/archetypes.mjs';

const ESC='\x1b[';
const clear=()=>process.stdout.write(`${ESC}2J${ESC}H`);
const hide=()=>process.stdout.write(`${ESC}?25l`);
const show=()=>process.stdout.write(`${ESC}?25h`);
const green=(s)=>`\x1b[38;2;183;255;25m${s}\x1b[0m`;
const dim=(s)=>`\x1b[38;2;110;130;108m${s}\x1b[0m`;
const white=(s)=>`\x1b[38;2;235;242;233m${s}\x1b[0m`;
const line='─'.repeat(72);

function bar(value, width=16) {
  const n=Math.round((value/100)*width);
  return green('█'.repeat(n))+dim('░'.repeat(width-n));
}

export async function runTerminal() {
  const wallet=await loadDemoWallet();
  const score=scoreWallet(wallet);
  const archetype=classifyArchetype(score);
  const badges=assignBadges(score);
  let view=0;

  function draw() {
    clear();
    const d=score.dimensions, m=score.metrics;
    console.log(green(' VIPR ')+dim(' / wallet reputation desk')+' '.repeat(18)+dim('ROBINHOOD CHAIN · READ ONLY'));
    console.log(dim(line));
    console.log(white(' 0x6900…0420')+'   '+green('SYNTHETIC DEMO')+'   '+dim('evidence: HIGH'));
    console.log('');
    if (view===0) {
      console.log(green(`  ${String(score.rank).padEnd(4)} `)+white('VIPR RANK')+'   '+green(archetype));
      console.log('');
      for (const [label,value] of [['TIMING',d.timing],['EXITS',d.exits],['DISCIPLINE',d.discipline],['SURVIVAL',d.survival],['REPEAT',d.repeatability],['EVIDENCE',d.evidence]]) {
        console.log(`  ${label.padEnd(12)} ${bar(value)}  ${String(value).padStart(3)}`);
      }
      console.log('');
      console.log(dim('  BEHAVIOR RECEIPT'));
      console.log(`  MEDIAN HOLD   ${white(Math.round(m.medianHoldMinutes)+'m')}     EARLY HITS   ${white(m.earlyHitRate.toFixed(0)+'%')}`);
      console.log(`  ROUNDTRIPS    ${white(m.roundtripRate.toFixed(0)+'%')}      MAX CONC.    ${white(m.maxConcentrationPct.toFixed(0)+'%')}`);
      console.log('');
      console.log(dim('  BADGES'));
      console.log('  '+badges.map(green).join(dim('  ·  ')));
    } else {
      console.log(green('  EVIDENCE LEDGER'));
      console.log('');
      const rows=[
        ['transfer provenance','verified','source rows are labelled'],
        ['complete positions','10 / 10','demo fixture only'],
        ['market age','present','entry timing measurable'],
        ['exit observations','present','realized behavior measurable'],
        ['live wallet claim','NO','synthetic walkthrough']
      ];
      for (const [a,b,c] of rows) console.log(`  ${a.padEnd(22)} ${green(b.padEnd(12))} ${dim(c)}`);
      console.log('');
      console.log(dim('  VIPR lowers evidence when required facts are unknown.'));
      console.log(dim('  Missing data never becomes a fake zero.'));
    }
    console.log('');
    console.log(dim(line));
    console.log(dim('  [tab] profile / evidence     [r] redraw     [q] quit'));
  }

  if (!process.stdin.isTTY) { draw(); return; }
  hide(); draw();
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  const cleanup=()=>{ try{process.stdin.setRawMode(false);}catch{} show(); console.log(''); };
  process.stdin.on('keypress',(_,key)=>{
    if (key?.name==='q' || (key?.ctrl && key?.name==='c')) { cleanup(); process.exit(0); }
    if (key?.name==='tab') { view=(view+1)%2; draw(); }
    if (key?.name==='r') draw();
  });
  process.on('exit', show);
}
