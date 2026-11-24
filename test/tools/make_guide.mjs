/*
 * 기준선·관절 가이드 이미지 생성 (v0.55.29, 회의 안건 A-25)
 * test/rig/skeleton_human.json의 guide, bones.pivot을 읽어 test/guide/guide_template.png(1024, 투명 배경)를 만든다.
 * 글자는 넣지 않는다(생성 AI 참고 이미지로 쓰일 때 글자가 따라 그려지지 않게). 표시 내용은 test/ASSET_SPEC.md 7절.
 *
 * 사용법 (프로젝트 루트): node test/tools/make_guide.mjs [skeleton.json]
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';
import { encodePNG } from '../../scratch/pixelfx/tools/lib/png.mjs';

const skelFile = path.resolve(process.argv[2] || path.join(ROOT, 'test', 'rig', 'skeleton_human.json'));
const sk = JSON.parse(fs.readFileSync(skelFile, 'utf8'));
const N = sk.canvas, g = sk.guide;
const px = new Uint8ClampedArray(N * N * 4);

// 알파 합성으로 점 찍기
function dot(x, y, [r, gg, b, a]) {
    if (x < 0 || y < 0 || x >= N || y >= N) return;
    const i = (y * N + x) * 4, A = a / 255, B = px[i + 3] / 255, O = A + B * (1 - A);
    if (O <= 0) return;
    px[i] = (r * A + px[i] * B * (1 - A)) / O; px[i + 1] = (gg * A + px[i + 1] * B * (1 - A)) / O; px[i + 2] = (b * A + px[i + 2] * B * (1 - A)) / O;
    px[i + 3] = O * 255;
}
const hline = (y, w, c) => { for (let t = 0; t < w; t++) for (let x = 0; x < N; x++) dot(x, y - (w >> 1) + t, c); };
const vline = (x, w, c) => { for (let t = 0; t < w; t++) for (let y = 0; y < N; y++) dot(x - (w >> 1) + t, y, c); };
const band = (y0, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = 0; x < N; x++) dot(x, y, c); };
function circle(cx, cy, r, w, c) {
    for (let y = cy - r - w; y <= cy + r + w; y++) for (let x = cx - r - w; x <= cx + r + w; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (Math.abs(d - r) <= w / 2) dot(x, y, c);
    }
}

const RED = [230, 40, 40], ORANGE = [245, 140, 20], BLUE = [40, 110, 240], YELLOW = [255, 215, 0], DARK = [20, 20, 20];
const T = g.tolerance;
// 합격 범위 띠
band(g.headTop - T, g.headTop + T, [...RED, 40]);
band(g.chin - T, g.chin + T, [...ORANGE, 40]);
band(g.foot - T, g.foot + T, [...RED, 40]);
// 기준선
hline(g.headTop, 2, [...RED, 230]);
hline(g.chin, 2, [...ORANGE, 230]);
hline(g.foot, 2, [...RED, 230]);
vline(g.centerX, 2, [...BLUE, 200]);
// 관절: 바깥 어두운 원 + 노란 원 + 중심점
for (const b of sk.bones) {
    const [x, y] = b.pivot;
    circle(x, y, 9, 4, [...DARK, 200]);
    circle(x, y, 9, 2, [...YELLOW, 255]);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) dot(x + dx, y + dy, [...YELLOW, 255]);
}
// 뼈 연결선(부모 → 자식)
const byId = Object.fromEntries(sk.bones.map(b => [b.id, b]));
for (const b of sk.bones) {
    if (!b.parent) continue;
    const [x0, y0] = byId[b.parent].pivot, [x1, y1] = b.pivot, n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
    for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); dot(x, y, [...YELLOW, 150]); }
}

const out = path.join(ROOT, 'test', 'guide', `guide_template${sk.race === 'human' ? '' : '_' + sk.race}.png`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, encodePNG(N, N, px));
console.log(`${path.relative(ROOT, out)} (${sk.race}, 관절 ${sk.bones.length}곳)`);
