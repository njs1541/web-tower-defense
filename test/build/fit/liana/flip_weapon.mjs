// REQ04(칼 방향): 주무기 그림을 손잡이 가운데를 축으로 정확히 180도 돌린다(픽셀 뒤집기, 재샘플링 없음). 한 번만 실행
import fs from 'node:fs'; import path from 'node:path';
import { ROOT, decodePNG } from '../../../tools/lib.mjs';
import { encodePNG } from '../../../../scratch/pixelfx/tools/lib/png.mjs';
const F = path.join(ROOT, 'test/build/fit/liana/fit.json'), fit = JSON.parse(fs.readFileSync(F, 'utf8'));
const w = fit.parts.find(p => p.slot === 'weapon_main');
if (w.src.includes('_r180')) { console.log('이미 뒤집혀 있다'); process.exit(0); }
const img = decodePNG(path.join(ROOT, w.src)), N = img.w * img.h, out = new Uint8Array(N * 4);
for (let i = 0; i < N; i++) out.set(img.rgba.subarray(i * 4, i * 4 + 4), (N - 1 - i) * 4);
const dst = w.src.replace(/\.png$/, '_r180.png'); fs.writeFileSync(path.join(ROOT, dst), encodePNG(img.w, img.h, out));
const r = w.rot * Math.PI / 180, c = Math.cos(r) * w.scale, s = Math.sin(r) * w.scale;
const grip = [(397.5 + 340) / 2, (612.5 + 670) / 2]; // 시트 좌표: 손잡이 끝(폼멜)과 가드 사이 가운데
const lx = grip[0] - w.sheetBox[0] - w.w / 2, ly = grip[1] - w.sheetBox[1] - w.h / 2;
const H = [w.tx + c * lx - s * ly, w.ty + s * lx + c * ly];
w.src = dst; w.tx = +(2 * H[0] - w.tx).toFixed(1); w.ty = +(2 * H[1] - w.ty).toFixed(1);
w.flags = [...(w.flags || []), '칼 방향: 손잡이 가운데 축으로 180도(칼날이 몸을 가로질러 방패 위쪽)'];
fs.writeFileSync(F, JSON.stringify(fit, null, 1));
console.log('축', H.map(v => v.toFixed(1)), '→ 중심', w.tx, w.ty, w.src);
