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
  'gen-details': { value: 'deep royal navy blue low twin tails, glowing crimson ruby eyes, charming confident gaze, cute canine fangs' },
  'gen-remove-bg': { checked: true },
  'copy-bar-title': { innerHTML: '' },
  'copy-bar-desc': { innerHTML: '', textContent: '' },
  'btn-main-copy': { textContent: '', style: {} },
  'template-download-box': { style: {} },
  'prompt-output': { textContent: '' },
  'prompt-output-negative': { textContent: '' }
};

const domMock = `
const document = {
  getElementById: (id) => mockElements[id] || { value: '', checked: false, style: {}, innerHTML: '', textContent: '' },
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
console.log("=== 2-IMAGE SHEET PROMPT (POSITIVE) ===");
console.log(mockElements['prompt-output'].textContent.substring(0, 800) + '...');
console.log("\\n=== UI BUTTONS STATUS ===");
console.log("Template Download Box display:", mockElements['template-download-box'].style.display);
console.log("Copy Button text:", mockElements['btn-main-copy'].textContent);
`;

fs.writeFileSync('scratch/test_final_ui.js', runnerCode, 'utf-8');
