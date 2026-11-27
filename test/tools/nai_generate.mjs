/*
 * NovelAI 이미지 생성 (v0.55.75)
 *
 * 사용자가 쓴 프롬프트를 NovelAI 이미지 API로 보내고 결과 PNG와 생성 기록을 저장한다.
 * 프롬프트는 이 도구가 만들지 않는다(역할 분담: 프롬프트는 사용자, 도구는 전달과 저장만).
 *
 * 토큰: NovelAI 계정 설정 > Account > Get Persistent API Token 으로 받은 값을 환경 변수 NAI_TOKEN에 넣는다.
 *   PowerShell: setx NAI_TOKEN "pst-..."   (새 터미널부터 적용)
 *   저장소가 공개 상태이므로 토큰을 파일에 적지 않는다.
 *
 * Opus 무료 조건(공식 문서 기준, 2026-11-27 확인): 1024x1024 이하 픽셀 수, 28스텝 이하, 1장씩, 기준 이미지 없음,
 *   V4.5 이하 모델은 무제한(V5는 사용 한도). 이 도구는 기본으로 이 조건을 넘는 설정을 거부한다(--allow-paid로 풀림).
 *   API 생성에도 무료가 적용되는지는 공식 문서에 없으므로, 매 장 생성 뒤 Anlas 잔액을 확인해 줄면 즉시 멈춘다.
 *
 * 사용법 (프로젝트 루트):
 *   node test/tools/nai_generate.mjs --balance
 *   node test/tools/nai_generate.mjs --prompt-file <프롬프트.txt> [--negative-file <네거티브.txt>] --out <폴더> [옵션]
 *   node test/tools/nai_generate.mjs --job <작업.json> [옵션으로 덮어쓰기]
 * 옵션:
 *   --prompt "..." / --negative "..."   파일 대신 직접 입력
 *   --name c00          저장 파일 이름 앞부분(기본 nai)
 *   --count 4           몇 장 만들지(한 장씩 차례로 요청)
 *   --width 1024 --height 1024   64의 배수(기본 1024x1024, 원화 사양과 같은 정사각형)
 *   --seed 123          첫 장 시드(이후 +1씩). 없으면 무작위
 *   --model nai-diffusion-4-5-full   (curated, 4-full, 3도 가능)
 *   --steps 28 --scale 5 --sampler k_euler_ancestral --noise karras --cfg-rescale 0
 *   --delay 3000        요청 사이 간격(ms)
 *   --allow-paid        무료 조건 검사와 Anlas 감소 중단을 끈다
 *   --dry-run           요청 내용만 출력하고 보내지 않는다(토큰 불필요)
 * 작업 JSON 필드: prompt, promptFile, negative, negativeFile, out, name, count, width, height, seed, model,
 *   steps, scale, sampler, noise, cfgRescale, delay (파일 경로는 작업 JSON 위치 기준)
 * 출력: <out>/<name>_<시드>.png 와 같은 이름의 .json(모델, 설정, 프롬프트, 시드, Anlas 전후. 토큰은 남기지 않음)
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import tls from 'node:tls';

// 회사망 등에서 HTTPS 검사 장비가 자체 인증서로 다시 서명하면(SELF_SIGNED_CERT_IN_CHAIN) Node 기본 인증서 목록으로는
// 연결이 거부된다. 브라우저처럼 Windows 인증서 저장소도 믿도록 합친다(v0.55.76, Node 22.15/23.5 이상).
try {
  if (tls.getCACertificates && tls.setDefaultCACertificates)
    tls.setDefaultCACertificates([...new Set([...tls.getCACertificates('default'), ...tls.getCACertificates('system')])]);
} catch (e) { console.log('주의: 시스템 인증서를 불러오지 못했다(' + e.message + '). 연결이 거부되면 node --use-system-ca 로 실행한다.'); }

const API_IMAGE = 'https://image.novelai.net/ai/generate-image';
// 구독 정보는 image 서버에서 받는다. api 서버는 실제 토큰에 400 "update to the image URL"을 돌려준다(v0.55.77 확인).
const API_SUBS = ['https://image.novelai.net/user/subscription', 'https://api.novelai.net/user/subscription'];
const randId = () => Array.from({ length: 6 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]).join('');
// 웹 클라이언트와 같은 출처·요청 식별 헤더(현행 비공식 라이브러리 nekoai-js 1.4.0과 같음)
const baseHeaders = tok => ({
  Authorization: 'Bearer ' + tok, Origin: 'https://novelai.net', Referer: 'https://novelai.net/',
  'x-correlation-id': randId(), 'x-initiated-at': new Date().toISOString(),
});
const FREE_PIXELS = 1024 * 1024, FREE_STEPS = 28;
const TIER_NAMES = { 0: '무료 체험', 1: 'Tablet', 2: 'Scroll', 3: 'Opus' };

// 프로젝트 규칙(CLAUDE.md "이미지 프롬프트 필수 항목")
const AGE_NEGATIVES = ['child', 'kid', 'underage', 'loli', 'male', 'boy', 'man'];
const FORBIDDEN_POSITIVE = /\b(loli|lolicon|shota|child|children|kid|kids|toddler|underage|minor|little girl|young girl|elementary)\b/i;
const RECOMMENDED_POSITIVE = ['full body', 'adult female', 'exactly two arms', 'exactly two legs'];
const RECOMMENDED_NEGATIVE = ['cropped', 'out of frame', 'extra arms', 'extra legs', 'extra fingers'];

const args = process.argv.slice(2);
const has = k => args.includes('--' + k);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const fail = (msg, code = 1) => { console.log(msg); process.exit(code); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function token() {
  const t = (process.env.NAI_TOKEN || '').trim();
  if (!t) fail('환경 변수 NAI_TOKEN이 없다. NovelAI 계정 설정에서 영구 API 토큰을 받아 setx NAI_TOKEN "..." 후 새 터미널에서 실행한다.', 2);
  return t;
}

async function getBalance(tok) {
  const errs = [];
  for (const url of API_SUBS) {
    const res = await fetch(url, { headers: baseHeaders(tok), signal: AbortSignal.timeout(30000) });
    if (res.status === 401) fail('토큰이 거부되었다(401). NAI_TOKEN 값을 확인한다.', 2);
    if (!res.ok) { errs.push(`${url} ${res.status}: ${(await res.text()).slice(0, 200)}`); continue; }
    const j = await res.json();
    const s = j.trainingStepsLeft;
    // 응답 형식이 바뀌어 잔액을 못 읽으면 anlas를 null로 두고 생성 쪽에서 멈춘다
    const anlas = s && typeof s === 'object' ? (s.fixedTrainingStepsLeft || 0) + (s.purchasedTrainingSteps || 0) : null;
    return { tier: j.tier, active: j.active, anlas, keys: Object.keys(j) };
  }
  throw new Error('구독 정보 요청 실패\n  ' + errs.join('\n  '));
}

// zip 응답에서 첫 PNG 꺼내기(중앙 디렉터리 기준, 저장·deflate만 지원)
function firstPngFromZip(buf) {
  let e = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('zip 끝 레코드를 찾지 못했다');
  const count = buf.readUInt16LE(e + 10);
  let p = buf.readUInt32LE(e + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('zip 중앙 디렉터리가 깨졌다');
    const method = buf.readUInt16LE(p + 10), comp = buf.readUInt32LE(p + 20);
    const nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42), name = buf.toString('utf8', p + 46, p + 46 + nl);
    p += 46 + nl + xl + cl;
    if (!/\.png$/i.test(name)) continue;
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + comp);
    if (method === 0) return data;
    if (method === 8) return zlib.inflateRawSync(data);
    throw new Error(`지원하지 않는 zip 압축 방식 ${method}`);
  }
  throw new Error('zip 안에 PNG가 없다');
}
const isPng = b => b.length > 8 && b.readUInt32BE(0) === 0x89504e47;

function buildBody(c, seed) {
  const p = {
    params_version: 3, width: c.width, height: c.height, scale: c.scale, sampler: c.sampler, steps: c.steps,
    n_samples: 1, ucPreset: 0, qualityToggle: true, sm: false, sm_dyn: false, dynamic_thresholding: false,
    controlnet_strength: 1, legacy: false, add_original_image: true, cfg_rescale: c.cfgRescale,
    noise_schedule: c.noise, legacy_v3_extend: false, skip_cfg_above_sigma: null, seed,
    negative_prompt: c.negative, deliberate_euler_ancestral_bug: false, prefer_brownian: true,
  };
  if (/diffusion-4/.test(c.model)) Object.assign(p, {
    use_coords: false, characterPrompts: [],
    v4_prompt: { caption: { base_caption: c.prompt, char_captions: [] }, use_coords: false, use_order: true },
    v4_negative_prompt: { caption: { base_caption: c.negative, char_captions: [] }, legacy_uc: false },
  });
  return { input: c.prompt, model: c.model, action: 'generate', parameters: p };
}

async function generate(tok, body) {
  const waits = [10000, 30000, 60000];
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(API_IMAGE, {
      method: 'POST', body: JSON.stringify(body), signal: AbortSignal.timeout(180000),
      headers: { ...baseHeaders(tok), 'Content-Type': 'application/json', Accept: '*/*' },
    });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      return isPng(buf) ? buf : firstPngFromZip(buf);
    }
    const text = (await res.text()).slice(0, 300);
    if (res.status === 401) fail('토큰이 거부되었다(401). NAI_TOKEN 값을 확인한다.', 2);
    if (res.status === 402) fail(`Anlas가 부족하거나 유료 생성이 필요하다(402): ${text}`, 1);
    if ((res.status === 429 || res.status >= 500) && attempt < waits.length) {
      console.log(`  응답 ${res.status}, ${waits[attempt] / 1000}초 뒤 다시 시도: ${text}`);
      await sleep(waits[attempt]);
      continue;
    }
    throw new Error(`생성 실패 ${res.status}: ${text}`);
  }
}

