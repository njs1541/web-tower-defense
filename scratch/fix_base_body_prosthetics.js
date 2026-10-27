const fs = require('fs');
let html = fs.readFileSync('visual_style_guide.html', 'utf-8');

// 1. 종족별 영구 신체 특징 정의 추가 (기본 체형에도 절대 제거되지 않고 유지되어야 하는 신체 파츠)
const anatomicalFeaturesCode = `                // 🧬 5대 종족 고유 신체 특징 명세 (04 기본 체형에도 탈의되지 않고 영구 유지되는 신체 부위)
                const RACE_ANATOMICAL_FEATURES = {
                    'earth': "Permanent mechanical prosthetic limbs: Her cybernetic prosthetic arm (with intricate brass gears, mechanical joints, and pneumatic cylinders) is an inseparable, integral part of her living body and MUST BE CLEARLY DEPICTED on the 04 base body model (NOT an organic arm, NOT detached).",
                    'beastkin': "Permanent beast anatomy: Her fluffy animal ears on head and natural expressive animal tail are inseparable parts of her living body and MUST BE CLEARLY DEPICTED on the 04 base body model.",
                    'forest': "Permanent elf anatomy: Her long pointed translucent elf ears are an inseparable part of her living body and MUST BE CLEARLY DEPICTED on the 04 base body model.",
                    'avian': "Permanent avian anatomy: Natural feathered wing anatomy on back is an integral part of her living body.",
                    'human': "Pure natural human anatomy with natural organic limbs and smooth skin.",
                    'mutation': "Exotic permanent mutant anatomical traits."
                };`;

// 2. 새로운 baseBodyPrompt 정의 (구체관절인형/달걀귀신 실루엣 원천 방지 + 기계 의수 및 얼굴/헤어 100% 보존)
const newBaseBodyPrompt = `const baseBodyPrompt = \`full-body anatomical base character model of the EXACT SAME character (NOT a blank mannequin, NOT a featureless doll, NOT a faceless silhouette, NOT a bald mannequin):
- Identical Face & Hair (완전한 얼굴과 헤어스타일): MUST have her complete beautiful expressive anime face (clear eyes, eyelashes, eyebrows, nose, mouth) and full voluminous hairstyle and hair color IDENTICAL to turnaround views 01-03.
- Inherent Bodily Traits (\${RACE_ANATOMICAL_FEATURES[race] || ''}): Permanent body traits such as earth folk's mechanical prosthetic arm or beastkin's ears/tail are part of her flesh and MUST remain fully attached and visible on the 04 base model.
- Equipment Stripping (복장/장비만 탈의): Stripped of fabric clothing, outer armor, cape, halo, weapons, and accessories only.
- Body & Proportions: Natural bare female anatomy strictly maintaining her specified build (\${selectedBodySpec}) for 3D modeling and rigging reference, with smooth skin tone and soft studio rim lighting highlighting body silhouette and muscle contours, non-sexual safe-for-work production reference.
- Korean Label: '04. 기본 체형'\`;`;

// 기존 baseBodyPrompt 치환
const oldBasePromptRegex = /const baseBodyPrompt = `full body standing reference model of the EXACT SAME character with identical facial features and identical hairstyle and hair color as views 01-03:[\s\S]*?Korean Label: '04. 기본 체형'`;/;

if (!oldBasePromptRegex.test(html)) {
  console.error("oldBasePromptRegex not found in html!");
} else {
  // RACE_ANATOMICAL_FEATURES 넣을 위치: baseBodyPrompt 바로 위
  const replacementFull = anatomicalFeaturesCode + "\n\n                " + newBaseBodyPrompt;
  html = html.replace(oldBasePromptRegex, replacementFull);

  // 3. 네거티브 프롬프트 보강: 구체관절인형, 달걀귀신, 대머리, 기계팔 누락 방지 키워드
  const oldSheetNeg = 'clothes on 04 base body, wings on 04 base body, halo on 04 base body, armor on 04 base body, underwear on 04 base body, different hairstyle on 04 base body, short hair on 04 base body, mannequin, wooden mannequin, plastic doll, blank face, featureless face, faceless';
  const newSheetNeg = 'ball-jointed doll, joint doll, doll joints, featureless head, bald, faceless, blank face, no eyes, mannequin, wooden mannequin, plastic doll, organic arm replacing prosthetic arm on earth folk, missing mechanical arm, clothes on 04 base body, wings on 04 base body, halo on 04 base body, armor on 04 base body, underwear on 04 base body, different hairstyle on 04 base body, short hair on 04 base body';
  
  if (html.includes(oldSheetNeg)) {
    html = html.replace(oldSheetNeg, newSheetNeg);
    console.log("Updated sheet negative prompt!");
  } else {
    console.warn("oldSheetNeg substring not exact match, checking pattern...");
  }

  fs.writeFileSync('visual_style_guide.html', html, 'utf-8');
  console.log("Successfully updated visual_style_guide.html with inherent anatomical features!");
}
