const fs = require('fs');
const html = fs.readFileSync('visual_style_guide.html', 'utf-8');

const scriptStart = html.indexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');
const scriptContent = html.substring(scriptStart + 8, scriptEnd);

const mockElements = {
  'gen-grade': { value: 'UR' },
  'gen-element': { value: 'holy' },
  'gen-role': { value: 'tactician' },
  'gen-race': { value: 'beastkin' },
  'gen-style': { value: 'supreme_gold_chain' },
  'gen-body-type': { value: 'mega_glamour' },
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

const runnerCode = `
${domMock}
const mockElements = ${JSON.stringify(mockElements)};
${scriptContent}
updatePrompt();
console.log("=== BEASTKIN HOLY TACTICIAN SHEET POSITIVE ===");
console.log(mockElements['prompt-output'].textContent);
console.log("\\n=== BEASTKIN HOLY TACTICIAN SHEET NEGATIVE ===");
console.log(mockElements['prompt-output-negative'].textContent);
`;

fs.writeFileSync('scratch/test_beastkin_tactician.js', runnerCode, 'utf-8');
