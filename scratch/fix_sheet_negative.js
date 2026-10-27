const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '..', 'visual_style_guide.html');
let content = fs.readFileSync(targetPath, 'utf8');
content = content.replace(/\r\n/g, '\n');

// 설정 시트 모드의 네거티브 프롬프트 체형별 스마트 분기
const oldSheetNegative = `                // 🛡️ 실전 검증된 설정 시트 전용 올인원 네거티브 프롬프트
                negativePrompt = "mannequin, wooden mannequin, plastic doll, blank face, featureless face, faceless, different face, different character, changed body type, flat chest, altered proportions, nsfw, explicit, erotic, sexual, inconsistent costume, english text labels, english words, chinese characters, japanese text, cropped, out of frame, cut off head, cut off feet, complex background, scenery, landscape, blurry, lowres, bad anatomy, bad hands, extra limbs, extra arms, extra legs, cropped, out of frame, cut off head, cut off feet, cut off legs, cut off shoes, close-up, portrait, bust shot, upper body only, medium shot, zoom in, extra arms, extra legs, extra limbs, third arm, four arms, mutated hands, poorly drawn hands, missing limbs, fused limbs, malformed limbs, cloned limbs, floating limbs, extra fingers, deformed fingers, fused fingers, child, kid, underage, loli, male, man, boy, text, error, missing fingers, extra digit, fewer digits, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry";`;

const newSheetNegative = `                // 🛡️ 실전 검증된 설정 시트 전용 올인원 네거티브 프롬프트 (체형 맞춤형 분기)
                let sheetBodyNegatives = [];
                if (bodyType === 'slender' || bodyType === 'petite') {
                    sheetBodyNegatives.push("huge breasts, large breasts, heavy cleavage, voluptuous, thick thighs, wide hips, plump");
                } else if (bodyType === 'mega_glamour') {
                    sheetBodyNegatives.push("flat chest, small breasts, skinny, slender, modest bust");
                } else if (bodyType === 'standard') {
                    sheetBodyNegatives.push("huge breasts, gigantic breasts, flat chest, extreme curves");
                }

                const baseSheetNegative = "mannequin, wooden mannequin, plastic doll, blank face, featureless face, faceless, different face, different character, changed body type, altered proportions, nsfw, explicit, erotic, sexual, inconsistent costume, english text labels, english words, chinese characters, japanese text, cropped, out of frame, cut off head, cut off feet, complex background, scenery, landscape, blurry, lowres, bad anatomy, bad hands, extra limbs, extra arms, extra legs, cropped, out of frame, cut off head, cut off feet, cut off legs, cut off shoes, close-up, portrait, bust shot, upper body only, medium shot, zoom in, extra arms, extra legs, extra limbs, third arm, four arms, mutated hands, poorly drawn hands, missing limbs, fused limbs, malformed limbs, cloned limbs, floating limbs, extra fingers, deformed fingers, fused fingers, child, kid, underage, loli, male, man, boy, text, error, missing fingers, extra digit, fewer digits, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry";

                negativePrompt = sheetBodyNegatives.concat([baseSheetNegative]).join(", ");`;

content = content.replace(oldSheetNegative, newSheetNegative);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully applied smart body negatives to sheet mode!');
