const fs = require('fs');
const html = fs.readFileSync('visual_style_guide.html', 'utf-8');
const pos = html.indexOf('gen-style');
console.log(html.substring(pos - 50, pos + 1500));
