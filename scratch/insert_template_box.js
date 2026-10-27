const fs = require('fs');
let html = fs.readFileSync('visual_style_guide.html', 'utf-8');

const targetStr = '<div id="copy-bar-box"';

const templateBoxHtml = `<!-- 종족별 공식 설정 시트 규격 틀 템플릿(PNG) 다운로드 배너 (설정 시트 모드 전용) -->
                <div id="template-download-box" style="display: none; background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2)); border: 2px solid #10b981; border-radius: 12px; padding: 16px 20px; margin-bottom: 16px; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.25);">
                    <div style="flex: 1; min-width: 280px;">
                        <div style="font-size: 15px; font-weight: 800; color: #34d399; display: flex; align-items: center; gap: 8px;">
                            <span>📐 [1단계] 공식 설정 시트 규격 틀 (PNG 2048x1152) 다운로드</span>
                            <span style="background: #10b981; color: #000; font-size: 11px; font-weight: 900; padding: 2px 7px; border-radius: 4px;">GRID TEMPLATE</span>
                        </div>
                        <div style="font-size: 12.5px; color: #e2e8f0; margin-top: 5px; line-height: 1.6;">
                            📌 <b>01~04 턴어라운드 박스(키 눈금 포함), 05~08 표정 4칸, 09~15 복장·속옷 분해도</b>가 픽셀 단위로 인쇄된 <b>2048x1152 공식 템플릿 PNG</b>를 다운로드합니다.<br>
                            나노바나나(제미나이)에 <b>① 원본 캐릭터 전신 일러스트</b>와 <b>② 다운로드한 설정 시트 규격 틀(PNG)</b> 2장을 함께 첨부(Ctrl+V)하고 아래 프롬프트를 전송하세요!
                        </div>
                    </div>
                    <button type="button" class="btn-preset" style="background: linear-gradient(135deg, #10b981, #3b82f6); color: #fff; font-weight: 800; padding: 12px 24px; font-size: 14px; border-radius: 8px; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4); transition: all 0.2s ease; display: flex; align-items: center; gap: 8px;" onclick="downloadModelSheetTemplate()">
                        <span>📥 설정 시트 규격 틀 (PNG) 다운로드</span>
                    </button>
                </div>\n\n                `;

if (!html.includes(targetStr)) {
  console.error("targetStr not found!");
} else {
  // 이미 template-download-box가 본문에 있는지 확인
  if (html.indexOf('<div id="template-download-box"') !== -1) {
    console.log("Already has template-download-box div!");
  } else {
    html = html.replace(targetStr, templateBoxHtml + targetStr);
    fs.writeFileSync('visual_style_guide.html', html, 'utf-8');
    console.log("Successfully inserted template-download-box into HTML!");
  }
}
