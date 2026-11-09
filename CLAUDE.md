# 타워디펜스 프로젝트 가이드

미소녀 지휘관 수집, 룬 소켓 덱빌딩, 히어로 컨트롤을 결합한 브라우저 타워 디펜스 게임과 그 에셋 제작 도구 모음이다.
빌드 도구와 외부 의존성이 없는 바닐라 JS/HTML/CSS 프로젝트다.

- 게임 버전: v0.53.9
- 이 문서의 행 번호와 현황은 v0.52.0 작업본 기준이다(v0.53.x는 문서, RP 드롭 상수, 크롤러 보호 판정만 변경. enemy.js 행 번호는 약 +15 밀림). 코드가 바뀌면 행 번호는 어긋날 수 있으니 함수명으로 다시 찾는다.
- **커밋은 사용자가 수동으로 한다.** 명시적인 요청이 없으면 커밋이나 푸시를 하지 않는다.
- 세부 규칙은 [QA_AND_RULES.md](QA_AND_RULES.md), 기획은 [기획문서.md](기획문서.md), 에셋 절차는 [asset_generation_pipeline_guide.html](asset_generation_pipeline_guide.html)을 본다.

## 실행과 검증

```
node scratch/serve.js      # http://localhost:8085/ (no-store 응답이라 캐시 무력화 불필요)
```

- 게임: `/index.html`. 에셋 도구: `/sd_all_in_one_hub.html`(스타일 가이드와 스튜디오를 iframe으로 묶음).
- `Ctrl+J`: 게임 내 QA 치트 패널(`js/qa.js`). 재화 지급, 전체 해금, 라운드 설정, 하드 리셋. 자동 테스트가 아니다.
- **게임 자동 테스트는 없다.** `scratch/sim_harness.js`는 게임이 아니라 프롬프트 생성기 스냅샷용이고, 현행 코드와도 어긋나 있다.
- **밸런스 측정:** `node scratch/balance_sim/run_balance.mjs [--preset starter,mid,strong] [--stage 1,2,3] [--runs 10] [--prep 15]`. 실제 게임을 Edge 헤드리스와 가상 시계로 1배속 그대로 빠르게 돌리고 봇이 플레이한다(90판 약 21분). 요약은 `scratch/balance_sim/report.md`(회귀 확인용 짧은 실행은 `--no-report`로 덮어쓰기를 막는다). 봇은 사람보다 약하니 하한선으로 읽는다. 측정 중에는 `js/`를 수정하지 않는다(판마다 디스크의 코드를 새로 읽는다).
- 문법 확인: `node -e "const fs=require('fs');for(const f of fs.readdirSync('js'))new Function(fs.readFileSync('js/'+f,'utf8'))"`
- 게임 동작을 바꾸면 브라우저에서 실제로 확인한다. Edge 헤드리스와 CDP로 `startGame`, `onEnemyHit`을 호출해 흐름을 검증할 수 있다(임시 프로필 사용). 확인하지 못했으면 그렇게 보고한다.

## 반드시 지킬 규칙 (QA_AND_RULES.md L92-153)

**언어:** 설명, 주석, 문서, 작업 보고는 모두 한국어로 쓴다.

**버전:** "어떠한 내용이든 업데이트가 될 때마다 반드시 버전을 상향"한다. 게임 코드뿐 아니라 에셋 도구(HTML)와 문서만 고친 경우도 포함한다. 다음 위치를 항상 같은 값으로 맞춘다.
- `js/constants.js:1` (`GAME_VERSION`)
- `index.html:26, 40, 223` (수동 표기 3곳). 스크립트 캐시 쿼리 `?v=0539`도 함께 올린다
- `QA_AND_RULES.md:8` (인수인계 절)
- `기획문서.md:2`

