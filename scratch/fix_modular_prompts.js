const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'visual_style_guide.html');
let content = fs.readFileSync(targetPath, 'utf8');

content = content.replace(/\r\n/g, '\n');

// 1. updatePrompt()의 전신 일러스트 모드 부분 개편
// 기존: if (race === 'earth' && EARTH_GOLDEN_PROMPTS[grade]) ... else { baseStyle ... }
// 개편: 사용자가 선택한 모든 옵션(체형, 복장, 속성, 역할군, 종족, 등급, 세부특징)이 100% 반영되는 완전 모듈러 엔진으로 전환!
// 단, 프리셋 버튼 클릭 시에는 기본 세부특징이 채워지고, 사용자가 언제든 옵션을 바꾸면 즉시 그에 맞춰 완벽 결합됨.

const oldIllustBlock = `            } else {
                // ✨ 전신 일러스트 모드
                // 땅의 종족 프리셋이 활성화된 경우: 충돌하는 일반 키워드를 배제하고 검증된 골든 프롬프트 직접 출력
                                // 체형 커스텀 함수: 골든 프롬프트에서 기존 체형 묘사를 선택된 커스텀 체형으로 지능적 치환
                function applyCustomBody(rawPrompt) {
                    if (bodyType === 'auto') return rawPrompt;
                    let p = rawPrompt;
                    p = p.replace(/tall slender adult female, 168cm height, voluptuous curvy hourglass figure, huge breasts, thick thighs/gi, selectedBodySpec);
                    p = p.replace(/short height petite adult female, curvy voluptuous bust/gi, selectedBodySpec);
                    p = p.replace(/short height petite adult female, curvy voluptuous hourglass figure, huge breasts, thick thighs/gi, selectedBodySpec);
                    p = p.replace(/short height petite adult female, voluptuous hourglass figure, huge breasts, thick thighs/gi, selectedBodySpec);
                    p = p.replace(/tall slender adult female, 165cm height, athletic slim figure, modest bust/gi, selectedBodySpec);
                    p = p.replace(/tall slender adult female, 165cm height, athletic figure/gi, selectedBodySpec);
                    p = p.replace(/tall slender adult female, 165cm height, curvy athletic body, voluptuous bust/gi, selectedBodySpec);
                    p = p.replace(/tall slender adult female, 165cm height, voluptuous curvy hourglass figure, huge breasts, thick thighs/gi, selectedBodySpec);
                    p = p.replace(/tall slender adult female, 168cm height, voluptuous divine goddess figure, huge breasts, thick thighs/gi, selectedBodySpec);
                    if (!p.includes(selectedBodySpec)) {
                        p = p.replace('standing pose, ', 'standing pose, ' + selectedBodySpec + ', ');
                    }
                    return p;
                }

if (race === 'earth' && EARTH_GOLDEN_PROMPTS[grade]) {
                    prompt = applyCustomBody(EARTH_GOLDEN_PROMPTS[grade]);
                    if (grade === 'U') {
                        negativePrompt = "bodysuit, catsuit, jumpsuit, full body suit, tights, leggings, heavy dress, robe, hat, witch hat, " + NEGATIVE_PROMPT_FIXED;
                    }
                } else if (race === 'beastkin' && BEASTKIN_GOLDEN_PROMPTS[grade]) {
                    prompt = applyCustomBody(BEASTKIN_GOLDEN_PROMPTS[grade]);
                    if (grade === 'U') {
                        negativePrompt = "bodysuit, catsuit, jumpsuit, full body suit, tights, leggings, heavy dress, robe, hat, witch hat, human ears, four ears, extra ears, " + NEGATIVE_PROMPT_FIXED;
                    } else {
                        negativePrompt = "human ears, four ears, extra ears, " + NEGATIVE_PROMPT_FIXED;
                    }
                } else if (race === 'forest' && FOREST_GOLDEN_PROMPTS[grade]) {
                    prompt = applyCustomBody(FOREST_GOLDEN_PROMPTS[grade]);
                    if (grade === 'U') {
                        negativePrompt = "bodysuit, catsuit, jumpsuit, full body suit, tights, leggings, heavy dress, robe, hat, witch hat, short ears, round ears, " + NEGATIVE_PROMPT_FIXED;
                    } else {
                        negativePrompt = "short ears, round human ears, " + NEGATIVE_PROMPT_FIXED;
                    }
                } else if (race === 'avian' && AVIAN_GOLDEN_PROMPTS[grade]) {
                    prompt = applyCustomBody(AVIAN_GOLDEN_PROMPTS[grade]);
                    if (grade === 'U') {
                        negativePrompt = "bodysuit, catsuit, jumpsuit, full body suit, tights, leggings, heavy dress, robe, hat, witch hat, no wings, missing wings, " + NEGATIVE_PROMPT_FIXED;
                    } else {
                        negativePrompt = "no wings, missing wings, " + NEGATIVE_PROMPT_FIXED;
                    }
                } else if (race === 'human' && HUMAN_GOLDEN_PROMPTS[grade]) {
                    prompt = applyCustomBody(HUMAN_GOLDEN_PROMPTS[grade]);
                    if (grade === 'U') {
                        negativePrompt = "bodysuit, catsuit, jumpsuit, full body suit, tights, leggings, heavy armor, plate armor, heavy dress, robe, hat, animal ears, elf ears, wings, " + NEGATIVE_PROMPT_FIXED;
                    } else {
                        negativePrompt = "animal ears, elf ears, wings, cyborg arm, mechanical parts, " + NEGATIVE_PROMPT_FIXED;
                    }
                } else {
                    const baseStyle = "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, anatomically correct, exactly two arms, exactly two legs, perfectly drawn hands, clean lineart, vibrant cel-shading, cinematic lighting, core guardian crest brooch on chest";
                    let raceAndStylePrompt = \`\${STYLE_PROMPTS[style]}, \${RACE_PROMPTS[race]}\`;
                    prompt = \`\${baseStyle}, \${raceAndStylePrompt}, \${details ? details + ', ' : ''}\${ROLE_PROMPTS[role]}, \${ELEMENT_PROMPTS[element]}, \${GRADE_PROMPTS[grade]}\`;
                }`;

