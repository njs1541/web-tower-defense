// REQ04(칼 쥔 손 분리, v0.55.56): 새 가까운 아래팔(주먹 없음)과 가까운 손을 기존 fit.json에 끼운다. 다른 파츠의 사람 조정값은 건드리지 않는다.
// 입력: test/build/fit/liana_req04/src (prepare_fit.mjs --name liana_req04 결과). 한 번만 실행
import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from '../../../tools/lib.mjs';
const D = path.join(ROOT, 'test/build/fit/liana'), N = path.join(ROOT, 'test/build/fit/liana_req04');
const F = path.join(D, 'fit.json'), fit = JSON.parse(fs.readFileSync(F, 'utf8'));
if (fit.parts.some(p => p.slot === 'hand_cap')) { console.log('이미 적용됨'); process.exit(0); }
const auto = JSON.parse(fs.readFileSync(path.join(N, 'fit_auto.json'), 'utf8'));
const nl = auto.parts.find(p => p.slot === 'arm_near_lower'), hc = auto.parts.find(p => p.slot === 'hand_cap');
// 1) 아래팔: 옛 그림은 s3_2_v2.png로 보관. 팔꿈치 돔이 시트에서 같은 좌표라 시트→세계 변환(회전·배율)을 그대로 두고 상자 중심 이동만 반영
const a = fit.parts.find(p => p.slot === 'arm_near_lower');
fs.renameSync(path.join(D, 'src/s3_2.png'), path.join(D, 'src/s3_2_v2.png'));
fs.copyFileSync(path.join(ROOT, nl.src), path.join(D, 'src/s3_2.png'));
const oc = [a.sheetBox[0] + a.w / 2, a.sheetBox[1] + a.h / 2], nc = [nl.sheetBox[0] + nl.w / 2, nl.sheetBox[1] + nl.h / 2];
const r = a.rot * Math.PI / 180, dx = nc[0] - oc[0], dy = nc[1] - oc[1];
a.tx = +(a.tx + a.scale * (Math.cos(r) * dx - Math.sin(r) * dy)).toFixed(1);
a.ty = +(a.ty + a.scale * (Math.sin(r) * dx + Math.cos(r) * dy)).toFixed(1);
a.sheetBox = nl.sheetBox; a.w = nl.w; a.h = nl.h;
a.flags = [...(a.flags || []), 'REQ04: 주먹 없는 아래팔로 교체(시트 좌표 유지, 중심만 이동)'];
// 2) 가까운 손: 시트 3 팔과 같은 배율로 그렸다(납품 보고). 위치·회전은 아래 값에서 사람 조정
fs.copyFileSync(path.join(ROOT, hc.src), path.join(D, 'src/s4_5.png'));
fit.parts.push({ ...hc, src: 'test/build/fit/liana/src/s4_5.png', tx: 413, ty: 683, rot: 0, scale: 0.735,
  flags: ['REQ04: 손목(hand_near)에 붙임. 배율은 아래팔과 같게'] });
fs.writeFileSync(F, JSON.stringify(fit, null, 1));
console.log('아래팔', a.tx, a.ty, '/ 손 추가');