**게임 로직:** `generateBoard`와 경로 탐색(`findAStarPath`, `recalculateGlobalPath`)을 해치지 않는다. 기능을 추가할 때는 `gameLoopTick`, `setInterval`, `setTimeout` 같은 비동기 로직과의 충돌을 확인한다. 규칙 원문의 `gameLoop`, `generateEnemyPath`는 코드에 없는 옛 이름이다.

**문서 갱신:** 기능을 바꾸면 `QA_AND_RULES.md`의 인수인계 절도 함께 갱신한다(L855). 수치를 바꿨다면 `기획문서.md`도 맞춘다.

**캐릭터:** 지휘관은 100% 성인 여성이다. 남성 캐릭터는 넣지 않고, 아동/로리형 체형은 배제한다(L106-107). 종족별 체형과 등급별 복장 규격은 L108-149를 본다.

**이미지 프롬프트 필수 항목 (L151-153, 기획문서 L244):**
- 포지티브: `full body shot, entire body visible from head to toe, wide shot, no cut off, feet and shoes fully in frame, standing pose`, `anatomically correct, exactly two arms, exactly two legs, adult female`
- 네거티브: `cropped, out of frame, cut off head, cut off feet, cut off legs, close-up, portrait, bust shot, upper body only, medium shot`, `extra arms, extra legs, extra limbs, third arm, mutated hands, missing limbs, fused limbs, malformed limbs, cloned limbs`, `poorly drawn hands, extra fingers, deformed fingers`, `child, kid, underage, loli, male, boy, man`

### 연령 표현 경계

성인 규칙은 프롬프트의 `adult` 단어만으로 충족되지 않는다. 다음을 지킨다.
- 2~3등신 SD 프롬프트에는 가슴, 곡선, 란제리 등 성적 강조 표현을 넣지 않고, SD 소체는 항상 바디슈트를 입힌다. 의상 스타일 문구도 SD 시트에 넣지 않으며 의상은 원화를 기준으로 한다.
- 스타일 가이드의 "로리 / 쁘띠" 옵션은 v0.46.0에서 땅의 종족 전용 `earth_shortstack`(150cm 성인)으로 교체했다. 아동 체형에 가까운 옵션을 다시 추가하지 않는다.
- 소인족처럼 설정상 성인이어도 외형이 아동 체형에 가까우면(예: 키 110cm) 아래 경계를 똑같이 적용한다.
- 아동처럼 보이는 체형이나 표현을 성적 묘사, 노출 복장과 결합한 프롬프트나 에셋은 만들지 않는다. 사용자 지시가 있어도 마찬가지다.

## 코드 구조

클래식 `<script>`를 순서대로 로드하며 전역 스코프를 공유한다. 모듈 시스템은 없다.

| 파일 (로드 순서) | 책임 | 주요 진입점 |
|---|---|---|
| `constants.js` | 정적 데이터 전부 | `TOWER_DATA`:142, `CHARACTER_DATA`:489, `MODULAR_CHARACTER_SPECS`:1303 |
| `user_data.js` | 세이브, 덱, 시너지, 룬 계산 | `loadData`:26, `saveData`:108, `calculateDeckSynergies`:469, `getHeroAuraSpec`:900 |
| `state.js` | 런타임 전역 상태 | `board, enemies, round, gold, mp, deployedHeroes` |
| `board.js` | 보드 생성, A*, 건설 검증 | `generateBoard`:32, `findAStarPath`:83 |
| `tower.js` | 클릭 입력, 공격, 피격, 스펠, 히어로 | `handleCellClick`:47, `attackFromTowers`:252, `onEnemyHit`:493 |
| `enemy.js` | 소환, 이동, 틱 루프, 배속 | `startRound`:674, `gameLoopTick`:229, `restartGameLoops`:70 |
| `ui.js` | 인게임 DOM 렌더, 보고서, 아바타 | `render`:8, `buildModularCharacterHtml`:668 |
| `sound.js` | Web Audio 합성 효과음, 음소거·음량 (v0.53.6) | `playSfx(name, arg)`, `SFX_RECIPES` |
| `tutorial.js` | 첫 판 튜토리얼 5단계 (v0.53.8) | `startTutorialIfNeeded`, `updateTutorial`(render에서 호출) |
| `lobby.js` | 로비, 덱, 룬 장착, 연구소 | `updateLobbyUI`:9 |
| `gacha.js` | 소환과 연출 | `rollSingleCommander`:28 |
| `qa.js` | 디버그 패널 | `qa*` |
| `main.js` | 진입, 세션 시작/종료 | `init`:9, `startGame`:76, `endGame`:146 |

