document.documentElement.classList.add('js');
const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];
const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=(a)=>a?`${a.slice(0,6)}…${a.slice(-4)}`:'—';

const glow=$('.cursor-glow');
window.addEventListener('pointermove',e=>{if(glow){glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px'}});
const stage=$('#mascot-stage');
const snakeSvg=$('#snake-life-svg');
const bodyOutline=$('#snake-body-outline');
const bodyFill=$('#snake-body-fill');
const bodyHighlight=$('#snake-body-highlight');
const stripeLayer=$('#snake-stripes');
const snakeHead=$('#snake-head');
const pupilLeft=$('#snake-pupil-left');
const pupilRight=$('#snake-pupil-right');
const snakeTongue=$('#snake-tongue');

if(stage&&snakeSvg&&bodyOutline&&bodyFill&&snakeHead&&stripeLayer){
  const NS='http://www.w3.org/2000/svg';
  let seed=0x51A7E;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const pick=(a,b)=>a+(b-a)*rand();
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const ease=(v,t,dt,s)=>v+(t-v)*(1-Math.exp(-dt*s));

  const stripes=[];
  for(let i=0;i<11;i++){
    const e=document.createElementNS(NS,'ellipse');
    e.setAttribute('class','snake-life-stripe'+(i%2?' alt':''));
    stripeLayer.appendChild(e);
    stripes.push(e);
  }

  const s={
    x:610,y:305,vx:0,vy:0,angle:0,targetX:720,targetY:300,
    speed:58,targetSpeed:58,mode:'crawl',next:0,phase:pick(0,6.28),
    lookX:0,lookY:0,targetLookX:0,targetLookY:0,
    lift:0,targetLift:0,lastTongue:0,tongueUntil:0,side:1
  };

  const history=[];
  for(let i=0;i<90;i++){
    history.push({x:s.x-i*5.2,y:s.y+Math.sin(i*.25)*18});
  }

  const choose=(now)=>{
    const r=rand();
    s.mode=r<.18?'watch':r<.31?'pause':r<.82?'crawl':'turn';

    if(s.mode==='crawl'){
      s.side*=-1;
      s.targetX=pick(455,770)+(s.side*pick(10,45));
      s.targetY=pick(205,415);
      s.targetSpeed=pick(48,82);
      s.targetLookX=pick(-2.5,2.5);
      s.targetLookY=pick(-1.5,1.5);
      s.targetLift=pick(-2,3);
      s.next=now+pick(2300,4600);
    }else if(s.mode==='turn'){
      s.targetX=clamp(900-s.x+pick(-70,70),440,790);
      s.targetY=clamp(620-s.y+pick(-65,65),205,425);
      s.targetSpeed=pick(35,58);
      s.targetLookX=pick(-4,4);
      s.targetLookY=pick(-2,2);
      s.targetLift=pick(-1,4);
      s.next=now+pick(1100,1900);
    }else if(s.mode==='watch'){
      s.targetX=s.x;s.targetY=s.y;s.targetSpeed=0;
      s.targetLookX=pick(-5,5);
      s.targetLookY=pick(-2.5,2.5);
      s.targetLift=pick(-5,4);
      s.next=now+pick(1200,2600);
    }else{
      s.targetX=s.x;s.targetY=s.y;s.targetSpeed=0;
      s.targetLookX=pick(-2,2);
      s.targetLookY=pick(-1.5,1.5);
      s.targetLift=0;
      s.next=now+pick(650,1400);
    }

    if(now-s.lastTongue>2500 && rand()>.55){
      s.tongueUntil=now+pick(220,430);
      s.lastTongue=now;
    }
  };

  const smoothPath=(pts)=>{
    if(!pts.length)return'';
    if(pts.length===1)return 'M '+pts[0].x+' '+pts[0].y;
    let d='M '+pts[0].x.toFixed(1)+' '+pts[0].y.toFixed(1);
    for(let i=1;i<pts.length-1;i++){
      const p=pts[i],n=pts[i+1];
      const mx=(p.x+n.x)/2,my=(p.y+n.y)/2;
      d+=' Q '+p.x.toFixed(1)+' '+p.y.toFixed(1)+' '+mx.toFixed(1)+' '+my.toFixed(1);
    }
    const last=pts[pts.length-1];
    d+=' T '+last.x.toFixed(1)+' '+last.y.toFixed(1);
    return d;
  };

  const trailSamples=(spacing,count)=>{
    const out=[];
    if(!history.length)return out;
    out.push(history[0]);
    let acc=0,last=history[0],need=spacing;
    for(let i=1;i<history.length&&out.length<count;i++){
      const p=history[i];
      acc+=Math.hypot(p.x-last.x,p.y-last.y);
      if(acc>=need){out.push(p);need+=spacing}
      last=p;
    }
    return out;
  };

  const trimHistory=()=>{
    let total=0;
    for(let i=1;i<history.length;i++){
      total+=Math.hypot(history[i].x-history[i-1].x,history[i].y-history[i-1].y);
      if(total>455){history.length=i+1;break}
    }
  };

  let last=performance.now();
  choose(last);

  const animate=(now)=>{
    const dt=Math.min(.034,Math.max(.001,(now-last)/1000));last=now;
    if(now>=s.next)choose(now);

    const dx=s.targetX-s.x,dy=s.targetY-s.y;
    const dist=Math.hypot(dx,dy);
    const ux=dist>1?dx/dist:Math.cos(s.angle);
    const uy=dist>1?dy/dist:Math.sin(s.angle);

    s.speed=ease(s.speed,s.targetSpeed,dt,1.8);
    s.phase+=dt*(2.2+s.speed*.045);

    const sideWave=Math.sin(s.phase)*Math.min(22,5+s.speed*.22);
    const px=-uy,py=ux;
    const desiredVx=ux*s.speed+px*sideWave;
    const desiredVy=(uy*s.speed+py*sideWave)*.63;

    s.vx=ease(s.vx,desiredVx,dt,2.45);
    s.vy=ease(s.vy,desiredVy,dt,2.35);

    if(s.mode==='watch'||s.mode==='pause'){
      s.vx*=Math.pow(.035,dt);
      s.vy*=Math.pow(.035,dt);
    }

    s.x=clamp(s.x+s.vx*dt,420,800);
    s.y=clamp(s.y+s.vy*dt,175,445);

    if(dist<42&&s.mode==='crawl')choose(now);

    const prev=history[0];
    if(!prev||Math.hypot(s.x-prev.x,s.y-prev.y)>.9){
      history.unshift({x:s.x,y:s.y});
      trimHistory();
    }

    const headSpeed=Math.hypot(s.vx,s.vy);
    if(headSpeed>1.5){
      const targetAngle=Math.atan2(s.vy,s.vx);
      let da=Math.atan2(Math.sin(targetAngle-s.angle),Math.cos(targetAngle-s.angle));
      s.angle+=da*(1-Math.exp(-dt*5.2));
    }

    const samples=trailSamples(16,31).reverse();
    const bodyD=smoothPath(samples);
    bodyOutline.setAttribute('d',bodyD);
    bodyFill.setAttribute('d',bodyD);

    const hi=samples.slice(Math.max(0,samples.length-13)).map((p,i)=>({x:p.x-4,y:p.y-7}));
    bodyHighlight.setAttribute('d',smoothPath(hi));

    const stripeSamples=trailSamples(34,12);
    stripes.forEach((e,i)=>{
      const p=stripeSamples[i+1];
      if(!p){e.setAttribute('opacity','0');return}
      e.setAttribute('opacity',i<9?'1':'.82');
      const q=stripeSamples[Math.min(i+2,stripeSamples.length-1)]||p;
      const a=Math.atan2(q.y-p.y,q.x-p.x)*180/Math.PI;
      const taper=Math.max(.43,1-i*.055);
      e.setAttribute('cx',p.x.toFixed(1));
      e.setAttribute('cy',p.y.toFixed(1));
      e.setAttribute('rx',(24*taper).toFixed(1));
      e.setAttribute('ry',(11.5*taper).toFixed(1));
      e.setAttribute('transform','rotate('+(a+90).toFixed(1)+' '+p.x.toFixed(1)+' '+p.y.toFixed(1)+')');
    });

    s.lookX=ease(s.lookX,s.targetLookX,dt,3.2);
    s.lookY=ease(s.lookY,s.targetLookY,dt,3.2);
    s.lift=ease(s.lift,s.targetLift,dt,2.4);

    if(s.mode==='watch'){
      s.targetLookX=Math.sin(now*.0021)*4.7;
      s.targetLookY=Math.cos(now*.0017)*2.1;
      s.targetLift=Math.sin(now*.0012)*3.2-1.5;
    }else if(s.mode==='crawl'){
      s.targetLookX=clamp(s.vx/22,-4,4);
      s.targetLookY=clamp(s.vy/32,-2,2);
    }

    const lookAngle=s.mode==='watch'?s.lookX*1.8:0;
    const headDeg=s.angle*180/Math.PI+lookAngle;
    snakeHead.setAttribute('transform','translate('+s.x.toFixed(1)+' '+(s.y+s.lift).toFixed(1)+') rotate('+headDeg.toFixed(2)+')');

    pupilLeft.setAttribute('cx',(-20+s.lookX).toFixed(1));
    pupilLeft.setAttribute('cy',(-9+s.lookY).toFixed(1));
    pupilRight.setAttribute('cx',(19+s.lookX).toFixed(1));
    pupilRight.setAttribute('cy',(-9+s.lookY).toFixed(1));

    const tongueOn=now<s.tongueUntil;
    snakeTongue.style.opacity=tongueOn?'1':'.08';
    snakeTongue.setAttribute('transform','scale(1 '+(tongueOn?'1':'.24')+')');

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