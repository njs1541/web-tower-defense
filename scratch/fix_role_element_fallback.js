const fs = require('fs');
let html = fs.readFileSync('visual_style_guide.html', 'utf-8');

// 안전한 fallback 처리
const target = "${ROLE_PROMPTS[role]}, ${ELEMENT_PROMPTS[element]}";
const replacement = "${ROLE_PROMPTS[role] || ''}, ${ELEMENT_PROMPTS[element] || ''}";

if (html.includes(target)) {
  html = html.replace(target, replacement);
  fs.writeFileSync('visual_style_guide.html', html, 'utf-8');
  console.log("Safe fallback added for ROLE & ELEMENT prompts!");
}
