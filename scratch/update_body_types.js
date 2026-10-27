const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'visual_style_guide.html');
let content = fs.readFileSync(targetPath, 'utf8');

// 줄바꿈 통일 (\r\n -> \n)
content = content.replace(/\r\n/g, '\n');

// 1. UI 치환
// id="gen-style"의 부모 <div class="gen-controls" ...> 블록 찾아서 치환
const uiRegex = /<div class="gen-controls" style="margin-bottom: 16px;">[\s\S]+?id="gen-style"[\s\S]+?id="gen-details"[\s\S]+?<\/div>\s*<\/div>/;

const newUI = `<div class="gen-controls" style="margin-bottom: 16px;">
                    <div class="gen-group">
                        <label>👗 시그니처 의상 스타일 (Costume Style)</label>
                        <select id="gen-style" class="gen-select" onchange="updatePrompt()">
                            <option value="supreme_gold_chain" selected>👑 [UR/U 최고등급] 성스러운 황금 체인 비키니 아머 & 실크 베일 (브더2/라오 감성)</option>
                            <option value="supreme_cyber_highleg">👑 [UR/U 최고등급] 하이엔드 SF 하이레그 사이버네틱 슈트 (라오/ZZZ 감성)</option>
                            <option value="supreme_celestial_lingerie">👑 [U 유니크 전용] 창세신의 천상 성운 시스루 란제리 & 다중 헤일로</option>
                            <option value="style_a">스타일 A (사이버 택티컬 바디슈트 & 가죽 하네스 - 땅/수인)</option>
                            <option value="style_b">스타일 B (판타지 시스루 드레스 & 하이슬릿 가터벨트 - 숲/비행)</option>
                            <option value="style_hybrid">하이브리드 (택티컬 바디슈트 + 시스루 레이어드 - 인간족 올라운더)</option>
                            <option value="style_classic">클래식 (단정한 제국 제복 & 흉갑 판금 아머)</option>
                        </select>
                    </div>

                    <div class="gen-group">
                        <label>💃 몸매 / 체형 선택 (Body Type)</label>
                        <select id="gen-body-type" class="gen-select" onchange="updatePrompt()">
                            <option value="auto" selected>🌐 종족 자동 (기본 종족별 표준 체형 & 키 반영)</option>
                            <option value="slender">🌱 슬렌더 (Slender - 슬림·우아한 실루엣, 아담한 바스트, 롱 레그)</option>
                            <option value="standard">⚖️ 표준 (Standard - 자연스러운 황금비율, C컵 바스트)</option>
                            <option value="glamour">✨ 글래머 (Glamour - 풍만한 볼륨감, 잘록한 허리와 골반, D~E컵)</option>
                            <option value="mega_glamour">💥 메가 글래머 (Mega Glamour - 압도적 폭유, 육감적 모래시계 힙, F~H컵)</option>
                            <option value="tomboy">⚡ 톰보이 (Tomboy - 탄탄한 11자 복근, 역동적 잔근육, 건강미 체형)</option>
                            <option value="petite">🎀 로리 / 쁘띠 (Petite - 아담한 단신 145cm, 요정 같은 소형 프레임)</option>
                        </select>
                    </div>

                    <div class="gen-group" style="grid-column: 1 / -1;">
                        <label>외모 및 세부 특징 (헤어, 눈, 분위기 등)</label>
                        <input type="text" id="gen-details" class="gen-input" value="silver twintail hair, sharp violet eyes, confident smile" oninput="updatePrompt()">
                    </div>
                </div>`;

content = content.replace(uiRegex, newUI);

// 2. BODY_TYPE_SPECS 추가 및 STYLE_PROMPTS 정의
const bodyTypeSpecsCode = `        // 💃 몸매 / 체형 명세 (종족 자동 + 슬랜더, 표준, 글래머, 메가 글래머, 톰보이, 로리/쁘띠)
        const BODY_TYPE_SPECS = {
            'slender': "slender graceful adult female build, 166cm height, 7.3 head ratio, modest A-B cup bust, thin feminine waist, long slender legs, graceful posture",
            'standard': "balanced perfect standard adult female build, 163cm height, 7.0 head ratio, natural healthy feminine curves, natural C-cup bust, harmonious waist-to-hip ratio, toned shapely legs",
            'glamour': "voluptuous curvy hourglass adult female build, 165cm height, 7.0 head ratio, heavy D-E cup bust, narrow waist, wide feminine curvy hips, thick alluring thighs",
            'mega_glamour': "hyper-voluptuous extreme hourglass adult female build, 167cm height, 6.8 head ratio, gigantic heavy breasts (F-H cup), tiny corseted waist, extremely wide curvy hips, plump thick thighs, deeply alluring mature feminine silhouette",
            'tomboy': "athletic toned tomboy adult female build, 165cm height, 7.0 head ratio, defined 11-line abs, firm compact bust, toned athletic muscles, dynamic healthy silhouette, androgynous charming posture",
            'petite': "petite adult female build, compact delicate stature, 145cm height, 5.8 head ratio, small feminine frame, slender waist and hips, graceful cute proportions (adult female)"
        };

`;