**구현 시 주의점**
- 새 최상위 `let/const`가 기존 전역과 겹치면 그 스크립트 전체가 SyntaxError로 실패한다. `path, round, board, gold, mp`가 이미 전역이다.
- 렌더링은 전부 DOM이다. Canvas와 rAF는 쓰지 않는다. 소환 1000ms, 틱 200ms의 `setInterval` 두 개가 돌고, 모두 배속으로 나눈다. 틱마다 400칸을 다시 그린다.
- `typeof X === 'function'` 가드가 많아 이름을 잘못 쓰면 오류 없이 기능만 꺼진다. 새 코드에 이 패턴을 늘리지 않는다.
- 세션 리셋은 `location.reload()`에 의존한다(ui.js:659). `startGame`은 `round`, `enemies`를 초기화하지 않는다.
- 인게임 `gold`와 영구 `USER_DATA.gold`는 다른 값인데 UI 라벨은 둘 다 TP다.
- 세이브 키는 `tower_defense_save_v1`이고, v0.53.4부터 `schemaVersion`(`SAVE_SCHEMA_VERSION`)과 백업 키 `_backup`, 손상 보존 키 `_corrupt`가 있다. 필드를 바꾸면 `loadData`의 기본값 채우기를 수정하고, 구조가 바뀌면 `SAVE_SCHEMA_VERSION`을 올리고 `migrateSaveData`에 단계를 추가한다.
- 파일은 UTF-8이고 행 끝이 파일마다 다르다. `user_data.js`, `기획문서.md`는 LF, `enemy.js`, `main.js`, `QA_AND_RULES.md`는 CRLF, `constants.js`, `state.js`, `index.html`은 섞여 있다. 수정할 때 기존 행 끝을 유지하고, PowerShell 5.1로 쓸 때는 인코딩을 지정한다.
- 재화 수급 수치는 `constants.js`에 있다. RP는 맨 위 `RP_DROP_CHANCE`, `RP_REWARD_*`, MP는 `MP_CONFIG`(`regenPerSec`, `perKill`). MP 충전은 `gameLoopTick` 안에서 틱당 `regenPerSec/5`씩 돌아서 전투 중에만 동작한다(사용자 확정). v0.52.0 병합에서 로컬 `MP_REGEN_*`는 삭제했다. RP는 처치 4% 드롭(v0.53.0에서 12%→4%), 완막 +1, 스테이지 클리어 +5로 확정되었다.
- 스테이지 클리어: `STAGE_DATA[n].clearRound`(현재 전 스테이지 30, 사용자 결정) 이후의 보스를 **처치**하면 `endGame(true)`로 런이 승리 종료되고 RP +5를 준다(50 TP 대신). 보스 누출은 `bossKilledThisRound`로 구분해 격파 보상과 최초 클리어 PP를 주지 않고, 생존하면 런이 계속되어 40R 보스가 다음 기회가 된다. `stageCleared`로 중복 판정을 막는다.

## 추가 체크리스트

