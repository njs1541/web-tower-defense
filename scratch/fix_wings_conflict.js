const fs = require('fs');
let html = fs.readFileSync('visual_style_guide.html', 'utf-8');

// 기존 종족별 네거티브 블록 찾기
const targetBlock = `                // 종족별 비정상 파츠 배제
                if (race === 'human') {
                    customNegatives.push("animal ears, four ears, elf ears, pointed ears, wings, cyborg arm, mechanical parts");
                } else if (race === 'beastkin') {
                    customNegatives.push("human ears, four ears, extra ears, missing animal ears, missing tail");
                } else if (race === 'forest') {
                    customNegatives.push("short ears, round human ears, animal ears, wings");
                } else if (race === 'avian') {
                    customNegatives.push("no wings, missing wings, animal ears, elf ears");
                } else if (race === 'earth') {
                    customNegatives.push("animal ears, elf ears, wings");
                }`;

const replacementBlock = `                // 종족별 비정상 파츠 배제 (U등급 천상 날개와의 상호 충돌 지능형 방지)
                if (race === 'human') {
                    const humanNeg = ["animal ears", "four ears", "elf ears", "pointed ears", "cyborg arm", "mechanical parts"];
                    if (grade !== 'U') humanNeg.push("wings");
                    customNegatives.push(humanNeg.join(", "));
                } else if (race === 'beastkin') {
                    const beastNeg = ["human ears", "four ears", "extra ears", "missing animal ears", "missing tail"];
                    if (grade !== 'U') beastNeg.push("wings");
                    customNegatives.push(beastNeg.join(", "));
                } else if (race === 'forest') {
                    const forestNeg = ["short ears", "round human ears", "animal ears"];
                    if (grade !== 'U') forestNeg.push("wings");
                    customNegatives.push(forestNeg.join(", "));
                } else if (race === 'avian') {
                    customNegatives.push("no wings, missing wings, animal ears, elf ears");
                } else if (race === 'earth') {
                    const earthNeg = ["animal ears", "elf ears"];
                    if (grade !== 'U') earthNeg.push("wings");
                    customNegatives.push(earthNeg.join(", "));
                }`;

if (!html.includes(targetBlock)) {
  console.error("targetBlock not found!");
} else {
  html = html.replace(targetBlock, replacementBlock);
  fs.writeFileSync('visual_style_guide.html', html, 'utf-8');
  console.log("Successfully resolved wings conflict!");
}
