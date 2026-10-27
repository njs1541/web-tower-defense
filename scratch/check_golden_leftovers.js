const fs = require('fs');
const html = fs.readFileSync('visual_style_guide.html', 'utf-8');

const goldenNames = ['EARTH_GOLDEN_PROMPTS', 'BEASTKIN_GOLDEN_PROMPTS', 'FOREST_GOLDEN_PROMPTS', 'AVIAN_GOLDEN_PROMPTS', 'HUMAN_GOLDEN_PROMPTS'];

goldenNames.forEach(name => {
  const count = (html.match(new RegExp(name, 'g')) || []).length;
  console.log(`${name}: ${count} matches`);
});