**지휘관**
1. `CHARACTER_DATA`에 항목 추가: id, name, title, grade, element, role, avatar, image, baseSockets, maxSockets, levelCaps, towerStock, quotes, skillQuote, desc. UR/U는 `isHeroUnit`을 넣고 `towerStock:{}`로 둔다.
2. 소환 확률은 v0.53.5부터 자동이다. `COMMANDER_GACHA_CONFIG.gradeRates`(등급별 총 %)를 `getCommanderGachaRates()`(gacha.js)가 같은 등급 지휘관에게 균등 분배한다. 소환에서 빼려면 `gachaExcluded: true`.
3. `assets/char_<id>.jpg` 추가 후 `node scratch/make_thumbs.mjs`로 썸네일(`assets/thumbs/<id>.webp`) 생성. 선택: `MODULAR_CHARACTER_SPECS`(없으면 `getCharacterModularSpec`이 자동 추론).
4. UR/U 고유 오라: `getHeroAuraSpec`(user_data.js:905-963).
5. 새 원소/역할군이면 `SYNERGY_DATA`, 시너지 분기(user_data.js:576-600, 624-647), 정렬 가중치(lobby.js:169-180), 필터 버튼(lobby.js:547-556), `elemPalette`(constants.js:1458).

**타워:** `TOWER_DATA`, `TOWER_EMBLEMS`, 타격 분기(tower.js:398-436), 효과 문구(tower.js:828-831), `.cell.<id>` CSS, U 대장 한도(user_data.js:354), 제공 지휘관의 `towerStock`.
**적:** `ENEMY_TYPES`, `determineEnemyType`(enemy.js:88-114), `.monster-body.<id>` CSS.
**룬:** `RUNE_DATA`, `RUNE_GACHA_CONFIG`, 패시브 체인(user_data.js:857-888) 또는 스펠 체인(tower.js:1052-1110).
**스테이지:** `STAGE_DATA`, 버튼(index.html:75-77).

## 새 에셋 파이프라인 (진행 중, `test/`)

전신 원화 이후의 작업은 처음부터 다시 만든다(사용자 결정). **아래 "기존 에셋 파이프라인"의 시트, 슬라이스, 리깅 과정은 새 작업의 전제로 삼지 않는다.** 기존 파일은 삭제하지 않는다.

- **목적:** 많은 캐릭터 추가에 대비해 로딩을 줄이고, 인게임에서 Live2D 같은 움직임을 낸다. 로비는 크게 움직이지 않아도 되고, 인게임 이동과 공격 모션은 필수다.
- **구조:** 종족별 공통 바디 1벌 + 캐릭터 파츠(얼굴, 머리카락, 의상, 무기). 투명 파츠를 겹치고 관절을 코드로 회전한다. 규격은 [test/ASSET_SPEC.md](test/ASSET_SPEC.md).
- **역할 분담:** 프롬프트와 이미지 생성은 사용자가 다른 AI와 나노바나나로 진행해 납품한다. 여기서는 사양, 조립, 모션, 게임 연동을 맡고 프롬프트는 작성하지 않는다.
- **납품 위치:** `test/incoming/body_human/`, `test/incoming/char_liana/`. 다음 단계는 납품된 이미지로 배경 제거, 관절 지정, 모션 뷰어를 `test/`에 만드는 것이다.
- **등급별 범위(사용자 결정):** UR/U는 전장에 출전하고 전체 모션(파츠 15장). C~SR은 전장에 나오지 않고 도감과 지휘관 선택에서 대기 모션만(파츠 11장).
- **도감 동작(사용자 결정):** 목록은 정지 이미지로 표시하고, 지휘관을 선택하면 그 캐릭터의 파츠만 불러와 대기 모션을 재생한다.
- **구조상 확인할 점:** 현재 전장 유닛은 36px이다. 리아나(C)는 전체 모션 시험용으로 15장을 만들고 뷰어에서 먼저 시험한다. `CHARACTER_DATA`에 종족 필드가 없어 게임 연동 시 추가가 필요하다.
- **납품 검수 기준:** 바디는 회색 바디슈트와 신발을 입은 것이 분명해야 한다. 벗은 몸처럼 보이는 바디는 파츠 분할, 조립, 뷰어 작업에 쓰지 않고 재제작을 요청한다. `test/GENERATION_PROMPTS.md`, `test/prompt_hub.html`은 다른 AI가 쓴 프롬프트 문서로, 피부색 바디슈트를 지시하는 부분이 사양과 다르다.
- **현재 상태:** `b00_master.png` 재제작 대기 중. 머리 꼭대기 110(사양 180), 발바닥 965(사양 880), 키 856px(사양 700)로 규격 밖이고 피부색이라 벗은 몸처럼 보인다.

