const fs = require('fs');
const html = fs.readFileSync('visual_style_guide.html', 'utf-8');

// 테스트용 함수 실행
const idx = html.indexOf('function updatePrompt() {');
const endIdx = html.indexOf('function copyPrompt(type) {');
const fnCode = html.substring(idx, endIdx);

// mock document and elements
const mockElements = {
  'gen-grade': { value: 'U' },
  'gen-element': { value: 'shock' },
  'gen-role': { value: 'ranger' },
  'gen-race': { value: 'forest' },
  'gen-style': { value: 'supreme_cyber_highleg' },
  'gen-body-type': { value: 'tomboy' },
  'gen-details': { value: '' },
  'gen-remove-bg': { checked: true },
  'copy-bar-title': { innerHTML: '' },
  'copy-bar-desc': { textContent: '' },
  'btn-main-copy': { textContent: '', style: {} },
  'prompt-output': { textContent: '' },
  'prompt-output-negative': { textContent: '' }
};

const domMock = `
const document = {
  getElementById: (id) => mockElements[id] || { value: '', checked: false, style: {} },
  querySelector: (sel) => {
    if (sel.includes('gen-mode')) return { value: 'sheet' };
    return null;
  },
  querySelectorAll: () => []
};
`;

// Extract whole script context up to updatePrompt
const scriptStart = html.indexOf('<script>');
const scriptUpToUpdate = html.substring(scriptStart + 8, endIdx);

const runnerCode = `
${domMock}
const mockElements = ${JSON.stringify(mockElements)};
${scriptUpToUpdate}
updatePrompt();
console.log("=== SHEET PROMPT (POSITIVE) ===");
console.log(mockElements['prompt-output'].textContent);
console.log("\\n=== SHEET PROMPT (NEGATIVE) ===");
console.log(mockElements['prompt-output-negative'].textContent);
`;

fs.writeFileSync('scratch/test_sheet_sim.js', runnerCode, 'utf-8');
