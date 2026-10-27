const fs = require('fs');
let html = fs.readFileSync('visual_style_guide.html', 'utf-8');

// 1. RACE_COSTUME_LABELS 정정 (기계의수, 꼬리 등 신체 파츠를 복장 분해도 라벨에서 영구 퇴출)
const oldCostumeLabels = `                const RACE_COSTUME_LABELS = {
                    'earth': {
                        'head': '09. 복장 : 고글 / 헤어핀',
                        'top': '10. 복장 : 상의 (작업형 흉갑 상의)',
                        'bottom': '11. 복장 : 하의 (카고 배틀 하의)',
                        'outer': '12. 복장 : 기계의수 파츠 및 망토',
                        'acc1': '13. 장신구 1 (레더 하네스 & 공구 벨트)',
                        'acc2': '14. 장신구 2 (강철 엔지니어 부츠)'
                    },
                    'beastkin': {
                        'head': '09. 복장 : 야성 머리띠 / 뿔 장식',
                        'top': '10. 복장 : 상의 (가죽 크롭 상의)',
                        'bottom': '11. 복장 : 하의 (배틀 레더 하의)',
                        'outer': '12. 복장 : 털 망토 및 꼬리 장식',
                        'acc1': '13. 장신구 1 (가죽 바디 스트랩)',
                        'acc2': '14. 장신구 2 (발톱 각반 및 부츠)'
                    },
                    'forest': {
                        'head': '09. 복장 : 잎새 티아라 / 헤어핀',
                        'top': '10. 복장 : 상의 (실크 로브 상의)',
                        'bottom': '11. 복장 : 하의 (시스루 슬릿 하의)',
                        'outer': '12. 복장 : 오르간자 페어리 망토 / 날개',
                        'acc1': '13. 장신구 1 (에메랄드 바디체인)',
                        'acc2': '14. 장신구 2 (덩굴 발찌 및 샌들)'
                    },
                    'avian': {
                        'head': '09. 복장 : 깃털 티아라 / 헤어핀',
                        'top': '10. 복장 : 상의 (순백 성직자 상의)',
                        'bottom': '11. 복장 : 하의 (비행 레이스 하의)',
                        'outer': '12. 복장 : 성운 날개 장식 및 베일',
                        'acc1': '13. 장신구 1 (골드 페더 바디체인)',
                        'acc2': '14. 장신구 2 (천상 스트랩 부츠)'
                    },
                    'human': {
                        'head': '09. 복장 : 제국 장교모 / 티아라',
                        'top': '10. 복장 : 상의 (제복 상의 & 흉갑)',
                        'bottom': '11. 복장 : 하의 (스커트 & 레더 쇼츠)',
                        'outer': '12. 복장 : 사령관 망토 / 숄',
                        'acc1': '13. 장신구 1 (가죽 하네스 & 홀스터)',
                        'acc2': '14. 장신구 2 (제국 기사 부츠)'
                    }
                };`;

const newCostumeLabels = `                const RACE_COSTUME_LABELS = {
                    'earth': {
                        'head': '09. 복장 : 고글 / 헤어핀',
                        'top': '10. 복장 : 상의 (작업형 흉갑 상의)',
                        'bottom': '11. 복장 : 하의 (카고 배틀 하의)',
                        'outer': '12. 복장 : 외투 (엔지니어 망토 / 코트)',
                        'acc1': '13. 장신구 1 (레더 하네스 & 공구 벨트)',
                        'acc2': '14. 장신구 2 (강철 엔지니어 부츠)'
                    },
                    'beastkin': {
                        'head': '09. 복장 : 야성 머리띠 / 헤어핀',
                        'top': '10. 복장 : 상의 (가죽 크롭 상의)',
                        'bottom': '11. 복장 : 하의 (배틀 레더 하의)',
                        'outer': '12. 복장 : 외투 (털 망토 / 판초 / 케이프)',
                        'acc1': '13. 장신구 1 (가죽 바디 스트랩)',
                        'acc2': '14. 장신구 2 (발톱 각반 및 부츠)'
                    },
                    'forest': {
                        'head': '09. 복장 : 잎새 티아라 / 헤어핀',
                        'top': '10. 복장 : 상의 (실크 로브 상의)',
                        'bottom': '11. 복장 : 하의 (시스루 슬릿 하의)',
                        'outer': '12. 복장 : 외투 (오르간자 페어리 실크 망토)',
                        'acc1': '13. 장신구 1 (에메랄드 바디체인)',
                        'acc2': '14. 장신구 2 (덩굴 발찌 및 샌들)'
                    },
                    'avian': {
                        'head': '09. 복장 : 깃털 티아라 / 헤어핀',
                        'top': '10. 복장 : 상의 (순백 성직자 상의)',
                        'bottom': '11. 복장 : 하의 (비행 레이스 하의)',
                        'outer': '12. 복장 : 외투 (성운 베일 / 오버코트)',
                        'acc1': '13. 장신구 1 (골드 페더 바디체인)',
                        'acc2': '14. 장신구 2 (천상 스트랩 부츠)'
                    },
                    'human': {
                        'head': '09. 복장 : 제국 장교모 / 티아라',
                        'top': '10. 복장 : 상의 (제복 상의 & 흉갑)',
                        'bottom': '11. 복장 : 하의 (스커트 & 레더 쇼츠)',
                        'outer': '12. 복장 : 외투 (사령관 망토 / 숄)',
                        'acc1': '13. 장신구 1 (가죽 하네스 & 홀스터)',
                        'acc2': '14. 장신구 2 (제국 기사 부츠)'
                    }
                };`;

