document.documentElement.classList.add('js');
const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];
const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=(a)=>a?`${a.slice(0,6)}…${a.slice(-4)}`:'—';

const glow=$('.cursor-glow');
window.addEventListener('pointermove',e=>{if(glow){glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px'}});
const stage=$('#mascot-stage');
const live=$('#snake-live');
const snakeSvg=$('#snake-live-svg');
const bands=$$('.snake-band');

if(stage&&live&&snakeSvg&&bands.length){
  let seed=0x51A7E;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const pick=(a,b)=>a+(b-a)*rand();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const wrap=(a)=>Math.atan2(Math.sin(a),Math.cos(a));
  const ease=(v,t,dt,s)=>v+(t-v)*(1-Math.exp(-dt*s));

  const s={
    x:0,y:0,vx:0,vy:0,heading:pick(-.7,.7),speed:0,targetSpeed:0,
    look:0,targetLook:0,lift:0,targetLift:0,lean:0,targetLean:0,
    wave:2.2,targetWave:2.2,phase:pick(0,Math.PI*2),
    mode:'watch',next:0,wander:pick(-1,1)
  };

  const choose=(now)=>{
    const r=rand();
    s.mode=r<.20?'watch':r<.34?'pause':r<.78?'crawl':'turn';
    if(s.mode==='watch'){
      s.targetSpeed=0;s.targetLook=pick(-1,1);s.targetLift=pick(-3,2);
      s.targetWave=pick(.8,1.5);s.next=now+pick(1200,2500);
    }else if(s.mode==='pause'){
      s.targetSpeed=0;s.targetLook=pick(-.35,.35);s.targetLift=0;
      s.targetWave=pick(.7,1.2);s.next=now+pick(600,1400);
    }else if(s.mode==='turn'){
      s.targetSpeed=pick(14,24);s.heading+=pick(.65,1.1)*(rand()<.5?-1:1);
      s.targetLook=clamp(Math.cos(s.heading),-1,1);s.targetLift=pick(-2,2);
      s.targetWave=pick(2.3,3.4);s.next=now+pick(900,1600);
    }else{
      s.targetSpeed=pick(25,43);s.heading+=pick(-.22,.22);
      s.targetLook=clamp(Math.cos(s.heading)*.55,-.7,.7);s.targetLift=pick(-2,2);
      s.targetWave=pick(2.8,4.2);s.next=now+pick(1800,3700);
    }
  };

  let last=performance.now();
  choose(last);

  const animate=(now)=>{
    const dt=Math.min(.034,(now-last)/1000);last=now;
    if(now>=s.next)choose(now);

    const bx=Math.min(110,stage.clientWidth*.18);
    const by=Math.min(58,stage.clientHeight*.10);

    if(Math.abs(s.x)>bx*.72){
      const desired=s.x>0?Math.PI:0;
      s.heading+=wrap(desired-s.heading)*dt*(1.6+Math.abs(s.x/bx));
    }
    if(Math.abs(s.y)>by*.68){
      const desired=s.y>0?-Math.PI/2:Math.PI/2;
      s.heading+=wrap(desired-s.heading)*dt*(1.05+Math.abs(s.y/by));
    }

    if(s.mode==='crawl'||s.mode==='turn'){
      s.heading+=(Math.sin(now*.00042+s.wander*2.2)*.18+s.wander*.10)*dt;
      s.wander=clamp(s.wander+(rand()-.5)*.11*dt,-1,1);
    }

    s.speed=ease(s.speed,s.targetSpeed,dt,1.7);
    s.look=ease(s.look,s.targetLook,dt,2.05);
    s.lift=ease(s.lift,s.targetLift,dt,1.8);
    s.wave=ease(s.wave,s.targetWave,dt,1.6);

    const crawlWave=Math.sin(now*.006+s.phase)*s.speed*.17;
    const fx=Math.cos(s.heading),fy=Math.sin(s.heading);
    const sx=-fy,sy=fx;
    const dvx=fx*s.speed+sx*crawlWave;
    const dvy=(fy*s.speed+sy*crawlWave)*.46;

    s.vx=ease(s.vx,dvx,dt,2.25);
    s.vy=ease(s.vy,dvy,dt,2.05);
    s.x=clamp(s.x+s.vx*dt,-bx,bx);
    s.y=clamp(s.y+s.vy*dt,-by,by);

    s.targetLean=clamp(s.vx/43,-1,1)*3.6;
    s.lean=ease(s.lean,s.targetLean,dt,2.15);
    s.phase+=dt*(1.55+Math.min(1,s.speed/36)*2.35);

    live.style.transform=
      'translate3d(calc(-50% + '+s.x.toFixed(1)+'px),calc(-50% + '+s.y.toFixed(1)+'px),0) rotate('+s.lean.toFixed(2)+'deg)';

    const n=bands.length;
    bands.forEach((band,i)=>{
      const ny=i/(n-1);
      const body=Math.sin(Math.PI*ny);
      const head=Math.max(0,1-ny/.34);
      const tail=Math.max(0,(ny-.58)/.42);
      const wave=Math.sin(s.phase-ny*6.4)*s.wave*(.25+.75*body);
      const second=Math.sin(s.phase*.58-ny*3.1+1.2)*s.wave*.28*body;
      const tailLag=Math.sin(s.phase*.78-ny*8.2-1.0)*s.wave*.34*tail;
      const look=s.look*4.8*head;
      const rise=s.lift*head;
      const idle=(1-Math.min(1,s.speed/18))*Math.sin(now*.0011+ny*3.4)*.45*head;
      const dx=wave+second+tailLag+look+idle;
      const dy=Math.cos(s.phase*.72-ny*4.2)*.28*body-rise;
      band.setAttribute('transform','translate('+dx.toFixed(2)+' '+dy.toFixed(2)+')');
    });

    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
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