const newIllustBlock = `            } else {
                // ✨ 전신 일러스트 모드: 사용자가 선택한 [체형 + 복장 + 역할군 + 속성 + 등급 + 종족 + 세부특징] 완전 동적 결합 엔진
                const baseMaster = "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, anatomically correct, clean lineart, vibrant cel-shading, cinematic lighting";
                
                // 1. 선택된 체형 주입 (슬랜더, 표준, 글래머, 메가 글래머, 톰보이, 로리/쁘띠 또는 종족 자동)
                const bodyClause = selectedBodySpec;
                
                // 2. 선택된 의상 스타일 주입
                const styleClause = STYLE_PROMPTS[style] || "stylish fantasy costume";
                
                // 3. 종족 고유 외형
                const raceClause = RACE_PROMPTS[race] || "human folk";
                
                // 4. 역할군 & 무기/장비
                const roleClause = ROLE_PROMPTS[role] || "";
                
                // 5. 원소 속성 이펙트
                const elementClause = ELEMENT_PROMPTS[element] || "";
                
                // 6. 등급 아우라 및 배경 연출
                const gradeClause = GRADE_PROMPTS[grade] || "";
                
                // 7. 세부 외모 (헤어, 눈, 표정, 장신구)
                const detailClause = details ? details : "";

                // 동적 결합
                const promptParts = [
                    baseMaster,
                    bodyClause,
                    styleClause,
                    raceClause,
                    detailClause,
                    roleClause,
                    elementClause,
                    gradeClause
                ].filter(p => p && p.trim().length > 0);

                prompt = promptParts.join(", ");

                // 🛡️ 체형 및 종족별 지능형 네거티브 프롬프트 결합
                let customNegatives = [];

                // 체형별 상반되는 키워드 자동 배제
                if (bodyType === 'slender') {
                    customNegatives.push("huge breasts, large breasts, heavy cleavage, voluptuous, thick thighs, wide hips, plump");
                } else if (bodyType === 'petite') {
                    customNegatives.push("tall, mature adult woman, huge breasts, long legs, heavy curves, voluptuous");
                } else if (bodyType === 'standard') {
                    customNegatives.push("huge breasts, gigantic breasts, flat chest, extreme curves");
                } else if (bodyType === 'mega_glamour') {
                    customNegatives.push("flat chest, small breasts, skinny, slender, modest bust");
                } else if (bodyType === 'tomboy') {
                    customNegatives.push("ultra feminine, soft fat, weak physique, heavy makeup");
                }

                // 종족별 비정상 파츠 배제
                if (race === 'human') {
                    customNegatives.push("animal ears, four ears, elf ears, pointed ears, wings, cyborg arm, mechanical parts");
                } else if (race === 'beastkin') {
                    customNegatives.push("human ears, four ears, extra ears, missing animal ears, missing tail");
                } else if (race === 'forest') {
                    customNegatives.push("short ears, round human ears, animal ears, wings");
                } else if (race === 'avian') {
                    customNegatives.push("no wings, missing wings, animal ears, elf ears");
                } else if (race === 'earth') {
                    customNegatives.push("animal ears, elf ears, wings");
                }

                if (style === 'supreme_celestial_lingerie' || grade === 'U') {
                    customNegatives.push("bodysuit, catsuit, jumpsuit, full body suit, tights, leggings, heavy armor, plate armor, heavy coat, heavy dress, robe, hat");
                }

                negativePrompt = customNegatives.concat([NEGATIVE_PROMPT_FIXED]).join(", ");`;

content = content.replace(oldIllustBlock, newIllustBlock);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully upgraded updatePrompt() to full dynamic modular engine!');
