/*
 * 맞춤 기준 그림 승인 (v0.55.69, R04 A-34)
 *
 * 사람이 확인해 승인한 정지 자세 조립 그림을 캐릭터의 맞춤 기준 그림(rest_ref.png)으로 저장한다.
 * c00은 처음 원화로 보관하고, 조립 중에 자세가 바뀐 뒤(예: 칼을 위로 쥐게 바꿈)의 수정 납품은 이 그림을 기준으로 맞추고 검증한다.
 *   - prepare_fit.mjs --update: 바뀐 파츠의 위치 다듬기, 새 파츠 자동 맞춤에 쓴다.
 *   - verify_rig.mjs --ref: 정지 자세 비교에 쓴다.
 *
 * 사용법 (프로젝트 루트): node test/tools/approve_rest.mjs <fit.json> [--from test/build/verify_<이름>/rest_pose.png]
 *   --from이 없으면 test/build/verify_<fit 이름>/rest_pose.png(verify_rig.mjs --out verify_<이름> 결과)를 쓴다.
 *   그 그림이 지금 fit.json으로 만든 리그에서 나왔는지 사람이 확인한 뒤 실행한다.
 * 출력: fit.json과 같은 폴더의 rest_ref.png, fit.json의 restRef(경로, 승인 시각, 원본)
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, decodePNG } from './lib.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
if (!args[0] || !fs.existsSync(args[0])) { console.log('사용법: node test/tools/approve_rest.mjs <fit.json> [--from rest_pose.png]'); process.exit(2); }
const fitFile = path.resolve(args[0]), fit = JSON.parse(fs.readFileSync(fitFile, 'utf8'));
const from = path.resolve(opt('from', path.join(ROOT, 'test', 'build', 'verify_' + fit.name, 'rest_pose.png')));
if (!fs.existsSync(from)) { console.log(`기준 그림 원본이 없다: ${from}\n먼저 verify_rig.mjs --rig <rig.json> --out verify_${fit.name} 를 돌린다`); process.exit(2); }
const img = decodePNG(from);
if (img.w !== 1024 || img.h !== 1024 || !img.hasAlpha) { console.log(`정지 자세 그림은 1024x1024 투명 배경이어야 한다(${img.w}x${img.h}, 알파 ${img.hasAlpha})`); process.exit(1); }
const rel = p => path.relative(ROOT, p).replace(/\\/g, '/');
const dst = path.join(path.dirname(fitFile), 'rest_ref.png');
fs.copyFileSync(from, dst);
fit.restRef = { src: rel(dst), approvedAt: new Date().toISOString(), from: rel(from) };
fs.writeFileSync(fitFile, JSON.stringify(fit, null, 1));
console.log(`맞춤 기준 그림 승인: ${rel(dst)} (원본 ${rel(from)})`);