// '#'으로 시작하는 줄은 메모로 보고 빼며, 남은 줄은 쉼표로 잇는다(v0.55.78)
function readText(file, base) {
  const f = path.resolve(base, file);
  if (!fs.existsSync(f)) fail(`프롬프트 파일을 찾지 못했다: ${f}\n  틀 파일은 test/nai/prompt.txt, test/nai/negative.txt 에 있다.`, 2);
  return fs.readFileSync(f, 'utf8').replace(/^﻿/, '').split(/\r?\n/).map(l => l.trim())
    .filter(l => l && !l.startsWith('#')).map(l => l.replace(/,+$/, '')).join(', ');
}

function loadConfig() {
  let job = {}, base = process.cwd();
  const jobFile = opt('job');
  if (jobFile) { job = JSON.parse(fs.readFileSync(jobFile, 'utf8')); base = path.dirname(path.resolve(jobFile)); }
  const pick = (k, jk, d) => opt(k) ?? job[jk ?? k] ?? d;
  let prompt = opt('prompt') ?? (opt('prompt-file') ? readText(opt('prompt-file'), process.cwd()) : null)
    ?? job.prompt ?? (job.promptFile ? readText(job.promptFile, base) : null);
  let negative = opt('negative') ?? (opt('negative-file') ? readText(opt('negative-file'), process.cwd()) : null)
    ?? job.negative ?? (job.negativeFile ? readText(job.negativeFile, base) : '') ?? '';
  const outRaw = opt('out') ?? (job.out ? path.resolve(base, job.out) : null);
  const c = {
    prompt, negative, out: outRaw ? path.resolve(outRaw) : null, name: String(pick('name', null, 'nai')),
    count: +pick('count', null, 1), width: +pick('width', null, 1024), height: +pick('height', null, 1024),
    seed: pick('seed', null, null), model: String(pick('model', null, 'nai-diffusion-4-5-full')),
    steps: +pick('steps', null, 28), scale: +pick('scale', null, 5), sampler: String(pick('sampler', null, 'k_euler_ancestral')),
    noise: String(pick('noise', null, 'karras')), cfgRescale: +pick('cfg-rescale', 'cfgRescale', 0), delay: +pick('delay', null, 3000),
  };
  if (c.seed !== null) c.seed = +c.seed;
  return c;
}

