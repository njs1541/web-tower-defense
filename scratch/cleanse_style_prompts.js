const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'visual_style_guide.html');
let content = fs.readFileSync(targetPath, 'utf8');

content = content.replace(/\r\n/g, '\n');

// 1. RACE_PROMPTS 정제 (체형 단어 배제, 순수 종족 고유 피처만 유지)
const oldRacePrompts = `        const RACE_PROMPTS = {
            'forest': "forest folk, tall height, voluptuous curvy mature body, light revealing leaf and cloth attire, long pointed elf ears",
            'earth': "earth folk, short height petite adult female, curvy voluptuous bust, cyborg mechanical prosthetic arm and legs, gears and wrench",
            'beastkin': "beastkin folk, average height, fluffy animal ears on head and fluffy tail, light agile wild attire",
            'human': "human folk, average height, balanced adult proportions, elaborate formal fantasy costume",
            'avian': "avian folk, short height petite adult female, curvy bust, majestic wings on back, feather accents",
            'mutation': "unique mutant anomaly, rare contrasting body proportions, exotic hybrid features"
        };`;

const newRacePrompts = `        const RACE_PROMPTS = {
            'forest': "forest folk, long pointed elf ears, emerald foliage accents, graceful nature presence",
            'earth': "earth folk, cybernetic mechanical prosthetic arm and legs, visible brass gears and hydraulics",
            'beastkin': "beastkin folk, fluffy animal ears on head and fluffy tail, feline fangs, agile wild presence",
            'human': "human folk, elegant imperial styling, versatile fantasy aura",
            'avian': "avian folk, majestic feathered wings spread on back, feather accents, soaring aerial presence",
            'mutation': "unique mutant anomaly, rare contrasting exotic hybrid features"
        };`;

content = content.replace(oldRacePrompts, newRacePrompts);

// 2. STYLE_PROMPTS 정제 (체형 단어 배제, 순수 복장/장비 디자인만 유지)
const oldStylePromptsRegex = /const STYLE_PROMPTS = \{[\s\S]+?\};\n\n\s*const NEGATIVE_PROMPT_FIXED/;

const newStylePromptsCode = `const STYLE_PROMPTS = {
            'supreme_gold_chain': "alluring sensual apex costume, ornate glowing gold chain bikini armor with platinum trims, jeweled chest piece with cleavage cutout, micro high-leg armor plating exposing hips, translucent white sheer silk veil draped over shoulders and flowing behind, sheer lace-up garter stockings with gold embroidery, golden choker with glowing sacred crest gem",
            'supreme_cyber_highleg': "futuristic high-leg cybernetic bodysuit, transparent holographic chest panels, micro high-cut hip exposure with glowing cybernetic lines, glossy patent leather, snug thigh strap holster squeeze, translucent cyber stockings",
            'supreme_celestial_lingerie': "sheer ethereal starlight lingerie, translucent flowing organza nebula robe, sacred golden chain jewelry across chest and hips, floating gracefully in the air, enormous celestial halo rings, stardust particles",
            'style_a': "tight shiny black latex and patent leather bodysuit with glossy specular highlights, chest leather body harness with metallic buckles, keyhole cutout, thigh holster with snug leather thigh strap squeeze, asymmetrical thigh-high stockings, black leather choker with ring",
            'style_b': "elegant dark fantasy silk dress, translucent sheer lace fabric over chest and shoulders, deep teardrop keyhole cutout, extremely high side slit exposing hip, delicate lace-up black garter belt, sheer black stockings with floral embroidery",
            'style_hybrid': "fantasy tactical hybrid costume, leather bodysuit layered under an elegant high-slit sheer silk coat, metallic armor buckles and lace-up garter details",
            'style_classic': "formal knight officer tunic and light breastplate armor, neat shoulder cape, high-waist leather shorts, silver filigree details, polished combat boots",
            'curvy': "alluring sensual costume, flattering feminine design",
            'slender': "graceful elegant costume, slim fitting design",
            'boyish': "handsome dashing tactical costume, sharp tailored design"
        };

        const NEGATIVE_PROMPT_FIXED`;

content = content.replace(oldStylePromptsRegex, newStylePromptsCode);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully cleansed STYLE_PROMPTS and RACE_PROMPTS of conflicting body descriptors!');
