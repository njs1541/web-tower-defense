const { runSimulation } = require('./sim_harness.js');

const races = ['earth', 'beastkin', 'forest', 'avian', 'human'];
const grades = ['C', 'UC', 'R', 'SR', 'UR', 'U'];

let sheetErrors = [];

races.forEach(race => {
  grades.forEach(grade => {
    const res = runSimulation({
      race,
      grade,
      bodyType: 'tomboy',
      style: 'style_b',
      role: 'mage',
      element: 'frost',
      removeBg: true,
      mode: 'sheet'
    });

    const pos = res.pos;
    
    // 필수 01~15 라벨 확인
    for (let i = 1; i <= 15; i++) {
      const numStr = (i < 10 ? '0' : '') + i;
      if (!pos.includes(numStr)) {
        sheetErrors.push(`Missing number tag ${numStr} in Race=${race}, Grade=${grade}`);
      }
    }

    // 04 기본 체형 정밀 확인
    if (!pos.includes("'04. 기본 체형'")) {
      sheetErrors.push(`Missing '04. 기본 체형' in Race=${race}, Grade=${grade}`);
    }
    // 15 복장 : 속옷 확인
    if (!pos.includes("'15. 복장 : 속옷")) {
      sheetErrors.push(`Missing '15. 복장 : 속옷' in Race=${race}, Grade=${grade}`);
    }
  });
});

console.log(`Sheet validation done. Errors: ${sheetErrors.length}`);
if (sheetErrors.length > 0) {
  console.log(sheetErrors);
} else {
  console.log("🎉 ALL 01~15 Standard Numbered Labels & Underwear Specs perfectly validated across ALL races and grades!");
}
