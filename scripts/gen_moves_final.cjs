const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const DIR = path.join(__dirname, '..', 'data', 'pokemon');
const DEX = path.join(__dirname, '..', 'data', 'pokedex', 'national.json');
const NUM = ['零','一','二','三','四','五','六','七','八','九'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Parsers (supports both 7-col Z-A and 8-col standard format) ──
function pLv($, t) { const m=[]; t.find('tr').each((_,r)=>{const c=$(r).find('td');if(c.length<7)return;const n=$(c[2]).text().trim().replace('[详]','').trim();if(!n)return;const obj={level:$(c[0]).text().trim(),name:n,type:$(c[3]).text().trim(),category:$(c[4]).text().trim(),power:$(c[5]).text().trim()};if(c.length>=8){obj.accuracy=$(c[6]).text().trim();obj.pp=$(c[7]).text().trim();}else{obj.accuracy='—';obj.pp='—';}m.push(obj);});return m;}
function pTM($, t) { const m=[]; t.find('tr').each((_,r)=>{const c=$(r).find('td');if(c.length<7)return;const n=c.length>=8?$(c[2]).text().trim().replace('[详]','').trim():$(c[1]).text().trim().replace('[详]','').trim();if(!n)return;const obj={};if(c.length>=8){obj.machine=$(c[1]).text().trim();obj.name=n;obj.type=$(c[3]).text().trim();obj.category=$(c[4]).text().trim();obj.power=$(c[5]).text().trim();obj.accuracy=$(c[6]).text().trim();obj.pp=$(c[7]).text().trim();}else{obj.machine=$(c[0]).text().trim();obj.name=n;obj.type=$(c[2]).text().trim();obj.category=$(c[3]).text().trim();obj.power=$(c[4]).text().trim();obj.accuracy='—';obj.pp='—';}m.push(obj);});return m;}
function pEgg($, t) { const m=[]; t.find('tr').each((_,r)=>{const c=$(r).find('td');if(c.length<7)return;const n=$(c[1]).text().trim().replace('[详]','').trim();if(!n)return;const p=[];$(c[0]).find('[data-msp]').each((_,e)=>{const s=$(e).attr('data-msp');if(!s)return;s.split(',').forEach(x=>{const y=x.split('\\');p.push({id:y[0]||null,name:y[1]||x});});});$(c[0]).find('a').each((_,l)=>{const t=$(l).attr('title');if(t&&!p.some(x=>x.name===t))p.push({id:null,name:t});});m.push({parents:p,name:n,type:$(c[2]).text().trim(),category:$(c[3]).text().trim(),power:$(c[4]).text().trim(),accuracy:$(c[5]).text().trim(),pp:$(c[6]).text().trim()});});return m;}
function pTu($, t) { const m=[]; t.find('tr').each((_,r)=>{const c=$(r).find('td');if(c.length<6)return;const n=$(c[0]).text().trim().replace('[详]','').trim();if(!n)return;m.push({name:n,type:$(c[1]).text().trim(),category:$(c[2]).text().trim(),power:$(c[3]).text().trim(),accuracy:$(c[4]).text().trim(),pp:$(c[5]).text().trim()});});return m;}
function findTbl($, h) { let el=null; $('h3,h4,h5').each((_,e)=>{if($(e).text().trim().includes(h)){el=e;return false;}}); if(!el&&h==='教授招式'){$('h3,h4,h5').each((_,e)=>{if($(e).text().trim().includes('特殊招式')){el=e;return false;}});} if(!el)return null; const s=$(el).nextUntil('h2,h3,h4,h5'); let t=s.filter('table.roundy').first(); if(t.length)return t; const tg=s.find('div.toggle-content').first(); if(tg.length){t=tg.find('table.roundy').first();if(t.length)return t;} t=s.find('table.roundy').first(); return t.length?t:null;}

async function scrapeGen(name, gen, retries=12) {
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
        const w = Math.min(6000 * a + Math.random()*4000, 40000);
        console.log(`      429 on G${gen}, retry ${a}, wait ${Math.round(w/1000)}s`);
        await sleep(w); continue;
      }
      if (a<retries) { await sleep(3000*a); continue; }
      console.log(`      FAILED G${gen}: ${e.message?.slice(0,60)}`);
      return {lv:[],tm:[],egg:[],tu:[]};
    }
  }
  return {lv:[],tm:[],egg:[],tu:[]};
}

async function main() {
  const files = fs.readdirSync(DIR).filter(f=>f.endsWith('.json'));
  const dex = JSON.parse(fs.readFileSync(DEX,'utf8'));

  // Filter: any missing generations from debut to 9
  const dexMap = {};
  dex.forEach(e => dexMap[e.id] = e.gen);
  const incomplete = files.filter(f=>{
    const d=JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'));
    const eg=(d.learnable_moves||[]).filter(g=>g.generation!=null).map(g=>g.generation);
    const debut=dexMap[d.pokedex_id]||1;
    for (let g=debut; g<=9; g++) if (!eg.includes(g)) return true;
    return false;
  });

  console.log(`需补跑: ${incomplete.length} 只 (存在缺失世代)\n`);

  let startTime = Date.now();
  let completed = 0;

  for (let i=0; i<incomplete.length; i++) {
    const fp = path.join(DIR, incomplete[i]);
    const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const name = d.name_zh, pid = d.pokedex_id;

    const entry = dex.find(e=>e.id===pid);
    const debut = entry ? entry.gen : 1;

    const existing = new Set((d.learnable_moves||[]).filter(g=>g.generation!=null).map(g=>g.generation));
    const missing = [];
    for (let g=debut; g<=9; g++) if (!existing.has(g)) missing.push(g);

    if (!missing.length) { completed++; continue; }

    let added = 0;
    for (const gen of missing) {
      const g = await scrapeGen(name, gen);
      if (g.lv.length) { d.learnable_moves.push(...g.lv); added++; }
      if (g.tm.length) { d.machine_moves.push(...g.tm); }
      if (g.egg.length) { if(!d.egg_moves) d.egg_moves=[]; d.egg_moves.push(...g.egg); }
      if (g.tu.length) { if(!d.tutor_moves) d.tutor_moves=[]; d.tutor_moves.push(...g.tu); }
      await sleep(3500); // generous delay to avoid 429
    }

    // Sort & save
    d.learnable_moves.sort((a,b)=>a.generation-b.generation);
    d.machine_moves.sort((a,b)=>a.generation-b.generation);
    if (d.egg_moves) d.egg_moves.sort((a,b)=>a.generation-b.generation);
    if (d.tutor_moves) d.tutor_moves.sort((a,b)=>a.generation-b.generation);
    fs.writeFileSync(fp, JSON.stringify(d,null,2), 'utf8');

    completed++;
    const now = (d.learnable_moves||[]).filter(x=>x.generation!=null).length;
    const elapsed = Math.round((Date.now()-startTime)/1000);
    const rate = (completed / elapsed * 60).toFixed(1);
    console.log(`[${completed}/${incomplete.length} ${elapsed}s ${rate}/min] ${pid} ${name}: +${added} gens → now ${now} gens`);
    await sleep(500);
  }

  // Summary
  let full=0,part=0,empty=0;
  files.forEach(f=>{const d=JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'));const g=(d.learnable_moves||[]).filter(x=>x.generation!=null).length;if(g>=6)full++;else if(g>0)part++;else empty++;});
  console.log(`\n=== 完成 ===`);
  console.log(`耗时: ${Math.round((Date.now()-startTime)/1000)}s`);
  console.log(`完整(≥6): ${full}  部分(1-5): ${part}  空(0): ${empty}`);
}

main().catch(console.error);
