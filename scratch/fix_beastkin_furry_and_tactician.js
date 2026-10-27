const fs = require('fs');
let html = fs.readFileSync('visual_style_guide.html', 'utf-8');

// 1. 수인족을 퍼리(동물 얼굴)가 아닌 미소녀 케모노미미(사람 얼굴 + 귀/꼬리)로 못박기
html = html.replace(
  "'beastkin': \"beastkin folk, fluffy animal ears on head and fluffy tail, feline fangs, agile wild presence\",",
  "'beastkin': \"beastkin kemonomimi anime girl, beautiful human female face with clear anime eyes and small human nose, fluffy animal ears on head and fluffy animal tail, cute fangs, agile wild presence, NO animal snout, NO muzzle\",'beastkin': \"beastkin kemonomimi anime girl, beautiful human female face with clear anime eyes and small human nose, fluffy animal ears on head and fluffy animal tail, cute fangs, agile wild presence, NO animal snout, NO muzzle\","
);

// 단일 치환으로 깔끔하게 처리
html = fs.readFileSync('visual_style_guide.html', 'utf-8');

const oldBeastkinPrompt = `'beastkin': "beastkin folk, fluffy animal ears on head and fluffy tail, feline fangs, agile wild presence",`;
const newBeastkinPrompt = `'beastkin': "beastkin kemonomimi girl, beautiful anime human female face with small cute human nose and clear expressive eyes, fluffy animal ears on top of head and natural expressive animal tail, cute canine fangs, agile wild presence",`;

if (html.includes(oldBeastkinPrompt)) {
  html = html.replace(oldBeastkinPrompt, newBeastkinPrompt);
  console.log("Updated RACE_PROMPTS['beastkin']!");
}

const oldBeastkinSheet = `'beastkin': "beastkin folk, fluffy animal ears on head and fluffy expressive animal tail, canine fangs",`;
const newBeastkinSheet = `'beastkin': "beastkin kemonomimi, beautiful anime human female face, fluffy animal ears on head and fluffy expressive animal tail, cute canine fangs, NO animal snout, NO muzzle",`;

if (html.includes(oldBeastkinSheet)) {
  html = html.replace(oldBeastkinSheet, newBeastkinSheet);
  console.log("Updated RACE_SHEET_SPECS['beastkin']!");
}

// 2. tactician (전술가) 프롬프트에서 고글/포션벨트 등 복장 덮어쓰기 요소 제거 -> 전술 태블릿/마도서 및 지휘 포즈로 변경
const oldTacticianPrompt = `'tactician': "tactician alchemist class, wearing tactical goggles and tool belt with glowing potion flasks and mechanical gears, smart observing pose"`;
const newTacticianPrompt = `'tactician': "tactician commander class, holding an ornate tactical grimoire and holographic command tablet, strategic observing pose, commanding gesture"`;

if (html.includes(oldTacticianPrompt)) {
  html = html.replace(oldTacticianPrompt, newTacticianPrompt);
  console.log("Updated ROLE_PROMPTS['tactician']!");
}

// 3. 네거티브 프롬프트에 퍼리(Furry, 주둥이, 동물 얼굴) 및 중복 벨트 차단 추가
const negAnchor = 'four ears on beastkin, human ears on beastkin';
const newNegAnchor = 'furry, anthro, animal snout, muzzle, animal nose, animal face, beast face, cat face, snout, four ears on beastkin, human ears on beastkin';

if (html.includes(negAnchor)) {
  html = html.replace(negAnchor, newNegAnchor);
  console.log("Added anti-furry keywords to negative prompt!");
}

// 4. 수인족 기본 신체 정의(RACE_ANATOMICAL_FEATURES)에서도 케모노미미 얼굴 확정
const oldAnatBeast = `'beastkin': "Permanent beast anatomy: Her fluffy animal ears on head and natural expressive animal tail are living, permanent body parts rooted in her flesh. Both animal ears and tail MUST remain attached on views 01-04 (tail and ears must NEVER be depicted as detached costume props in views 09-15, and must NEVER be replaced by human ears or four-ears).",`;
const newAnatBeast = `'beastkin': "Permanent beast anatomy: MUST have a 100% beautiful anime human female face (small cute human nose, expressive eyes, smooth human skin) with fluffy animal ears on top of head and natural expressive animal tail. Both animal ears and tail MUST remain attached on views 01-04 (tail and ears must NEVER be depicted as detached costume props in views 09-15, and MUST NEVER have an animal snout, animal muzzle, or furry face).",`;

if (html.includes(oldAnatBeast)) {
  html = html.replace(oldAnatBeast, newAnatBeast);
  console.log("Updated RACE_ANATOMICAL_FEATURES['beastkin']!");
}

fs.writeFileSync('visual_style_guide.html', html, 'utf-8');
console.log("Successfully saved all updates!");
