const fs = require('fs');
const html = fs.readFileSync('visual_style_guide.html', 'utf-8');
const pos = html.indexOf("if (style === 'supreme_celestial_lingerie' || grade === 'U')");
console.log('Found at:', pos);
console.log(html.substring(pos - 100, pos + 300));
