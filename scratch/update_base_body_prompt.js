const fs = require('fs');
let html = fs.readFileSync('visual_style_guide.html', 'utf-8');

// 기존 baseBodyPrompt 라인 찾기
const targetPattern = /const baseBodyPrompt = `full body standing model of the exact same character with identical face and hair,[\s\S]*?슈트 내부의 표현`;/;

const newBaseBodyPrompt = `const baseBodyPrompt = \`full body standing reference model of the EXACT SAME character with identical facial features and identical hairstyle and hair color as views 01-03:
- Complete Equipment Stripping (완전 탈의): Stripped of ALL costumes, outer armor, lingerie, underwear, wings, halo, tail, weapons, and jewelry (ZERO clothing, ZERO wings, ZERO halo, ZERO accessories on 04 base model).
- Natural Anatomical Proportions: Depicting purely her natural bare body silhouette strictly maintaining her specified build (\${selectedBodySpec}) for 3D modeling, rigging, and height scale reference.
- Skin Surface & Lighting: Seamless smooth natural skin tone matching her face, with subtle soft studio rim lighting highlighting body silhouette, muscle contours, and natural anatomical proportions, strictly non-sexual safe-for-work concept art reference without explicit anatomical details.
- Korean Label: '04. 기본 체형'\`;`;

if (!targetPattern.test(html)) {
  console.error("targetPattern not found!");
} else {
  html = html.replace(targetPattern, newBaseBodyPrompt);
  
  // 네거티브 프롬프트에도 04 기본 체형 오류 방지 키워드 추가
  const negTarget = 'mannequin, wooden mannequin, plastic doll, blank face, featureless face, faceless, different face, different character, changed body type';
  const negReplace = 'clothes on 04 base body, wings on 04 base body, halo on 04 base body, armor on 04 base body, underwear on 04 base body, different hairstyle on 04 base body, short hair on 04 base body, mannequin, wooden mannequin, plastic doll, blank face, featureless face, faceless, different face, different character, changed body type';
  
  html = html.replace(negTarget, negReplace);
  
  fs.writeFileSync('visual_style_guide.html', html, 'utf-8');
  console.log("Successfully updated baseBodyPrompt and sheet negatives!");
}
