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
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const ctx=snakeCanvas.getContext('2d');
  if(!ctx)return;
  ctx.imageSmoothingEnabled=false;

  const startRig=()=>{
    let sprite;
    try{sprite=buildForegroundSprite(snakeSource)}catch(err){return}
    const sw=sprite.width,sh=sprite.height;
    stage.classList.add('snake-ready');

    let last=performance.now(),phase=0,pointerX=0,pointerY=0,targetX=0,targetY=0;
    stage.addEventListener('pointermove',e=>{
      const r=stage.getBoundingClientRect();
      targetX=((e.clientX-r.left)/r.width-.5)*9;
      targetY=((e.clientY-r.top)/r.height-.5)*5;
    });
    stage.addEventListener('pointerleave',()=>{targetX=0;targetY=0});

    const draw=(now)=>{
      const dt=Math.min(34,now-last);last=now;
      pointerX+=(targetX-pointerX)*Math.min(1,dt*.005);
      pointerY+=(targetY-pointerY)*Math.min(1,dt*.005);

      const cw=snakeCanvas.width,ch=snakeCanvas.height;
      ctx.clearRect(0,0,cw,ch);

      const t=now/1000;
      const travel=Math.sin(t*.46);
      const velocity=Math.cos(t*.46);
      const maxTravel=cw*.105;
      const crawlX=travel*maxTravel + Math.sin(t*.17+1.1)*8 + pointerX;
      const crawlY=Math.sin(t*.72+.6)*3.5 + pointerY;
      const rot=Math.sin(t*.38-.4)*.012;

      // The travelling body wave advances slightly faster when the mascot is moving.
      phase += dt*(.0025 + Math.abs(velocity)*.0018);

      const scale=Math.min((cw*.62)/sw,(ch*.70)/sh);
      const dw=sw*scale,dh=sh*scale;
      const baseX=(cw-dw)/2+crawlX,baseY=(ch-dh)/2+crawlY;

      ctx.save();
      ctx.translate(cw/2+crawlX,ch/2+crawlY);
      ctx.rotate(rot);
      ctx.translate(-(cw/2+crawlX),-(ch/2+crawlY));

      // Fine horizontal slices create an S-wave through the exact original artwork.
      const slice=3;
      for(let sy=0;sy<sh;sy+=slice){
        const nh=Math.min(slice,sh-sy);
        const ny=sy/sh;
        const envelope=.34 + .66*Math.sin(Math.PI*ny);
        const headLead=ny<.42 ? (1-ny/.42)*2.4 : 0;
        const wave=(Math.sin(phase*3.3-ny*6.9)*5.8 + Math.sin(phase*1.45-ny*3.2)*2.3)*envelope;
        const probe=headLead*Math.sin(t*1.15)*1.35;
        const dx=wave+probe;
        const dy=Math.sin(phase*2.2-ny*4.4)*.65*envelope;
        ctx.drawImage(sprite,0,sy,sw,nh,baseX+dx,baseY+sy*scale+dy,dw,nh*scale+0.65);
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