if (!content.includes('const BODY_TYPE_SPECS = {')) {
    content = content.replace('const STYLE_PROMPTS = {', bodyTypeSpecsCode + 'const STYLE_PROMPTS = {');
}

// STYLE_PROMPTS에 style_classic 추가
if (!content.includes("'style_classic':")) {
    content = content.replace(
        "'style_hybrid': \"voluptuous hourglass figure, fantasy tactical hybrid costume, leather bodysuit layered under an elegant high-slit sheer silk coat, metallic armor buckles and lace-up garter details\",",
        "'style_hybrid': \"voluptuous hourglass figure, fantasy tactical hybrid costume, leather bodysuit layered under an elegant high-slit sheer silk coat, metallic armor buckles and lace-up garter details\",\n            'style_classic': \"formal knight officer tunic and light breastplate armor, neat shoulder cape, high-waist leather shorts, silver filigree details, polished combat boots\","
    );
}

// 3. updatePrompt() 시작부에 bodyType 및 selectedBodySpec 주입
const updatePromptHeadRegex = /function updatePrompt\(\) \{\n\s*const grade = document\.getElementById\('gen-grade'\)\.value;\n\s*const element = document\.getElementById\('gen-element'\)\.value;\n\s*const role = document\.getElementById\('gen-role'\)\.value;\n\s*const race = document\.getElementById\('gen-race'\)\.value;\n\s*const style = document\.getElementById\('gen-style'\)\.value;/;

const newUpdatePromptHead = `function updatePrompt() {
            const grade = document.getElementById('gen-grade').value;
            const element = document.getElementById('gen-element').value;
            const role = document.getElementById('gen-role').value;
            const race = document.getElementById('gen-race').value;
            const style = document.getElementById('gen-style').value;
            const bodyType = document.getElementById('gen-body-type')?.value || 'auto';
            const details = document.getElementById('gen-details').value.trim();
            const isRemoveBg = document.getElementById('gen-remove-bg').checked;
            const genMode = document.querySelector('input[name="gen-mode"]:checked')?.value || 'illust';

            // 💃 체형 결정: 'auto'면 종족 기본 스펙, 선택 시 커스텀 체형 스펙 적용
            const selectedBodySpec = (bodyType !== 'auto' && BODY_TYPE_SPECS[bodyType]) 
                ? BODY_TYPE_SPECS[bodyType] 
                : (RACE_BODY_SPECS[race] || 'voluptuous adult female');`;

// 이미 주입되어 있는지 확인
if (!content.includes('const selectedBodySpec =')) {
    // 기존 updatePrompt 함수 헤더 치환
    const oldHeadMatch = content.match(/function updatePrompt\(\) \{[\s\S]+?const genMode = document\.querySelector\('input\[name="gen-mode"\]:checked'\)\?\.value \|\| 'illust';/);
    if (oldHeadMatch) {
        content = content.replace(oldHeadMatch[0], newUpdatePromptHead);
    }
}

// 4. 전신 일러스트 골든 프롬프트 치환 로직 주입
if (!content.includes('function applyCustomBody(rawPrompt)')) {
    const customBodyHelper = `                // 체형 커스텀 함수: 골든 프롬프트에서 기존 체형 묘사를 선택된 커스텀 체형으로 지능적 치환
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
                }\n\n`;

    content = content.replace(
        "if (race === 'earth' && EARTH_GOLDEN_PROMPTS[grade]) {",
        customBodyHelper + "if (race === 'earth' && EARTH_GOLDEN_PROMPTS[grade]) {"
    );
    content = content.replace("prompt = EARTH_GOLDEN_PROMPTS[grade];", "prompt = applyCustomBody(EARTH_GOLDEN_PROMPTS[grade]);");
    content = content.replace("prompt = BEASTKIN_GOLDEN_PROMPTS[grade];", "prompt = applyCustomBody(BEASTKIN_GOLDEN_PROMPTS[grade]);");
    content = content.replace("prompt = FOREST_GOLDEN_PROMPTS[grade];", "prompt = applyCustomBody(FOREST_GOLDEN_PROMPTS[grade]);");
    content = content.replace("prompt = AVIAN_GOLDEN_PROMPTS[grade];", "prompt = applyCustomBody(AVIAN_GOLDEN_PROMPTS[grade]);");
    content = content.replace("prompt = HUMAN_GOLDEN_PROMPTS[grade];", "prompt = applyCustomBody(HUMAN_GOLDEN_PROMPTS[grade]);");
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Update script finished successfully.');
