document.documentElement.classList.add('js');
const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];
const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=(a)=>a?`${a.slice(0,6)}…${a.slice(-4)}`:'—';

const glow=$('.cursor-glow');
window.addEventListener('pointermove',e=>{if(glow){glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px'}});
const stage=$('#mascot-stage');
const creature=$('#snake-creature');
if(stage&&creature&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  let targetPX=0,targetPY=0,px=0,py=0,last=performance.now();
  stage.addEventListener('pointermove',e=>{
    const r=stage.getBoundingClientRect();
    targetPX=((e.clientX-r.left)/r.width-.5)*22;
    targetPY=((e.clientY-r.top)/r.height-.5)*14;
  });
  stage.addEventListener('pointerleave',()=>{targetPX=0;targetPY=0});
  const animateSnake=(now)=>{
    const dt=Math.min(32,now-last); last=now;
    const spring=Math.min(1,dt*.0048);
    px+=(targetPX-px)*spring; py+=(targetPY-py)*spring;

    const ampX=Math.min(72,stage.clientWidth*.115);
    const crawlX=Math.sin(now*.00043)*ampX + Math.sin(now*.00017+1.25)*14 + px;
    const crawlY=Math.sin(now*.00068+.85)*9 + Math.cos(now*.00031)*4 + py;
    const crawlR=Math.sin(now*.00039-.5)*1.05;

    // Head leads the motion; lower coil follows more slowly.
    const headR=Math.sin(now*.00105)*1.85 + Math.sin(now*.00037+1.7)*.75;
    const headX=Math.sin(now*.00092+.45)*3.2;
    const headY=Math.cos(now*.00083)*2.1;
    const bodyR=Math.sin(now*.00053+2.2)*.6;
    const bodySX=1+Math.sin(now*.00072+1.4)*.006;
    const bodySY=1-Math.sin(now*.00072+1.4)*.004;

    creature.style.setProperty('--crawl-x',crawlX.toFixed(2)+'px');
    creature.style.setProperty('--crawl-y',crawlY.toFixed(2)+'px');
    creature.style.setProperty('--crawl-r',crawlR.toFixed(3)+'deg');
    creature.style.setProperty('--head-r',headR.toFixed(3)+'deg');
    creature.style.setProperty('--head-x',headX.toFixed(2)+'px');
    creature.style.setProperty('--head-y',headY.toFixed(2)+'px');
    creature.style.setProperty('--body-r',bodyR.toFixed(3)+'deg');
    creature.style.setProperty('--body-sx',bodySX.toFixed(4));
    creature.style.setProperty('--body-sy',bodySY.toFixed(4));
    requestAnimationFrame(animateSnake);
  };
  requestAnimationFrame(animateSnake);
}

const io=new IntersectionObserver(entries=>entries.forEach(x=>{if(x.isIntersecting){x.target.classList.add('visible');io.unobserve(x.target)}}),{threshold:.14});
$$('.reveal').forEach(el=>io.observe(el));

async function getJSON(url){
  const r=await fetch(url,{cache:'no-store'});const b=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(b.error||`HTTP ${r.status}`);return b;
}
const result=$('#scan-result'),form=$('#wallet-form'),input=$('#wallet-input'),network=$('#network-state');
function renderDemo(p){
  const d=p.score.dimensions,m=p.score.metrics;
  result.innerHTML=`<div class="result-head"><div><code>${esc(short(p.wallet.address))}</code><div class="live-tape-note" style="margin-top:10px">Synthetic walkthrough · deterministic score pipeline.</div></div><span class="result-badge">${esc(p.archetype)} · ${esc(p.score.evidenceLabel.toUpperCase())} EVIDENCE</span></div>
  <div class="result-rank">${p.score.rank}<small>/1000 VIPR RANK</small></div>
  <div class="result-grid">${Object.entries(d).map(([k,v])=>`<div><small>${esc(k.toUpperCase())}</small><b>${v}</b></div>`).join('')}</div>
  <div class="result-grid" style="grid-template-columns:repeat(4,1fr)"><div><small>MEDIAN HOLD</small><b>${Math.round(m.medianHoldMinutes)}m</b></div><div><small>EARLY HITS</small><b>${m.earlyHitRate.toFixed(0)}%</b></div><div><small>ROUNDTRIPS</small><b>${m.roundtripRate.toFixed(0)}%</b></div><div><small>MAX CONC.</small><b>${m.maxConcentrationPct.toFixed(0)}%</b></div></div>
  <div class="badges-line" style="margin-top:18px">${p.badges.map(b=>`<span>${esc(b)}</span>`).join('')}</div>`;
  result.hidden=false;result.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function renderLive(p){
  result.innerHTML=`<div class="result-head"><div><code>${esc(short(p.wallet))}</code><div class="live-tape-note" style="margin-top:10px">Live public-RPC observation · blocks ${Number(p.scannedFromBlock).toLocaleString()} → ${Number(p.latestBlock).toLocaleString()}</div></div><span class="result-badge">LIVE TAPE · NOT SCORED</span></div>
  <div class="result-rank">${p.transferEvents}<small> ERC-20 TRANSFER EVENTS</small></div>
  <div class="result-grid" style="grid-template-columns:repeat(5,1fr)"><div><small>INCOMING</small><b>${p.incomingTransfers}</b></div><div><small>OUTGOING</small><b>${p.outgoingTransfers}</b></div><div><small>TOKENS</small><b>${p.distinctTokens}</b></div><div><small>WINDOW</small><b>${Number(p.scannedBlocks).toLocaleString()}</b></div><div><small>ETH</small><b>${Number(p.nativeBalanceEth).toFixed(4)}</b></div></div>
  <div class="live-tape-note">${esc(p.scoreReason)}</div>
  ${p.recent?.length?`<table class="event-table"><tbody>${p.recent.slice(0,8).map(e=>`<tr><td>${e.side}</td><td>${esc(short(e.token))}</td><td>block ${Number(e.block).toLocaleString()}</td><td>${esc(short(e.tx))}</td></tr>`).join('')}</tbody></table>`:'<div class="live-tape-note">No ERC-20 transfer events were returned in this short public-RPC window.</div>'}`;
  result.hidden=false;result.scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function loadDemo(){
  result.hidden=false;result.innerHTML='<div class="live-tape-note">Building deterministic receipt…</div>';
  try{renderDemo(await getJSON('/api/demo'))}catch(e){result.innerHTML=`<div class="live-tape-note">${esc(e.message)}</div>`}
}
form?.addEventListener('submit',async e=>{
  e.preventDefault();const w=input.value.trim();if(!w||w.toLowerCase()==='demo')return loadDemo();
  result.hidden=false;result.innerHTML='<div class="live-tape-note">Reading Robinhood Chain public RPC…</div>';
  try{renderLive(await getJSON('/api/inspect?wallet='+encodeURIComponent(w)))}catch(e){result.innerHTML=`<div class="live-tape-note">${esc(e.message)}</div>`}
});
$('#demo-button')?.addEventListener('click',()=>{input.value='demo';loadDemo()});
$('#hero-demo')?.addEventListener('click',()=>{$('#inspect').scrollIntoView({behavior:'smooth'});input.value='demo';setTimeout(loadDemo,420)});
(async()=>{try{const h=await getJSON('/api/health');network.classList.add(h.ok?'ok':'bad');network.innerHTML=`<span></span> chain ${h.chainId} · block ${Number(h.blockNumber).toLocaleString()}`}catch{network.classList.add('bad');network.innerHTML='<span></span> public RPC unavailable'}})();