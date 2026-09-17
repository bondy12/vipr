document.documentElement.classList.add('js');
const $=(s)=>document.querySelector(s);
const $$=(s)=>[...document.querySelectorAll(s)];
const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const short=(a)=>a?`${a.slice(0,6)}…${a.slice(-4)}`:'—';

const glow=$('.cursor-glow');
window.addEventListener('pointermove',e=>{if(glow){glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px'}});
const stage=$('#mascot-stage');
const snakeCanvas=$('#snake-canvas');
const snakeSource=$('#snake-source');

function buildForegroundSprite(img){
  const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
  const work=document.createElement('canvas');work.width=w;work.height=h;
  const wctx=work.getContext('2d',{willReadFrequently:true});
  wctx.imageSmoothingEnabled=false;
  wctx.drawImage(img,0,0,w,h);
  const image=wctx.getImageData(0,0,w,h),d=image.data;

  // Estimate the baked background from the corners.
  const pts=[[0,0],[w-1,0],[0,h-1],[w-1,h-1],[Math.floor(w/2),0],[Math.floor(w/2),h-1]];
  let br=0,bg=0,bb=0,n=0;
  for(const [x,y] of pts){const i=(y*w+x)*4;br+=d[i];bg+=d[i+1];bb+=d[i+2];n++}
  br/=n;bg/=n;bb/=n;

  const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);
  let qh=0,qt=0;
  const push=(x,y)=>{if(x<0||y<0||x>=w||y>=h)return;const p=y*w+x;if(seen[p])return;seen[p]=1;queue[qt++]=p};
  for(let x=0;x<w;x++){push(x,0);push(x,h-1)}
  for(let y=0;y<h;y++){push(0,y);push(w-1,y)}

  const threshold=58;
  while(qh<qt){
    const p=queue[qh++],x=p%w,y=(p/w)|0,i=p*4;
    const dr=d[i]-br,dg=d[i+1]-bg,db=d[i+2]-bb;
    const dist=Math.sqrt(dr*dr+dg*dg+db*db);
    const lum=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];
    if(dist>threshold || lum>92) continue;
    d[i+3]=0;
    push(x+1,y);push(x-1,y);push(x,y+1);push(x,y-1);
  }

  // Feather only the outer keyed edge. Internal dark outlines remain untouched.
  const alpha=new Uint8ClampedArray(w*h);
  for(let p=0;p<w*h;p++)alpha[p]=d[p*4+3];
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
    const p=y*w+x;if(alpha[p]===0)continue;
    let empty=0;
    for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)if(alpha[(y+yy)*w+x+xx]===0)empty++;
    if(empty>=4)d[p*4+3]=Math.min(d[p*4+3],205);
  }
  wctx.putImageData(image,0,0);
  return work;
}

