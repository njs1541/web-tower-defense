const fs = require('fs');
let html = fs.readFileSync('visual_style_guide.html', 'utf-8');

// 1. template-download-box를 상시 표시(display: flex)로 변경하고, 선택된 종족에 맞춰 버튼 텍스트가 동적으로 갱신되도록 개선
const oldTemplateBox = `<div id="template-download-box" style="display: none; background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2)); border: 2px solid #10b981; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.25);">`;

const newTemplateBox = `<div id="template-download-box" style="display: flex; background: linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(59, 130, 246, 0.25)); border: 2px solid #10b981; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);">`;

if (html.includes(oldTemplateBox)) {
  html = html.replace(oldTemplateBox, newTemplateBox);
  console.log("Updated template-download-box to display: flex (always visible)!");
}

// 2. updatePrompt() 에서 버튼 텍스트를 현재 선택된 종족명에 맞춰 스마트하게 변경
// 예: [📥 수인족 공식 설정 시트 규격 틀 다운로드 (PNG 2048x1152)]
const oldBtnCode = `<span>📥 설정 시트 규격 틀 (PNG) 다운로드</span>`;
const newBtnCode = `<span id="btn-template-download-text">📥 [수인족] 공식 설정 시트 규격 틀 (PNG 2048x1152) 다운로드</span>`;

if (html.includes(oldBtnCode)) {
  html = html.replace(oldBtnCode, newBtnCode);
  console.log("Updated button text with ID btn-template-download-text!");
}

// 3. updatePrompt() 내부에서 종족 변경 시 버튼 텍스트 동적 동기화
const targetUpdatePrompt = `function updatePrompt() {
            const grade = document.getElementById('gen-grade').value;
            const element = document.getElementById('gen-element').value;
            const role = document.getElementById('gen-role').value;
            const race = document.getElementById('gen-race').value;`;

const newUpdatePrompt = `function updatePrompt() {
            const grade = document.getElementById('gen-grade').value;
            const element = document.getElementById('gen-element').value;
            const role = document.getElementById('gen-role').value;
            const race = document.getElementById('gen-race').value;

            // 📥 템플릿 다운로드 버튼 텍스트를 현재 선택 종족에 맞춰 즉시 갱신
            const RACE_KR_MAP = {
                'earth': '땅의 종족',
                'beastkin': '수인족',
                'forest': '숲의 종족',
                'avian': '비행족',
                'human': '인간족',
                'mutation': '변이종'
            };
            const tBtnText = document.getElementById('btn-template-download-text');
            if (tBtnText) {
                tBtnText.textContent = \`📥 [\${RACE_KR_MAP[race] || '종족'}] 공식 설정 시트 규격 틀 (PNG 2048x1152) 다운로드\`;
            }`;

if (html.includes(targetUpdatePrompt)) {
  html = html.replace(targetUpdatePrompt, newUpdatePrompt);
  console.log("Added dynamic race label update to download button!");
}

fs.writeFileSync('visual_style_guide.html', html, 'utf-8');
console.log("All updates saved successfully!");