function checkConfig(c, allowPaid) {
  const errs = [], warns = [];
  if (!c.prompt) errs.push('프롬프트가 없다(--prompt, --prompt-file 또는 작업 JSON의 prompt/promptFile)');
  if (!c.out) errs.push('저장 폴더가 없다(--out 또는 작업 JSON의 out)');
  if (!(c.count >= 1 && Number.isInteger(c.count))) errs.push('--count는 1 이상 정수');
  if (c.width % 64 || c.height % 64 || c.width < 64 || c.height < 64) errs.push('가로·세로는 64의 배수');
  if (c.seed !== null && !(Number.isInteger(c.seed) && c.seed >= 0 && c.seed < 4294967295)) errs.push('--seed는 0 이상 4294967295 미만 정수');
  if (c.prompt && FORBIDDEN_POSITIVE.test(c.prompt)) errs.push(`프롬프트에 아동을 뜻하는 단어가 있다("${c.prompt.match(FORBIDDEN_POSITIVE)[0]}"). 프로젝트 규칙상 생성하지 않는다`);
  if (!allowPaid) {
    if (c.width * c.height > FREE_PIXELS) errs.push(`픽셀 수 ${c.width}x${c.height}가 무료 한도(1024x1024)를 넘는다(--allow-paid로 허용)`);
    if (c.steps > FREE_STEPS) errs.push(`스텝 ${c.steps}가 무료 한도(28)를 넘는다(--allow-paid로 허용)`);
    if (!/diffusion-(3|4|4-5)-/.test(c.model)) warns.push(`모델 ${c.model}은 무제한 대상(V4.5 이하)이 아닐 수 있다. Anlas가 줄면 멈춘다`);
  }
  // 연령·성별 네거티브는 빠진 것만 자동으로 붙인다
  const negLow = (c.negative || '').toLowerCase();
  const missing = AGE_NEGATIVES.filter(t => !new RegExp(`(^|[^a-z])${t}([^a-z]|$)`).test(negLow));
  if (missing.length) { c.negative = (c.negative ? c.negative.replace(/[,\s]+$/, '') + ', ' : '') + missing.join(', '); warns.push(`네거티브에 필수 연령·성별 항목을 붙였다: ${missing.join(', ')}`); }
  const pLow = (c.prompt || '').toLowerCase();
  const mp = RECOMMENDED_POSITIVE.filter(t => !pLow.includes(t)), mn = RECOMMENDED_NEGATIVE.filter(t => !negLow.includes(t));
  if (mp.length) warns.push(`프롬프트에 필수 항목이 안 보인다(파츠 시트라면 무시): ${mp.join(', ')}`);
  if (mn.length) warns.push(`네거티브에 필수 항목이 안 보인다(파츠 시트라면 무시): ${mn.join(', ')}`);
  return { errs, warns };
}

