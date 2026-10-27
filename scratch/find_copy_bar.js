const fs = require('fs');
const html = fs.readFileSync('visual_style_guide.html', 'utf-8');

const matches = [];
let pos = 0;
while ((pos = html.indexOf('copy-bar-box', pos)) !== -1) {
  matches.push(pos);
  pos += 12;
}

console.log('Matches for copy-bar-box:', matches);
matches.forEach(p => {
  console.log('--- At ' + p + ' ---');
  console.log(html.substring(p - 30, p + 200));
});