## 기존 에셋 파이프라인 (새 작업의 전제가 아님)

모든 단계가 브라우저 수동 조작이다. 이미지 생성 API나 Stable Diffusion 연동은 없고, 웹 AI 도구(나노바나나/Gemini)를 사람이 직접 쓴다.

| 단계 | 도구 | 입력 → 출력 |
|---|---|---|
| 0 기획 | `visual_style_guide.html` 셀렉터 (`updatePrompt`) | 종족/등급/역할/원소 → 프롬프트 |
| 1 원화 | 웹 AI | 프롬프트 → `assets/char_{slug}` |
| 2 시트 | 웹 AI + 규격 틀 PNG + 원화 첨부 | → `assets/ref_{slug}_sheet` (듀얼 시트는 `_a`, `_b`) |
| 3 슬라이스 | `sd_asset_studio.html` 또는 ps1 | 시트 → `assets/parts/{slug}_{key}.png` |
| 4 리깅 검증 | `sd_asset_studio.html` | 파츠 → 핏 JSON, 아틀라스 |
| 5 등록 | 스튜디오 코드 출력(`updateGeneratedCode`) 후 수동 수정 | → `MODULAR_CHARACTER_SPECS` |

**슬라이스 슬롯 11종 (`OFFICIAL_2048_SLICE_SPECS`, sd_asset_studio.html:2151, 좌표는 %)**

| ID | key | ID | key |
|---|---|---|---|
| 01 | `front_core` | 11 | `bottom_skirt` |
| 04 | `base_body` | 12 | `wings_cape` |
| 05 | `expr_neutral` | 13 | `main_weapon` |
| 08 | `expr_serious` | 14 | `sub_weapon` |
| 09 | `headgear` | 15 | `bottom_skirt_back` |
| 10 | `top_dress` | | |

**규격**
- 원화: 대부분 1024×1024 jpg. 예외는 lumina 686×1024, sylvana·titania 768×1376.
- 시트 목표는 2048×1152이지만 실제로는 titania만 일치한다. sylvana·ranger는 1376×768이다.
- 파츠: 32bpp 알파 PNG, 내용에 맞게 트림되어 크기가 제각각이다.
- 크로마키: auto면 숲 종족은 마젠타 `#FF00FF`, 그 외는 `#00FF00`(visual_style_guide.html:2373). 슬라이서 ps1은 흰 배경 기준이다.
- 스타일: 공통 앞머리와 종족/등급/역할/원소 테이블은 visual_style_guide.html:2824-2893. 시트 내부 텍스트 금지, 의상 파츠에 살 포함 금지, 12번은 왼쪽 날개 1짝, 종족 신체 특징은 01~04에 결합한다.
- 레이어 순서는 게임 CSS(style.css:4711-4801)를 기준으로 삼는다. 문서와 스튜디오 아틀라스의 순서는 다르다.

**캐릭터별 현황 (`CHARACTER_DATA` 21명 전원 원화 있음)**

| 캐릭터 | 시트 | 파츠 | 비고 |
|---|---|---|---|
| lumina (U) | 있음 | 구형 키 6개 | SD 스프라이트 idle/attack 있음. 게임은 파츠 중 `orb`만 사용 |
| titania (U) | 있음 | 11개, `sub_weapon`·`bottom_skirt_back` 없음 | 표정 `confident`, `smile`은 미참조 |
| 나머지 19명 | 없음 | 없음 | 절차적 SVG 또는 자동 추론 |

