/**
 * [v0.55.18] 픽셀 이펙트 재생기
 * patch-gg/pixelfx(MIT)의 코드 이펙트를 scratch/build_pixel_fx.mjs가 가로 스트립 PNG로 구워 두고(assets/fx/),
 * 여기서는 DOM div 하나에 CSS steps() 애니메이션으로 재생한다. Canvas나 rAF 루프를 새로 만들지 않는다.
 * - 배속: 시작 시점의 gameSpeed로 재생 시간을 나눈다.
 * - 일시정지: body.game-paused 클래스(updateSpeedUI)가 animation-play-state를 멈춘다.
 * - 동시 재생 수를 PIXEL_FX_MAX_ACTIVE로 제한해 타격이 몰려도 DOM이 불어나지 않게 한다.
 * 프레임 정보는 js/pixel_fx_data.js(PIXEL_FX_SHEETS, 자동 생성)에 있다.
 */

const PIXEL_FX_CELL_PITCH = 31; // 칸 30px + 그리드 간격 1px
const PIXEL_FX_MAX_ACTIVE = 40;
// 타워 종류별 타격 이펙트 (얼음, 폭탄, 전격은 tower.js 분기에서 따로 처리)
const PIXEL_FX_TOWER_HIT = {
    ranged: 'hit_ranged',
    melee: 'hit_melee',
    sniper: 'hit_sniper',
};
let pixelFxActiveCount = 0;
let pixelFxEnabled = true;

/** 보드 기준 칸 좌표의 기준점(px). center = 칸 중앙, ground = 칸 아래쪽 */
function getPixelFxAnchor(gridX, gridY, anchor) {
    const x = gridX * PIXEL_FX_CELL_PITCH + 15;
    const y = gridY * PIXEL_FX_CELL_PITCH + (anchor === 'ground' ? 26 : 15);
    return { x, y };
}

/**
 * 픽셀 이펙트 1회 재생
 * @param {string} key - PIXEL_FX_SHEETS 키 (hit_ranged, explosion, spell_thunder 등)
 * @param {number} gridX - 보드 칸 X (소수 허용)
 * @param {number} gridY - 보드 칸 Y
 * @param {{flip?: boolean, delayMs?: number}} [opts] - flip은 좌우 반전(방향성 타격은 기본이 오른쪽으로 맞는 모양)
 * @returns {HTMLElement|null}
 */
function playPixelFx(key, gridX, gridY, opts = {}) {
    if (!pixelFxEnabled) return null;
    const sheet = PIXEL_FX_SHEETS[key];
    if (!sheet) {
        console.warn(`[pixel_fx] 알 수 없는 이펙트: ${key}`);
        return null;
    }
    if (pixelFxActiveCount >= PIXEL_FX_MAX_ACTIVE) return null;
    const boardDom = document.getElementById("game-board");
    if (!boardDom) return null;

    const { x, y } = getPixelFxAnchor(gridX, gridY, sheet.anchor);
    const el = document.createElement("div");
    el.className = "pixel-fx";
    el.style.left = `${x - sheet.px}px`;
    el.style.top = `${y - sheet.py}px`;
    el.style.width = `${sheet.w}px`;
    el.style.height = `${sheet.h}px`;
    el.style.backgroundImage = `url("${sheet.src}")`;
    el.style.setProperty("--pfx-end", `${-sheet.w * sheet.frames}px`);
    if (opts.flip) {
        el.style.transformOrigin = `${sheet.px}px ${sheet.py}px`;
        el.style.transform = "scaleX(-1)";
    }
    const speed = gameSpeed || 1;
    const durationSec = sheet.frames / sheet.fps / speed;
    el.style.animation = `pixelFxPlay ${durationSec.toFixed(3)}s steps(${sheet.frames}) ${((opts.delayMs || 0) / 1000 / speed).toFixed(3)}s forwards`;

    pixelFxActiveCount++;
    let done = false;
    const finish = () => {
        if (done) return;
        done = true;
        pixelFxActiveCount--;
        el.remove();
    };
    el.addEventListener("animationend", finish);
    el.addEventListener("animationcancel", finish);
    boardDom.appendChild(el);
    return el;
}

/** 전투 시작 시 스프라이트를 미리 받아 첫 재생 때 빈 프레임이 보이지 않게 한다 */
function preloadPixelFx() {
    for (const sheet of Object.values(PIXEL_FX_SHEETS)) {
        const img = new Image();
        img.src = sheet.src;
    }
}

/** 스펠 이펙트 대상: 목록(적, 타워 칸)에서 최대 count개를 고르게 뽑는다. 동시 재생 수 제한을 넘지 않게 한다. */
function pickPixelFxTargets(list, count) {
    if (list.length <= count) return list.slice();
    const step = list.length / count;
    const out = [];
    for (let i = 0; i < count; i++) out.push(list[Math.floor(i * step)]);
    return out;
}
