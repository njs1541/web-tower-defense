const fs = require('fs');
let html = fs.readFileSync('visual_style_guide.html', 'utf-8');

// 1. 네거티브 프롬프트에서 grade === 'U' 조건 제거 (SF 하이레그 슈트 선택 시 bodysuit이 네거티브로 들어가는 치명적 충돌 해결)
const targetCode = `                if (style === 'supreme_celestial_lingerie' || grade === 'U') {
                    customNegatives.push("bodysuit, catsuit, jumpsuit, full body suit, tights, leggings, heavy armor, plate armor, heavy coat, heavy dress, robe, hat");
                }`;

const replacementCode = `                if (style === 'supreme_celestial_lingerie') {
                    customNegatives.push("bodysuit, catsuit, jumpsuit, full body suit, tights, leggings, heavy armor, plate armor, heavy coat, heavy dress, robe, hat");
                } else if (style === 'supreme_cyber_highleg' || style === 'style_a') {
                    customNegatives.push("loose robe, wedding dress, fluffy gown, lingerie, negligee, casual clothes");
                }`;

if (!html.includes(targetCode)) {
  console.error("targetCode not found!");
} else {
  html = html.replace(targetCode, replacementCode);
  fs.writeFileSync('visual_style_guide.html', html, 'utf-8');
  console.log("Successfully replaced negative prompt conflict!");
}
