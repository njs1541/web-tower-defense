const fs = require('fs');
let html = fs.readFileSync('visual_style_guide.html', 'utf-8');

// 1. Canvas 기반 고해상도(2048x1152) 설정 시트 규격 템플릿 생성 및 다운로드 함수 작성
const templateGeneratorFunction = `
        // 📐 종족별 초고해상도(2048x1152) 공식 설정 시트 규격 틀(PNG) 원클릭 생성 & 다운로드 엔진
        function downloadModelSheetTemplate(customRace) {
            const race = customRace || document.getElementById('gen-race')?.value || 'beastkin';
            const grade = document.getElementById('gen-grade')?.value || 'UR';
            const bodyType = document.getElementById('gen-body-type')?.value || 'auto';
            
            const RACE_TITLES = {
                'earth': '땅의 종족 (EARTH FOLK)',
                'beastkin': '수인족 (BEASTKIN FOLK)',
                'forest': '숲의 종족 (FOREST FOLK)',
                'avian': '비행족 (AVIAN FOLK)',
                'human': '인간족 (HUMAN FOLK)',
                'mutation': '변이종 (MUTATION)'
            };

            const RACE_NOTES = {
                'earth': '※ [땅의 종족 영구 신체]: 기계 의수는 01~04 뷰에 영구 결합 유지 (09~15 분해 금지, 몸통과 다리는 생체 피부)',
                'beastkin': '※ [수인족 영구 신체]: 케모노미미 미소녀 얼굴 + 동물 귀/꼬리는 01~04 뷰에 영구 결합 (09~15 분해 금지, 퍼리 주둥이 금지)',
                'forest': '※ [숲의 종족 영구 신체]: 결정체 엘프 뾰족귀는 01~04 뷰에 영구 결합 유지 (둥근 인간 귀 변형 금지)',
                'avian': '※ [비행족 영구 신체]: 등 뒤의 생체 깃털 날개는 01~04 뷰에 영구 결합 유지 (09~15 분해 금지)',
                'human': '※ [인간족 영구 신체]: 순수 인간 인체 및 둥근 귀 엄수 (동물귀, 날개, 기계팔 무단 침범 금지)'
            };

            const currentLabels = (typeof RACE_COSTUME_LABELS !== 'undefined' && RACE_COSTUME_LABELS[race]) 
                ? RACE_COSTUME_LABELS[race] 
                : {
                    'head': '09. 복장 : 머리 장식',
                    'top': '10. 복장 : 상의',
                    'bottom': '11. 복장 : 하의',
                    'outer': '12. 복장 : 외투',
                    'acc1': '13. 장신구 1',
                    'acc2': '14. 장신구 2'
                };

            // 가상 캔버스 생성 (2048 x 1152 고해상도)
            const canvas = document.createElement('canvas');
            canvas.width = 2048;
            canvas.height = 1152;
            const ctx = canvas.getContext('2d');

            // 1. 배경 채우기 (순백색)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. 상단 메인 헤더
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(RACE_TITLES[race] + ' 캐릭터 설정 및 제작 참고 자료', 1024, 60);

            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText('CHARACTER REF SHEET & TURNAROUND (OFFICIAL GAME PRODUCTION SPECIFICATION 01~15)', 1024, 92);

            // 종족별 영구 신체 주의사항 라벨 (헤더 우측)
            ctx.fillStyle = '#dc2626';
            ctx.font = 'bold 15px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(RACE_NOTES[race] || '', 2000, 92);

            // 헬퍼: 박스 그리기
            function drawSlotBox(x, y, w, h, title, sub, isHighlight) {
                ctx.save();
                ctx.fillStyle = isHighlight ? '#fffbeb' : '#f8fafc';
                ctx.strokeStyle = isHighlight ? '#f59e0b' : '#cbd5e1';
                ctx.lineWidth = isHighlight ? 2.5 : 1.5;
                ctx.fillRect(x, y, w, h);
                ctx.strokeRect(x, y, w, h);

                // 상단 라벨 바
                ctx.fillStyle = isHighlight ? '#fef3c7' : '#f1f5f9';
                ctx.fillRect(x, y, w, 38);
                ctx.strokeStyle = isHighlight ? '#f59e0b' : '#cbd5e1';
                ctx.beginPath();
                ctx.moveTo(x, y + 38);
                ctx.lineTo(x + w, y + 38);
                ctx.stroke();

                // 텍스트 라벨
                ctx.fillStyle = isHighlight ? '#b45309' : '#1e293b';
                ctx.font = 'bold 17px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(title, x + w / 2, y + 25);

                if (sub) {
                    ctx.fillStyle = '#94a3b8';
                    ctx.font = '13px sans-serif';
                    ctx.fillText(sub, x + w / 2, y + h / 2);
                }
                ctx.restore();
            }

            // 3. 상단 턴어라운드 영역 (Y: 120 ~ 680, H: 560)
            const topY = 120;
            const topH = 560;
            const slotW = 445;
            const startX = 60;
            const gap = 38;

            // 눈금 가이드선 (좌측 0~180cm 및 등신선)
            ctx.save();
            ctx.strokeStyle = '#fca5a5';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);

            // 머리선, 가슴선, 허리선, 골반선, 발끝선 수평 점선 가이드
            const guideLevels = [topY + 70, topY + 160, topY + 230, topY + 310, topY + topH - 30];
            const levelNames = ['정수리 기준선 (Head)', '가슴선 (Chest)', '허리선 (Waist)', '골반선 (Hips)', '발끝 바닥선 (Feet Base)'];
            guideLevels.forEach((gy, i) => {
                ctx.beginPath();
                ctx.moveTo(startX - 20, gy);
                ctx.lineTo(startX + (slotW + gap) * 4 - gap + 20, gy);
                ctx.stroke();

                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'right';
                ctx.fillText(levelNames[i], startX - 25, gy + 4);
            });
            ctx.restore();

            drawSlotBox(startX + (slotW + gap) * 0, topY, slotW, topH, '01. 정면 (Front View)', '[전신 풀 착장 정면 실측 배치]');
            drawSlotBox(startX + (slotW + gap) * 1, topY, slotW, topH, '02. 측면 (Side View)', '[정면과 1:1 눈금 일치 측면 실측]');
            drawSlotBox(startX + (slotW + gap) * 2, topY, slotW, topH, '03. 후면 (Back View)', '[망토/날개/뒷모습 완전 해체 실측]');
            drawSlotBox(startX + (slotW + gap) * 3, topY, slotW, topH, '04. 기본 체형 (Base Body Model)', '[의상 완전 탈의 / 순수 스킨톤 베이스 인체 모델]', true);

            // 4. 중앙 세련된 구분선 (Y: 705)
            ctx.save();
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(startX, 705);
            ctx.lineTo(startX + (slotW + gap) * 4 - gap, 705);
            ctx.stroke();
            ctx.restore();

            // 5. 하단 좌측: 표정 시트 4종 (X: 60 ~ 820, Y: 730 ~ 1100)
            const expY = 730;
            const expH = 370;
            const expBoxW = 760;
            
            // 표정 섹션 타이틀
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('표정 시트 (Facial Expressions 05~08)', startX, expY - 8);

            const subExpW = 175;
            const subExpGap = 20;
            drawSlotBox(startX + (subExpW + subExpGap) * 0, expY, subExpW, expH, '05. 기본 무표정', '[Neutral]');
            drawSlotBox(startX + (subExpW + subExpGap) * 1, expY, subExpW, expH, '06. 밝은 미소', '[Happy Smile]');
            drawSlotBox(startX + (subExpW + subExpGap) * 2, expY, subExpW, expH, '07. 자신감', '[Confident]');
            drawSlotBox(startX + (subExpW + subExpGap) * 3, expY, subExpW, expH, '08. 진지한 결의', '[Serious]');

            // 6. 하단 우측: 복장 및 속옷 분해도 (X: 880 ~ 1988, Y: 730 ~ 1100)
            const costStartX = 880;
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('복장 및 속옷 분해도 (Exploded Costume & Underwear 09~15)', costStartX, expY - 8);

            const costSlotW = 145;
            const costGap = 16;

            drawSlotBox(costStartX + (costSlotW + costGap) * 0, expY, costSlotW, expH, currentLabels.head, '[Headpiece]');
            drawSlotBox(costStartX + (costSlotW + costGap) * 1, expY, costSlotW, expH, currentLabels.top, '[Top / Armor]');
            drawSlotBox(costStartX + (costSlotW + costGap) * 2, expY, costSlotW, expH, currentLabels.bottom, '[Bottom / Skirt]');
            drawSlotBox(costStartX + (costSlotW + costGap) * 3, expY, costSlotW, expH, currentLabels.outer, '[Cape / Outer]');
            drawSlotBox(costStartX + (costSlotW + costGap) * 4, expY, costSlotW, expH, currentLabels.acc1, '[Accessory 1]');
            drawSlotBox(costStartX + (costSlotW + costGap) * 5, expY, costSlotW, expH, currentLabels.acc2, '[Accessory 2]');
            
            // 15번 속옷 분해도 전용 슬롯 (골드 하이라이트)
            drawSlotBox(costStartX + (costSlotW + costGap) * 6, expY, costSlotW + 20, expH, '15. 복장 : 속옷', '[속옷 상의 + 속옷 하의 분해도]', true);

            // 7. PNG 다운로드 실행
            const link = document.createElement('a');
            link.download = race + '_model_sheet_template_2048x1152.png';
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
`;

