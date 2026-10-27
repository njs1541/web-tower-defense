const fs = require('fs');
let html = fs.readFileSync('visual_style_guide.html', 'utf-8');

// 개별 라벨 안전 치환
html = html.replace(
  "'outer': '12. 복장 : 기계의수 파츠 및 망토'",
  "'outer': '12. 복장 : 외투 (엔지니어 망토 / 코트)'"
);

html = html.replace(
  "'outer': '12. 복장 : 털 망토 및 꼬리 장식'",
  "'outer': '12. 복장 : 외투 (털 망토 / 판초 / 케이프)'"
);

html = html.replace(
  "'outer': '12. 복장 : 오르간자 페어리 망토 / 날개'",
  "'outer': '12. 복장 : 외투 (오르간자 페어리 실크 망토)'"
);

fs.writeFileSync('visual_style_guide.html', html, 'utf-8');
console.log("Labels successfully updated!");