function initSnakeRig(){
  if(!stage||!snakeCanvas||!snakeSource)return;
  const ctx=snakeCanvas.getContext('2d');
  if(!ctx)return;
  ctx.imageSmoothingEnabled=false;

  const startRig=()=>{
    let sprite;
    try{sprite=buildForegroundSprite(snakeSource)}catch(err){return}
    const sw=sprite.width,sh=sprite.height;
    stage.classList.add('snake-ready');

    // Autonomous creature controller: continuous wandering, pauses, looking and turns.
    let seed=0x51A7E;
    const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
    const pick=(a,b)=>a+(b-a)*rand();
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const ease=(v,t,dt,s)=>v+(t-v)*(1-Math.exp(-dt*s));

    const s={
      x:0,y:0,vx:0,vy:0,
      dir:pick(0,Math.PI*2),wander:pick(-1,1),
      speed:0,targetSpeed:0,
      look:0,targetLook:0,lift:0,targetLift:0,
      wave:2.8,targetWave:2.8,phase:0,
      bodyLean:0,targetLean:0,
      mode:'watch',nextMode:0,
      px:0,py:0,tpx:0,tpy:0
    };

    const bounds=()=>{
      const w=stage.clientWidth||560,h=stage.clientHeight||560;
      return {x:Math.min(142,w*.255),y:Math.min(82,h*.14)};
    };

    const chooseMode=(now)=>{
      const r=rand();
      if(r<.18)s.mode='watch';
      else if(r<.34)s.mode='pause';
      else if(r<.79)s.mode='wander';
      else s.mode='turn';

      if(s.mode==='watch'){
        s.targetSpeed=0;
        s.targetLook=pick(-1.15,1.15);
        s.targetLift=pick(9,16);
        s.targetWave=pick(1.2,2.1);
        s.nextMode=now+pick(1300,2800);
      }else if(s.mode==='pause'){
        s.targetSpeed=0;
        s.targetLook=pick(-.45,.45);
        s.targetLift=pick(2,7);
        s.targetWave=pick(1.5,2.6);
        s.nextMode=now+pick(800,1700);
      }else if(s.mode==='turn'){
        s.targetSpeed=pick(14,24);
        s.dir+=pick(.7,1.25)*(rand()<.5?-1:1);
        s.wander=pick(-1,1);
        s.targetLook=clamp(Math.cos(s.dir)*.65,-.7,.7);
        s.targetLift=pick(3,8);
        s.targetWave=pick(3.5,5.2);
        s.nextMode=now+pick(850,1500);
      }else{
        s.targetSpeed=pick(24,42);
        s.wander=pick(-1,1);
        s.targetLook=clamp(Math.cos(s.dir)*.5,-.6,.6);
        s.targetLift=pick(0,5);
        s.targetWave=pick(5.2,8.0);
        s.nextMode=now+pick(2100,4300);
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

    const draw=(now)=>{
      const dtMs=Math.min(34,now-last); last=now;
      const dt=dtMs/1000;
      if(now>=s.nextMode)chooseMode(now);

      const b=bounds();

      s.px=ease(s.px,s.tpx,dt,4.5);
      s.py=ease(s.py,s.tpy,dt,4.5);
      s.speed=ease(s.speed,s.targetSpeed,dt,1.45);
      s.look=ease(s.look,s.targetLook,dt,2.1);
      s.lift=ease(s.lift,s.targetLift,dt,1.9);
      s.wave=ease(s.wave,s.targetWave,dt,1.55);

      if(s.mode==='wander'||s.mode==='turn'){
        // Smooth semi-random steering — no teleporting targets, no hard loop.
        s.dir += (Math.sin(now*.00037+s.wander*2.4)*.22 + s.wander*.16)*dt;
        s.wander += pick(-.14,.14)*dt;
        s.wander=clamp(s.wander,-1,1);
      }

      // Soft boundary avoidance: the creature turns before it hits the edge.
      const nx=s.x/b.x, ny=s.y/b.y;
      if(Math.abs(nx)>.72){
        const desired=nx>0?Math.PI:0;
        let delta=Math.atan2(Math.sin(desired-s.dir),Math.cos(desired-s.dir));
        s.dir+=delta*dt*(1.2+Math.abs(nx));
      }
      if(Math.abs(ny)>.68){
        const desired=ny>0?-Math.PI/2:Math.PI/2;
        let delta=Math.atan2(Math.sin(desired-s.dir),Math.cos(desired-s.dir));
        s.dir+=delta*dt*(.75+Math.abs(ny));
      }

      const desiredVx=Math.cos(s.dir)*s.speed;
      const desiredVy=Math.sin(s.dir)*s.speed*.48;
      s.vx=ease(s.vx,desiredVx,dt,2.2);
      s.vy=ease(s.vy,desiredVy,dt,2.0);
      s.x=clamp(s.x+s.vx*dt,-b.x,b.x);
      s.y=clamp(s.y+s.vy*dt,-b.y,b.y);

      // Looking is partly independent and partly informed by travel direction.
      const travelLook=clamp(s.vx/34,-1,1);
      if(s.mode==='wander')s.targetLook=ease(s.targetLook,travelLook*.58,dt,.9);

      const activity=clamp(Math.hypot(s.vx,s.vy)/28,0,1);
      s.targetLean=clamp(s.vx/42,-1,1)*2.15;
      s.bodyLean=ease(s.bodyLean,s.targetLean,dt,2.1);
      s.phase+=dt*(1.65+activity*2.25);

      const cw=snakeCanvas.width,ch=snakeCanvas.height;
      ctx.clearRect(0,0,cw,ch);

      const scale=Math.min((cw*.62)/sw,(ch*.70)/sh);
      const dw=sw*scale,dh=sh*scale;
      const baseX=(cw-dw)/2+s.x+s.px;
      const baseY=(ch-dh)/2+s.y+s.py;

      ctx.save();
      ctx.translate(cw/2+s.x,ch/2+s.y);
      ctx.rotate(s.bodyLean*Math.PI/180);
      ctx.translate(-(cw/2+s.x),-(ch/2+s.y));

      // Preserve the exact mascot texture. Motion is a travelling deformation field:
      // head leads, neck counter-steers, middle body carries the main S-wave, tail lags.
      const slice=2;
      for(let sy=0;sy<sh;sy+=slice){
        const nh=Math.min(slice,sh-sy);
        const ny=sy/sh;

        const head=Math.max(0,1-ny/.36);
        const neck=Math.max(0,1-Math.abs(ny-.39)/.19);
        const middle=Math.pow(Math.sin(Math.PI*clamp((ny-.08)/.92,0,1)),.8);
        const tail=Math.max(0,(ny-.55)/.45);

        const locomotion=(Math.sin(s.phase-ny*7.6)*s.wave
          +Math.sin(s.phase*.61-ny*3.4+1.1)*s.wave*.34)*(.18+.82*middle);

        const tailLag=Math.sin(s.phase*.82-ny*9.7-1.4)*s.wave*.48*tail;
        const headScan=s.look*21*head;
        const neckCounter=-s.look*7.2*neck;
        const headRise=-s.lift*head;

        // During pauses the head still makes tiny exploratory micro-movements.
        const idleScan=(1-activity)*Math.sin(now*.00105+ny*4.2)*1.35*head;
        const idleBreath=(1-activity)*Math.sin(now*.00155+ny*2.7)*.55*middle;

        const dx=locomotion+tailLag+headScan+neckCounter+idleScan;
        const dy=Math.cos(s.phase*.69-ny*4.9)*(.48+activity*.52)*middle+headRise+idleBreath;

        ctx.drawImage(
          sprite,0,sy,sw,nh,
          baseX+dx,baseY+sy*scale+dy,
          dw,nh*scale+.78
        );
      }
      ctx.restore();
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  };

  if(snakeSource.complete&&snakeSource.naturalWidth)startRig();
  else snakeSource.addEventListener('load',startRig,{once:true});
}
initSnakeRig();
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