**실바나(`char_sylvana`)는 게임에서 제외했고 추가 계획이 없다.** 데이터는 지웠지만 `assets/`의 원화, 시트, 파츠 11종(슬라이스 참고 자료로 유용)과 스튜디오 프리셋은 남아 있다. 사용자가 요청하기 전에는 다시 등록하지 않는다.

**파일 주의**
- 현행 파일: `visual_style_guide.html`, `sd_asset_studio.html`. `*.backup.html`, `*.pre_rigging_backup.html`은 백업이니 수정하지 않는다.
- `live2d_rigging_test.html`은 목업 기반 독립 테스트베드다. 같은 이름의 `PartRiggingSystem`이 스튜디오에 복제되어 있다.
- `scratch/`의 `fix_*`, `update_*`, `enhance_*`, `resolve_*` 등은 HTML이나 `constants.js`를 직접 고치는 일회성 스크립트다. **재실행하지 않는다.**
- `slice_sylvana.ps1`, `process_sd_titania.ps1`, `gen_template.ps1`은 에셋을 덮어쓴다. 경로와 파일명이 하드코딩되어 있으니 새 캐릭터용은 복사해서 쓴다.
- `run_conflict_detector.js`는 옛 역할/원소 키로 돈다. 통과해도 현행 프롬프트를 보증하지 않는다.

## 알려진 문제

표시: **[확인]** 원본 코드를 직접 대조함. **[판독]** 분석 시 코드만 읽고 재대조는 하지 않음. 모두 브라우저에서 재현하지는 않았으니 수정 전에 재현한다.

**게임 로직**
- 중간 **[판독]** 원격 커밋 `051119e`/`b8694be`(v0.52.0에 병합)가 무한 TP, 수호자 2셋 `freeBases`, `extraDamageRatio` 이중 적용, 크롤러 A* 추적, 오버킬 방지 `id`, 송환 스펠, 룬 중복 장착을 수정했다고 기록했다. 코드 변경은 들어왔지만 브라우저에서 하나씩 재현해 확인하지는 않았다.
- 중간 **[판독]** 룬 `cooldownSec` 미사용.
- 낮음 **[판독]** 판매 버튼 60% 고정 표기(tower.js:770-775 주석 포함). (MP 최대치 표시는 `ui.js:159-161`에서 `maxMp`를 반영하도록 이미 수정됨, v0.53.1 확인)

**에셋 도구**
- 중간 **[판독]** Tier 1 전용 규격 틀 코드가 없다. 다운로드 버튼은 "12슬롯"이라고 표시하지만 틀 생성 함수(`sheet_a`, `sheet_b`, 그 외 분기)에서는 15슬롯 통합 틀이 나온다.
- 중간 **[판독]** 스튜디오 UI에 `15. 속옷` 표기와 `underwear` 레이어가 남아 있다(sd_asset_studio.html:608, 1740, 1887). 슬라이서는 이미 뒷치마 기준이다.

**에셋 ↔ 게임 연결**
- 높음 **[확인]** `mirrorWings`가 `modularParts` 안에 있어(constants.js:1429) `spec.mirrorWings`(ui.js:802)가 읽지 못한다. 날개가 단일 레이어로 나온다.
- 높음 **[확인]** `bottomSkirtBack`을 렌더하는 코드가 없다. 문서에는 뒷치마 샌드위치가 완료로 적혀 있다.
- 높음 **[확인]** `modularCustomFit`의 소비 코드가 없다. 게임은 CSS 고정 %를 쓰므로 스튜디오의 핏 값이 반영되지 않는다.
- 높음 **[확인]** 스튜디오 생성 코드의 키(`standingArt`, `referenceSheet`, sd_asset_studio.html:3276-3277)가 게임 키(`refSheet`, `sdPartsSheet`)와 다르다. 복붙 후 수정이 필요하다.
- 높음 **[판독]** 듀얼 시트에 15번 좌표가 없어(`OFFICIAL_SHEET_B_SPECS`:2176) SOP 권장 경로로는 뒷치마를 따로 얻지 못한다. Tier1/Tier3 슬라이스도 미지원이다.
- 중간 **[판독]** 문서 간 충돌: 배경색(SOP 녹색 고정 / 가이드 종족별), 소체 정의(탈의 / 바디슈트 / 언더웨어), 표정 06·07 정의. 이 정의들은 기준이 아직 정해지지 않았다.

