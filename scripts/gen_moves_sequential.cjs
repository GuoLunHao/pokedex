/*
 * gen_moves_sequential.cjs — 从 0001 开始顺序补全世代招式数据
 * 用法: node gen_moves_sequential.cjs [起始编号]
 * 每只宝可梦补完才跑下一只，出现限流时显示当前编号方便恢复
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

const DIR = path.join(__dirname, '..', 'data', 'pokemon');
const DEX = path.join(__dirname, '..', 'data', 'pokedex', 'national.json');
const NUM = ['零','一','二','三','四','五','六','七','八','九'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Parsers ──
function pLv($, t) {
  const m=[]; t.find('tr').each((_,r)=>{
    const c=$(r).find('td'); if(c.length<8) return;
    const n=$(c[2]).text().trim().replace('[详]','').trim(); if(!n) return;
    m.push({level:$(c[0]).text().trim(),name:n,type:$(c[3]).text().trim(),category:$(c[4]).text().trim(),power:$(c[5]).text().trim(),accuracy:$(c[6]).text().trim(),pp:$(c[7]).text().trim()});
  }); return m;
}
function pTM($, t) {
  const m=[]; t.find('tr').each((_,r)=>{
    const c=$(r).find('td'); if(c.length<8) return;
    const n=$(c[2]).text().trim().replace('[详]','').trim(); if(!n) return;
    m.push({machine:$(c[1]).text().trim(),name:n,type:$(c[3]).text().trim(),category:$(c[4]).text().trim(),power:$(c[5]).text().trim(),accuracy:$(c[6]).text().trim(),pp:$(c[7]).text().trim()});
  }); return m;
}
function pEgg($, t) {
  const m=[]; t.find('tr').each((_,r)=>{
    const c=$(r).find('td'); if(c.length<7) return;
    const n=$(c[1]).text().trim().replace('[详]','').trim(); if(!n) return;
    const p=[]; $(c[0]).find('[data-msp]').each((_,e)=>{
      const s=$(e).attr('data-msp'); if(!s) return;
      s.split(',').forEach(x=>{const y=x.split('\\');p.push({id:y[0]||null,name:y[1]||x});});
    });
    $(c[0]).find('a').each((_,l)=>{const t=$(l).attr('title'); if(t&&!p.some(x=>x.name===t)) p.push({id:null,name:t});});
    m.push({parents:p,name:n,type:$(c[2]).text().trim(),category:$(c[3]).text().trim(),power:$(c[4]).text().trim(),accuracy:$(c[5]).text().trim(),pp:$(c[6]).text().trim()});
  }); return m;
}
function pTu($, t) {
  const m=[]; t.find('tr').each((_,r)=>{
    const c=$(r).find('td'); if(c.length<6) return;
    const n=$(c[0]).text().trim().replace('[详]','').trim(); if(!n) return;
    m.push({name:n,type:$(c[1]).text().trim(),category:$(c[2]).text().trim(),power:$(c[3]).text().trim(),accuracy:$(c[4]).text().trim(),pp:$(c[5]).text().trim()});
  }); return m;
}
function findTbl($, h) {
  let el=null; $('h3,h4,h5').each((_,e)=>{if($(e).text().trim().includes(h)){el=e;return false;}});
  if(!el) return null;
  const s=$(el).nextUntil('h2,h3,h4,h5');
  let t=s.filter('table.roundy').first(); if(t.length) return t;
  const tg=s.find('div.toggle-content').first();
  if(tg.length){t=tg.find('table.roundy').first(); if(t.length) return t;}
  t=s.find('table.roundy').first(); return t.length?t:null;
}

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
      if (e.response?.status===404) { return {lv:[],tm:[],egg:[],tu:[]}; }
      if (e.response?.status===429) {
        const w = Math.min(6000 * a + Math.random()*4000, 30000);
        console.log(`      ⚠ 429 on G${gen}, retry ${a}/${retries}, wait ${Math.round(w/1000)}s`);
        await sleep(w); continue;
      }
      if (a<retries) { await sleep(3000*a); continue; }
      console.log(`      ❌ FAILED G${gen}: ${e.message?.slice(0,80)}`);
      return {lv:[],tm:[],egg:[],tu:[]};
    }
  }
  return {lv:[],tm:[],egg:[],tu:[]};
}

async function main() {
  const startId = parseInt(process.argv[2] || '1');
  const dex = JSON.parse(fs.readFileSync(DEX, 'utf-8'));
  const dexMap = {}; dex.forEach(e => { dexMap[e.id] = e.gen; });

  // Get and sort all Pokémon files by ID
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json'));
  files.sort((a, b) => parseInt(a) - parseInt(b));

  // Find starting index
  let startIdx = files.findIndex(f => parseInt(f) >= startId);
  if (startIdx === -1) { console.log('起始编号超出范围'); return; }

  console.log(`从 #${String(startId).padStart(4,'0')} 开始，共 ${files.length} 只`);
  let totalFetched = 0;

  for (let i = startIdx; i < files.length; i++) {
    const fp = path.join(DIR, files[i]);
    const d = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const pid = d.pokedex_id;
    const name = d.name_zh;
    const debut = dexMap[pid] || 1;

    // Find missing generations
    const existing = new Set((d.learnable_moves||[]).filter(g=>g.generation!=null).map(g=>g.generation));
    const missing = [];
    for (let g = debut; g <= 9; g++) {
      if (!existing.has(g)) missing.push(g);
    }

    if (missing.length === 0) {
      console.log(`[${i+1}/${files.length}] #${String(pid).padStart(4,'0')} ${name} ✅ 已完成`);
      continue;
    }

    console.log(`\n[${i+1}/${files.length}] #${String(pid).padStart(4,'0')} ${name} 现有 ${existing.size} 组，缺 ${missing.join(',')}`);
    
    let addedGens = 0;
    for (const gen of missing) {
      const g = await scrapeGen(name, gen);
      if (g.lv.length) { d.learnable_moves.push(...g.lv); addedGens++; }
      if (g.tm.length) { d.machine_moves.push(...g.tm); }
      if (g.egg.length) { if(!d.egg_moves) d.egg_moves=[]; d.egg_moves.push(...g.egg); }
      if (g.tu.length) { if(!d.tutor_moves) d.tutor_moves=[]; d.tutor_moves.push(...g.tu); }
      totalFetched++;
      // Delay between gen requests
      await sleep(3500 + Math.random() * 1000);
    }

    // Sort generations
    d.learnable_moves.sort((a,b)=>a.generation-b.generation);
    d.machine_moves.sort((a,b)=>a.generation-b.generation);
    if (d.egg_moves) d.egg_moves.sort((a,b)=>a.generation-b.generation);
    if (d.tutor_moves) d.tutor_moves.sort((a,b)=>a.generation-b.generation);

    fs.writeFileSync(fp, JSON.stringify(d, null, 2), 'utf8');
    const now = (d.learnable_moves||[]).filter(x=>x.generation!=null).length;
    console.log(`  ✅ 完成 — 现有 ${now} 组 (新增 ${addedGens} 组)`);

    // Delay between Pokémon
    await sleep(1000);
  }

  // Final summary
  console.log(`\n========== 补跑完成 ==========`);
  let full=0, part=0, empty=0;
  files.forEach(f=>{
    const d=JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'));
    const g=(d.learnable_moves||[]).filter(x=>x.generation!=null).length;
    if(g>=6) full++; else if(g>0) part++; else empty++;
  });
  console.log(`完整(≥6): ${full}  部分(1-5): ${part}  空(0): ${empty}`);
  console.log(`共抓取 ${totalFetched} 个世代页面`);
}

main().catch(e => {
  console.error('脚本异常:', e?.message);
  process.exit(1);
});
