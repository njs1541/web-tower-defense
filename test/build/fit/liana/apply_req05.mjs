// REQ05(오른손 재작화, v0.55.60): 가까운 손 그림만 새 납품으로 바꾼다. 임시 반전본(s4_5_mx.png)과 REQ04 원본(s4_5.png)은 보관.
// 입력: test/build/fit/liana_req05/src (prepare_fit.mjs --name liana_req05 결과). 인자: [tx ty rot scale]
import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from '../../../tools/lib.mjs';
const D = path.join(ROOT, 'test/build/fit/liana'), F = path.join(D, 'fit.json'), fit = JSON.parse(fs.readFileSync(F, 'utf8'));
const auto = JSON.parse(fs.readFileSync(path.join(ROOT, 'test/build/fit/liana_req05/fit_auto.json'), 'utf8'));
const nh = auto.parts.find(p => p.slot === 'hand_cap'), h = fit.parts.find(p => p.slot === 'hand_cap');
fs.copyFileSync(path.join(ROOT, nh.src), path.join(D, 'src/s4_5_req05.png'));
const [tx, ty, rot, scale] = process.argv.slice(2).map(Number);
Object.assign(h, { src: 'test/build/fit/liana/src/s4_5_req05.png', sheetBox: nh.sheetBox, w: nh.w, h: nh.h,
  tx: isNaN(tx) ? h.tx : tx, ty: isNaN(ty) ? h.ty : ty, rot: isNaN(rot) ? 0 : rot, scale: isNaN(scale) ? h.scale : scale,
  flags: ['REQ05: 손등 쪽에서 본 오른손(재작화). 손목 관절(hand_near)에 붙임'] });
fs.writeFileSync(F, JSON.stringify(fit, null, 1));
console.log(h.src, h.w, h.h, h.tx, h.ty, h.rot, h.scale, '| 자동 맞춤 참고', nh.tx, nh.ty, nh.rot, nh.scale);