**문서 ↔ 코드 불일치**

수급 규칙처럼 문서와 코드가 다르면 **문서를 기준으로 코드를 맞춘다**(사용자 결정). MP, RP 수급은 v0.44.0에서 이 원칙으로 맞췄다. 아래 항목은 문서가 옛 내용일 가능성이 있으니 고치기 전에 어느 쪽을 바꿀지 확인한다.
- QA L183-188의 확률표, L749·750의 성장·보스 배율은 옛 값이다. 현행은 constants.js:38-39, 1227-1272.
- QA에서 "전면 은퇴"(L67)한 대장 강림/결계가 QA L217, L231-239와 기획 L177-192에 현행처럼 남아 있다.
- `QA_AND_RULES.md`의 "수정된 버그" 절에 v0.37~v0.43 항목이 없다. 최신 내역은 인수인계 절을 본다.

## 다음 작업 (QA_AND_RULES.md L78-84, 기획문서 L295-300)

1. 가챠 재화 수급 설계. 소프트 피티(v0.42)와 RP 완막/클리어 보상(v0.44)은 구현되었고, 수치 조정과 PP 수급처 다각화가 남았다.
2. 타워 설치비/철거 환급 규칙 재정립(무한 TP 문제와 연결).
3. 스테이지 난이도, 엔드게임 구축, 챕터 목표와 무한 모드 분리. 클리어 조건은 v0.52.0에서 30R 보스 처치로 정해졌고(맵 장애물 지형 포함), 30R까지의 밸런스는 아직 플레이로 검증하지 않았다.
4. 중장기: 호감도와 스토리, Stage 4(번개 폭풍의 협곡), Stage 5(공허의 심연).
5. 무료 웹 공개 v1.0 (v0.53.0 방향 확정, 기획문서 "[계획] 무료 웹 공개 v1.0"과 3.7절): GitHub Pages + Firebase Spark(로그인·세이브·순위표), 차원석(1 PP = 100) 상점·출석·미션, 출시 지휘관 45명, 연구소 확장. 구현 계획은 [docs/workflow_v1_release.md](docs/workflow_v1_release.md) (P0 크롤러 소프트락(v0.53.2 완료) → P1 측정 시뮬레이터(v0.53.3 완료) → P2-1 Pages 워크플로(v0.53.3 작성, 실행 미확인) → P2-3·2-4 세이브 보호·내보내기(v0.53.4 완료) → P4-1 자동 소환 확률(v0.53.5 완료) → P6-1 효과음(v0.53.6 완료) → P2-2 썸네일(v0.53.7 완료) → P6-3 튜토리얼(v0.53.8 완료). 남은 작업은 아래 "사용자 확인 필요"의 결정이 있어야 진행된다. → P2 배포·세이브·Firebase → P3 차원석·상점 → P4 지휘관 확장 → P5 변조·순위표 → P6 사운드·튜토리얼 → P7 연구소 → P8 출시 준비). 저장소 `njs1541/web-tower-defense`는 공개 상태(2026-11-09 확인).

## 사용자 확인 필요

