const fs = require('fs');
const content = fs.readFileSync('app.js', 'utf8');
const regex = /getElementById\(['"]([^'"]+)['"]\)/g;
const ids = new Set();
let m;
while ((m = regex.exec(content)) !== null) {
  ids.add(m[1]);
}
console.log('Total unique IDs referenced in app.js:', ids.size);
fs.writeFileSync('scripts/referenced_ids.json', JSON.stringify([...ids].sort(), null, 2));
