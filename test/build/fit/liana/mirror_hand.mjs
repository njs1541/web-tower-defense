// v0.55.57: 가까운 손이 왼손처럼 보이는 문제(손목이 그림 왼쪽이라 팔 반대편에 붙음). 손 그림만 좌우로 뒤집는다(픽셀 뒤집기, 재샘플링 없음). 한 번만 실행
import fs from 'node:fs'; import path from 'node:path';
import { ROOT, decodePNG } from '../../../tools/lib.mjs';
import { encodePNG } from '../../../../scratch/pixelfx/tools/lib/png.mjs';
const F = path.join(ROOT, 'test/build/fit/liana/fit.json'), fit = JSON.parse(fs.readFileSync(F, 'utf8'));
const h = fit.parts.find(p => p.slot === 'hand_cap');
if (h.src.includes('_mx')) { console.log('이미 뒤집혀 있다'); process.exit(0); }
const img = decodePNG(path.join(ROOT, h.src)), out = new Uint8Array(img.w * img.h * 4);
for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) out.set(img.rgba.subarray((y * img.w + x) * 4, (y * img.w + x) * 4 + 4), (y * img.w + img.w - 1 - x) * 4);
const dst = h.src.replace(/\.png$/, '_mx.png'); fs.writeFileSync(path.join(ROOT, dst), encodePNG(img.w, img.h, out));
h.src = dst; h.flags = [...(h.flags || []), '좌우 반전: 손목이 팔 쪽(오른쪽 위)에 오도록'];
const [tx, ty, rot] = process.argv.slice(2).map(Number);
if (!isNaN(tx)) { h.tx = tx; h.ty = ty; h.rot = rot || 0; }
fs.writeFileSync(F, JSON.stringify(fit, null, 1));
console.log(dst, h.tx, h.ty, h.rot);
