const fs = require('fs');
const files = fs.readdirSync('./data/images/dream');

const names = ['Wormadam','Tauros','Rockruff','Lycanroc','Wishiwashi','Minior','Mimikyu','Terapagos'];
const ids = ['413','744','745','746','774','778','128','1024'];

ids.forEach(id => {
  const m = files.filter(f => f.startsWith(id) || f.startsWith('0'+id));
  console.log(id, ':', m.length ? m.join(', ') : 'NONE');
});
console.log('---');
names.forEach(name => {
  const m = files.filter(f => f.toLowerCase().includes(name.toLowerCase()));
  console.log(name, ':', m.length ? m.join(', ') : 'NONE');
});
