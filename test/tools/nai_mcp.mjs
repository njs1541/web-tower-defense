/*
 * NovelAI 생성 MCP 서버 (v0.55.80)
 *
 * Antigravity, Claude Code 같은 에이전트가 nai_generate.mjs를 도구로 부를 수 있게 하는 stdio MCP 서버다.
 * 외부 패키지 없이 MCP(JSON-RPC 2.0, 줄 단위 JSON)를 직접 처리한다.
 * 생성은 nai_generate.mjs를 자식 프로세스로 실행해서 하므로, 무료 조건 검사, Anlas 감소 시 중단,
 * 금지어 거부, 필수 네거티브 자동 추가 같은 안전 장치가 그대로 적용된다.
 * 에이전트가 유료 생성을 할 수 없도록 --allow-paid는 도구에 열지 않는다.
 *
 * 토큰: 환경 변수 NAI_TOKEN. 편집기를 setx 이전에 켜서 환경 변수가 없으면 Windows 사용자 환경 변수(레지스트리)에서 읽는다.
 * 경로: 상대 경로는 프로젝트 루트 기준이고, 프로젝트 밖 경로는 거부한다.
 * 등록: v0.55.81부터 이 PC는 독립판(~/tools/novelai-mcp/server.mjs, 규칙은 프로젝트 루트 .novelai.json)을 쓴다.
 * 이 파일은 독립판이 없는 PC용 예비다. 쓰려면 .mcp.json이나 Antigravity 설정에 등록한다(CLAUDE.md 참고).
 * 직접 시험: node test/tools/nai_mcp.mjs --self-test (도구 목록과 잔액 조회를 한 번 해 본다)
 */
import { spawn, execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const SCRIPT = path.join(HERE, 'nai_generate.mjs');
const VERSION = '0.55.80';
const MAX_COUNT = 10;

function tokenEnv() {
  const env = { ...process.env };
  if (!env.NAI_TOKEN && process.platform === 'win32') {
    try {
      const out = execFileSync('reg', ['query', 'HKCU\\Environment', '/v', 'NAI_TOKEN'], { encoding: 'utf8', windowsHide: true });
      const m = out.match(/NAI_TOKEN\s+REG_(?:EXPAND_)?SZ\s+(.+)/);
      if (m) env.NAI_TOKEN = m[1].trim();
    } catch { /* 없으면 nai_generate.mjs가 안내한다 */ }
  }
  return env;
}

function inRoot(p, what) {
  const abs = path.resolve(ROOT, p);
  const rel = path.relative(ROOT, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error(`${what}는 프로젝트 안이어야 한다: ${p}`);
  return abs;
}

function runScript(args, timeoutMs) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [SCRIPT, ...args], { cwd: ROOT, env: tokenEnv(), windowsHide: true });
    let out = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    const timer = setTimeout(() => { child.kill(); out += `\n시간 초과(${Math.round(timeoutMs / 1000)}초)로 중단했다.`; }, timeoutMs);
    child.on('close', code => { clearTimeout(timer); resolve({ code, out: out.trim() }); });
    child.on('error', e => { clearTimeout(timer); resolve({ code: -1, out: '실행 실패: ' + e.message }); });
  });
}

const TOOLS = [
  {
    name: 'nai_balance',
    description: 'NovelAI 요금제와 Anlas 잔액을 확인한다.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'nai_generate',
    description: [
      'NovelAI(기본 V4.5 Full)로 이미지를 만들어 프로젝트 폴더에 PNG와 생성 기록 JSON을 저장한다.',
      'Opus 무료 조건(1024x1024 이하, 28스텝 이하, 1장씩)만 허용하고, Anlas가 줄면 멈춘다. 유료 생성은 할 수 없다.',
      '프롬프트는 사용자가 쓴다. 사용자가 준 프롬프트나 파일을 그대로 전달하고 임의로 지어내지 않는다.',
      '필수 항목 틀은 test/nai/prompt.txt, test/nai/negative.txt(파일의 # 줄은 메모). 아동을 뜻하는 단어가 있으면 거부된다.',
      `한 번에 최대 ${MAX_COUNT}장, 한 장에 보통 10-30초.`,
    ].join(' '),
    inputSchema: {
      type: 'object',
      properties: {
        out: { type: 'string', description: '저장 폴더(프로젝트 루트 기준). 예: test/incoming/char_cecilia/nai' },
        prompt: { type: 'string', description: '프롬프트 문자열(prompt_file과 둘 중 하나)' },
        prompt_file: { type: 'string', description: '프롬프트 파일(프로젝트 루트 기준). 예: test/nai/prompt.txt' },
        negative: { type: 'string', description: '네거티브 문자열' },
        negative_file: { type: 'string', description: '네거티브 파일. 예: test/nai/negative.txt' },
        name: { type: 'string', description: '파일 이름 앞부분(기본 nai). 결과는 <name>_<시드>.png' },
        count: { type: 'integer', minimum: 1, maximum: MAX_COUNT, description: '만들 장 수(기본 1)' },
        width: { type: 'integer', description: '64의 배수, 기본 1024' },
        height: { type: 'integer', description: '64의 배수, 기본 1024' },
        seed: { type: 'integer', description: '첫 장 시드(이후 +1). 없으면 무작위' },
        model: { type: 'string', description: '기본 nai-diffusion-4-5-full' },
        steps: { type: 'integer', description: '기본 28(최대 28)' },
        scale: { type: 'number', description: '프롬프트 따르는 정도, 기본 5' },
        sampler: { type: 'string', description: '기본 k_euler_ancestral' },
      },
      required: ['out'],
      additionalProperties: false,
    },
  },
];

