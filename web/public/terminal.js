const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short = (a) => a ? `${a.slice(0,6)}…${a.slice(-4)}` : '—';
let current = null;

async function json(url) {
  const r=await fetch(url,{cache:'no-store'}); const body=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(body.error||`HTTP ${r.status}`); return body;
}

function tickClock(){ $('#terminal-clock').textContent=new Date().toISOString().slice(11,19)+' UTC'; }
setInterval(tickClock,1000); tickClock();

const syntheticTape = [
  ['BUY','$COIL','+04m','verified early entry'],['EXIT','$COIL','43m','3.90× realized'],['BUY','$BITE','+11m','verified early entry'],
  ['EXIT','$BITE','27m','2.10× realized'],['BUY','$SHED','+22m','verified early entry'],['EXIT','$SHED','19m','1.45× realized'],
  ['BUY','$MOLT','+08m','failure sample'],['EXIT','$MOLT','08m','0.91× recovered'],['BUY','$SCALE','+17m','verified early entry'],
  ['EXIT','$SCALE','51m','4.20× realized'],['BUY','$VENOM','+28m','verified early entry'],['EXIT','$VENOM','25m','1.90× realized']
];

function renderTape(rows, mode='SYNTHETIC') {
  $('#tape-mode').textContent=mode;
  $('#tape-stream').innerHTML=rows.map((r,i)=>`<div class="tape-row ${i===0?'active':''}"><span class="side">${esc(r[0])}</span><span class="token">${esc(r[1])}</span><span class="time">${esc(r[2])}</span><small>${esc(r[3])}</small></div>`).join('');
}

function bar(label,value){ return `<div class="term-score"><span>${esc(label)}</span><i><b style="width:${Math.max(0,Math.min(100,value))}%"></b></i><strong>${value}</strong></div>`; }

function renderDemo(p){
  current=p; const d=p.score.dimensions,m=p.score.metrics;
  $('#profile-evidence').textContent=`EVIDENCE ${p.score.evidenceLabel.toUpperCase()}`;
  $('#profile-content').innerHTML=`
    <div class="profile-top"><div class="profile-wallet"><code>${esc(short(p.wallet.address))}</code><small>SYNTHETIC WALKTHROUGH · NO LIVE CLAIM</small></div><div class="profile-rank"><strong>${p.score.rank}</strong><small>/1000 VIPR RANK</small></div></div>
    <div class="profile-archetype"><span>ARCHETYPE</span>${esc(p.archetype)}</div>
    ${bar('TIMING',d.timing)}${bar('EXITS',d.exits)}${bar('DISCIPLINE',d.discipline)}${bar('SURVIVAL',d.survival)}${bar('REPEAT',d.repeatability)}${bar('EVIDENCE',d.evidence)}
    <div class="term-metrics"><div><small>MEDIAN HOLD</small><b>${Math.round(m.medianHoldMinutes)}m</b></div><div><small>EARLY HITS</small><b>${m.earlyHitRate.toFixed(0)}%</b></div><div><small>ROUNDTRIPS</small><b>${m.roundtripRate.toFixed(0)}%</b></div><div><small>MAX CONC.</small><b>${m.maxConcentrationPct.toFixed(0)}%</b></div></div>
    <div class="term-badges">${p.badges.map((b)=>`<span>${esc(b)}</span>`).join('')}</div>`;
  $('#evidence-content').innerHTML=[
    ['PROVENANCE','VERIFIED','yes'],['COMPLETE POSITIONS','10 / 10','yes'],['MARKET AGE','PRESENT','yes'],['EXIT OBSERVATIONS','PRESENT','yes'],['LIVE WALLET CLAIM','NO','no'],['MODE','SYNTHETIC FIXTURE','no']
  ].map(([a,b,c])=>`<div class="ev-row"><span>${a}</span><b class="${c}">${b}</b></div>`).join('');
  renderTape(syntheticTape,'SYNTHETIC');
  $('#pulse-label').textContent='DEMO';
  $('#pulse-lines').innerHTML=`<div><span class="good">[OK]</span> score core returned <b>${p.score.rank}/1000</b></div><div><span class="good">[OK]</span> evidence gate <b>${p.score.evidenceLabel}</b></div><div><span class="good">[OK]</span> archetype <b>${esc(p.archetype)}</b></div><div>[SAFE] no signer · no execution · no wallet connect</div><div>[NOTE] unknown values never become zero</div>`;
}

function renderLive(p){
  current=p; $('#profile-evidence').textContent='LIVE TAPE · UNSCORED';
  $('#profile-content').innerHTML=`<div class="profile-top"><div class="profile-wallet"><code>${esc(short(p.wallet))}</code><small>PUBLIC RPC · BLOCK ${p.latestBlock.toLocaleString()}</small></div><div class="profile-rank"><strong>${p.transferEvents}</strong><small>TRANSFER EVENTS</small></div></div><div class="profile-archetype"><span>STATUS</span>INSUFFICIENT FOR REPUTATION SCORE</div><div class="live-summary">Short read-only evidence window<strong>${p.distinctTokens} TOKENS</strong>${p.incomingTransfers} incoming · ${p.outgoingTransfers} outgoing · ${p.nativeBalanceEth.toFixed(4)} ETH</div><div class="unscored">${esc(p.scoreReason)}</div>`;
  const ev=Object.entries(p.evidence).map(([k,v])=>`<div class="ev-row"><span>${esc(k.replaceAll(/([A-Z])/g,' $1').toUpperCase())}</span><b class="${v?'yes':'no'}">${v?'PRESENT':'MISSING'}</b></div>`).join('');
  $('#evidence-content').innerHTML=ev;
  renderTape(p.recent.map((e)=>[e.side,short(e.token),`#${e.block}`,short(e.tx)]),'LIVE RPC');
  $('#pulse-label').textContent='LIVE';
  $('#pulse-lines').innerHTML=`<div><span class="good">[LIVE]</span> chain <b>${p.chainId}</b> block <b>${p.latestBlock.toLocaleString()}</b></div><div>[READ] ${p.scannedBlocks.toLocaleString()} blocks inspected</div><div>[READ] ${p.transferEvents} transfer events returned</div><div>[HOLD] VIPR score withheld: provenance / cost basis incomplete</div>`;
}

async function run(value){
  const q=value.trim();
  $('#profile-content').innerHTML='<div class="term-loading">reading evidence...</div>';
  try {
    if(!q || q.toLowerCase()==='demo') renderDemo(await json('/api/demo'));
    else renderLive(await json(`/api/inspect?wallet=${encodeURIComponent(q)}`));
  } catch(e){
    $('#profile-content').innerHTML=`<div class="unscored">${esc(e.message)}</div>`;
  }
}

$('#terminal-run').addEventListener('click',()=>run($('#terminal-input').value));
$('#terminal-input').addEventListener('keydown',(e)=>{ if(e.key==='Enter')run(e.currentTarget.value); });
document.querySelectorAll('[data-fill]').forEach((b)=>b.addEventListener('click',()=>{ $('#terminal-input').value=b.dataset.fill; run(b.dataset.fill); }));
document.addEventListener('keydown',(e)=>{ if(e.key.toLowerCase()==='r' && document.activeElement!==$('#terminal-input')) run($('#terminal-input').value); });

(async()=>{
  try{ const h=await json('/api/health'); $('#term-rpc-dot').classList.add(h.ok?'ok':''); $('#term-block').textContent=`BLOCK ${Number(h.blockNumber).toLocaleString()}`; }
  catch{ $('#term-block').textContent='RPC OFFLINE'; }
})();
run('demo');
