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

    // A tiny deterministic PRNG keeps motion organic without sudden random jumps.
    let seed=0x51A7E;
    const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
    const pick=(a,b)=>a+(b-a)*rand();

    const state={
      x:0,y:0,rot:0,look:0,lift:0,wave:4.2,waveSpeed:.72,coil:0,
      tx:0,ty:0,trot:0,tlook:0,tlift:0,twave:4.2,twaveSpeed:.72,tcoil:0,
      phase:0,next:0,lastMode:'idle',dir:1,pointerX:0,pointerY:0,targetPX:0,targetPY:0
    };

    const chooseBehavior=(now)=>{
      // Alternate the broad left/right bias so the movement feels chaotic but balanced.
      const modes=['idle','look','crawl','crawl','watch','coil'];
      const mode=modes[Math.floor(rand()*modes.length)];
      let dir=state.dir;
      if(mode==='crawl'||mode==='look'){dir*=-1;state.dir=dir}

      state.tlook=0;state.tlift=0;state.tcoil=0;
      state.twave=pick(3.4,5.4);state.twaveSpeed=pick(.58,.9);
      state.ty=pick(-4,4);state.trot=pick(-.45,.45);

      if(mode==='idle'){
        state.tx=pick(-16,16);
        state.tlook=pick(-.15,.15);
        state.tlift=pick(-1.5,2.5);
        state.twave=pick(2.2,3.4);
        state.twaveSpeed=pick(.42,.62);
        state.next=now+pick(1700,3200);
      }else if(mode==='look'){
        state.tx=pick(-12,12);
        state.tlook=dir*pick(.75,1);
        state.tlift=pick(4,8);
        state.trot=dir*pick(.35,.75);
        state.twave=pick(2.4,3.8);
        state.twaveSpeed=pick(.42,.67);
        state.next=now+pick(1100,2100);
      }else if(mode==='crawl'){
        const reach=Math.min(76,stage.clientWidth*.12);
        state.tx=dir*pick(reach*.66,reach);
        state.tlook=dir*pick(.35,.65);
        state.tlift=pick(0,5);
        state.trot=dir*pick(.15,.5);
        state.twave=pick(5.2,7.6);
        state.twaveSpeed=pick(.88,1.22);
        state.next=now+pick(2600,4300);
      }else if(mode==='watch'){
        state.tx=pick(-26,26);
        state.tlook=pick(-.55,.55);
        state.tlift=pick(6,11);
        state.trot=pick(-.25,.25);
        state.twave=pick(1.8,3);
        state.twaveSpeed=pick(.32,.52);
        state.next=now+pick(1500,2900);
      }else{
        state.tx=pick(-18,18);
        state.tlook=pick(-.25,.25);
        state.tlift=pick(-2,3);
        state.tcoil=pick(.65,1);
        state.twave=pick(4.5,6.2);
        state.twaveSpeed=pick(.68,.95);
        state.next=now+pick(1400,2400);
      }
      state.lastMode=mode;
    };

    const spring=(value,target,dt,speed)=>value+(target-value)*(1-Math.exp(-dt*speed));
    stage.addEventListener('pointermove',e=>{
      const r=stage.getBoundingClientRect();
      state.targetPX=((e.clientX-r.left)/r.width-.5)*8;
      state.targetPY=((e.clientY-r.top)/r.height-.5)*5;
    });
    stage.addEventListener('pointerleave',()=>{state.targetPX=0;state.targetPY=0});

    let last=performance.now();
    chooseBehavior(last);

    const draw=(now)=>{
      const dtMs=Math.min(34,now-last);last=now;
      const dt=dtMs/1000;
      if(now>=state.next)chooseBehavior(now);

      state.pointerX=spring(state.pointerX,state.targetPX,dt,4.2);
      state.pointerY=spring(state.pointerY,state.targetPY,dt,4.2);
      state.x=spring(state.x,state.tx,dt,1.35);
      state.y=spring(state.y,state.ty,dt,1.55);
      state.rot=spring(state.rot,state.trot,dt,1.9);
      state.look=spring(state.look,state.tlook,dt,2.05);
      state.lift=spring(state.lift,state.tlift,dt,1.7);
      state.wave=spring(state.wave,state.twave,dt,1.45);
      state.waveSpeed=spring(state.waveSpeed,state.twaveSpeed,dt,1.2);
      state.coil=spring(state.coil,state.tcoil,dt,1.6);
      state.phase+=dt*state.waveSpeed*3.05;

      const cw=snakeCanvas.width,ch=snakeCanvas.height;
      ctx.clearRect(0,0,cw,ch);
      const scale=Math.min((cw*.62)/sw,(ch*.70)/sh);
      const dw=sw*scale,dh=sh*scale;
      const baseX=(cw-dw)/2+state.x+state.pointerX;
      const baseY=(ch-dh)/2+state.y+state.pointerY;

      ctx.save();
      ctx.translate(cw/2+state.x,ch/2+state.y);
      ctx.rotate(state.rot*Math.PI/180);
      ctx.translate(-(cw/2+state.x),-(ch/2+state.y));

      // The original mascot is preserved. Thin source rows are only displaced,
      // producing a travelling S-wave and a softer delayed tail.
      const slice=2;
      for(let sy=0;sy<sh;sy+=slice){
        const nh=Math.min(slice,sh-sy);
        const ny=sy/sh;

        // Body motion: strongest through the middle, quieter at head/tail.
        const bodyEnvelope=.22+.78*Math.sin(Math.PI*ny);
        const tailLag=Math.max(0,(ny-.58)/.42);
        const headZone=Math.max(0,1-ny/.44);

        const primary=Math.sin(state.phase-ny*7.4)*state.wave;
        const secondary=Math.sin(state.phase*.57-ny*3.25+1.4)*(state.wave*.34);
        const delayedTail=Math.sin(state.phase*.82-ny*9.1-1.1)*(state.wave*.42)*tailLag;

        // "Looking": the head/neck shifts and rises independently while the body stays planted.
        const lookX=state.look*10.5*headZone;
        const lookY=-state.lift*headZone;
        const neckCounter=-state.look*2.7*Math.max(0,1-Math.abs(ny-.43)/.22);

        // Coil compresses the lower body very slightly during a pause/turn.
        const coilShift=state.coil*Math.sin((ny-.56)*Math.PI*2.25)*3.1*Math.max(0,(ny-.48)/.52);

        const dx=(primary+secondary)*bodyEnvelope+delayedTail+lookX+neckCounter+coilShift;
        const dy=Math.cos(state.phase*.74-ny*4.7)*.8*bodyEnvelope+lookY;

        // A tiny horizontal breathing change sells weight without changing identity.
        const breathe=1+(Math.sin(now*.0014+ny*2.3)*.0018)*(1-headZone*.65);
        const rowW=dw*breathe;
        const rowX=baseX+dx-(rowW-dw)/2;
        ctx.drawImage(sprite,0,sy,sw,nh,rowX,baseY+sy*scale+dy,rowW,nh*scale+.75);
      }

      // Soft grounded shadow follows the body rather than floating with it.
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