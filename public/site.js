document.documentElement.classList.add('js');
const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];
const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=(a)=>a?`${a.slice(0,6)}…${a.slice(-4)}`:'—';

const glow=$('.cursor-glow');
window.addEventListener('pointermove',e=>{if(glow){glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px'}});
const stage=$('#mascot-stage');
const actor=$('#snake-actor');
const layerA=$('#snake-frame-a');
const layerB=$('#snake-frame-b');

if(stage&&actor&&layerA&&layerB){
  const framePos=[
    ['0%','0%'],['33.333%','0%'],['66.666%','0%'],['100%','0%'],
    ['0%','50%'],['33.333%','50%'],['66.666%','50%'],['100%','50%'],
    ['0%','100%'],['33.333%','100%'],['66.666%','100%'],['100%','100%']
  ];
  const sequences={
    crawl:[0,5,10,5,1,5],
    crawl2:[10,5,0,5,1,5],
    watch:[1,2,3,11,7,11,3,2],
    coil:[6,4,8,3,7,3,4,6],
    turn:[10,5,1,9,7,3,2,1]
  };

  let active=layerA, hidden=layerB, frame=0;
  let seed=0x51A7E;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const pick=(a,b)=>a+(b-a)*rand();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const ease=(v,t,dt,s)=>v+(t-v)*(1-Math.exp(-dt*s));

  const s={
    x:0,y:0,tx:0,ty:0,vx:0,vy:0,
    dir:1,rot:0,trot:0,
    mode:'watch',seq:sequences.watch,seqIndex:0,nextFrame:0,nextMode:0,
    px:0,py:0,tpx:0,tpy:0
  };

  const setFrame=(el,n)=>{
    const p=framePos[n];
    el.style.backgroundPosition=p[0]+' '+p[1];
  };
  const swapFrame=(n)=>{
    if(n===frame)return;
    setFrame(hidden,n);
    hidden.style.opacity='1';
    active.style.opacity='0';
    const old=active;active=hidden;hidden=old;
    frame=n;
  };
  const chooseMode=(now)=>{
    const r=rand();
    if(r<.18)s.mode='watch';
    else if(r<.32)s.mode='coil';
    else if(r<.78)s.mode='crawl';
    else s.mode='turn';

    if(s.mode==='watch'){
      s.seq=sequences.watch;s.tx=pick(-28,28);s.ty=pick(-18,18);s.trot=pick(-2,2);
      s.nextMode=now+pick(1800,3400);
    }else if(s.mode==='coil'){
      s.seq=sequences.coil;s.tx=pick(-42,42);s.ty=pick(-18,22);s.trot=pick(-3,3);
      s.nextMode=now+pick(1400,2400);
    }else if(s.mode==='turn'){
      s.seq=sequences.turn;s.dir*=-1;s.tx=s.dir*pick(65,118);s.ty=pick(-48,48);s.trot=s.dir*pick(3,6);
      s.nextMode=now+pick(1000,1750);
    }else{
      s.seq=rand()>.5?sequences.crawl:sequences.crawl2;
      s.dir*=-1;
      s.tx=s.dir*pick(82,132);s.ty=pick(-52,52);s.trot=s.dir*pick(1.5,4);
      s.nextMode=now+pick(2500,4600);
    }
    s.seqIndex=0;
    s.nextFrame=now;
  };

  const loadSprite=async()=>{
    try{
      const urls=Array.from({length:7},(_,i)=>'/sprite/s'+i+'.txt?v=1');
      const parts=await Promise.all(urls.map(u=>fetch(u,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('sprite');return r.text()})));
      const src='data:image/webp;base64,'+parts.join('');
      layerA.style.backgroundImage='url("'+src+'")';
      layerB.style.backgroundImage='url("'+src+'")';
      setFrame(layerA,1);setFrame(layerB,1);
      layerA.style.opacity='1';layerB.style.opacity='0';
      actor.classList.add('ready');
      frame=1;
      requestAnimationFrame(animate);
    }catch(err){
      actor.classList.add('failed');
    }
  };

  stage.addEventListener('pointermove',e=>{
    const r=stage.getBoundingClientRect();
    s.tpx=((e.clientX-r.left)/r.width-.5)*8;
    s.tpy=((e.clientY-r.top)/r.height-.5)*5;
  });
  stage.addEventListener('pointerleave',()=>{s.tpx=0;s.tpy=0});

  let last=performance.now();
  chooseMode(last);
  const animate=(now)=>{
    const dt=Math.min(.034,(now-last)/1000);last=now;
    if(now>=s.nextMode)chooseMode(now);

    if(now>=s.nextFrame){
      swapFrame(s.seq[s.seqIndex%s.seq.length]);
      s.seqIndex++;
      const fast=s.mode==='crawl'||s.mode==='turn';
      s.nextFrame=now+(fast?pick(105,155):pick(155,260));
    }

    s.px=ease(s.px,s.tpx,dt,4.2);s.py=ease(s.py,s.tpy,dt,4.2);
    s.x=ease(s.x,s.tx,dt,s.mode==='crawl'?1.0:1.65);
    s.y=ease(s.y,s.ty,dt,s.mode==='crawl'?1.15:1.8);
    s.rot=ease(s.rot,s.trot,dt,1.9);

    const breathe=1+Math.sin(now*.0021)*.008;
    actor.style.transform=
      'translate3d(calc(-50% + '+(s.x+s.px).toFixed(1)+'px),calc(-50% + '+(s.y+s.py).toFixed(1)+'px),0) rotate('+s.rot.toFixed(2)+'deg) scaleX('+s.dir+') scaleY('+breathe.toFixed(4)+')';
    requestAnimationFrame(animate);
  };

  loadSprite();
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