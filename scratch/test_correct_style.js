const fs = require('fs');
const html = fs.readFileSync('visual_style_guide.html', 'utf-8');

// extract constants from html
function extractConst(name) {
  const m = html.match(new RegExp('const ' + name + ' = ({[\\s\\S]*?});'));
  if (!m) return null;
  return eval('(' + m[1] + ')');
}

const BODY_TYPE_SPECS = extractConst('BODY_TYPE_SPECS');
const RACE_BODY_SPECS = extractConst('RACE_BODY_SPECS');
const STYLE_PROMPTS = extractConst('STYLE_PROMPTS');
const RACE_PROMPTS = extractConst('RACE_PROMPTS');
const ROLE_PROMPTS = extractConst('ROLE_PROMPTS');
const ELEMENT_PROMPTS = extractConst('ELEMENT_PROMPTS');
const GRADE_PROMPTS = extractConst('GRADE_PROMPTS');

const state = {
  grade: 'U',
  element: 'shock',
  role: 'ranger',
  race: 'forest',
  style: 'supreme_cyber_highleg',
  bodyType: 'tomboy',
  details: '',
  isRemoveBg: true,
  genMode: 'illust'
};

const selectedBodySpec = (state.bodyType !== 'auto' && BODY_TYPE_SPECS[state.bodyType]) 
    ? BODY_TYPE_SPECS[state.bodyType] 
    : (RACE_BODY_SPECS[state.race] || 'voluptuous adult female');

const baseMaster = 'masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, anatomically correct, clean lineart, vibrant cel-shading, cinematic lighting';

const promptParts = [
    baseMaster,
    selectedBodySpec,
    STYLE_PROMPTS[state.style],
    RACE_PROMPTS[state.race],
    state.details,
    ROLE_PROMPTS[state.role],
    ELEMENT_PROMPTS[state.element],
    GRADE_PROMPTS[state.grade]
].filter(p => p && p.trim().length > 0);

let prompt = promptParts.join(', ');

// Apply clean white background
const bgRegex = /(?:background|backdrop|setting|scenery)[^,]*(?:,|$)/gi;
prompt = prompt.replace(bgRegex, '').replace(/,\s*,/g, ',').trim();
prompt += ', simple solid pure white background, clean plain white backdrop, no background elements, solo isolated character, full body asset cutout ready';

console.log('=== NEW DYNAMIC PROMPT (POSITIVE) ===');
console.log(prompt);
console.log('\n=== CHECK KEYWORDS ===');
console.log('Contains tomboy body:', prompt.includes('tomboy'));
console.log('Contains highleg suit:', prompt.includes('high-leg'));
console.log('Contains ranger sniper:', prompt.includes('ranger') || prompt.includes('bow'));
console.log('Contains shock / lightning:', prompt.includes('lightning') || prompt.includes('electric'));
console.log('Contains elf:', prompt.includes('elf'));
