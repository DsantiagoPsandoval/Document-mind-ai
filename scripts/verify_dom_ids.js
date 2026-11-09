const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const referenced = JSON.parse(fs.readFileSync('scripts/referenced_ids.json', 'utf8'));

const missing = [];
for (const id of referenced) {
  // Check if id is present as id="..." or id='...'
  const pattern = new RegExp(`id=["']${id}["']`);
  if (!pattern.test(html)) {
    missing.push(id);
  }
}

console.log(`Referenced IDs: ${referenced.length}`);
console.log(`Missing in index.html: ${missing.length}`);
if (missing.length > 0) {
  console.log('Missing IDs:', missing);
}