// 2. updatePrompt() 내의 프롬프트 헤더를 '2-Image In-context Transfer' 표준 규격으로 업데이트
const oldSheetHeader = `                prompt = \`Based on the attached character design image, generate a professional game production character reference sheet (official model sheet & setting guide), multiple turnaround angles of the exact same character: full body front view, full body side view, full body back view.
[1. Standard Numbered Korean Annotations]: All section titles, part labels, callouts, and explanatory notes on the sheet MUST be written in Korean text with precise numbered tags for seamless post-production text editing:`;

const newSheetHeader = `                prompt = \`Based on the TWO attached reference images:
- [Image 1: Character Design Source]: Faithfully adopt the character's exact face, hair, colors, race traits, and costume design from Image 1.
- [Image 2: Official Model Sheet Grid Template]: Strictly map and decompose the character into the EXACT standardized bounding grid boxes, height guides, and numbered Korean label positions of Image 2.
Generate an official game production reference sheet (master model sheet & setting guide) strictly matching the 01~15 section layout:
[1. Standard Numbered Korean Annotations]: All section titles, part labels, callouts, and explanatory notes MUST strictly follow the exact numbered tags and positions from the Image 2 template:`;

// 3. UI 버튼 삽입: copy-bar-box 안에 '📥 [1단계] 공식 설정 시트 규격 틀 다운로드 (PNG 2048x1152)' 버튼 추가
const oldCopyBarBox = `<div id="copy-bar-box" style="background: linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(99, 102, 241, 0.15)); border: 1px solid rgba(234, 179, 8, 0.4); border-radius: 12px; padding: 14px 18px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <div id="copy-bar-title" style="font-size: 13.5px; font-weight: 800; color: #fde047; display: flex; align-items: center; gap: 6px;">
                            <span>🍌 나노바나나 / 제미나이(단일창) 전용 원클릭 복사</span>
                            <span id="copy-bar-badge" style="background: #eab308; color: #000; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 4px;">FULL BODY 보장</span>
                        </div>
                        <div id="copy-bar-desc" style="font-size: 12px; color: #cbd5e1; margin-top: 3px;">
                            머리부터 발끝까지 잘리지 않는 전신 샷 키워드와 인체 기형 배제 지시문이 단일 문장으로 자동 결합됩니다.
                        </div>
                    </div>
                    <button type="button" id="btn-main-copy" class="btn-preset" style="background: linear-gradient(135deg, #f59e0b, #6366f1); color: #fff; font-weight: 800; padding: 10px 20px; font-size: 13px; border-radius: 8px; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3); transition: all 0.2s ease;" onclick="copyPrompt('all_in_one')">
                        🍌 나노바나나 전용 복사 (원클릭)
                    </button>
                </div>`;

