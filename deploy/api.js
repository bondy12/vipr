
const RPC = process.env.VIPR_RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

function send(res, status, body) {
  res.status(status);
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(body));
}
function validAddress(v){ return /^0x[a-fA-F0-9]{40}$/.test(String(v||'')); }
function topicAddress(a){ return '0x'+'0'.repeat(24)+a.slice(2).toLowerCase(); }
async function rpc(method, params=[]) {
  const r = await fetch(RPC,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  if(!r.ok) throw new Error('RPC HTTP '+r.status);
  const j = await r.json();
  if(j.error) throw new Error(j.error.message || 'RPC error');
  return j.result;
}
const demo = {
  wallet:{address:'0x6900000000000000000000000000000000000420',label:'synthetic-first-wave',synthetic:true},
  score:{
    rank:982,evidenceLabel:'high',
    dimensions:{timing:91,exits:100,discipline:100,survival:100,repeatability:100,evidence:100},
    metrics:{medianHoldMinutes:26,earlyHitRate:90,roundtripRate:0,maxConcentrationPct:24}
  },
  archetype:'FIRST WAVE',
  badges:['EARLY BLOOD','DIAMOND SCALES','RUG SURVIVOR','CLEAN RECEIPTS']
};

export default async function handler(req,res){
  try{
    const pathname = new URL(req.url,'https://vipr.local').pathname;
    if(pathname.endsWith('/demo')) return send(res,200,{...demo,observedAt:new Date().toISOString()});
    if(pathname.endsWith('/health')){
      const [chainHex,blockHex]=await Promise.all([rpc('eth_chainId'),rpc('eth_blockNumber')]);
      const chainId=parseInt(chainHex,16), blockNumber=parseInt(blockHex,16);
      return send(res,200,{ok:chainId===4663,chainId,blockNumber,observedAt:new Date().toISOString()});
    }
    if(pathname.endsWith('/inspect')){
      const wallet=(req.query?.wallet || '').toLowerCase();
      if(!validAddress(wallet)) return send(res,400,{error:'Enter a valid EVM wallet address.'});
      const latest=parseInt(await rpc('eth_blockNumber'),16);
      const from=Math.max(0,latest-12000), fromHex='0x'+from.toString(16), toHex='0x'+latest.toString(16), wt=topicAddress(wallet);
      const [balHex,incoming,outgoing]=await Promise.all([
        rpc('eth_getBalance',[wallet,'latest']),
        rpc('eth_getLogs',[{fromBlock:fromHex,toBlock:toHex,topics:[TRANSFER_TOPIC,null,wt]}]).catch(()=>[]),
        rpc('eth_getLogs',[{fromBlock:fromHex,toBlock:toHex,topics:[TRANSFER_TOPIC,wt]}]).catch(()=>[])
      ]);
      const all=[...incoming.map(x=>({...x,side:'IN'})),...outgoing.map(x=>({...x,side:'OUT'}))]
        .sort((a,b)=>parseInt(b.blockNumber,16)-parseInt(a.blockNumber,16));
      const tokens=new Set(all.map(x=>x.address.toLowerCase()));
      return send(res,200,{
        mode:'live-tape',wallet,chainId:4663,latestBlock:latest,scannedFromBlock:from,scannedBlocks:latest-from,
        nativeBalanceEth:Number(BigInt(balHex))/1e18,transferEvents:all.length,incomingTransfers:incoming.length,
        outgoingTransfers:outgoing.length,distinctTokens:tokens.size,
        recent:all.slice(0,12).map(x=>({side:x.side,token:x.address.toLowerCase(),block:parseInt(x.blockNumber,16),tx:x.transactionHash})),
        scoreStatus:'not-scored',
        scoreReason:'A short public-RPC transfer window is useful evidence, but it is not enough to reconstruct entry cost, exits, market age, peak value or swap provenance honestly.',
        evidence:{transferWindow:true,swapProvenance:false,completePositionBook:false,marketBirth:false,exitCostBasis:false},
        observedAt:new Date().toISOString()
      });
    }
    return send(res,404,{error:'Not found'});
  }catch(error){
    return send(res,503,{error:error?.message || String(error)});
  }
}
