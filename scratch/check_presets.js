const fs = require('fs');
const html = fs.readFileSync('visual_style_guide.html', 'utf-8');

const presetFunctions = [
  'applyEarthGradePreset',
  'applyBeastkinGradePreset',
  'applyForestGradePreset',
  'applyAvianGradePreset',
  'applyHumanGradePreset'
];

presetFunctions.forEach(fn => {
  const idx = html.indexOf('function ' + fn);
  if (idx !== -1) {
    console.log(`=== ${fn} ===`);
    console.log(html.substring(idx, idx + 1000));
  }
});