const newCopyBarBox = `<!-- 종족별 공식 설정 시트 규격 틀 템플릿(PNG) 다운로드 배너 (설정 시트 모드 전용) -->
                <div id="template-download-box" style="display: none; background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.15)); border: 1.5px solid rgba(16, 185, 129, 0.5); border-radius: 12px; padding: 14px 18px; margin-bottom: 14px; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div style="flex: 1; min-width: 280px;">
                        <div style="font-size: 14px; font-weight: 800; color: #34d399; display: flex; align-items: center; gap: 6px;">
                            <span>📐 [1단계] 종족별 공식 설정 시트 규격 틀 (PNG 2048x1152) 다운로드</span>
                            <span style="background: #10b981; color: #000; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 4px;">GRID TEMPLATE</span>
                        </div>
                        <div style="font-size: 12px; color: #cbd5e1; margin-top: 4px; line-height: 1.5;">
                            📌 <b>눈금 가이드, 01~04 턴어라운드 박스, 05~08 표정 칸, 09~15 복장·속옷 분해도</b>가 픽셀 단위로 인쇄된 <b>2048x1152 공식 템플릿</b>을 다운로드합니다.<br>
                            나노바나나(제미나이)에 <b>[캐릭터 원본] + [시트 규격 틀] 2장을 함께 첨부(Ctrl+V)</b>하고 아래 프롬프트를 전송하세요!
                        </div>
                    </div>
                    <button type="button" class="btn-preset" style="background: linear-gradient(135deg, #10b981, #3b82f6); color: #fff; font-weight: 800; padding: 11px 22px; font-size: 13.5px; border-radius: 8px; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35); transition: all 0.2s ease; display: flex; align-items: center; gap: 8px;" onclick="downloadModelSheetTemplate()">
                        <span>📥 설정 시트 규격 틀 (PNG) 다운로드</span>
                    </button>
                </div>

                <!-- 나노바나나 / 단일 입력창 전용 원클릭 올인원 복사 바 -->
                <div id="copy-bar-box" style="background: linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(99, 102, 241, 0.15)); border: 1px solid rgba(234, 179, 8, 0.4); border-radius: 12px; padding: 14px 18px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <div>
                        <div id="copy-bar-title" style="font-size: 13.5px; font-weight: 800; color: #fde047; display: flex; align-items: center; gap: 6px;">
                            <span>🍌 나노바나나 / 제미나이(단일창) 전용 원클릭 복사</span>
                            <span id="copy-bar-badge" style="background: #eab308; color: #000; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 4px;">FULL BODY 보장</span>
                        </div>
                        <div id="copy-bar-desc" style="font-size: 12px; color: #cbd5e1; margin-top: 3px;">
                            머리부터 발끝까지 잘리지 않는 전신 샷 키워드와 인체 기형 배제 지시문이 단일 문장으로 자동 결합됩니다.
                        </div>
                    </div>
                    <button type="button" id="btn-main-copy" class="btn-preset" style="background: linear-gradient(135deg, #f59e0b, #6366f1); color: #fff; font-weight: 800; padding: 10px 20px; font-size: 13px; border-radius: 8px; border: none; cursor: pointer; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3); transition: all 0.2s ease;" onclick="copyPrompt('all_in_one')">
                        🍌 나노바나나 전용 복사 (원클릭)
                    </button>
                </div>`;

