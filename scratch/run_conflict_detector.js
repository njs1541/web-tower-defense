const { runSimulation } = require('./sim_harness.js');

const races = ['earth', 'beastkin', 'forest', 'avian', 'human'];
const grades = ['C', 'UC', 'R', 'SR', 'UR', 'U'];
const bodyTypes = ['auto', 'slender', 'standard', 'glamour', 'mega_glamour', 'tomboy', 'petite'];
const styles = ['supreme_gold_chain', 'supreme_cyber_highleg', 'supreme_celestial_lingerie', 'style_a', 'style_b', 'style_hybrid', 'style_classic'];
const roles = ['warrior', 'tank', 'ranger', 'mage', 'assassin', 'support'];
const elements = ['fire', 'frost', 'shock', 'holy', 'dark'];
const modes = ['illust', 'sheet'];

let totalTests = 0;
let conflicts = [];

// 세밀한 충돌 검사 규칙 정의
function detectConflicts(state, pos, neg) {
  const issues = [];

  // 1. 바디슈트 충돌: Pos에 bodysuit이 있는데 Neg에도 bodysuit이 있는가?
  if (/\b(?:bodysuit|catsuit|jumpsuit)\b/i.test(pos) && /\b(?:bodysuit|catsuit|jumpsuit|full body suit)\b/i.test(neg)) {
    // 단, 04 기본 체형의 "clothes on 04 base body" 같은 특수 목적 문맥인지 확인
    issues.push({ type: 'CRITICAL', msg: 'Pos contains bodysuit but Neg also forbids bodysuit!' });
  }

  // 2. 란제리 충돌: Pos에 lingerie가 있는데 Neg에도 lingerie가 있는가?
  if (/\b(?:lingerie|slingshot lingerie)\b/i.test(pos) && /\b(?:lingerie|negligee)\b/i.test(neg)) {
    issues.push({ type: 'CRITICAL', msg: 'Pos contains lingerie but Neg also forbids lingerie!' });
  }

  // 3. 날개 충돌: Pos에 wings가 있는데 Neg에 wings가 있는가?
  // 단, 'no wings, missing wings'는 결손 방지이므로 제외하고 순수 'wings' 배제인지 확인
  if (/\b(?:wings|celestial wings|feathered wings)\b/i.test(pos)) {
    // neg에서 'no wings'가 아닌 순수 'wings' 배제가 있는지 검사
    const cleanNeg = neg.replace(/\b(?:no wings|missing wings)\b/gi, '').replace(/\b(?:wings on 04 base body)\b/gi, '');
    if (/\bwings\b/i.test(cleanNeg)) {
      issues.push({ type: 'CRITICAL', msg: 'Pos requires wings but Neg forbids wings!' });
    }
  }

  // 4. 수인 귀 충돌: beastkin 종족인데 Neg에 animal ears가 있는가?
  if (state.race === 'beastkin' && /\banimal ears\b/i.test(neg.replace(/\bmissing animal ears\b/gi, ''))) {
    issues.push({ type: 'CRITICAL', msg: 'Beastkin has animal ears in Pos, but Neg forbids animal ears!' });
  }

  // 5. 엘프 귀 충돌: forest 종족인데 Neg에 elf ears나 pointed ears가 있는가?
  if (state.race === 'forest') {
    const cleanNeg = neg.replace(/\b(?:short ears|round ears|round human ears)\b/gi, '');
    if (/\b(?:elf ears|pointed ears)\b/i.test(cleanNeg)) {
      issues.push({ type: 'CRITICAL', msg: 'Forest has elf ears in Pos, but Neg forbids elf ears!' });
    }
  }

  // 6. 인간 종족인데 Pos에 animal ears나 elf ears가 섞여 들어가는가?
  if (state.race === 'human' && /\b(?:elf ears|pointed ears|animal ears|fluffy wolf ears)\b/i.test(pos)) {
    issues.push({ type: 'WARNING', msg: 'Human character unexpectedly contains beast/elf ears in Pos!' });
  }

  // 7. 체형 충돌: 슬랜더/쁘띠인데 Pos에 huge breasts가 남아있는가?
  if ((state.bodyType === 'slender' || state.bodyType === 'petite') && /\bhuge breasts|voluptuous\b/i.test(pos)) {
    // 만약 등급이나 복장에서 들어왔다면 경고
    issues.push({ type: 'CRITICAL', msg: `BodyType is ${state.bodyType} but Pos still contains huge breasts/voluptuous!` });
  }

  // 8. 체형 충돌: 메가 글래머인데 Neg에 huge breasts가 들어가 있는가?
  if (state.bodyType === 'mega_glamour' && /\bhuge breasts|voluptuous\b/i.test(neg)) {
    issues.push({ type: 'CRITICAL', msg: 'BodyType is mega_glamour but Neg forbids huge breasts!' });
  }

  // 9. 배경 누끼 충돌: removeBg = true 인데 Pos에 풍경/실내 배경 키워드가 강하게 남아있는가?
  if (state.removeBg && /\b(?:room|bedroom|temple|sanctuary background|palace interior)\b/i.test(pos)) {
    issues.push({ type: 'WARNING', msg: 'Clean white background selected, but complex scene background remains in Pos!' });
  }

  return issues;
}

console.log("Starting exhaustive permutation test...");

for (const race of races) {
  for (const grade of grades) {
    for (const bodyType of bodyTypes) {
      for (const style of styles) {
        for (const mode of modes) {
          totalTests++;
          const state = {
            race,
            grade,
            bodyType,
            style,
            role: 'ranger',
            element: 'shock',
            removeBg: true,
            mode
          };

          try {
            const res = runSimulation(state);
            const foundIssues = detectConflicts(state, res.pos, res.neg);
            if (foundIssues.length > 0) {
              conflicts.push({ state, issues: foundIssues });
            }
          } catch (e) {
            conflicts.push({ state, issues: [{ type: 'FATAL', msg: e.message }] });
          }
        }
      }
    }
  }
}

console.log(`Executed ${totalTests} combinations.`);
console.log(`Found ${conflicts.length} conflict cases.`);

if (conflicts.length > 0) {
  console.log("\n--- Sample Conflict Details ---");
  conflicts.slice(0, 10).forEach((c, i) => {
    console.log(`[Issue #${i+1}] State: Race=${c.state.race}, Grade=${c.state.grade}, Style=${c.state.style}, Body=${c.state.bodyType}, Mode=${c.state.mode}`);
    c.issues.forEach(iss => console.log(`  - [${iss.type}] ${iss.msg}`));
  });
} else {
  console.log("🎉 ALL combinations passed with ZERO conflicts!");
}