async function callTool(name, a = {}) {
  if (name === 'nai_balance') return runScript(['--balance'], 60000);
  if (name !== 'nai_generate') throw new Error('알 수 없는 도구: ' + name);
  if (!a.prompt && !a.prompt_file) throw new Error('prompt 또는 prompt_file이 필요하다');
  const count = a.count ?? 1;
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) throw new Error(`count는 1-${MAX_COUNT}`);
  const args = ['--out', inRoot(a.out, '저장 폴더'), '--count', String(count)];
  if (a.prompt) args.push('--prompt', a.prompt);
  if (a.prompt_file) args.push('--prompt-file', inRoot(a.prompt_file, '프롬프트 파일'));
  if (a.negative) args.push('--negative', a.negative);
  if (a.negative_file) args.push('--negative-file', inRoot(a.negative_file, '네거티브 파일'));
  for (const [k, flag] of [['name', 'name'], ['width', 'width'], ['height', 'height'], ['seed', 'seed'], ['model', 'model'], ['steps', 'steps'], ['scale', 'scale'], ['sampler', 'sampler']])
    if (a[k] !== undefined && a[k] !== null) args.push('--' + flag, String(a[k]));
  return runScript(args, 60000 + count * 200000);
}

// --- JSON-RPC ---
const send = msg => process.stdout.write(JSON.stringify(msg) + '\n');
const reply = (id, result) => send({ jsonrpc: '2.0', id, result });
const replyErr = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });

async function handle(msg) {
  const { id, method, params } = msg;
  const isRequest = id !== undefined && id !== null;
  try {
    if (method === 'initialize') {
      return reply(id, {
        protocolVersion: params?.protocolVersion || '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'novelai-td', version: VERSION },
      });
    }
    if (method === 'ping') return reply(id, {});
    if (method === 'tools/list') return reply(id, { tools: TOOLS });
    if (method === 'tools/call') {
      try {
        const r = await callTool(params?.name, params?.arguments);
        return reply(id, { content: [{ type: 'text', text: r.out || '(출력 없음)' }], isError: r.code !== 0 });
      } catch (e) {
        return reply(id, { content: [{ type: 'text', text: '오류: ' + e.message }], isError: true });
      }
    }
    if (isRequest) return replyErr(id, -32601, '지원하지 않는 메서드: ' + method);
  } catch (e) {
    if (isRequest) replyErr(id, -32603, e.message);
  }
}

if (process.argv.includes('--self-test')) {
  console.log('도구:', TOOLS.map(t => t.name).join(', '));
  console.log('토큰:', tokenEnv().NAI_TOKEN ? '있음' : '없음');
  const r = await runScript(['--balance'], 60000);
  console.log('잔액 조회:', r.out);
} else {
  // 입력이 닫혀도 진행 중인 요청의 응답을 보낸 뒤 끝낸다
  let pending = 0, closed = false;
  const maybeExit = () => { if (closed && pending === 0) process.exit(0); };
  const rl = readline.createInterface({ input: process.stdin });
  rl.on('line', line => {
    if (!line.trim()) return;
    let msg;
    try { msg = JSON.parse(line); } catch { return replyErr(null, -32700, 'JSON 해석 실패'); }
    pending++;
    handle(msg).finally(() => { pending--; maybeExit(); });
  });
  rl.on('close', () => { closed = true; maybeExit(); });
  if (!fs.existsSync(SCRIPT)) console.error('nai_generate.mjs를 찾지 못했다: ' + SCRIPT);
}
