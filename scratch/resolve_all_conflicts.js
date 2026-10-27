const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'visual_style_guide.html');
let content = fs.readFileSync(targetPath, 'utf8');
content = content.replace(/\r\n/g, '\n');

// 1. [충돌 해결 1] ROLE_PROMPTS['mage']에서 witch hat 제거 -> 마도서 & 마법 서클릿으로 정제
content = content.replace(
    "'mage': \"mage sorceress class, holding an ornate glowing rune staff and floating grimoire, elegant flowing robe dress with witch hat, casting spell pose\",",
    "'mage': \"mage sorceress class, holding an ornate glowing rune staff and floating grimoire, elegant flowing dress with glowing magical circlet, casting spell pose\","
);

// 2. [충돌 해결 2] RACE_SHEET_SPECS에서 체형/가슴 하드코딩 제거 -> 순수 종족 부속기관만 유지
const oldRaceSheetSpecs = `                const RACE_SHEET_SPECS = {
                    'earth': "earth folk, short petite adult female 150cm height, huge breasts, cybernetic mechanical prosthetic arm with visible brass gears and hydraulics",
                    'beastkin': "beastkin folk, athletic adult female 165cm height, voluptuous bust, fluffy animal ears on head and fluffy expressive animal tail, canine fangs",
                    'forest': "forest folk, tall slender elf adult female 172cm height, long pointed elf ears, emerald eyes, sensual high-slit sheer dress",
                    'avian': "avian folk, petite adult female 152cm height, huge breasts, majestic feathered wings spread on back, floating in air",
                    'human': "human folk, average height adult female 164cm height, balanced voluptuous hourglass figure, hybrid imperial tactical officer uniform"
                };`;

const newRaceSheetSpecs = `                const RACE_SHEET_SPECS = {
                    'earth': "earth folk, cybernetic mechanical prosthetic arm with visible brass gears and hydraulics",
                    'beastkin': "beastkin folk, fluffy animal ears on head and fluffy expressive animal tail, canine fangs",
                    'forest': "forest folk, long pointed elf ears, emerald eyes, ethereal nature aura",
                    'avian': "avian folk, majestic feathered wings spread on back, floating in air",
                    'human': "human folk, elegant imperial styling, versatile commander presence",
                    'mutation': "unique mutant anomaly, rare contrasting exotic hybrid features"
                };`;

content = content.replace(oldRaceSheetSpecs, newRaceSheetSpecs);

// 3. [충돌 해결 3] 설정 시트 모드에서 GRADE_SHEET_SPECS 고정 대신 사용자가 고른 styleClause 연동
// 기존: [5. Safety & Production Context]: ... ${RACE_SHEET_SPECS[race] || 'female anime commander'}, ${selectedBodySpec}, ${GRADE_SHEET_SPECS[grade] || ''}${details ? ', ' + details : ''}
content = content.replace(
    "${RACE_SHEET_SPECS[race] || 'female anime commander'}, ${selectedBodySpec}, ${GRADE_SHEET_SPECS[grade] || ''}${details ? ', ' + details : ''}",
    "${RACE_SHEET_SPECS[race] || 'female anime commander'}, ${selectedBodySpec}, ${STYLE_PROMPTS[style] || 'stylish costume'}, ${details ? details + ', ' : ''}${ROLE_PROMPTS[role]}, ${ELEMENT_PROMPTS[element]}"
);

// 4. [충돌 해결 4] applyCleanWhiteBackground 배경 제거 정규식 대폭 보강
const oldBgPatterns = `            const bgPatterns = [
                /standing on stone floor/gi,
                /standing on grassy plain ground/gi,
                /standing on mossy stone ground in sunlit forest/gi,
                /standing on stone fortress courtyard/gi,
                /stone fortress dungeon background[^,]*/gi,
                /ancient temple throne background[^,]*/gi,
                /ancient sacred grove sanctuary background[^,]*/gi,
                /grand cloud sanctuary background[^,]*/gi,
                /grand cathedral sanctuary[^,]*/gi,
                /castle ramparts background[^,]*/gi,
                /misty ancient woodland background/gi,
                /blue sky cloud background/gi,
                /stardust nebula [^,]*background[^,]*/gi,
                /cosmic [^,]*nebula background/gi,
                /flat simple gradient background/gi,
                /soft gradient studio background/gi,
                /floating slightly above cloudy ground/gi,
                /stardust nebula galaxy background with shooting stars/gi
            ];`;

const newBgPatterns = `            const bgPatterns = [
                /standing on stone floor/gi,
                /standing on grassy plain ground/gi,
                /standing on mossy stone ground in sunlit forest/gi,
                /standing on stone fortress courtyard/gi,
                /stone fortress dungeon background[^,]*/gi,
                /ancient temple throne background[^,]*/gi,
                /ancient sacred grove sanctuary background[^,]*/gi,
                /grand cloud sanctuary background[^,]*/gi,
                /grand cathedral sanctuary[^,]*/gi,
                /grand sanctuary background[^,]*/gi,
                /grand galaxy nebula background[^,]*/gi,
                /castle ramparts background[^,]*/gi,
                /misty ancient woodland background/gi,
                /blue sky cloud background/gi,
                /stardust nebula [^,]*background[^,]*/gi,
                /cosmic [^,]*nebula background/gi,
                /stardust nebula galaxy background[^,]*/gi,
                /flat simple gradient background/gi,
                /soft gradient studio background/gi,
                /floating slightly above cloudy ground/gi,
                /floating in mid-air levitation, grand galaxy[^,]*/gi,
                /with stardust and spatial distortion/gi
            ];`;

content = content.replace(oldBgPatterns, newBgPatterns);

// 5. [충돌 해결 5] 프리셋 버튼들의 style 및 body-type 완벽 동기화
// applyEarthGradePreset, applyBeastkinGradePreset, applyForestGradePreset, applyAvianGradePreset, applyHumanGradePreset
['applyEarthGradePreset', 'applyBeastkinGradePreset', 'applyForestGradePreset', 'applyAvianGradePreset', 'applyHumanGradePreset'].forEach(fnName => {
    const fnRegex = new RegExp(`function ${fnName}\\(grade, btnEl\\) \\{`);
    content = content.replace(
        fnRegex,
        `function ${fnName}(grade, btnEl) {\n            if (document.getElementById('gen-body-type')) document.getElementById('gen-body-type').value = 'auto';`
    );
});

// 프리셋 내의 'curvy' 잔재를 'style_classic'으로 교체
content = content.replace(/document\.getElementById\('gen-style'\)\.value = 'curvy';/g, "document.getElementById('gen-style').value = 'style_classic';");

fs.writeFileSync(targetPath, content, 'utf8');
console.log('All 5 prompt conflict issues resolved successfully!');
