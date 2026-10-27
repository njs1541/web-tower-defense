const { runSimulation } = require('./sim_harness.js');

const races = ['earth', 'beastkin', 'forest', 'avian', 'human'];
const grades = ['C', 'UC', 'R', 'SR', 'UR', 'U'];
const bodyTypes = ['auto', 'slender', 'standard', 'glamour', 'mega_glamour', 'tomboy', 'petite'];
const styles = ['supreme_gold_chain', 'supreme_cyber_highleg', 'supreme_celestial_lingerie', 'style_a', 'style_b', 'style_hybrid', 'style_classic'];
const modes = ['illust', 'sheet'];

let conflicts = [];
let total = 0;

for (const race of races) {
  for (const grade of grades) {
    for (const bodyType of bodyTypes) {
      for (const style of styles) {
        for (const mode of modes) {
          total++;
          const state = { race, grade, bodyType, style, role: 'ranger', element: 'shock', removeBg: true, mode };
          const res = runSimulation(state);
          
          // 전처리: 04 기본 체형 전용 보호 키워드 및 결손 방지 키워드 제외 후 순수 금지어 추출
          let cleanNeg = res.neg
            .replace(/\bblack bodysuit on 04 base body\b/gi, '')
            .replace(/\bmissing wings on avian folk\b/gi, '')
            .replace(/\bdetached feathered wings in costume breakdown\b/gi, '')
            .replace(/\bclothes on 04 base body\b/gi, '')
            .replace(/\bwings on 04 base body\b/gi, '')
            .replace(/\barmor on 04 base body\b/gi, '')
            .replace(/\bno wings\b/gi, '')
            .replace(/\bmissing wings\b/gi, '')
            .replace(/\bmissing animal ears\b/gi, '')
            .replace(/\bmissing tail\b/gi, '');

          const issues = [];

          // 1. 순수 바디슈트 배제 충돌
          if (/\b(?:bodysuit|catsuit|jumpsuit)\b/i.test(res.pos) && /\b(?:bodysuit|catsuit|jumpsuit|full body suit)\b/i.test(cleanNeg)) {
            issues.push('Bodysuit in Pos vs Pure Bodysuit in Neg');
          }

          // 2. 순수 날개 배제 충돌
          if (/\b(?:wings|celestial wings|feathered wings)\b/i.test(res.pos) && /\bwings\b/i.test(cleanNeg)) {
            issues.push(`Wings in Pos (${state.grade}) vs Pure Wings in Neg (${state.race})`);
          }

          // 3. 체형 충돌
          if ((bodyType === 'slender' || bodyType === 'petite') && /\bhuge breasts|voluptuous\b/i.test(res.pos)) {
            issues.push('Slender with huge breasts in Pos');
          }

          if (issues.length > 0) {
            conflicts.push({ state, issues });
          }
        }
      }
    }
  }
}

console.log(`Executed ${total} permutations.`);
console.log(`Real Conflicts: ${conflicts.length}`);
if (conflicts.length === 0) {
  console.log("🎉 ALL combinations passed with ZERO real conflicts!");
} else {
  console.log(conflicts.slice(0, 5));
}
