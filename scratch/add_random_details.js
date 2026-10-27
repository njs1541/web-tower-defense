const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'visual_style_guide.html');
let content = fs.readFileSync(targetPath, 'utf8');

// 줄바꿈 통일
content = content.replace(/\r\n/g, '\n');

// 1. HTML 부분 치환
const oldHTML = `                    <div class="gen-group" style="grid-column: 1 / -1;">
                        <label>외모 및 세부 특징 (헤어, 눈, 분위기 등)</label>
                        <input type="text" id="gen-details" class="gen-input" value="silver twintail hair, sharp violet eyes, confident smile" oninput="updatePrompt()">
                    </div>`;

const newHTML = `                    <div class="gen-group" style="grid-column: 1 / -1;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                            <label style="margin-bottom: 0;">외모 및 세부 특징 (헤어, 눈, 분위기 등)</label>
                            <span style="font-size: 11.5px; color: #a5b4fc;">원하는 키워드를 직접 입력하거나 🎲 랜덤 버튼으로 즉시 생성할 수 있습니다</span>
                        </div>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input type="text" id="gen-details" class="gen-input" value="silver twintail hair, sharp violet eyes, confident smile" oninput="updatePrompt()" style="flex: 1;">
                            <button type="button" id="btn-random-details" onclick="randomizeDetails()" style="background: linear-gradient(135deg, #6366f1, #a855f7); color: #fff; border: 1px solid rgba(255,255,255,0.2); padding: 10px 18px; border-radius: 8px; font-weight: 800; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap; transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(168, 85, 247, 0.5)';" onmouseout="this.style.transform='none'; this.style.boxShadow='0 4px 12px rgba(99, 102, 241, 0.35)';">
                                <span>🎲 랜덤 생성</span>
                            </button>
                        </div>
                    </div>`;

if (content.includes(oldHTML)) {
    content = content.replace(oldHTML, newHTML);
} else {
    console.error('Target oldHTML not found');
}

// 2. randomizeDetails() 함수 추가
const randomizeFunctionCode = `
        // 🎲 외모 및 세부 특징 랜덤 생성기 (헤어 컬러, 스타일, 눈동자, 표정, 종족별 포인트)
        function randomizeDetails() {
            const HAIR_COLORS = [
                'platinum blonde', 'silver white', 'radiant golden blonde', 'raven jet-black', 
                'soft rose pink', 'sakura pastel pink', 'misty ash blue', 'deep royal navy blue',
                'crimson ruby red', 'deep amethyst violet', 'emerald mint green', 'cosmic gradient pastel',
                'warm honey chestnut', 'lavender purple'
            ];

            const HAIR_STYLES = [
                'long flowing wavy hair', 'twin drill pigtails', 'high ponytail tied with ribbons',
                'neat bob cut', 'straight elegant hime-cut hair', 'twin braided pigtails',
                'loose messy side-braid', 'fluffy wavy twintails', 'voluminous wavy wolf cut',
                'half-up ribbon ponytail', 'medium layered hair with straight bangs', 'low twin tails'
            ];

            const EYE_SPECS = [
                'sharp violet eyes', 'sparkling sapphire blue eyes', 'glowing crimson ruby eyes',
                'warm golden amber eyes', 'mystic emerald green eyes', 'heterochromia (blue and golden) eyes',
                'deep amethyst slit eyes', 'gentle starlight cyan eyes', 'intense burning flame eyes',
                'translucent diamond eyes'
            ];

            const EXPRESSIONS = [
                'confident playful smile', 'gentle sweet smile', 'proud arrogant queen smirk',
                'cool composed calm expression', 'mischievous daring grin', 'shy blushing gaze',
                'dignified elegant smile', 'determined fierce battle expression', 'seductive charming smile'
            ];

            const RACE_ACCENTS = {
                'forest': ['long pointed elf ears', 'botanical flower hairpins', 'delicate emerald vine ornaments', 'emerald drop earrings'],
                'earth': ['steampunk brass goggles on head', 'rudimentary brass hairpin', 'cute grease smudge on cheek', 'leather headband with mini gear'],
                'beastkin': ['fluffy animal ears with tipped fur', 'cute canine fangs', 'expressive fluffy striped animal tail', 'leather feather choker'],
                'avian': ['delicate pure white feather hairpin', 'floating glowing starlight ribbons', 'crystal star hair clip', 'iridescent hair gradient'],
                'human': ['royal platinum hairpin', 'velvet lace hair ribbon', 'cross jewel brooch', 'golden pearl hair ornament'],
                'mutation': ['exotic gradient horns', 'mystic glowing rune tattoo on cheek', 'floating mana crystal shards']
            };

            const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

            const currentRace = document.getElementById('gen-race')?.value || 'human';
            const accents = RACE_ACCENTS[currentRace] || RACE_ACCENTS['human'];

            const color = pick(HAIR_COLORS);
            const style = pick(HAIR_STYLES);
            const eyes = pick(EYE_SPECS);
            const expr = pick(EXPRESSIONS);
            const accent = pick(accents);

            // 최종 랜덤 외모 조합
            const generatedDetails = \`\${color} \${style}, \${eyes}, \${expr}, \${accent}\`;

            const inputEl = document.getElementById('gen-details');
            if (inputEl) {
                inputEl.value = generatedDetails;
                // 시각적 피드백 효과 (반짝임)
                inputEl.style.transition = 'background 0.3s';
                inputEl.style.background = 'rgba(99, 102, 241, 0.25)';
                setTimeout(() => {
                    inputEl.style.background = '';
                }, 300);
            }

            // 프롬프트 즉시 동기화
            updatePrompt();
        }
`;

if (!content.includes('function randomizeDetails()')) {
    content = content.replace('function updatePrompt() {', randomizeFunctionCode + '\n        function updatePrompt() {');
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully added randomizeDetails() and updated UI!');
