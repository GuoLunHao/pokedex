const axios=require('axios');
const cheerio=require('cheerio');
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function main(){
  const r=await axios.get('https://wiki.52poke.com/wiki/%E6%B3%A2%E6%B3%A2/%E7%AC%AC%E4%B9%9D%E4%B8%96%E4%BB%A3%E6%8B%9B%E5%BC%8F%E8%A1%A8',{headers:{'User-Agent':UA,'Accept-Language':'zh-Hans'},timeout:15000});
  const $=cheerio.load(r.data);
  
  console.log('Tables with .roundy class:', $('.roundy').length);
  console.log('Tables containing .roundy descendant:', $('table:has(.roundy)').length);
  
  console.log('\nHeadings:');
  $('h3,h4,h5').each((i,el)=>console.log(' ',el.tagName+':',$(el).text().trim().substring(0,40)));
  
  // Test findTbl
  function findTbl($, h, label){
    let el=null;
    $('h3,h4,h5').each((_,e)=>{if($(e).text().trim().includes(h)){el=e;return false;}});
    if(!el){console.log('NOT FOUND:',h);return null;}
    console.log('\nFOUND:',h,'at',el.tagName);
    const s=$(el).nextUntil('h2,h3,h4,h5');
    console.log('  siblings:', s.length);
    s.each((i,si)=>console.log('  ['+i+']',si.tagName,si.attribs?.class||''));
    let t=s.filter('table.roundy').first();
    if(t.length){console.log('  direct roundy! rows:', t.find('tr').length);return t;}
    const tg=s.find('div.toggle-content').first();
    if(tg.length){t=tg.find('table.roundy').first();if(t.length){console.log('  in toggle! rows:', t.length);return t;}}
    t=s.find('table.roundy').first();
    if(t.length){console.log('  nested roundy! rows:', t.find('tr').length);return t;}
    // Also try finding the wrapping table structure
    const wrapper = s.filter('table').first();
    if(wrapper.length){
      const inner = wrapper.find('.roundy');
      console.log('  wrapper table with inner roundy:', inner.length);
      if(inner.length) console.log('  inner rows:', inner.find('tr').length);
    }
    console.log('  No table found');
    return null;
  }
  
  console.log('\n=== findTbl tests ===');
  const lt=findTbl($,'可学会的招式');
  if(lt){
    // Check data rows (skip header rows)
    var allRows=lt.find('tr');
    for(var i=5;i<Math.min(10,allRows.length);i++){
      var cells=$(allRows[i]).find('th');
      console.log('Data Row',i,':',cells.length,'th |',cells.map((j,c)=>$(c).text().trim()).get().join(' | '));
    }
    // Check if data cells might be td or th
    var firstDataRow=allRows.eq(5);
    var allCells=firstDataRow.find('td,th');
    console.log('\nRow 5 cell types:', allCells.map((i,c)=>c.tagName).get().join(','));
    console.log('Row 5 HTML:', firstDataRow.html()?.substring(0,400));
  }
  
  const tt=findTbl($,'能使用的招式学习器');
  if(tt){
    tt.find('tr').slice(0,2).each((i,row)=>{
      const cols=$(row).find('td');
      console.log('TM Row',i,':',cols.length,'cols |',cols.map((j,c)=>$(c).text().trim()).get().join(' | '));
    });
  }
}
main().catch(e=>console.log('ERROR:',e.message.substring(0,100)));
