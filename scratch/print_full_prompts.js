const fs = require('fs');
const html = fs.readFileSync('visual_style_guide.html', 'utf-8');

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
const NEGATIVE_PROMPT_FIXED = html.match(/const NEGATIVE_PROMPT_FIXED = "([^"]+)";/)[1];

const grade = 'U';
const element = 'shock';
const role = 'ranger';
const race = 'forest';
const style = 'supreme_cyber_highleg';
const bodyType = 'tomboy';
const details = '';
const isRemoveBg = true;
const genMode = 'illust';

const selectedBodySpec = (bodyType !== 'auto' && BODY_TYPE_SPECS[bodyType]) 
    ? BODY_TYPE_SPECS[bodyType] 
    : (RACE_BODY_SPECS[race] || 'voluptuous adult female');

const baseMaster = "masterpiece, best quality, ultra-detailed anime mobile gacha illustration, Genshin and Blue Archive art style, 1girl, solo, adult female, full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose, anatomically correct, clean lineart, vibrant cel-shading, cinematic lighting";

const promptParts = [
    baseMaster,
    selectedBodySpec,
    STYLE_PROMPTS[style],
    RACE_PROMPTS[race],
    details,
    ROLE_PROMPTS[role],
    ELEMENT_PROMPTS[element],
    GRADE_PROMPTS[grade]
].filter(p => p && p.trim().length > 0);

let prompt = promptParts.join(", ");

let customNegatives = [];

if (bodyType === 'slender') {
    customNegatives.push("huge breasts, large breasts, heavy cleavage, voluptuous, thick thighs, wide hips, plump");
} else if (bodyType === 'petite') {
    customNegatives.push("tall, mature adult woman, huge breasts, long legs, heavy curves, voluptuous");
} else if (bodyType === 'standard') {
    customNegatives.push("huge breasts, gigantic breasts, flat chest, extreme curves");
} else if (bodyType === 'mega_glamour') {
    customNegatives.push("flat chest, small breasts, skinny, slender, modest bust");
} else if (bodyType === 'tomboy') {
    customNegatives.push("ultra feminine, soft fat, weak physique, heavy makeup");
}

if (race === 'forest') {
    customNegatives.push("short ears, round human ears, animal ears, wings");
}

if (style === 'supreme_celestial_lingerie') {
    customNegatives.push("bodysuit, catsuit, jumpsuit, full body suit, tights, leggings, heavy armor, plate armor, heavy coat, heavy dress, robe, hat");
} else if (style === 'supreme_cyber_highleg' || style === 'style_a') {
    customNegatives.push("loose robe, wedding dress, fluffy gown, lingerie, negligee, casual clothes");
}

let negativePrompt = customNegatives.concat([NEGATIVE_PROMPT_FIXED]).join(", ");

if (isRemoveBg) {
    const bgRegex = /(?:background|backdrop|setting|scenery)[^,]*(?:,|$)/gi;
    prompt = prompt.replace(bgRegex, '').replace(/,\s*,/g, ',').trim();
    prompt += ', simple solid pure white background, clean plain white backdrop, no background elements, solo isolated character, full body asset cutout ready';

    const bgNegatives = "scenery, landscape, complex background, outdoors, indoors, furniture, sky, clouds, space, nebula, stars, shadows on background, gradient background";
    negativePrompt = `${bgNegatives}, ${negativePrompt}`;
}

const allInOne = `${prompt}. Avoid: ${negativePrompt}`;

console.log("=== POSITIVE ===");
console.log(prompt);
console.log("\n=== NEGATIVE ===");
console.log(negativePrompt);
console.log("\n=== ALL-IN-ONE ===");
console.log(allInOne);
