const fs = require('fs');
const html = fs.readFileSync('visual_style_guide.html', 'utf-8');

// 스크립트 블록 추출
const scriptMatch = html.match(/<script[\s\S]*?<\/script>/);
if (!scriptMatch) {
  console.error("No script tag found!");
  process.exit(1);
}

// updatePrompt 함수와 각종 상수들을 추출하여 가상 DOM 환경에서 실행 준비
const scriptContent = scriptMatch[0].replace(/<\/?script>/g, '');

// 가상 DOM 및 이벤트 환경 구성
const races = ['earth', 'beastkin', 'forest', 'avian', 'human'];
const grades = ['C', 'UC', 'R', 'SR', 'UR', 'U'];
const bodyTypes = ['auto', 'slender', 'standard', 'glamour', 'mega_glamour', 'tomboy', 'petite'];
const styles = ['supreme_gold_chain', 'supreme_cyber_highleg', 'supreme_celestial_lingerie', 'style_a', 'style_b', 'style_hybrid', 'style_classic'];
const roles = ['warrior', 'tank', 'ranger', 'mage', 'assassin', 'support'];
const elements = ['physical', 'fire', 'frost', 'shock', 'holy', 'dark', 'wind', 'earth'];
const modes = ['illust', 'sheet'];

// 충돌 검사용 단어 매핑 테이블 (Pos에 이것이 있는데 Neg에 이것이 있으면 충돌)
const CRITICAL_CONFLICT_PAIRS = [
  { name: 'bodysuit', posRegex: /\b(?:bodysuit|catsuit|jumpsuit)\b/i, negRegex: /\b(?:bodysuit|catsuit|jumpsuit)\b/i },
  { name: 'wings', posRegex: /\b(?:wings|feathered wings|celestial wings)\b/i, negRegex: /\b(?:wings|no wings|missing wings)\b/i },
  { name: 'animal_ears', posRegex: /\b(?:animal ears|wolf ears|cat ears|fox ears)\b/i, negRegex: /\b(?:animal ears)\b/i },
  { name: 'elf_ears', posRegex: /\b(?:elf ears|pointed ears)\b/i, negRegex: /\b(?:short ears|round ears|round human ears|elf ears|pointed ears)\b/i },
  { name: 'cyborg_arm', posRegex: /\b(?:cyborg arm|mechanical arm|prosthetic arm)\b/i, negRegex: /\b(?:cyborg arm|mechanical parts)\b/i },
  { name: 'huge_breasts', posRegex: /\b(?:huge breasts|voluptuous|gigantic breasts)\b/i, negRegex: /\b(?:huge breasts|large breasts|voluptuous)\b/i },
  { name: 'flat_chest', posRegex: /\b(?:firm compact bust|modest bust|petite)\b/i, negRegex: /\b(?:flat chest|small breasts)\b/i },
  { name: 'tomboy_physique', posRegex: /\b(?:tomboy|defined 11-line abs|athletic toned)\b/i, negRegex: /\b(?:athletic|muscle)\b/i },
  { name: 'lingerie', posRegex: /\b(?:lingerie|slingshot lingerie|bikini)\b/i, negRegex: /\b(?:lingerie|bikini)\b/i }
];

console.log("Analyzing visual_style_guide.html prompt generation engine...");

// 모의 실행 함수 정의
const codeToEval = `
let currentMockState = {};

const document = {
  getElementById: (id) => {
    return {
      value: currentMockState[id] !== undefined ? currentMockState[id] : '',
      checked: currentMockState[id] !== undefined ? currentMockState[id] : false,
      innerHTML: '',
      textContent: '',
      style: {}
    };
  },
  querySelector: (sel) => {
    if (sel.includes('gen-mode')) {
      return { value: currentMockState['gen-mode'] || 'illust' };
    }
    return null;
  },
  querySelectorAll: () => []
};

${scriptContent}

function runSimulation(state) {
  currentMockState = {
    'gen-grade': state.grade,
    'gen-element': state.element,
    'gen-role': state.role,
    'gen-race': state.race,
    'gen-style': state.style,
    'gen-body-type': state.bodyType,
    'gen-details': '',
    'gen-remove-bg': state.removeBg,
    'gen-mode': state.mode
  };
  
  // prompt-output 채우기 모의
  let posText = "";
  let negText = "";
  
  const originalGetElementById = document.getElementById;
  document.getElementById = (id) => {
    const el = originalGetElementById(id);
    if (id === 'prompt-output') {
      return {
        set textContent(v) { posText = v; },
        get textContent() { return posText; }
      };
    }
    if (id === 'prompt-output-negative') {
      return {
        set textContent(v) { negText = v; },
        get textContent() { return negText; }
      };
    }
    return el;
  };

  updatePrompt();
  return { pos: posText, neg: negText };
}
`;

fs.writeFileSync('scratch/sim_harness.js', codeToEval + `\nmodule.exports = { runSimulation };`, 'utf-8');
console.log("Harness created.");
