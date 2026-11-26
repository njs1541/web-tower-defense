// v0.55.61: 가까운 손의 손목 경계 외곽선(손 그림 위쪽 대각선 띠)을 지운다. 아래팔 끝과 이어지는 곳이 검은 선으로 끊겨 보이는 문제.
// 각 열에서 위에서 처음 만나는 진한 선(6px 이하이고 바로 아래가 피부)을 그 아래 피부색으로 바꾸고, 맨 위 2px은 반투명으로 풀어
// 밑에 깔린 아래팔 손목 돔과 섞이게 한다. 손 좌우와 손가락 쪽 윤곽선(가장자리 열)은 건드리지 않는다. 원본은 보관
import fs from 'node:fs'; import path from 'node:path';
import { ROOT, decodePNG } from '../../../tools/lib.mjs';
import { encodePNG } from '../../../../scratch/pixelfx/tools/lib/png.mjs';
const F = path.join(ROOT, 'test/build/fit/liana/fit.json'), fit = JSON.parse(fs.readFileSync(F, 'utf8'));
const h = fit.parts.find(p => p.slot === 'hand_cap');
const SRC = 'test/build/fit/liana/src/s4_5_req05.png', DST = 'test/build/fit/liana/src/s4_5_req05_soft.png';
const [X0, X1] = [7, 46]; // 손목 경계가 지나는 열 범위(좌우 윤곽선 제외)
const I = decodePNG(path.join(ROOT, SRC)), px = new Uint8Array(I.rgba), W = I.w;
const at = (x, y) => (y * W + x) * 4, lum = i => (px[i] + px[i + 1] + px[i + 2]) / 3;
let n = 0;
for (let x = X0; x <= X1; x++) {
  let y = 0; while (y < I.h && px[at(x, y) + 3] < 40) y++;
  const top = y; while (y < I.h && px[at(x, y) + 3] >= 40 && lum(at(x, y)) < 170) y++;
  const len = y - top; if (len < 1 || len > 6 || y >= I.h) continue;
  const s = at(x, Math.min(I.h - 1, y + 1)); if (lum(s) < 170) continue; // 아래가 피부가 아니면 윤곽선 모서리로 보고 둔다
  for (let k = top; k < y; k++) { const i = at(x, k); px[i] = px[s]; px[i + 1] = px[s + 1]; px[i + 2] = px[s + 2];
    px[i + 3] = k - top === 0 ? 90 : k - top === 1 ? 180 : 255; n++; }
}
fs.writeFileSync(path.join(ROOT, DST), encodePNG(I.w, I.h, px));
h.src = DST; h.flags = [...(h.flags || []).filter(f => !f.startsWith('손목 경계선')), '손목 경계선 지움(soften_wrist.mjs): 아래팔과 이어지게'];
fs.writeFileSync(F, JSON.stringify(fit, null, 1));
console.log('바꾼 픽셀', n, '→', DST);
