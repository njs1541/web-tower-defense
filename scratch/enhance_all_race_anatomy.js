const fs = require('fs');
let html = fs.readFileSync('visual_style_guide.html', 'utf-8');

// 1. RACE_COSTUME_LABELS: 비행족 12번, 수인족 09번 수정 (신체 파츠가 복장 라벨로 오인되는 문제 완전 제거)
html = html.replace(
  "'head': '09. 복장 : 야성 머리띠 / 뿔 장식'",
  "'head': '09. 복장 : 머리 장식 (야성 헤어핀 / 깃털 리본)'"
);

html = html.replace(
  "'outer': '12. 복장 : 성운 날개 장식 및 베일'",
  "'outer': '12. 복장 : 외투 (성운 베일 / 오버코트 / 숄)'"
);

// 2. 5대 종족 고유 신체 특징 명세 (RACE_ANATOMICAL_FEATURES) 전면 보강
const targetAnatRegex = /\/\/ 🧬 5대 종족 고유 신체 특징 명세[\s\S]*?const baseBodyPrompt = `full-body anatomical base character model of the EXACT SAME character[\s\S]*?Korean Label: '04\. 기본 체형'`;/;

const newAnatCode = `// 🧬 5대 종족 고유 신체 특징 명세 (04 기본 체형에도 탈의되지 않고 원본과 100% 동일한 사지 구성 유지)
                const RACE_ANATOMICAL_FEATURES = {
                    'earth': "Permanent mechanical prosthetic limbs: BOTH arms (left arm and right arm simultaneously) MUST be mechanical cybernetic prosthetic arms with visible brass gears, mechanical joints, and pneumatic cylinders from shoulders to fingers. Her torso and BOTH legs MUST be 100% natural organic human skin (NEVER turn legs into robotic legs, NEVER depict one arm as organic flesh when the character has dual robotic arms). Mechanical arms are living body parts and must NEVER appear detached in views 09-15.",
                    'beastkin': "Permanent beast anatomy: Her fluffy animal ears on head and natural expressive animal tail are living, permanent body parts rooted in her flesh. Both animal ears and tail MUST remain attached on views 01-04 (tail and ears must NEVER be depicted as detached costume props in views 09-15, and must NEVER be replaced by human ears or four-ears).",
                    'forest': "Permanent elf anatomy: Her long pointed crystal/emerald elf ears are living body parts and MUST remain attached on views 01-04 (NEVER turn elf ears into short human round ears on 04 base body, ears must never appear detached in views 09-15).",
                    'avian': "Permanent avian anatomy: Natural feathered wings on her back are living, permanent body parts and MUST BE FULLY SPREAD AND ATTACHED on views 01-04 (wings must NEVER be detached into costume breakdown, and must NEVER be stripped from 04 base body).",
                    'human': "Pure natural human anatomy with natural organic limbs and smooth skin on views 01-04 (NO animal ears, NO elf ears, NO wings, NO robotic limbs).",
                    'mutation': "Exotic permanent mutant anatomical traits strictly mirroring original image."
                };

                // ✨ 최초 레퍼런스 시트 표준: 04 기본 체형 (사지 구성 1:1 복제 + 순수 스킨톤 베이스 + 완전한 얼굴/헤어)
                const baseBodyPrompt = \`full-body anatomical base character model of the EXACT SAME character (NOT a blank mannequin, NOT a featureless doll, NOT a faceless silhouette, NOT a bald mannequin):
- Identical Face & Hair (완전한 얼굴과 헤어스타일): MUST have her complete beautiful expressive anime face (clear eyes, eyelashes, eyebrows, nose, mouth) and full voluminous hairstyle and hair color IDENTICAL to turnaround views 01-03.
- Inherent Bodily Traits (종족 고유 신체 100% 보존): \${RACE_ANATOMICAL_FEATURES[race] || ''}
- Equipment Stripping (순수 복장/장비만 탈의): Stripped of fabric clothing, outer armor, cape, halo, weapons, and accessories only. Her biological skin and permanent anatomical parts (earth folk's mechanical arms, beastkin's ears & tail, avian folk's wings, forest folk's elf ears) remain fully attached to her body. Permanent anatomical features are living body parts and must NEVER appear as detached spare parts in the costume breakdown (views 09-15).
- Body & Proportions: Natural bare female anatomy strictly maintaining her specified build (\${selectedBodySpec}) for 3D modeling and rigging reference, seamless smooth natural skin tone with soft studio rim lighting highlighting body silhouette and muscle contours, non-sexual safe-for-work production reference (NO dark bodysuit, NO black tank top, skin-toned smooth seamless surface).
- Korean Label: '04. 기본 체형'\`;`;

if (!targetAnatRegex.test(html)) {
  console.error("targetAnatRegex not found!");
} else {
  html = html.replace(targetAnatRegex, newAnatCode);
  console.log("Updated RACE_ANATOMICAL_FEATURES and baseBodyPrompt successfully!");
}

// 3. 네거티브 보강: 전 종족 신체 파츠 훼손/분리/변형 방지 키워드 종합
const oldNegBlock = 'prosthetic leg replacing organic leg, converting organic legs into robotic legs, cybernetic leg when original has human legs, single robotic arm when original has dual robotic arms, one organic arm when both arms are mechanical, normal flesh arm on mechanical arm side, human arm replacing mechanical arm, asymmetric flesh arm, one robotic arm and one flesh arm, detached mechanical arm in costume breakdown, mechanical limbs in exploded costume section, black bodysuit on 04 base body, dark leotard on 04 base body, dark swimsuit on 04 base body, ball-jointed doll, joint doll, doll joints, featureless head, bald, faceless, blank face, no eyes, mannequin, wooden mannequin, plastic doll, organic arm replacing prosthetic arm on earth folk, missing mechanical arm';

const newNegBlock = 'detached animal tail in costume breakdown, animal ears headband in costume section, missing tail on 04 base body, missing animal ears on 04 base body, four ears on beastkin, human ears on beastkin, missing elf ears on forest folk, short round ears on forest folk, detached elf ears in costume breakdown, missing wings on avian folk, detached feathered wings in costume breakdown, prosthetic leg replacing organic leg, converting organic legs into robotic legs, cybernetic leg when original has human legs, single robotic arm when original has dual robotic arms, one organic arm when both arms are mechanical, normal flesh arm on mechanical arm side, human arm replacing mechanical arm, asymmetric flesh arm, one robotic arm and one flesh arm, detached mechanical arm in costume breakdown, mechanical limbs in exploded costume section, black bodysuit on 04 base body, dark leotard on 04 base body, dark swimsuit on 04 base body, ball-jointed doll, joint doll, doll joints, featureless head, bald, faceless, blank face, no eyes, mannequin, wooden mannequin, plastic doll, organic arm replacing prosthetic arm on earth folk, missing mechanical arm';

if (html.includes(oldNegBlock)) {
  html = html.replace(oldNegBlock, newNegBlock);
  console.log("Updated negative prompt successfully!");
}

fs.writeFileSync('visual_style_guide.html', html, 'utf-8');
console.log("All changes saved to visual_style_guide.html!");
