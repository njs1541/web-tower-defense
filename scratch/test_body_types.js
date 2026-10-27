const fs = require('fs');
const html = fs.readFileSync('visual_style_guide.html', 'utf8');

// 1. 문법 검증
const scriptMatch = html.match(/<script>([\s\S]+?)<\/script>/);
if (scriptMatch) {
    try {
        new Function(scriptMatch[1]);
        console.log('Script syntax check: PASSED!');
    } catch(e) {
        console.error('Script syntax error:', e);
    }
}

// 2. 요소 존재 확인
console.log('gen-body-type included?:', html.includes('id="gen-body-type"'));
console.log('BODY_TYPE_SPECS included?:', html.includes('const BODY_TYPE_SPECS = {'));
console.log('mega_glamour option included?:', html.includes('value="mega_glamour"'));
console.log('petite option included?:', html.includes('value="petite"'));
console.log('tomboy option included?:', html.includes('value="tomboy"'));

// 3. 테스트 시뮬레이션:
// 종족 자동(auto) vs 메가 글래머(mega_glamour) vs 로리/쁘띠(petite)
const vm = require('vm');
const elements = {
    'gen-grade': { value: 'UR' },
    'gen-element': { value: 'fire' },
    'gen-role': { value: 'ranger' },
    'gen-race': { value: 'beastkin' },
    'gen-style': { value: 'supreme_gold_chain' },
    'gen-body-type': { value: 'auto' },
    'gen-details': { value: 'silver twintail' },
    'gen-remove-bg': { checked: false },
    'prompt-output': { textContent: '' },
    'prompt-output-negative': { textContent: '' },
    'copy-bar-title': { innerHTML: '' },
    'copy-bar-desc': { textContent: '' },
    'btn-main-copy': { textContent: '', style: {} }
};

let genMode = 'sheet';

const sandbox = {
    document: {
        getElementById: (id) => elements[id] || { value: '', checked: false, style: {} },
        querySelector: (sel) => ({ value: genMode }),
        querySelectorAll: () => []
    },
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    alert: () => {}
};

vm.createContext(sandbox);
vm.runInContext(scriptMatch[1], sandbox);

console.log('\n--- [TEST 1] 종족 자동 (auto) 설정 시트 ---');
elements['gen-body-type'].value = 'auto';
sandbox.updatePrompt();
const promptAuto = elements['prompt-output'].textContent;
console.log('기본 체형 문구 확인:', promptAuto.match(/동일한 체형 유지 \(([^)]+)\)/)[0]);

console.log('\n--- [TEST 2] 메가 글래머 (mega_glamour) 설정 시트 ---');
elements['gen-body-type'].value = 'mega_glamour';
sandbox.updatePrompt();
const promptMega = elements['prompt-output'].textContent;
console.log('기본 체형 문구 확인:', promptMega.match(/동일한 체형 유지 \(([^)]+)\)/)[0]);

console.log('\n--- [TEST 3] 로리/쁘띠 (petite) 설정 시트 ---');
elements['gen-body-type'].value = 'petite';
sandbox.updatePrompt();
const promptPetite = elements['prompt-output'].textContent;
console.log('기본 체형 문구 확인:', promptPetite.match(/동일한 체형 유지 \(([^)]+)\)/)[0]);

console.log('\n--- [TEST 4] 톰보이 (tomboy) 전신 일러스트 모드 ---');
genMode = 'illust';
elements['gen-body-type'].value = 'tomboy';
sandbox.updatePrompt();
const promptTomboy = elements['prompt-output'].textContent;
console.log('톰보이 체형 반영 여부:', promptTomboy.includes('athletic toned tomboy adult female build'));
