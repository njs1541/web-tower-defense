const fs = require('fs');
let html = fs.readFileSync('visual_style_guide.html', 'utf-8');

// 1. RACE_SHEET_SPECS['earth'] 정정: 단수형 arm -> 양팔 모두 기계의수 (DUAL mechanical prosthetic arms)
const oldSheetSpec = `'earth': "earth folk, cybernetic mechanical prosthetic arm with visible brass gears and hydraulics",`;
const newSheetSpec = `'earth': "earth folk, DUAL cybernetic mechanical prosthetic arms on BOTH left and right arms from shoulders to fingers with intricate brass gears and hydraulics, while both legs and torso are 100% natural organic skin",`;

if (html.includes(oldSheetSpec)) {
  html = html.replace(oldSheetSpec, newSheetSpec);
  console.log("Updated RACE_SHEET_SPECS['earth'] successfully!");
} else {
  console.warn("oldSheetSpec not found!");
}

// 2. RACE_PROMPTS['earth'] 정정: arm and legs -> dual prosthetic arms, natural legs
const oldRacePrompt = `'earth': "earth folk, cybernetic mechanical prosthetic arm and legs, visible brass gears and hydraulics",`;
const newRacePrompt = `'earth': "earth folk, dual cybernetic mechanical prosthetic arms on BOTH arms with visible brass gears and hydraulics, natural organic legs",`;

if (html.includes(oldRacePrompt)) {
  html = html.replace(oldRacePrompt, newRacePrompt);
  console.log("Updated RACE_PROMPTS['earth'] successfully!");
} else {
  console.warn("oldRacePrompt not found!");
}

// 3. RACE_ANATOMICAL_FEATURES['earth'] 더욱 강력하고 구체적으로 보강
const oldAnatEarth = `'earth': "Permanent mechanical prosthetic limbs strictly mirroring the attached character design: Depict the EXACT SAME number and configuration of mechanical prosthetic arms and organic limbs as shown in the original character image (if the character has DUAL mechanical prosthetic arms, BOTH arms MUST be mechanical cybernetic arms with visible brass gears and pneumatic cylinders; if her legs are organic skin, BOTH legs MUST remain organic natural skin and MUST NOT be turned into robotic legs; prosthetic limbs are NOT detachable clothing and must NEVER appear detached in the costume breakdown).",`;

const newAnatEarth = `'earth': "Permanent mechanical prosthetic limbs: BOTH arms (left arm and right arm simultaneously) MUST be mechanical cybernetic prosthetic arms with visible brass gears, mechanical joints, and pneumatic cylinders from shoulders to fingers. Her torso and BOTH legs MUST be 100% natural organic human skin (NEVER turn legs into robotic legs, NEVER depict one arm as organic flesh when the character has dual robotic arms). Mechanical arms are inseparable living body parts and must NEVER appear detached in views 09-15.",`;

if (html.includes(oldAnatEarth)) {
  html = html.replace(oldAnatEarth, newAnatEarth);
  console.log("Updated RACE_ANATOMICAL_FEATURES['earth'] successfully!");
} else {
  console.warn("oldAnatEarth not found!");
}

// 4. 네거티브 프롬프트 강화: 한쪽 팔만 살색으로 그리는 현상 차단
const oldNegAnchor = 'one organic arm when both arms are mechanical, detached mechanical arm in costume breakdown';
const newNegAnchor = 'one organic arm when both arms are mechanical, normal flesh arm on mechanical arm side, human arm replacing mechanical arm, asymmetric flesh arm, one robotic arm and one flesh arm, detached mechanical arm in costume breakdown';

if (html.includes(oldNegAnchor)) {
  html = html.replace(oldNegAnchor, newNegAnchor);
  console.log("Updated negative prompt successfully!");
}

fs.writeFileSync('visual_style_guide.html', html, 'utf-8');
console.log("All fixes written to visual_style_guide.html!");
