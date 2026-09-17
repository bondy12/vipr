const $ = (s) => document.querySelector(s);
const result = $('#scan-result');
const form = $('#wallet-form');
const input = $('#wallet-input');
const networkState = $('#network-state');

const short = (a) => a ? `${a.slice(0,6)}…${a.slice(-4)}` : '—';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function json(url) {
  const r = await fetch(url, { cache: 'no-store' });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
  return body;
}

function renderDemo(p) {
  const d = p.score.dimensions, m = p.score.metrics;
  result.innerHTML = `
    <div class="result-head">
      <div><code>${esc(short(p.wallet.address))}</code><div class="live-tape-note" style="margin:10px 0 0">Synthetic walkthrough. Same deterministic scoring path used by the CLI.</div></div>
      <span class="result-badge">${esc(p.archetype)} · ${esc(p.score.evidenceLabel.toUpperCase())} EVIDENCE</span>
    </div>
    <div class="result-rank">${p.score.rank}<small>/1000 VIPR RANK</small></div>
    <div class="result-grid">
      ${Object.entries(d).map(([k,v]) => `<div><small>${esc(k.toUpperCase())}</small><b>${v}</b></div>`).join('')}
    </div>
    <div class="result-grid" style="grid-template-columns:repeat(4,1fr)">
      <div><small>MEDIAN HOLD</small><b>${Math.round(m.medianHoldMinutes)}m</b></div>
      <div><small>EARLY HITS</small><b>${m.earlyHitRate.toFixed(0)}%</b></div>
      <div><small>ROUNDTRIPS</small><b>${m.roundtripRate.toFixed(0)}%</b></div>
      <div><small>MAX CONC.</small><b>${m.maxConcentrationPct.toFixed(0)}%</b></div>
    </div>
    <div class="badges-line" style="margin-top:18px">${p.badges.map((b) => `<span>${esc(b)}</span>`).join('')}</div>`;
  result.hidden = false;
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderLive(p) {
  result.innerHTML = `
    <div class="result-head">
      <div><code>${esc(short(p.wallet))}</code><div class="live-tape-note" style="margin:10px 0 0">Live public-RPC observation · blocks ${p.scannedFromBlock.toLocaleString()} → ${p.latestBlock.toLocaleString()}</div></div>
      <span class="result-badge">LIVE TAPE · NOT SCORED</span>
    </div>
    <div class="result-rank">${p.transferEvents}<small> ERC-20 TRANSFER EVENTS</small></div>
    <div class="result-grid" style="grid-template-columns:repeat(5,1fr)">
      <div><small>INCOMING</small><b>${p.incomingTransfers}</b></div>
      <div><small>OUTGOING</small><b>${p.outgoingTransfers}</b></div>
      <div><small>TOKENS</small><b>${p.distinctTokens}</b></div>
      <div><small>WINDOW</small><b>${p.scannedBlocks.toLocaleString()}</b></div>
      <div><small>ETH</small><b>${p.nativeBalanceEth.toFixed(4)}</b></div>
    </div>
    <div class="live-tape-note">${esc(p.scoreReason)}</div>
    ${p.recent.length ? `<table class="event-table"><tbody>${p.recent.slice(0,8).map((e) => `<tr><td>${e.side}</td><td>${esc(short(e.token))}</td><td>block ${e.block.toLocaleString()}</td><td>${esc(short(e.tx))}</td></tr>`).join('')}</tbody></table>` : '<div class="live-tape-note">No ERC-20 transfer events were returned in this short public-RPC window.</div>'}`;
  result.hidden = false;
  result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function loadDemo() {
  result.hidden = false;
  result.innerHTML = '<div class="live-tape-note">Building deterministic receipt…</div>';
  try { renderDemo(await json('/api/demo')); }
  catch (e) { result.innerHTML = `<div class="live-tape-note">${esc(e.message)}</div>`; }
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const wallet = input.value.trim();
  if (!wallet || wallet.toLowerCase() === 'demo') return loadDemo();
  result.hidden = false;
  result.innerHTML = '<div class="live-tape-note">Reading Robinhood Chain public RPC…</div>';
  try { renderLive(await json(`/api/inspect?wallet=${encodeURIComponent(wallet)}`)); }
  catch (e) { result.innerHTML = `<div class="live-tape-note">${esc(e.message)}</div>`; }
});

$('#demo-button')?.addEventListener('click', () => { input.value = 'demo'; loadDemo(); });
$('#hero-demo')?.addEventListener('click', () => { document.querySelector('#scan').scrollIntoView({behavior:'smooth'}); input.value='demo'; setTimeout(loadDemo,300); });

(async () => {
  try {
    const h = await json('/api/health');
    networkState.classList.add(h.ok ? 'ok' : 'bad');
    networkState.innerHTML = `<span></span> chain ${h.chainId} · block ${Number(h.blockNumber).toLocaleString()}`;
  } catch {
    networkState.classList.add('bad');
    networkState.innerHTML = '<span></span> public RPC unavailable';
  }
})();
