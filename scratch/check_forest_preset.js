const fs = require('fs');
const html = fs.readFileSync('visual_style_guide.html', 'utf-8');
const idx = html.indexOf('function applyForestGradePreset');
console.log(html.substring(idx, idx + 2500));
