// Node.js 시뮬레이션 테스트
const fs = require('fs');

console.log("Analyzing skin validation logic...");

function isValidSkin(r, g, b, a) {
  if (a < 180) return false;
  // 크로마키 초록색 및 잔여 노이즈 배제
  if (g > 130 && r < 120 && b < 120) return false;
  if (g > r && g > b) return false;
  if (g > r * 0.95 && g > b + 20) return false;
  
  // 어두운 선화/외곽선 배제 (명도 lum < 140)
  const lum = r * 0.299 + g * 0.587 + b * 0.114;
  if (lum < 145) return false;
  
  // 피부색(웜톤 살구색) 특성: R이 가장 높고, G가 그 다음, B가 가장 낮음
  if (r < 170 || g < 130 || b < 100) return false;
  if (r < g || g < b * 0.8) return false;
  
  return true;
}

// 테스트 케이스들
const samples = [
  { name: "파츠 내부 밝은 피부", r: 254, g: 227, b: 210, a: 255 },
  { name: "파츠 내부 그림자 피부", r: 231, g: 180, b: 161, a: 255 },
  { name: "어두운 외곽선 (기존에 번지던 색!)", r: 96, g: 33, b: 20, a: 255 },
  { name: "초록빛 크로마키 노이즈 (기존에 번지던 색!)", r: 38, g: 89, b: 13, a: 255 },
  { name: "외곽선 경계 흐린 색", r: 144, g: 80, b: 64, a: 255 }
];

for (const s of samples) {
  console.log(`${s.name.padEnd(30)}: valid = ${isValidSkin(s.r, s.g, s.b, s.a)}`);
}

