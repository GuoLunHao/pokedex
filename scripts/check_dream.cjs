const fs = require('fs');
const files = fs.readdirSync('./data/images/dream');
['0233','0474','0563','0867','0983','0675','0778','0827','0828','0848',
 '0128','0744','0745','0746','0774','1024'].forEach(id => {
  const prefix3 = id.slice(1);
  const prefix4 = id;
  const matches = files.filter(f => f.startsWith(prefix3) || f.startsWith(prefix4));
  console.log(id + ':', matches.length ? matches.join(', ') : 'NONE');
});
