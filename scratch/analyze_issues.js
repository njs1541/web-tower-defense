const { runSimulation } = require('./sim_harness.js');

const races = ['earth', 'beastkin', 'forest', 'avian', 'human'];
const grades = ['C', 'UC', 'R', 'SR', 'UR', 'U'];
const bodyTypes = ['auto', 'slender', 'standard', 'glamour', 'mega_glamour', 'tomboy', 'petite'];
const styles = ['supreme_gold_chain', 'supreme_cyber_highleg', 'supreme_celestial_lingerie', 'style_a', 'style_b', 'style_hybrid', 'style_classic'];
const modes = ['illust', 'sheet'];

const issueSummary = {};

for (const race of races) {
  for (const grade of grades) {
    for (const bodyType of bodyTypes) {
      for (const style of styles) {
        for (const mode of modes) {
          const state = { race, grade, bodyType, style, role: 'ranger', element: 'shock', removeBg: true, mode };
          const res = runSimulation(state);
          
          // 검사
          const issues = [];
          
          // 1. Bodysuit conflict
          if (/\b(?:bodysuit|catsuit|jumpsuit)\b/i.test(res.pos) && /\b(?:bodysuit|catsuit|jumpsuit|full body suit)\b/i.test(res.neg)) {
            issues.push('Bodysuit in Pos vs Bodysuit in Neg');
          }
          // 2. Wings conflict
          const cleanNegWings = res.neg.replace(/\b(?:no wings|missing wings)\b/gi, '').replace(/\b(?:wings on 04 base body)\b/gi, '');
          if (/\b(?:wings|celestial wings|feathered wings)\b/i.test(res.pos) && /\bwings\b/i.test(cleanNegWings)) {
            issues.push(`Wings in Pos (${state.grade}) vs Wings in Neg (${state.race})`);
          }
          // 3. Animal ears conflict
          if (state.race === 'beastkin' && /\banimal ears\b/i.test(res.neg.replace(/\bmissing animal ears\b/gi, ''))) {
            issues.push('Animal ears forbidden for Beastkin');
          }
          // 4. Elf ears conflict
          if (state.race === 'forest' && /\b(?:elf ears|pointed ears)\b/i.test(res.neg.replace(/\b(?:short ears|round ears|round human ears)\b/gi, ''))) {
            issues.push('Elf ears forbidden for Forest');
          }
          // 5. Breasts conflict
          if ((bodyType === 'slender' || bodyType === 'petite') && /\bhuge breasts|voluptuous\b/i.test(res.pos)) {
            issues.push(`Slender/Petite with huge breasts in Pos`);
          }
          if (bodyType === 'mega_glamour' && /\bhuge breasts|voluptuous\b/i.test(res.neg)) {
            issues.push(`Mega_glamour with huge breasts in Neg`);
          }
          // 6. Lingerie conflict
          if (/\b(?:lingerie|slingshot lingerie)\b/i.test(res.pos) && /\b(?:lingerie|negligee)\b/i.test(res.neg)) {
            issues.push(`Lingerie in Pos vs Lingerie in Neg`);
          }

          issues.forEach(iss => {
            issueSummary[iss] = (issueSummary[iss] || 0) + 1;
          });
        }
      }
    }
  }
}

console.log("=== ISSUE SUMMARY ===");
console.log(JSON.stringify(issueSummary, null, 2));
