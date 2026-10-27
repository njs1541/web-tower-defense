const fs = require('fs');
let html = fs.readFileSync('visual_style_guide.html', 'utf-8');

// 04 기본 체형에 속옷(브라, 팬티, 가터벨트)이 입혀지는 현상 차단
const oldStripCode = `Equipment Stripping (순수 복장/장비만 탈의): Stripped of fabric clothing, outer armor, cape, halo, weapons, and accessories only.`;
const newStripCode = `Equipment Stripping (순수 복장/장비 및 속옷 완전 탈의): Stripped of ALL fabric clothing, outer armor, cape, halo, weapons, accessories, and underwear (NO bra, NO panties, NO garter belt on 04 base body model; pure bare seamless skin-toned anatomy model). The underwear layer MUST ONLY be illustrated in the isolated section 15, NOT worn on the 04 base body model.`;

if (html.includes(oldStripCode)) {
  html = html.replace(oldStripCode, newStripCode);
  console.log("Updated 04 base body stripping instruction!");
}

// 네거티브에도 04 기본 체형 속옷 착용 차단 강화
const oldNegUnderwear = 'underwear on 04 base body, different hairstyle on 04 base body';
const newNegUnderwear = 'underwear on 04 base body, bra on 04 base body, panties on 04 base body, garter straps on 04 base body, lingerie on 04 base body, different hairstyle on 04 base body';

if (html.includes(oldNegUnderwear)) {
  html = html.replace(oldNegUnderwear, newNegUnderwear);
  console.log("Updated negative prompt for underwear on 04 base body!");
}

fs.writeFileSync('visual_style_guide.html', html, 'utf-8');
console.log("Saved base body stripping fix!");
