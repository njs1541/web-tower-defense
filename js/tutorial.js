/**
 * 첫 판 튜토리얼 (js/tutorial.js) - v0.53.8, 워크플로 P6-3
 * - 신규 세이브의 첫 판에만 나온다 (USER_DATA.tutorialDone). 기존 세이브는 완료로 간주한다(loadData).
 * - 화면 위쪽 안내 상자에 단계별 지시를 띄우고, 플레이어가 실제로 해당 행동을 하면 다음 단계로 넘어간다.
 * - 타이머를 쓰지 않는다. render()가 매 갱신마다 updateTutorial()을 부르고, 스펠은 castSpellRune에서 알린다.
 * - [건너뛰기]를 누르면 즉시 완료 처리된다.
 */

let tutorialStep = 0;          // 0 = 비활성
let tutorialStartPathLen = 0;  // 미로 단계 시작 시 경로 길이
let tutorialSpellCast = false;

const TUTORIAL_STEPS = [
    null,
    { text: '① <b>🏗️ 기반 건설</b>을 누른 뒤, 몬스터 경로(밝은 칸) 옆 빈 칸을 클릭해 기반을 <b>2개</b> 지으세요.',
      done: () => builtBaseCount >= 2 },
    { text: '② 오른쪽 패널의 <b>타워 버튼</b>을 고르고, 방금 지은 <b>기반</b>을 클릭해 타워를 설치하세요. 타워는 기반 위에만 설치됩니다.',
      done: () => board.some(c => c.tower) },
    { text: '③ 기반으로 길을 가로막으면 몬스터가 돌아갑니다. 경로가 <b>4칸 이상</b> 길어지도록 기반을 더 지어 보세요. (길을 완전히 막을 수는 없습니다)',
      enter: () => { tutorialStartPathLen = (path || []).length; },
      done: () => (path || []).length >= tutorialStartPathLen + 4 },
    { text: '④ <b>▶ 라운드 시작</b>을 눌러 첫 웨이브를 맞이하세요. 남는 TP로 타워를 강화할 수도 있습니다.',
      done: () => gameRunning },
    { text: '⑤ 마나(MP)는 전투 중에 차오릅니다. MP가 차면 오른쪽 <b>스펠 버튼</b>을 눌러 보세요.',
      skipIf: () => getEquippedSpellRunes().length === 0,
      done: () => tutorialSpellCast }
];

function startTutorialIfNeeded() {
    if (USER_DATA.tutorialDone) return;
    tutorialSpellCast = false;
    setTutorialStep(1);
}

function setTutorialStep(step) {
    while (step < TUTORIAL_STEPS.length && TUTORIAL_STEPS[step] && TUTORIAL_STEPS[step].skipIf && TUTORIAL_STEPS[step].skipIf()) step++;
    if (step >= TUTORIAL_STEPS.length) {
        finishTutorial(true);
        return;
    }
    tutorialStep = step;
    const s = TUTORIAL_STEPS[step];
    if (s.enter) s.enter();
    showTutorialBox(s.text, step);
}

/** render()에서 매번 호출된다. 현재 단계 조건을 만족하면 다음 단계로 넘어간다. */
function updateTutorial() {
    if (!tutorialStep) return;
    // 준비 단계(①~③)를 마치기 전에 라운드를 시작했으면 남은 준비 안내는 건너뛴다
    if (gameRunning && tutorialStep < 4) {
        setTutorialStep(5);
        return;
    }
    const s = TUTORIAL_STEPS[tutorialStep];
    if (s && s.done()) setTutorialStep(tutorialStep + 1);
}

/** castSpellRune에서 스펠 사용을 알린다. */
function notifyTutorialSpellCast() {
    if (!tutorialStep) return;
    tutorialSpellCast = true;
    updateTutorial();
}

function finishTutorial(completed) {
    tutorialStep = 0;
    USER_DATA.tutorialDone = true;
    saveData();
    if (completed) {
        showTutorialBox('🎉 튜토리얼 완료! 미로를 길게 만들고 타워를 강화해 30라운드 보스를 쓰러뜨리세요.', 0);
        const box = document.getElementById('tutorial-box');
        // 완료 안내는 다음 행동(클릭) 때 닫힌다
        if (box) box.dataset.closeOnNext = '1';
    } else {
        hideTutorialBox();
    }
}

function skipTutorial() {
    finishTutorial(false);
}

function showTutorialBox(html, step) {
    let box = document.getElementById('tutorial-box');
    if (!box) {
        box = document.createElement('div');
        box.id = 'tutorial-box';
        box.style.cssText = 'position: fixed; top: 14px; left: 50%; transform: translateX(-50%); z-index: 2500; max-width: 560px; width: calc(100% - 32px);'
            + ' background: rgba(15, 23, 42, 0.92); color: #f8fafc; border: 1px solid #38bdf8; border-radius: 10px; padding: 10px 14px;'
            + ' box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35); font-size: 13px; line-height: 1.55; display: flex; gap: 10px; align-items: flex-start;';
        document.body.appendChild(box);
        // 완료 안내는 다음 클릭에서 닫는다
        document.addEventListener('pointerdown', () => {
            const b = document.getElementById('tutorial-box');
            if (b && b.dataset.closeOnNext === '1') hideTutorialBox();
        }, true);
    }
    delete box.dataset.closeOnNext;
    const total = TUTORIAL_STEPS.length - 1;
    box.innerHTML = `<div style="flex: 1;">${step ? `<div style="font-size: 11px; color: #7dd3fc; margin-bottom: 2px;">튜토리얼 ${step} / ${total}</div>` : ''}${html}</div>`
        + (step ? '<button onclick="skipTutorial()" style="flex-shrink: 0; background: transparent; color: #94a3b8; border: 1px solid #475569; border-radius: 6px; padding: 3px 8px; font-size: 11px; cursor: pointer;">건너뛰기</button>' : '');
    box.style.display = 'flex';
}

function hideTutorialBox() {
    const box = document.getElementById('tutorial-box');
    if (box) box.style.display = 'none';
}
