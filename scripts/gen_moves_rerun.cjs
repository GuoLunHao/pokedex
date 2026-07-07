const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const DIR = path.join(__dirname, '..', 'data', 'pokemon');
const DEX = path.join(__dirname, '..', 'data', 'pokedex', 'national.json');
const NUM = ['零','一','二','三','四','五','六','七','八','九'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Parsers (same as generation_moves.js) ──────────────
function pLv($, t) { const m=[]; t.find('tr').each((_,r)=>{const c=$(r).find('td');if(c.length<8)return;const n=$(c[2]).text().trim().replace('[详]','').trim();if(!n)return;m.push({level:$(c[0]).text().trim(),name:n,type:$(c[3]).text().trim(),category:$(c[4]).text().trim(),power:$(c[5]).text().trim(),accuracy:$(c[6]).text().trim(),pp:$(c[7]).text().trim()});});return m;}
function pTM($, t) { const m=[]; t.find('tr').each((_,r)=>{const c=$(r).find('td');if(c.length<8)return;const n=$(c[2]).text().trim().replace('[详]','').trim();if(!n)return;m.push({machine:$(c[1]).text().trim(),name:n,type:$(c[3]).text().trim(),category:$(c[4]).text().trim(),power:$(c[5]).text().trim(),accuracy:$(c[6]).text().trim(),pp:$(c[7]).text().trim()});});return m;}
function pEgg($, t) { const m=[]; t.find('tr').each((_,r)=>{const c=$(r).find('td');if(c.length<7)return;const n=$(c[1]).text().trim().replace('[详]','').trim();if(!n)return;const p=[];$(c[0]).find('[data-msp]').each((_,e)=>{const s=$(e).attr('data-msp');if(!s)return;s.split(',').forEach(x=>{const y=x.split('\\');p.push({id:y[0]||null,name:y[1]||x});});});$(c[0]).find('a').each((_,l)=>{const t=$(l).attr('title');if(t&&!p.some(x=>x.name===t))p.push({id:null,name:t});});m.push({parents:p,name:n,type:$(c[2]).text().trim(),category:$(c[3]).text().trim(),power:$(c[4]).text().trim(),accuracy:$(c[5]).text().trim(),pp:$(c[6]).text().trim()});});return m;}
function pTu($, t) { const m=[]; t.find('tr').each((_,r)=>{const c=$(r).find('td');if(c.length<6)return;const n=$(c[0]).text().trim().replace('[详]','').trim();if(!n)return;m.push({name:n,type:$(c[1]).text().trim(),category:$(c[2]).text().trim(),power:$(c[3]).text().trim(),accuracy:$(c[4]).text().trim(),pp:$(c[5]).text().trim()});});return m;}
function findTbl($, h) { let el=null; $('h3,h4,h5').each((_,e)=>{if($(e).text().trim().includes(h)){el=e;return false;}}); if(!el)return null; const s=$(el).nextUntil('h2,h3,h4,h5'); let t=s.filter('table.roundy').first(); if(t.length)return t; const tg=s.find('div.toggle-content').first(); if(tg.length){t=tg.find('table.roundy').first();if(t.length)return t;} t=s.find('table.roundy').first(); return t.length?t:null;}

async function scrapeGen(name, gen, retries=10) {
  for (let a=1;a<=retries;a++) {
    try {
      const url = `https://wiki.52poke.com/wiki/${encodeURIComponent(name)}/第${NUM[gen]}世代招式表`;
      const r = await axios.get(url, {headers:{'User-Agent':UA,'Accept-Language':'zh-Hans'},timeout:25000});
      const $ = cheerio.load(r.data);
      const out = {lv:[],tm:[],egg:[],tu:[]};
      const lt=findTbl($,'可学会的招式'); if(lt){const m=pLv($,lt);if(m.length)out.lv=[{form:'一般',generation:gen,data:m}];}
      const tt=findTbl($,'能使用的招式学习器'); if(tt){const m=pTM($,tt);if(m.length)out.tm=[{form:'一般',generation:gen,data:m}];}
      const et=findTbl($,'蛋招式'); if(et){const m=pEgg($,et);if(m.length)out.egg=[{form:'一般',generation:gen,data:m}];}
      const ut=findTbl($,'教授招式'); if(ut){const m=pTu($,ut);if(m.length)out.tu=[{form:'一般',generation:gen,data:m}];}
      return out;
    } catch(e) {
      if (e.response?.status===404) return {lv:[],tm:[],egg:[],tu:[]};
      if (e.response?.status===429) {
        const w = Math.min(8000 * a + Math.random()*5000, 60000);
        console.log(`    429 on ${gen}, retry ${a}, wait ${Math.round(w/1000)}s`);
        await sleep(w); continue;
      }
      if (a<retries) { await sleep(3000*a); continue; }
      console.log(`    FAILED on ${gen}: ${e.message.slice(0,80)}`);
      return {lv:[],tm:[],egg:[],tu:[]};
    }
  }
  return {lv:[],tm:[],egg:[],tu:[]};
}

async function processOne(fp) {
  const d = JSON.parse(fs.readFileSync(fp,'utf8'));
  const name = d.name_zh, pid = d.pokedex_id;
  const dex = JSON.parse(fs.readFileSync(DEX,'utf8'));
  const entry = dex.find(e=>e.id===pid);
  const debut = entry ? entry.gen : 1;

  // Check existing
  const existing = new Set((d.learnable_moves||[]).filter(g=>g.generation!=null).map(g=>g.generation));
  const missing = []; for (let g=debut; g<=9; g++) if (!existing.has(g)) missing.push(g);

  if (missing.length === 0) return `${pid} ${name}: already complete (${existing.size} gens)`;

  // Full scrape for empty ones, incremental for partial
  const isFullScrape = existing.size === 0;
  const allLv=[], allTM=[], allEgg=[], allTu=[];

  for (const gen of missing) {
    console.log(`  ${pid} ${name}: fetching Gen ${gen}...`);
    const g = await scrapeGen(name, gen);
    if (g.lv.length) allLv.push(...g.lv);
    if (g.tm.length) allTM.push(...g.tm);
    if (g.egg.length) allEgg.push(...g.egg);
    if (g.tu.length) allTu.push(...g.tu);
    await sleep(2500); // generous delay
  }

  if (isFullScrape) {
    d.learnable_moves = allLv;
    d.machine_moves = allTM;
    d.egg_moves = allEgg.length ? allEgg : undefined;
    if (allTu.length) d.tutor_moves = allTu;
  } else {
    d.learnable_moves.push(...allLv);
    d.machine_moves.push(...allTM);
    if (allEgg.length) { if(!d.egg_moves) d.egg_moves=[]; d.egg_moves.push(...allEgg); }
    if (allTu.length) { if(!d.tutor_moves) d.tutor_moves=[]; d.tutor_moves.push(...allTu); }
  }

  // Sort
  d.learnable_moves.sort((a,b)=>a.generation-b.generation);
  d.machine_moves.sort((a,b)=>a.generation-b.generation);
  if (d.egg_moves) d.egg_moves.sort((a,b)=>a.generation-b.generation);
  if (d.tutor_moves) d.tutor_moves.sort((a,b)=>a.generation-b.generation);

  fs.writeFileSync(fp, JSON.stringify(d,null,2), 'utf8');
  return `${pid} ${name}: ${allLv.length} groups added (${isFullScrape?'full':'incremental'})`;
}

async function main() {
  const files = fs.readdirSync(DIR).filter(f=>f.endsWith('.json'));
  // Pick only those with < 2 gen groups (empty or near-empty)
  const targets = files.filter(f=>{
    const d=JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'));
    return (d.learnable_moves||[]).filter(g=>g.generation!=null).length < 2;
  });
  console.log(`Processing ${targets.length} empty/near-empty Pokémon (concurrency=3)...\n`);

  for (let i=0; i<targets.length; i+=3) {
    const batch = targets.slice(i, i+3);
    const results = await Promise.allSettled(batch.map(f => processOne(path.join(DIR, f))));
    for (let j=0; j<results.length; j++) {
      const r = results[j];
      if (r.status === 'fulfilled') {
        console.log(`[${Math.min(i+j+1, targets.length)}/${targets.length}] ${r.value}`);
      } else {
        console.log(`[${Math.min(i+j+1, targets.length)}/${targets.length}] ${batch[j].slice(0,8)}: ERROR ${r.reason?.message?.slice(0,80)}`);
      }
    }
    await sleep(1000);
    const fp = path.join(DIR, targets[i]);
    try {
      const r = await processOne(fp);
      console.log(`[${i+1}/${targets.length}] ${r}`);
    } catch(e) {
      console.log(`[${i+1}/${targets.length}] ${targets[i].slice(0,8)}: ERROR ${e.message.slice(0,80)}`);
    }
    await sleep(500);
  }

  // Summary
  let full=0,part=0,empty=0;
  files.forEach(f=>{const d=JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'));const g=(d.learnable_moves||[]).filter(x=>x.generation!=null).length;if(g>=6)full++;else if(g>0)part++;else empty++;});
  console.log(`\nFinal: complete=${full} partial=${part} empty=${empty}`);
}

main().catch(console.error);