// 2. RACE_ANATOMICAL_FEATURES 및 baseBodyPrompt 전면 정밀화 (원본 사지 구성 1:1 완벽 복제)
const oldAnatomicalCodeRegex = /\/\/ 🧬 5대 종족 고유 신체 특징 명세[\s\S]*?const baseBodyPrompt = `full-body anatomical base character model of the EXACT SAME character[\s\S]*?Korean Label: '04\. 기본 체형'`;/;

const newAnatomicalCode = `// 🧬 5대 종족 고유 신체 특징 명세 (04 기본 체형에도 탈의되지 않고 원본과 100% 동일한 사지 구성 유지)
                const RACE_ANATOMICAL_FEATURES = {
                    'earth': "Permanent mechanical prosthetic limbs strictly mirroring the attached character design: Depict the EXACT SAME number and configuration of mechanical prosthetic arms and organic limbs as shown in the original character image (if the character has DUAL mechanical prosthetic arms, BOTH arms MUST be mechanical cybernetic arms with visible brass gears and pneumatic cylinders; if her legs are organic skin, BOTH legs MUST remain organic natural skin and MUST NOT be turned into robotic legs; prosthetic limbs are NOT detachable clothing and must NEVER appear detached in the costume breakdown).",
                    'beastkin': "Permanent beast anatomy strictly mirroring the attached character design: Her fluffy animal ears on head and natural expressive animal tail are living body parts and MUST remain attached on views 01-04 (tail must NEVER be detached into costume breakdown).",
                    'forest': "Permanent elf anatomy: Her long pointed translucent elf ears are living body parts and MUST remain attached on views 01-04.",
                    'avian': "Permanent avian anatomy: Natural feathered wing anatomy strictly matching the original character design on views 01-04.",
                    'human': "Pure natural human anatomy with natural organic limbs and smooth skin on views 01-04.",
                    'mutation': "Exotic permanent mutant anatomical traits strictly mirroring original image."
                };

                // ✨ 최초 레퍼런스 시트 표준: 04 기본 체형 (사지 구성 1:1 복제 + 순수 스킨톤 베이스 + 완전한 얼굴/헤어)
                const baseBodyPrompt = \`full-body anatomical base character model of the EXACT SAME character (NOT a blank mannequin, NOT a featureless doll, NOT a faceless silhouette, NOT a bald mannequin):
- Identical Face & Hair (완전한 얼굴과 헤어스타일): MUST have her complete beautiful expressive anime face (clear eyes, eyelashes, eyebrows, nose, mouth) and full voluminous hairstyle and hair color IDENTICAL to turnaround views 01-03.
- Exact Limb Configuration (원본 사지 구성 1:1 완벽 일치): \${RACE_ANATOMICAL_FEATURES[race] || ''}
- Equipment Stripping (복장/장비만 탈의): Stripped of fabric clothing, outer armor, cape, halo, weapons, and accessories only. Her biological skin and permanent prosthetic limbs remain fully attached to her body. Mechanical limbs are living body parts and must NEVER appear as detached spare parts in the costume breakdown (views 09-15).
- Body & Proportions: Natural bare female anatomy strictly maintaining her specified build (\${selectedBodySpec}) for 3D modeling and rigging reference, seamless smooth natural skin tone with soft studio rim lighting highlighting body silhouette and muscle contours, non-sexual safe-for-work production reference (NO dark bodysuit, NO black tank top, skin-toned smooth seamless surface).
- Korean Label: '04. 기본 체형'\`;`;

// 3. 네거티브 보강: 사지 변형 방지, 기계의수 분리 방지, 다리 로봇화 방지
const oldNegPattern = 'ball-jointed doll, joint doll, doll joints, featureless head, bald, faceless, blank face, no eyes, mannequin, wooden mannequin, plastic doll, organic arm replacing prosthetic arm on earth folk, missing mechanical arm';
const newNegPattern = 'prosthetic leg replacing organic leg, converting organic legs into robotic legs, cybernetic leg when original has human legs, single robotic arm when original has dual robotic arms, one organic arm when both arms are mechanical, detached mechanical arm in costume breakdown, mechanical limbs in exploded costume section, black bodysuit on 04 base body, dark leotard on 04 base body, dark swimsuit on 04 base body, ball-jointed doll, joint doll, doll joints, featureless head, bald, faceless, blank face, no eyes, mannequin, wooden mannequin, plastic doll, organic arm replacing prosthetic arm on earth folk, missing mechanical arm';

if (!html.includes(oldCostumeLabels)) {
  console.error("oldCostumeLabels not found!");
} else {
  html = html.replace(oldCostumeLabels, newCostumeLabels);
  console.log("Updated RACE_COSTUME_LABELS successfully!");
}

if (!oldAnatomicalCodeRegex.test(html)) {
  console.error("oldAnatomicalCodeRegex not found!");
} else {
  html = html.replace(oldAnatomicalCodeRegex, newAnatomicalCode);
  console.log("Updated RACE_ANATOMICAL_FEATURES and baseBodyPrompt successfully!");
}

if (html.includes(oldNegPattern)) {
  html = html.replace(oldNegPattern, newNegPattern);
  console.log("Updated negative prompt successfully!");
} else {
  console.warn("oldNegPattern not exact match, checking...");
}

fs.writeFileSync('visual_style_guide.html', html, 'utf-8');
console.log("All fixes written to visual_style_guide.html!");
