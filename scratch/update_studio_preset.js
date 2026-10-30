const fs = require('fs');
let html = fs.readFileSync('sd_asset_studio.html', 'utf8');

// 1. 드롭다운 옵션에 실바나 추가
const sylvanaOption = `<option value="char_sylvana" selected>👑 [UR / 메가글래머] 숲의 종족: 성역의 여황 실바나 (Sylvana)</option>\n            `;
html = html.replace(/(<select[^>]*id="preset-selector"[^>]*>[\r\n\s]*)/, '$1' + sylvanaOption);

// 2. characterPresets에 char_sylvana 추가
const sylvanaPresetCode = `      char_sylvana: {
        slug: 'sylvana',
        rigType: 'tall',
        mirrorWings: true,
        useBaseBody: true,
        absentIds: ['15'],
        motionType: 'sword', // 대방패 가디언 수호 모션
        sampleStanding: 'assets/char_sylvana.jpg',
        sampleSheetA: 'assets/ref_sylvana_sheet_a.jpg',
        sampleSheetB: 'assets/ref_sylvana_sheet_b.jpg',
        customFit: {
          expr: { scale: 98, x: -1.0, y: 1.0, clip: 44, mask: true, flipX: false },
          top: { scale: 108, x: -2.0, y: 0.5, flipX: false },
          bottom: { scale: 106, x: -2.0, y: -2.0, flipX: false },
          halo: { scale: 100, x: 0, y: -4.0, flipX: false },
          wings: { scale: 102, x: 0, y: -3.0, flipX: false },
          weapon: { scale: 100, x: 2.0, y: 0, flipX: false },
          sub: { scale: 100, x: -2.0, y: 0, flipX: false }
        }
      },
`;

html = html.replace(/(const characterPresets = \{[\r\n\s]*)/, '$1' + sylvanaPresetCode);

fs.writeFileSync('sd_asset_studio.html', html, 'utf8');
console.log('Successfully added char_sylvana to sd_asset_studio.html!');