function freePath(dir, stem) {
  let f = path.join(dir, stem + '.png'), i = 2;
  while (fs.existsSync(f)) f = path.join(dir, `${stem}_${i++}.png`);
  return f;
}

async function main() {
  if (has('balance')) {
    const b = await getBalance(token());
    console.log(`요금제 ${TIER_NAMES[b.tier] ?? b.tier}${b.active ? '' : '(비활성)'}, Anlas ${b.anlas ?? '읽지 못함'}`);
    if (b.anlas === null) console.log(`  응답 항목: ${b.keys.join(', ')} (이 목록을 알려 주면 잔액 읽기를 맞춘다)`);
    return;
  }
  if (!args.length) fail('사용법: node test/tools/nai_generate.mjs --prompt-file <파일> --out <폴더> [--count N] [--dry-run] (자세한 옵션은 파일 머리 주석)', 2);
  const allowPaid = has('allow-paid'), dry = has('dry-run');
  const c = loadConfig();
  const { errs, warns } = checkConfig(c, allowPaid);
  for (const w of warns) console.log('주의: ' + w);
  if (errs.length) fail(errs.map(e => '오류: ' + e).join('\n'));

  const seeds = Array.from({ length: c.count }, (_, i) => c.seed !== null ? (c.seed + i) % 4294967295 : Math.floor(Math.random() * 4294967295));
  if (dry) {
    console.log(JSON.stringify(buildBody(c, seeds[0]), null, 1));
    console.log(`(시험 실행) ${c.count}장, 저장 위치 ${c.out}, 시드 ${seeds.join(', ')}`);
    return;
  }

  const tok = token();
  const start = await getBalance(tok);
  console.log(`요금제 ${TIER_NAMES[start.tier] ?? start.tier}, Anlas ${start.anlas}`);
  if (!allowPaid && start.tier !== 3) fail('Opus 요금제가 아니면 무료 생성이 되지 않는다. 유료로 진행하려면 --allow-paid', 1);
  if (!allowPaid && start.anlas === null) fail(`Anlas 잔액을 읽지 못해 무료 여부를 확인할 수 없어 멈춘다(응답 항목: ${start.keys.join(', ')}). 확인 없이 진행하려면 --allow-paid`, 1);
  fs.mkdirSync(c.out, { recursive: true });

  let before = start.anlas, made = 0;
  for (let i = 0; i < c.count; i++) {
    if (i > 0) await sleep(c.delay);
    const seed = seeds[i], t0 = Date.now();
    const png = await generate(tok, buildBody(c, seed));
    const file = freePath(c.out, `${c.name}_${seed}`);
    fs.writeFileSync(file, png);
    const after = (await getBalance(tok)).anlas;
    const rec = {
      tool: 'nai_generate.mjs', createdAt: new Date().toISOString(), seconds: +((Date.now() - t0) / 1000).toFixed(1),
      model: c.model, width: c.width, height: c.height, steps: c.steps, scale: c.scale, sampler: c.sampler,
      noise: c.noise, cfgRescale: c.cfgRescale, seed, prompt: c.prompt, negative: c.negative,
      anlasBefore: before, anlasAfter: after,
    };
    fs.writeFileSync(file.replace(/\.png$/, '.json'), JSON.stringify(rec, null, 1));
    made++;
    console.log(`[${i + 1}/${c.count}] ${path.relative(process.cwd(), file)} (시드 ${seed}, ${rec.seconds}초, Anlas ${before} → ${after})`);
    if (after < before && !allowPaid) fail(`Anlas가 ${before - after} 줄었다. 무료 조건이 적용되지 않는 것으로 보고 멈춘다(${made}장 저장).`, 1);
    before = after;
  }
  console.log(`완료: ${made}장, Anlas ${start.anlas} → ${before}`);
}

main().catch(e => {
  const code = e && e.cause && (e.cause.code || e.cause.message);
  let hint = '';
  if (/CERT|SELF_SIGNED|UNABLE_TO_VERIFY/.test(code || '')) hint = '\n  HTTPS 인증서가 거부되었다. 회사망 보안 장비가 연결을 검사하는 경우다. node --use-system-ca 로 실행하거나 다른 네트워크에서 시도한다.';
  else if (/ENOTFOUND|EAI_AGAIN/.test(code || '')) hint = '\n  주소를 찾지 못했다. 인터넷 연결이나 DNS를 확인한다.';
  else if (/ECONNREFUSED|ECONNRESET|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT/.test(code || '') || (e && e.name === 'TimeoutError')) hint = '\n  연결이 막히거나 시간이 초과되었다. 방화벽이나 프록시가 NovelAI를 막는지 확인한다.';
  fail('오류: ' + (e && e.message || e) + (code ? ` (${code})` : '') + hint);
});