v1.0 워크플로(`docs/workflow_v1_release.md`)에서 결정 없이 할 수 있는 작업은 v0.53.8까지 끝났다. 남은 작업은 다음 결정이 필요하다.
- **P2 Firebase:** SDK를 `gstatic.com` CDN 스크립트로 불러와도 되는지(외부 의존성 첫 예외), Firebase 프로젝트 생성과 웹 앱 구성값 전달(사용자 작업), 일일 초기화 시각(예: 한국 시간 0시 또는 5시).
- **P3 차원석:** 기획문서 3.7절의 획득처·상점 "초안" 수치 확정. 일일 초기화를 서버 시간으로 하려면 P2가 먼저다.
- **P4 지휘관:** 고유 효과 템플릿 유형과 21명 배정안 승인, `race`(종족) 필드의 지휘관별 값, 픽업 배너 천장 규칙, UR/U 파츠가 늦을 때 기존 렌더링으로 출시할지.
- **P5:** 변조 단계 목록과 보상, 3지선다 보상 후보.
- **P6-2:** 배경음 출처.
- **P7:** 연구소 확장 특성과 비용.
- **밸런스(P1 측정 결과):** 신규 덱은 10R 보스를 막지 못해 보스 PP와 최초 클리어 PP를 받지 못하고, 중반 덱은 20R 보스에서 막힌다. 초반 보스 난이도나 신규 지급을 조정할지.
- **배포:** GitHub 저장소 Settings → Pages → Source를 "GitHub Actions"로 바꿔야 `.github/workflows/deploy-pages.yml`이 동작한다. 배포본에 QA 치트 패널(Ctrl+J)이 그대로 들어가므로 P8 전에 처리 방식을 정해야 한다.


## 세션 인수인계

- 작업을 시작할 때 이 문서와 `QA_AND_RULES.md` L7-91(인수인계 절)를 읽는다. 전체 문서는 크므로 필요한 부분만 읽는다.
- `visual_style_guide.html`(약 330KB)은 Grep과 부분 읽기로 다룬다.
- 작업을 끝내면 해결한 문제를 "알려진 문제"에서 지우고, 구조나 절차가 바뀌었으면 이 문서를 갱신한다.

### 다른 컴퓨터에서 이어서 작업하기 (v0.53.9 기록)

AI 에이전트의 메모리는 PC마다 따로 저장되므로, 이어서 작업할 때 필요한 사용자 결정은 여기와 `기획문서.md`에 남긴다.
- **사용자 선호:** 모든 대답과 보고는 반드시 한국어로 쓴다(긴 작업 끝의 요약 포함). 사용자가 직접 지시한 규칙이다.
- **출시 방향(2026-11-09 확정):** 무료 웹 공개, PC 브라우저 대상, 한 판 약 30분. 정적 파일은 GitHub Pages, Firebase 무료(Spark)는 로그인·세이브·순위표만. 순위표 도입. 가챠는 유지하고 상위 재화 `차원석`(1 PP = 100 차원석, 주당 10연 1회 이상)을 출석·미션·업적·순위표로만 지급. 로비 골드 사용처는 연구소 확장. 지휘관 최종 100명, 출시 45명(C 5 / UC 10 / R 12 / SR 10 / UR 5 / U 3).
- **진행 상태:** 구현 계획은 `docs/workflow_v1_release.md`. 결정 없이 할 수 있는 작업은 v0.53.8까지 끝났고, 남은 작업은 위 "사용자 확인 필요"의 결정을 기다린다. 첫 질문으로 그 결정들을 사용자에게 확인한다.
- **필요한 환경:** Node.js(시뮬레이터는 내장 `fetch`, `WebSocket`을 쓰므로 22 이상, 작성 환경은 v25), Microsoft Edge(`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`, 다르면 환경 변수 `EDGE_PATH`). 서버는 `node scratch/serve.js`.
- **로컬에만 있는 것:** 시뮬레이터 원시 결과 `scratch/balance_sim/results/`는 `.gitignore` 대상이라 올라가지 않는다. 요약 `scratch/balance_sim/report.md`는 저장소에 있다. 원시 결과가 필요하면 `node scratch/balance_sim/run_balance.mjs`로 다시 만든다(90판 약 21분).