// 4. updatePrompt() 에서 genMode === 'sheet' 일 때 template-download-box 표시/숨김 연동
const oldUpdateSheetUI = `                // UI 안내 문구 업데이트
                document.getElementById('copy-bar-title').innerHTML = \`<span>📐 나노바나나 설정 시트 (01~15번 표준 넘버링·속옷 분해도) 복사</span><span id="copy-bar-badge" style="background: #f59e0b; color: #000; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 4px;">MODEL SHEET</span>\`;
                document.getElementById('copy-bar-desc').textContent = \`📌 [01~15 표준 넘버링 적용] 01~04 턴어라운드 및 체형 / 05~08 표정 / 09~14 복장·장신구 / 15. 복장 : 속옷(속옷 상의, 속옷 하의) 분해도가 후가공 최적화 규격으로 안전하게 생성됩니다.\`;
                document.getElementById('btn-main-copy').textContent = "📐 설정 시트 전용 복사 (01~15 넘버링)";
                document.getElementById('btn-main-copy').style.background = "linear-gradient(135deg, #f59e0b, #ec4899)";`;

const newUpdateSheetUI = `                // UI 안내 문구 업데이트 (템플릿 다운로드 박스 활성화)
                const tBox = document.getElementById('template-download-box');
                if (tBox) tBox.style.display = 'flex';

                document.getElementById('copy-bar-title').innerHTML = \`<span>🍌 [2단계] 나노바나나 설정 시트 합성 프롬프트 복사</span><span id="copy-bar-badge" style="background: #f59e0b; color: #000; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 4px;">2-IMAGE MULTI-REF</span>\`;
                document.getElementById('copy-bar-desc').innerHTML = \`📌 <b>[2장 첨부 필수]:</b> 나노바나나에 <b>① 원본 캐릭터 전신 일러스트</b>와 <b>② 다운로드한 설정 시트 규격 틀(PNG)</b> 2장을 함께 첨부하고 이 프롬프트를 전송하세요!\`;
                document.getElementById('btn-main-copy').textContent = "📋 [2단계] 2-Image 합성 프롬프트 복사";
                document.getElementById('btn-main-copy').style.background = "linear-gradient(135deg, #f59e0b, #ec4899)";`;

