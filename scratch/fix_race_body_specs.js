const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'visual_style_guide.html');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. RACE_BODY_SPECS 추출
const match = content.match(/const RACE_BODY_SPECS = \{[\s\S]+?\};/);
if (match) {
    const raceBodySpecsCode = match[0];
    
    // 기존 위치에서 제거
    content = content.replace(raceBodySpecsCode, '// (RACE_BODY_SPECS moved to top)');
    
    // BODY_TYPE_SPECS 아래에 배치
    if (!content.includes('// 🌍 종족별 기본 표준 체형 명세')) {
        content = content.replace(
            'const BODY_TYPE_SPECS = {',
            '// 🌍 종족별 기본 표준 체형 명세 (종족 자동 선택 시 적용)\n        ' + raceBodySpecsCode + '\n\n        const BODY_TYPE_SPECS = {'
        );
    }
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Fixed RACE_BODY_SPECS placement!');
