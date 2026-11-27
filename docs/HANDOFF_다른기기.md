# 다른 기기에서 이어서 작업하기 (v0.55.93, 2026-11-27)

이 문서는 기기를 옮겨 이어 작업할 때 한 번 읽는 임시 안내다. 상시 규칙과 현황은 `CLAUDE.md`, `QA_AND_RULES.md` 인수인계 절, `docs/meetings/asset_flow/REQ06_세실리아_대기형시범.md`에 있다.

**읽은 뒤 할 일: 아래 내용을 확인했으면 이 문서(`docs/HANDOFF_다른기기.md`)를 삭제하고 버전을 올린다. 이 문서 말고 따로 지울 문서는 없다.**

## 1. 받아 오기

```
git pull
node scratch/serve.js        # http://localhost:8085/
```

필요한 것: Node.js 22.15 이상(이 PC는 v25), Microsoft Edge(헤드리스 검증 도구가 씀).

## 2. 이 커밋에 들어간 것 (v0.55.63-v0.55.93)

- **R04 회의(A-33-A-49) 승인 사항 구현:** 수정 납품 갱신 모드(`prepare_fit.mjs --update`), 맞춤 기준 그림(`approve_rest.mjs`), 이음새 검사(`seam_check.mjs`), 확인 장면 모음(`review_sheet.mjs`), 시트 합성(`compose_sheet.mjs`), 배경 판정을 그림 배경색 기준으로 수정(`bgTestFor`), 작업 요청 양식(`REQ_TEMPLATE.md`).
- **NovelAI 생성 도구:** `test/tools/nai_generate.mjs`, 틀 파일 `test/nai/`, 프로젝트 규칙 `.novelai.json`, 예비 MCP `test/tools/nai_mcp.mjs`.
- **세실리아 대기형 시범(A-43):**
  - 2.5등신 c00 확정(REQ06 4.4절, 6.1절).
  - 파츠 시트는 3번 납품되었고 모두 불합격(5.1절, 6.1절, 6.3절).
  - B안 자리 맞춤 시험(6.4절)으로 도구 흐름을 끝까지 돌렸다. 게임에는 연결하지 않았다.
- 납품 원본과 시험 산출물: `test/incoming/char_cecilia/`, `test/build/{fit,rig_v2,verify,review}_cecilia*`, `scratch/`의 Gemini 작업 스크립트·비교 이미지.

## 3. 새 기기에서 따로 준비할 것 (저장소에 없음)

1. **NovelAI 토큰:** `setx NAI_TOKEN "pst-..."` 실행 후 편집기를 다시 켠다. 토큰은 파일에 적지 않는다(저장소가 공개 상태).
2. **NovelAI MCP 독립 서버:** 이 PC의 `C:\Users\NZIN\tools\novelai-mcp\`(server.mjs, README.md)는 저장소 밖에 있다. 새 기기로 폴더를 복사하고 README대로 등록한다.
   - Claude Code: `claude mcp add --scope user novelai -- node <경로>\server.mjs`
   - Antigravity: `~/.gemini/config/mcp_config.json`
   - 폴더를 복사할 수 없으면 저장소의 예비판 `test/tools/nai_mcp.mjs`를 등록한다(CLAUDE.md "NovelAI MCP" 항목).
3. 확인: `node test/tools/nai_generate.mjs --balance`를 실행해 요금제 Opus와 Anlas 잔액이 나오면 된다.

## 4. 남은 결정 (사용자)

- **세실리아 파츠:** REQ06 6.3절 A안으로 다시 받을지 정한다. A안은 가려진 부분을 사각형으로 채우지 않고 그림으로 이어 그리는 방식이다.
  - 인페인팅은 Opus 무료 조건 밖이라 Anlas가 들 수 있다. 쓰기 전에 확인한다.
- **런타임 표정 대체(별도 안건):** 대기형에는 공격 표정이 없다. `rig_runtime.js` `faceVisible`은 없는 표정을 고르면 얼굴을 숨긴다. 지금은 도감에서 대기 모션만 써서 영향이 없다.
- 그 밖의 출시 관련 결정은 `CLAUDE.md` "사용자 확인 필요"를 본다.

## 5. 알아 둘 점

- 숫자 검사(구멍 수치, `verify_rig`, `seam_check`)만으로는 덧붙인 자리의 이음새를 잡지 못한다. 납품 확인은 c00과 재조립본을 확대해 나란히 비교한다(REQ06 6.3절).
- 가려진 파츠는 자동 맞춤이 크기를 잘못 고르기 쉽다. 사람이 조정할 때 배율부터 본다(REQ06 6.4절).
- `test/build/fit/cecilia/fit.json`은 시험용 보정본이다(사람 승인 전, `note` 필드 참고).