// illust 모드일 때는 template-download-box 숨김
const oldIllustUI = `                // UI 안내 문구 업데이트
                if (isRemoveBg) {
                    document.getElementById('copy-bar-title').innerHTML = \`<span>⬜ [에셋 누끼 모드] 단색 순백 배경 올인원 복사</span><span id="copy-bar-badge" style="background: #38bdf8; color: #000; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 4px;">SOLID WHITE BG</span>\`;`;

const newIllustUI = `                // UI 안내 문구 업데이트 (템플릿 박스 숨김)
                const tBox = document.getElementById('template-download-box');
                if (tBox) tBox.style.display = 'none';

                if (isRemoveBg) {
                    document.getElementById('copy-bar-title').innerHTML = \`<span>⬜ [에셋 누끼 모드] 단색 순백 배경 올인원 복사</span><span id="copy-bar-badge" style="background: #38bdf8; color: #000; font-size: 10px; font-weight: 900; padding: 2px 6px; border-radius: 4px;">SOLID WHITE BG</span>\`;`;

// 치환 실행
if (html.includes(oldCopyBarBox)) {
  html = html.replace(oldCopyBarBox, newCopyBarBox);
  console.log("Updated copy-bar-box UI!");
}

if (html.includes(oldUpdateSheetUI)) {
  html = html.replace(oldUpdateSheetUI, newUpdateSheetUI);
  console.log("Updated updatePrompt sheet UI!");
}

if (html.includes(oldIllustUI)) {
  html = html.replace(oldIllustUI, newIllustUI);
  console.log("Updated updatePrompt illust UI!");
}

if (html.includes(oldSheetHeader)) {
  html = html.replace(oldSheetHeader, newSheetHeader);
  console.log("Updated sheet header to 2-Image format!");
}

// 스크립트 상단에 downloadModelSheetTemplate 함수 삽입
const scriptTagIdx = html.indexOf('<script>');
html = html.substring(0, scriptTagIdx + 8) + templateGeneratorFunction + html.substring(scriptTagIdx + 8);
console.log("Inserted downloadModelSheetTemplate function!");

fs.writeFileSync('visual_style_guide.html', html, 'utf-8');
console.log("Successfully implemented Model Sheet Template Generation System!");
