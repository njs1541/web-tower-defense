const fs = require('fs');
const html = fs.readFileSync('visual_style_guide.html', 'utf-8');

const tIdx = html.indexOf('template-download-box');
console.log('Found template-download-box at:', tIdx);
if (tIdx !== -1) {
  console.log(html.substring(tIdx - 100, tIdx + 600));
}

const rIdx = html.indexOf('gen-mode');
console.log('\n=== gen-mode context ===');
if (rIdx !== -1) {
  console.log(html.substring(rIdx - 50, rIdx + 800));
}
