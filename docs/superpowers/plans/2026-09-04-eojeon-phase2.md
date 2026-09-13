# 「어전 御前」 2단계 구현 계획 — 2막 「양요」 · 3막 「친정」

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1막에서 만든 엔진 위에 **2막 「양요」(1866~1871)와 3막 「친정」(1873~1876)을 올려 1~3막을 한 번에 완주**할 수 있게 만든다. 경복궁 맵과 그 화재 변형을 만들고, 사료 카드 15장을 더하고, 설계서의 네 축 — **D1 약탈 · D2 화재에서 3장 · E 장계 지연 · F1 척화비 친필** — 과 **C1 자경전 화재 90초**를 실제로 돌아가게 한다. 이 계획이 끝나면 1차시(45분) 분량이 통째로 손에 들어온다.

**Architecture:** 1단계의 구조를 쓰되, **Task 1에서 `main.js`의 단일 막 클로저를 먼저 뜯는다** — 막·국면·궁의 전이와 자원 수명은 `src/core/flow.js`, 걷기는 `src/systems/movement.js`, 배너와 막 끝 화면은 `src/ui/`로 나간다. 그 위에 나머지 순수 로직을 `src/systems/`에 **새 파일로만** 추가하고 DOM·WebGL을 import하지 않아 Vitest로 검증한다. 막의 흐름은 `src/data/acts.js`의 **선언적 비트 목록**으로 적고, `src/systems/scenario.js`가 그것을 상태 전이로 바꾸며, `src/main.js`는 비트 종류별 핸들러를 `await`으로 이어 붙이는 얇은 진행자가 된다. 렌더는 계속 절차적 지오메트리 + 캔버스 텍스처다.

**Tech Stack:** JavaScript(ES2022) · three.js 0.185.1 · esbuild · Vitest · Node 24

**Spec:** `docs/superpowers/specs/2026-09-03-gojong-metaverse-design.md`
**검증표:** `.superpowers/sdd/history-verification-A.md`(이어 날짜·화재) · `-B.md`(4·5막) · **`-C.md`(2·3막 사료 — 이 계획의 직접 근거)**
**1단계 계획:** `docs/superpowers/plans/2026-09-03-eojeon-phase1.md`
**1단계 판정:** `.superpowers/sdd/2026-09-03-eojeon-phase1/rulings-for-tasks.md` (R2·R3·R4·R5는 이 계획에서도 유효하다)
**1단계 진행 원장:** `.superpowers/sdd/2026-09-03-eojeon-phase1/progress.md` — **R15~R25가 이 계획을 구속한다.** 특히 **R17**(양헌수 장계를 D1에서 뺀다)과 **R23**(그 판정을 계획서가 조용히 뒤집은 것을 되돌린다)는 검증 C로 최종 확정되었다.

## 전체 단계 분할

| 계획 | 범위 | 결과물 |
|---|---|---|
| 1단계 | M1~M5 | 창덕궁 이동 · 사료 해금 · 하루 루프 · 조작권 A~D · 1막 완주 · 촉박 엔진 |
| **2단계 (이 문서)** | **M6~M7** | **2·3막 · 경복궁 · D1 약탈 · D2 화재 3장 · E 지연 · F1 척화비 · C1 자경전 90초** |
| 3단계 | M8~M9 | 4·5막 · C2 임오군란 · 7.6 실패 분기 · G 회수 · F2 친필 · 경우궁 |
| 4단계 | M10~M11 | 엔딩 · 기록 복사 · 검증표 대조 · 모바일 · 배포 |

**태스크 수: 17.** 1단계(16)보다 하나 많다 — **1단계 최종 전체 리뷰가 「2단계 선결」로 건 구조 분리를 Task 1로 맨 앞에 넣었기 때문이다.** 나머지 열여섯은 그대로이며 번호만 한 칸씩 밀렸다. 더 쪼개면 「경복궁 맵만 있고 2막은 못 도는」 반쪽 산출물이 나오므로 쪼개지 않았다.

---

## ⚠ 시작하기 전에 — 1단계가 지금도 굴러가고 있다

**1단계가 아직 굴러가는 중이다.** 이 계획을 쓰는 동안 다른 작업자가 1단계 Task 14~16을 커밋하고 있었다(`7ac2259` → `9364e5d` → `be03b9d`). 그래서 **Task 2는 「없으면 만들고, 있으면 맞춰 놓는」 마감 태스크**다. 시작할 때 반드시 현재 상태를 먼저 확인한다.

```bash
git log --oneline -5
for f in src/data/acts.js src/ui/council-ui.js src/ui/veil-screen.js src/systems/rush-scene.js; do
  [ -f "$f" ] && echo "있음 $f" || echo "없음 $f"
done
grep -n "councilRoom" src/data/palaces.js
grep -n "actual.quote" src/ui/council-ui.js
```

`be03b9d` 시점에 확인한 바로는 네 파일이 **모두 생겼고**, 다만 다음 세 가지가 비어 있다. Task 2는 이것을 채우는 일이 된다.

| 빠진 것 | 왜 필요한가 | 채우는 곳 |
|---|---|---|
| `PALACES.*.councilRoom` | 2막 후반부터 정전이 인정전 → 사정전으로 바뀐다. `main.js`에 방 id를 박아 두면 안 된다 | Task 2 Step 5 |
| `council-ui`의 `actual.quote` 렌더 | 3막 조약 회의의 최익현 인용을 띄울 자리가 없다 | Task 2 Step 2 |
| `acts.js`의 `actById` | 막이 셋으로 늘면 인덱스로 찾는 것이 위험하다 | Task 2 Step 1 |

`main.js`가 이미 1막 완주 흐름이면 Step 6은 **대조만** 하고 넘어가도 된다. Task 4가 어차피 막 러너로 다시 쓴다.

**그리고 `main.js`에는 지금도 손이 올라가 있다.** 1단계 최종 전체 리뷰가 내놓은 수정 묶음(Critical 1 + Important 7)이 **다른 작업자의 손에서** 반영되는 중이다 — 사료 줍기 마커, 고정 타임스텝 누산기, `tests/movement.test.js`·`tests/systems/rush-scene.test.js`. **Task 1이 그 물결 위에서 구조를 뜯는 태스크이며, 그래서 맨 앞에 있다.** Task 1의 Step 1은 「지금의 `main.js`를 읽는 것」이고, 이 계획서에 인용된 판본은 **뼈대일 뿐 정본이 아니다.**

---

## Global Constraints

설계서의 프로젝트 전역 요구사항. **1단계에서 그대로 가져온다. 모든 태스크의 요구사항에 암묵적으로 포함된다.**

- **단일 HTML 파일로 배포한다.** 외부 요청 0건. CDN·폰트·이미지·오디오 파일 참조 금지.
- **파일 크기 8MB 이하**, 첫 화면까지 3초 이내.
- **통합 그래픽 1280×720에서 60fps.** 드로우콜 100 이하. 기둥·기와는 InstancedMesh.
- **촉박 시퀀스 중 프레임 드랍이 난도를 바꾸면 안 된다.** 카운트다운은 반드시 `performance.now()` 기반이며 프레임 수에 의존하지 않는다.
- **계정·로그인·서버·개인정보 수집 없음.** 진행은 localStorage.
- **표시하지 않는 것**: 세력 게이지, 점수, 정답률, 경험치 바, **게임 오버 화면**.
- **실패해도 역사는 바뀌지 않는다.** 실패는 분기가 아니라 *왕이 모르게 되는 것*이다(설계서 7.6).
- **사실성 등급 `교과서 ≥ 사료 ≥ 연출`.** 모든 사료 카드는 `origin`(출처)과 `grade`(`textbook`|`source`|`staged`)를 반드시 가진다. `staged` 등급은 화면에 재구성임을 표시한다.
- **조작권 등급 문자열은 `'A'|'B'|'C'|'D'` 네 개뿐이다.** 다른 값을 쓰지 않는다.
- 한국어 UI. 파일·식별자는 영문 소문자 케밥/카멜.

### 2단계에서 추가로 지키는 것

- **음력은 적고, 양력은 적지 않는다.** `.superpowers/sdd/history-verification-A.md`가 네 건의 **음력 날짜를 실록 기사 ID 단위로 확정**했다(아래 표). 그러나 **일 단위 양력 환산은 전부 「확인불가」**로 남았고, 검증 보고서는 「여러 웹 자료가 음력 월일 숫자를 그대로 양력인 양 적는 오류」를 경고한다. 그러므로 화면에는 **음력 날짜만** 적고, 이어 화면 하단에 `※ 음력 날짜는 『고종실록』에서 확인했습니다. 양력 일 단위 환산은 확정하지 못해 적지 않습니다`를 붙인다. **음력 숫자를 양력인 것처럼 쓰는 것이 이 게임에서 가장 하면 안 되는 일이다.**

| 사건 | 확정된 음력 | 실록 근거 | 게임에서 쓰는 해 |
|---|---|---|---|
| 창덕궁 → 경복궁 이어 | 고종 5년 **7월 2일** | 『고종실록』 5권 (`kza_10507002_001`) | 1868 |
| 자경전 화재 | 고종 10년 **12월 10일** | 『고종실록』 10권 (`kza_11012010_002`) — 원문은 「慈慶殿災」 한 문장뿐 | 1873 |
| 화재 뒤 창덕궁 이어 | 고종 10년 **12월 20일** | 『고종실록』 10권 — **화재로부터 열흘 뒤다** | 1873 |
| 경복궁 환어 | 고종 12년 **5월 27일** | 『고종실록』 12권 (`kza_11205027_002`) | 1875 |
| 경복궁 대화재 | 고종 13년 **11월 4일** | 『고종실록』 13권 (`kza_11311004_001`) — 국역 원문에 「830여 간이 연달아 불길에 휘감겼다」 | 1876 |
| 대화재 뒤 창덕궁 이어 | 고종 **14년 3월 10일** | 『고종실록』 14권 — **불이 난 뒤 넉 달 지나서다. 1876년이 아니라 1877년이다** | **1877** |

- **「830여 칸」의 출처 문제는 해소되었다**(설계서 16장 2번). 후대 추산이 아니라 **실록 국역 원문에 있는 표현**이다. 다만 같은 사건을 **922칸**으로 적은 학술 논문(송승섭 2022)이 있어 수치가 갈린다 — 게임은 실록 원문의 「830여 칸」을 쓰고, 이견이 있다는 사실을 화면에 한 줄로 밝힌다.
- **실록에 없는 것은 재구성이라고 적는다.** 자경전 화재에 대해 실록이 남긴 것은 「慈慶殿災」 네 글자뿐이다. 소실 규모(364칸 반)는 『승정원일기』 계통이고 직접 대조되지 않았으며, **불이 사정전·근정전으로 번지는 경로는 어떤 기록에도 없다.** C1 장면은 `grade: 'staged'`로 두어 화면에 재구성 표시를 띄운다.
- **교과서 번역문을 그대로 베끼지 않는다.** (설계서 16.6 — 저작권 미해소) 사료 카드의 `excerpt`는 **원문의 뜻을 우리말로 새로 옮긴 것**이며, `origin`에 `『고등 한국사1』 p.○○○ 수록 · 우리말 옮김`이라고 밝힌다. 「어느 책 몇 쪽에 실린 자료인가」는 밝히되 그 책의 번역 문장을 옮겨 오지는 않는다.
- **쌀값은 절대 수치로 표시하지 않는다.** (설계서 11장) 「즉위 무렵의 ○.○배」라는 **상대 표기만** 쓴다. 설계서 5장 G의 `쌀 한 섬 ···· ○○냥` 예시는 11장과 충돌하므로 **11장을 따른다.**
- **촉박은 3회뿐이다.** C1(이 계획) · C2 · C3(3단계). **D2 화재 선택에는 카운트다운을 붙이지 않는다.** 네 번째 시계를 만드는 순간 이 장치가 싸진다.

### 사료 검증 C가 정한 것 — 2·3막 사료의 최종 근거

`.superpowers/sdd/history-verification-C.md`. 판정 R22가 「2막 사료는 아무도 검증하지 않았다」고 걸어 둔 선결조건의 답이며, **이 계획의 사료 처리는 전부 여기에 맞춘다.**

| 항목 | 판정 | 이 계획이 하는 일 |
|---|---|---|
| **양헌수 정족산성 장계의 D1 지정** | **사료적으로 성립하지 않음(설계 오류)** | **D1에서 뺀다.** 판정 R17·R23 확정. Task 3·10·12 |
| **1873 자경전 화재의 실록 기사** | 「慈慶殿災」 — **넉 자**(다섯 자가 아니다) | 화면·테스트·완료 기준의 글자 수를 모두 **네 글자**로 적는다. Task 13·16 |
| **척화비 12자** | **비문 전체가 아니라 앞부분 발췌.** 뒤에 `戒我萬年子孫`(경고문 6자) + `丙寅作 辛未立`(연호 4자)이 이어진다 | 화면에 **「비문 일부 발췌」임을 밝히고 뒤따르는 구절을 함께 보여준다.** 등급 **교과서** 유지. Task 3·11·12 |
| 슐리 회고(신미양요 참전 장교) | **원문 대조 성공.** 1904년 원서 95쪽에 실제로 있는 문장 | 계획대로. 등급 표기만 유지 |
| 어재연·수자기, 강화도 조약 제1·7·10관, 조·일 무역 규칙 제6·7칙, 최익현 왜양일체, 운요호 사실관계 | **모두 확인됨** | 고치지 않는다 |
| 「830여 칸」 vs 922칸, 1877년 이어까지 넉 달 | **확인됨** | 고치지 않는다 |
| **벨로네 서한 · 운요호 『승정원일기』 인용문** | 사건·인물·시점은 확인. **번역 충실도만 확인불가** | **내용은 그대로 둔다.** 이미 `origin`에 `우리말 옮김`이라 밝히고 있으므로 별도 경고를 띄우지 않는다. 등급도 내리지 않는다 — 확인불가인 것은 *사실*이 아니라 *옮긴 문장*이다 |

- **화재~이어 사이의 임시 거처에 특정 건물 이름을 넣지 않는다.** 1876년 대화재 뒤 넉 달 동안 임금이 경복궁 안 어디에서 지냈는지는 **확인불가**다(건청궁설은 건립 시기 자체가 논쟁적이다). 어떤 대사에도 건물명을 적지 않는다.

## 잠금 파일

**고치지 않는다:**
- `src/core/state.js` · `control.js` · `countdown.js` — **한 글자도 고치지 않는다.** Task 1이 새로 만드는 `src/core/flow.js`는 잠금 대상이 아니다(잠금은 *이미 테스트로 고정된 파일*을 가리킨다).
- `src/core/clock.js` — **함수는 한 글자도 고치지 않는다.** 다만 **판정 R30**이 `PLACE_COST` **표에 줄을 더하는 것**을 허용했다. 잠금의 뜻은 「그 파일의 테스트를 깨지 마라」이지 「조회표에 절대 줄을 더하지 마라」가 아니다. `tests/core/clock.test.js`의 아홉 개 테스트는 `gyujanggak`·`unhyeon`·`outside` 세 값과 모르는 키의 기본값 1만 단정하므로, **새 키를 더해도 아홉 개가 전부 그대로 통과한다.** 값을 더하는 곳은 **Task 6 Step 5 한 곳뿐**이고, 세 원본 값과 기본값 1은 새 테스트가 다시 못 박는다.
- `src/systems/codex.js` · `src/systems/council.js`
- `build.mjs` · `tests/build.test.js` · `vitest.config.js`

**주의 — `src/systems/`에 새 파일을 만드는 것은 잠금 위반이 아니다.** 잠금 대상은 *이미 테스트로 고정된 기존 두 파일*(`codex.js`, `council.js`)이다. 1단계 계획도 Task 16에서 같은 디렉터리에 `rush-scene.js`를 새로 만들도록 했다. 이 계획은 그 관례를 따라 순수 로직을 `src/systems/`에 **새 파일로만** 추가하고, 기존 두 파일은 **한 글자도 고치지 않는다.**

**`src/data/sources.js`는 덧붙이는 것이지 다시 쓰는 것이 아니다.** 1막의 `wonnapjeon`·`dangbaekjeon` 두 장은 id·본문·등급 그대로 남는다.

---

## File Structure

```
src/
  core/
    flow.js            [신규] 막·국면·궁 전이와 자원 수명 (Task 1) — core/ 잠금의 유일한 예외
    clock.js           [수정] PLACE_COST 표에 2·3막 장소 12줄 추가 (Task 6) — 함수는 무수정, 판정 R30
  data/
    sources.js         [수정] 2·3막 카드 15장 추가 (1막 2장은 그대로)
    palaces.js         [수정] 경복궁 + 화재 변형 + councilRoom + pickups
    acts.js            [신규→수정] 1막(Task 2) → 비트 스키마(Task 4) → 2막(12) → 3막(15·16)
  systems/
    movement.js        [신규] step() — main.js 에서 떼어냄 (Task 1) (순수·TDD)
    rush-scene.js      [신규] 1단계 Task 16 잔여분
    scenario.js        [신규] 비트 진행 · 조작권/궁 전이       (순수·TDD)
    prices.js          [신규] G 물가 지수와 상대 표기           (순수·TDD)
    relocate.js        [신규] 이어 기록                        (순수·TDD)
    dispatch.js        [신규] E 장계 지연                       (순수·TDD)
    loss-log.js        [신규] 소실 사유 기록                    (순수·TDD)
    brush-trace.js     [신규] F 친필 획 판정                    (순수·TDD)
    fire-rush.js       [신규] C1 불길 진격 → 불 위치            (순수·TDD)
  render/
    palace.js          [수정] 탄 전각 재질 · burnt 인자
    scene.js           [수정] 씬에 불을 붙이고 ctx.fire 로 내보낸다
    fire.js            [신규] 불·연기 파티클 (Points 1개 = 드로우콜 1)
  ui/
    hud.js             [수정] 쌀값 상대 표기
    dialog.js          [수정] 소실 사유 표시(약탈됨·프랑스 / 불탐)
    council-ui.js      [신규] 1단계 Task 14 잔여분
    veil-screen.js     [신규] 1단계 Task 15 잔여분
    move-screen.js     [신규] 이어 전환 화면
    dispatch-map.js    [신규] 장계 지도 「○일 전 장계 기준」
    loss-screen.js     [신규] D1 약탈 알림
    brush.js           [신규] F1 척화비 12자 쓰기
    salvage.js         [신규] D2 3장 고르기
    orders-ui.js       [신규] 신헌에게 보낼 훈령
    banner.js          [신규] 화면 배너 — main.js 에서 떼어냄 (Task 1)
    act-end.js         [신규(Task 1)→수정(Task 17)] 막 끝 화면 · 무엇을 잃었는가
    pause.js           [신규] Esc 일시정지 · 저장
  main.js              [수정] 비트 구동 막 러너
tests/
  core/flow.test.js      [신규]
  core/place-cost.test.js [신규] 장소별 칸 값 · 하루가 정말로 모자란가 (판정 R30)
  data/integrity.test.js [신규] ACTS × PALACES × SOURCES id 정합성
  systems/movement.test.js [신규] step() — 병행 물결의 tests/movement.test.js 를 이어받는다
  data/sources.test.js   [신규]
  data/palaces.test.js   [신규]
  data/acts.test.js      [신규]
  systems/scenario.test.js  [신규]
  systems/prices.test.js    [신규]
  systems/relocate.test.js  [신규]
  systems/dispatch.test.js  [신규]
  systems/loss-log.test.js  [신규]
  systems/brush-trace.test.js [신규]
  systems/fire-rush.test.js   [신규]
```

---

### Task 1: 막·궁 전이 구조 분리 — `flow` · `movement` · `ui`, 그리고 정합성 테스트

**1단계 최종 전체 리뷰의 「2단계 선결」 항목이다.** 지금의 `src/main.js`는 **단일 막 클로저**다. `act`·`phase`·`visited`·`session`·`hint`·`banner`와 막 끝 화면 마크업이 전부 `boot()` 안의 지역 변수이고, **막을 넘기거나 궁을 바꾸는 길이 아예 없다.** `createMinimap(root, def)`은 생성 시점에 궁을 붙박고 교체 함수가 없으며, `input`·`hud`·`minimap`에 있는 `dispose()`는 **한 번도 불리지 않는다.** 이 상태로 2막을 얹으면 전환마다 `keydown` 리스너·DOM 노드·`<style>` 태그가 그대로 쌓인다. 3막이 궁을 세 번 더 바꾸므로 **여기서 먼저 뜯는다.**

또 하나. 카드가 22장, 막이 4개 더 들어오는데 **`acts.js`의 `requires[]`와 `palaces.js`의 `pickups[].cardId`가 `sources.js`의 실재 id인지 확인하는 것이 아무 데도 없다.** 오타 하나가 「영원히 잠긴 선택지」로 조용히 굳는다. 그 자물쇠도 여기서 채운다.

> **⚠ `main.js`에 병행 수정 물결이 내려앉고 있다.** 1단계 최종 리뷰의 Critical 1 + Important 7 묶음이 지금 **다른 작업자의 손에서** `main.js`에 반영되는 중이다 — **사료 줍기 지점 3D 마커·미니맵 점**, **고정 타임스텝 누산기**(dt 클램프 대체), 그리고 새 테스트 `tests/movement.test.js`·`tests/systems/rush-scene.test.js`. **그러므로 이 태스크의 첫 걸음은 반드시 「지금의 `main.js`를 읽는 것」이다.** 이 계획서에 인용된 판본을 그대로 믿고 덮어쓰면 그 수정이 통째로 사라진다. 아래 Step 9의 전체 파일은 **뼈대**이며, 읽어서 확인한 마커·누산기·기타 수정은 **그대로 옮겨 담는다.**

**Files:**
- Create: `src/core/flow.js` — **잠금 예외.** `src/core/*`는 잠겨 있으나 이 파일은 이 태스크가 새로 만드는 것이므로 위반이 아니다. 기존 네 파일(`state`·`control`·`clock`·`countdown`)은 **한 글자도 고치지 않는다.**
- Create: `tests/core/flow.test.js`
- Create: `src/systems/movement.js`
- Create: `tests/systems/movement.test.js` (병행 물결이 `tests/movement.test.js`를 만들어 두었다면 **옮겨 담는다**)
- Create: `src/ui/banner.js`
- Create: `src/ui/act-end.js`
- Create: `tests/data/integrity.test.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `src/core/control.js` → `canMove(control)`, `isRoomOpen(control, room)`; `src/data/palaces.js` → `PALACES`, `roomAt(def,x,z)`, `pickupNear(def,x,z,radius=5)`; `src/data/acts.js` → `ACTS`; `src/core/clock.js` → `spend`, `isDusk`, `DAY_UNITS`; `src/data/sources.js` → `SOURCES`, `sourceById` (**읽기만 한다 — 이 태스크는 이 가운데 어느 것도 고치지 않는다**)
- Produces:
  - `src/systems/movement.js`
    - `WALK: number` · `RUN: number`
    - `step(ctx, input, state, dtMs): GameState` — `main.js`에서 그대로 옮긴 것. **동작을 바꾸지 않는다.**
  - `src/core/flow.js`
    - `PHASES: string[]` — `['boot','day','council','beat','rush','done']`
    - `actAt(acts, i: number): ActDef | null`
    - `nextActIndex(acts, i: number): number | null`
    - `isLastAct(acts, i: number): boolean`
    - `palaceChanged(prev: string|null, next: string): boolean`
    - `createFlow({ acts, state?, palaces?, resources? }): Flow` — `state`는 선택. **자기 상태를 따로 들고 있는 호출자는 넘기지 않는다**(Task 4의 막 러너는 `live.state` 한 벌만 쓴다)
      - `resources = { setPalace?(def): void, perPalace?: { [name]: (def) => ({ dispose?(): void }) }, lifetime?: Array<{ dispose?(): void }> }`
      - `Flow = { state, taken: Set<string>, actIndex: number, act(): ActDef|null, isLast(): boolean, phase: string, setPhase(p): string, nextAct(): boolean, syncPalace(palaceId): boolean, palace(): string|null, get(name): any, disposeBound(): void, dispose(): void }`
  - `src/ui/banner.js` → `banner(root, text, holdMs?): { dispose(): void }`
  - `src/ui/act-end.js` → `createActEnd(root): { show(view): Promise<void> }`
    - `view = { title, lines?: string[], read?: string, lost?: string, next?: string, last?: boolean }`
  - `src/main.js` → `boot(root): { flow, dispose(): void }`

- [ ] **Step 1: 지금의 `main.js`부터 읽는다**

```bash
git log --oneline -8
git status --short
wc -l src/main.js
grep -n "acc +=\|FIXED\|Math.min(50" src/main.js
grep -n "marker\|pickup" src/main.js src/render/scene.js src/ui/minimap.js
ls tests/movement.test.js tests/systems/rush-scene.test.js 2>/dev/null
```

읽고 나서 **아래 세 가지를 손으로 적어 둔다.** Step 9에서 그대로 옮겨 담아야 한다.

| 확인할 것 | 있으면 |
|---|---|
| 고정 타임스텝 누산기 | Step 9의 `frame()`이 이미 그 모양이다. 상수 이름만 맞춘다 |
| 사료 줍기 마커(3D·미니맵) | 마커를 만들고 갱신하는 줄을 **통째로 살려서** Step 9의 `boot()`에 넣는다 |
| `tests/movement.test.js` | Step 3에서 `tests/systems/movement.test.js`로 옮기고 import 경로만 바꾼다 |
| `src/data/sources.js`의 카드에 `rendering` 필드 | 병행 물결이 사료 등급을 쪼개면서 `rendering: '원문' \| '우리말 옮김'`을 카드에 붙였을 수 있다. **있으면 그대로 보존한다** — Task 1은 `sources.js`를 읽기만 하고, Task 3은 **덧붙이는** 태스크이므로 기존 카드의 새 필드를 지우면 안 된다 (판정 R32) |

- [ ] **Step 2: `step()`을 `main.js`에서 떼어낸다**

`src/systems/movement.js`:

```js
import { PALACES, roomAt } from '../data/palaces.js'
import { canMove, isRoomOpen } from '../core/control.js'

export const WALK = 9    // m/s
export const RUN = 15

export function step(ctx, input, state, dtMs) {
  if (!canMove(state.control)) return state
  const a = input.axis()
  if (a.x === 0 && a.z === 0) return state

  const speed = (input.running() ? RUN : WALK) * (dtMs / 1000)
  const p = ctx.player.position
  const def = PALACES[state.palace]
  const half = { w: def.ground.w / 2 - 2, d: def.ground.d / 2 - 2 }
  const cx = Math.max(-half.w, Math.min(half.w, p.x + a.x * speed))
  const cz = Math.max(-half.d, Math.min(half.d, p.z + a.z * speed))

  const here = roomAt(def, p.x, p.z)
  const room = roomAt(def, cx, cz)
  // 잠긴 방은 '들어가는 것'만 막는다. 이미 안에 있다면 움직여 나갈 수 있어야 한다
  if (room && !isRoomOpen(state.control, room) && room.id !== here?.id) return state

  p.x = cx
  p.z = cz
  return state.room === (room?.id ?? null) ? state : { ...state, room: room?.id ?? null }
}
```

**본문을 한 줄도 바꾸지 않았다.** 갇힘 수정(`room.id !== here?.id`)과 `'D'` 게이트가 그대로 살아 있는지 눈으로 확인한다 — 1단계 최종 리뷰가 이 두 가지를 보증으로 못 박았다.

- [ ] **Step 3: `step()` 테스트를 옮겨 담는다**

`tests/systems/movement.test.js`. **병행 물결이 만든 `tests/movement.test.js`가 있으면 그 내용을 이 파일로 옮기고 원본을 지운다.** import 경로만 바뀐다(`../src/main.js` → `../../src/systems/movement.js`). 없으면 아래를 그대로 쓴다. `main.js`가 아니라 `movement.js`에서 가져온다 — `main.js`는 `three`와 WebGL을 끌어오므로 테스트가 그것에 매달릴 이유가 없다.

```js
import { describe, it, expect } from 'vitest'
import { step, WALK, RUN } from '../../src/systems/movement.js'
import { createState } from '../../src/core/state.js'

function ctxAt(x, z) {
  return { player: { position: { x, z } } }
}
function inputOf(x, z, running = false) {
  return { axis: () => ({ x, z }), running: () => running }
}
const base = { ...createState(), palace: 'changdeok', control: 'A' }

describe('걷기', () => {
  it("조작권 'D' 면 한 걸음도 못 간다", () => {
    const ctx = ctxAt(0, 46)
    const s = step(ctx, inputOf(0, -1), { ...base, control: 'D' }, 100)
    expect(ctx.player.position.z).toBe(46)
    expect(s.control).toBe('D')
  })

  it('입력이 없으면 상태가 그대로다', () => {
    const s0 = { ...base }
    expect(step(ctxAt(0, 46), inputOf(0, 0), s0, 100)).toBe(s0)
  })

  it('달리면 걷는 것보다 멀리 간다', () => {
    const a = ctxAt(0, 0)
    const b = ctxAt(0, 0)
    step(a, inputOf(0, -1), base, 100)
    step(b, inputOf(0, -1, true), base, 100)
    expect(Math.abs(b.player.position.z)).toBeGreaterThan(Math.abs(a.player.position.z))
    expect(RUN).toBeGreaterThan(WALK)
  })

  it('궁 밖으로 나가지 않는다', () => {
    const ctx = ctxAt(0, 60)
    for (let i = 0; i < 50; i++) step(ctx, inputOf(0, 1), base, 100)
    expect(ctx.player.position.z).toBeLessThanOrEqual(140 / 2 - 2)
  })

  it('잠긴 방에는 들어가지 못한다', () => {
    // 연경당은 minControl 'A' — 조작권 'C' 로는 못 들어간다
    const ctx = ctxAt(-34, -30)
    const s = { ...base, control: 'C' }
    for (let i = 0; i < 40; i++) step(ctx, inputOf(0, -1), s, 100)
    expect(ctx.player.position.z).toBeGreaterThan(-44 + 16 / 2)
  })

  it('이미 잠긴 방 안에 있으면 나올 수 있다 — 갇히지 않는다', () => {
    const ctx = ctxAt(-34, -44)                 // 연경당 한가운데
    const s = { ...base, control: 'C', room: 'yeongyeongdang' }
    const before = ctx.player.position.z
    step(ctx, inputOf(0, 1), s, 100)
    expect(ctx.player.position.z).toBeGreaterThan(before)
  })

  it('방을 옮기면 state.room 이 바뀌고, 그대로면 같은 객체를 돌려준다', () => {
    const ctx = ctxAt(0, 18)
    const s1 = step(ctx, inputOf(0, -1), { ...base, room: null }, 16)
    expect(s1.room).toBe('injeongjeon')
    const s2 = step(ctx, inputOf(0, -1), s1, 16)
    expect(s2).toBe(s1)
  })
})
```

Run: `npx vitest run tests/systems/movement.test.js`
Expected: PASS 7/7. **여기서 실패하면 옮기다가 동작을 바꾼 것이다. 되돌린다.**

- [ ] **Step 4: `src/core/flow.js` 작성 — 막·국면·궁의 전이와 자원의 수명**

**경계를 먼저 정한다.** Task 4가 만드는 `src/systems/scenario.js`는 **비트 단위** 전이(`beatAt`·`applyBeat`·`advance`)를 맡는다. `flow.js`는 그보다 한 단 위 — **어느 막인가, 어느 국면인가, 어느 궁에 자원이 매여 있는가**만 맡는다. 둘은 겹치지 않는다.

`src/core/flow.js`:

```js
import { PALACES } from '../data/palaces.js'

export const PHASES = ['boot', 'day', 'council', 'beat', 'rush', 'done']

export function actAt(acts, i) {
  return acts[i] ?? null
}

export function nextActIndex(acts, i) {
  return i + 1 < acts.length ? i + 1 : null
}

export function isLastAct(acts, i) {
  return nextActIndex(acts, i) === null
}

// 화재 변형(gyeongbok_burnt 등)도 서로 다른 궁으로 본다 — 미니맵과 씬을 다시 세워야 하기 때문이다
export function palaceChanged(prev, next) {
  return prev !== next
}

/**
 * 막·국면·궁의 전이를 담고, 궁에 매인 자원의 수명을 책임진다.
 * DOM 을 직접 만들지 않는다 — 만드는 일은 resources 로 주입받는다. 그래서 테스트가 된다.
 */
// state 는 「이 흐름이 들고 다니는 상태」를 담아 두는 자리일 뿐이다. 자기 상태를 따로
// 들고 있는 호출자(Task 4의 막 러너의 live)는 넘기지 않는다 — 두 벌이 되면 반드시 어긋난다.
export function createFlow({ acts, state = null, palaces = PALACES, resources = {} }) {
  let actIndex = 0
  let phase = 'boot'
  let boundPalace = null
  const bound = new Map()

  const flow = {
    state,
    taken: new Set(),

    get actIndex() { return actIndex },
    act() { return actAt(acts, actIndex) },
    isLast() { return isLastAct(acts, actIndex) },

    get phase() { return phase },
    setPhase(p) {
      if (!PHASES.includes(p)) throw new Error(`모르는 국면: ${p}`)
      phase = p
      return phase
    },

    nextAct() {
      const n = nextActIndex(acts, actIndex)
      if (n === null) return false
      actIndex = n
      return true
    },

    // 궁이 바뀔 때마다 궁에 매인 것을 부수고 다시 세운다.
    // 이것을 안 하면 막·궁 전환마다 리스너·DOM·<style> 이 쌓인다.
    syncPalace(palaceId) {
      if (!palaceChanged(boundPalace, palaceId)) return false
      const def = palaces[palaceId]
      if (!def) throw new Error(`모르는 궁: ${palaceId}`)
      flow.disposeBound()
      boundPalace = palaceId
      resources.setPalace?.(def)
      for (const [name, make] of Object.entries(resources.perPalace ?? {})) {
        bound.set(name, make(def))
      }
      return true
    },

    palace() { return boundPalace },
    get(name) { return bound.get(name) ?? null },

    disposeBound() {
      for (const r of bound.values()) r?.dispose?.()
      bound.clear()
    },

    dispose() {
      flow.disposeBound()
      boundPalace = null
      for (const r of resources.lifetime ?? []) r?.dispose?.()
      phase = 'done'
    },
  }

  return flow
}
```

- [ ] **Step 5: `tests/core/flow.test.js`**

```js
import { describe, it, expect } from 'vitest'
import {
  PHASES, actAt, nextActIndex, isLastAct, palaceChanged, createFlow,
} from '../../src/core/flow.js'

const acts = [
  { id: 'a1', title: '첫 막', palace: 'p1', control: 'C' },
  { id: 'a2', title: '둘째 막', palace: 'p2', control: 'B' },
]
const palaces = {
  p1: { id: 'p1', name: '첫 궁' },
  p2: { id: 'p2', name: '둘째 궁' },
}

function rig() {
  const log = []
  const flow = createFlow({
    acts,
    state: { palace: 'p1', control: 'C' },
    palaces,
    resources: {
      setPalace: (def) => log.push(`setPalace:${def.id}`),
      perPalace: {
        map: (def) => ({ id: def.id, dispose: () => log.push(`dispose:map:${def.id}`) }),
      },
      lifetime: [
        { dispose: () => log.push('dispose:input') },
        { dispose: () => log.push('dispose:keydown') },
      ],
    },
  })
  return { flow, log }
}

describe('막 넘기기', () => {
  it('막이 셋이 되어도 인덱스로 더듬지 않는다', () => {
    expect(actAt(acts, 0).id).toBe('a1')
    expect(actAt(acts, 9)).toBeNull()
    expect(nextActIndex(acts, 0)).toBe(1)
    expect(nextActIndex(acts, 1)).toBeNull()
    expect(isLastAct(acts, 1)).toBe(true)
  })

  it('마지막 막에서 nextAct 는 false 를 돌려주고 자리를 지킨다', () => {
    const { flow } = rig()
    expect(flow.nextAct()).toBe(true)
    expect(flow.act().id).toBe('a2')
    expect(flow.nextAct()).toBe(false)
    expect(flow.actIndex).toBe(1)
    expect(flow.isLast()).toBe(true)
  })
})

describe('국면', () => {
  it('모르는 국면은 조용히 넘어가지 않고 던진다', () => {
    const { flow } = rig()
    expect(flow.phase).toBe('boot')
    expect(flow.setPhase('day')).toBe('day')
    expect(() => flow.setPhase('낮')).toThrow()
    expect(PHASES).toContain('rush')
  })
})

describe('궁 전환 — 여기서 새면 막마다 샌다', () => {
  it('같은 궁을 두 번 부르면 아무것도 다시 만들지 않는다', () => {
    const { flow, log } = rig()
    expect(flow.syncPalace('p1')).toBe(true)
    expect(flow.syncPalace('p1')).toBe(false)
    expect(log).toEqual(['setPalace:p1'])
    expect(flow.get('map').id).toBe('p1')
  })

  it('궁이 바뀌면 먼저 부수고 그다음에 세운다', () => {
    const { flow, log } = rig()
    flow.syncPalace('p1')
    log.length = 0
    expect(flow.syncPalace('p2')).toBe(true)
    expect(log).toEqual(['dispose:map:p1', 'setPalace:p2'])
    expect(flow.get('map').id).toBe('p2')
    expect(flow.palace()).toBe('p2')
  })

  it('모르는 궁은 던지고, 매여 있던 것을 부수지 않는다', () => {
    const { flow, log } = rig()
    flow.syncPalace('p1')
    log.length = 0
    expect(() => flow.syncPalace('없는궁')).toThrow()
    expect(log).toEqual([])
    expect(flow.get('map').id).toBe('p1')
  })

  it('palaceChanged 는 화재 변형도 다른 궁으로 본다', () => {
    expect(palaceChanged('gyeongbok', 'gyeongbok_burnt')).toBe(true)
    expect(palaceChanged('gyeongbok', 'gyeongbok')).toBe(false)
  })
})

describe('dispose — 한 번도 안 불리던 것을 부른다', () => {
  it('궁 자원과 수명 자원을 모두 부순다', () => {
    const { flow, log } = rig()
    flow.syncPalace('p1')
    log.length = 0
    flow.dispose()
    expect(log).toEqual(['dispose:map:p1', 'dispose:input', 'dispose:keydown'])
    expect(flow.get('map')).toBeNull()
    expect(flow.phase).toBe('done')
  })

  it('dispose 를 두 번 불러도 궁 자원을 두 번 부수지 않는다', () => {
    const { flow, log } = rig()
    flow.syncPalace('p1')
    flow.dispose()
    log.length = 0
    flow.dispose()
    expect(log.filter(l => l.startsWith('dispose:map'))).toEqual([])
  })
})
```

Run: `npx vitest run tests/core/flow.test.js`
Expected: PASS 9/9

- [ ] **Step 6: `src/ui/banner.js` — 배너를 떼어낸다**

```js
const STYLE =
  'position:fixed;left:50%;top:38%;transform:translate(-50%,-50%);z-index:60;' +
  'padding:14px 26px;background:#0f1113ee;border:1px solid #3a4248;border-radius:3px;' +
  'color:#e8e2d4;font-size:20px;letter-spacing:3px;pointer-events:none;transition:opacity .6s'

// <style> 태그를 만들지 않는다. 배너는 막마다 떴다 사라지므로
// head 에 스타일을 쌓아 두면 그것이 그대로 누수가 된다.
export function banner(root, text, holdMs = 1400) {
  const el = document.createElement('div')
  el.style.cssText = STYLE
  el.textContent = text
  root.appendChild(el)
  const fade = setTimeout(() => { el.style.opacity = '0' }, holdMs)
  const gone = setTimeout(() => el.remove(), holdMs + 700)
  return {
    dispose() { clearTimeout(fade); clearTimeout(gone); el.remove() },
  }
}
```

**호출 모양은 그대로다** — `banner(root, '늦었다')`. 뒤 태스크가 쓰는 자리를 한 곳도 고칠 필요가 없다. 판정 R4(모달이 아니라 배너)가 그대로 유지된다.

- [ ] **Step 7: `src/ui/act-end.js` — 막 끝 화면을 떼어낸다**

지금은 `boot()` 안에 `end.innerHTML = …`로 박혀 있어 2막·3막이 쓸 수 없다. **Task 17이 이 파일에 「무엇을 잃었는가」를 덧붙인다.**

```js
const CSS = `
.actend{position:fixed;inset:0;background:#0f1113;z-index:52;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:16px;padding:28px;text-align:center}
.actend h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:4px;font-weight:400}
.actend p{margin:0;font-size:20px;color:#e8e2d4;line-height:1.8;max-width:620px}
.actend .read{font-size:12px;color:#8f8a7c;letter-spacing:2px}
.actend .lost{font-size:13px;color:#d2503a;line-height:1.8;max-width:560px}
.actend button{margin-top:8px;padding:12px 28px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:15px;cursor:pointer}
`

let styled = false
function ensureStyle() {
  if (styled) return
  const style = document.createElement('style')
  style.textContent = CSS          // Task 17 이 여기에 FINAL_CSS 를 이어 붙인다
  document.head.appendChild(style)
  styled = true
}

export function createActEnd(root) {
  ensureStyle()

  return {
    show(view) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'actend'
        el.innerHTML = `
          <h2>${view.title}</h2>
          ${(view.lines ?? []).map(l => `<p>${l}</p>`).join('')}
          ${view.read ? `<div class="read">${view.read}</div>` : ''}
          ${view.lost ? `<div class="lost">${view.lost}</div>` : ''}
          ${view.last ? '' : `<button>${view.next ?? '다음'}</button>`}`
        root.appendChild(el)
        // 마지막 화면은 남긴다. 게임 오버 화면이 아니라 막의 끝이다 — 전역 제약
        if (view.last) return
        el.querySelector('button').addEventListener('click', () => { el.remove(); resolve() })
      })
    },
  }
}
```

- [ ] **Step 8: 데이터 정합성 테스트 — 오타 하나가 「영원히 잠긴 선택지」로 굳는 것을 막는다**

`tests/data/integrity.test.js`. **이것은 실패-우선 테스트가 아니라 특성화 테스트다**(1단계 판정 R6과 같은 취급). 지금은 카드 2장·막 1개라 조용히 통과하고, **카드 22장·막 4개가 더 들어오는 순간부터 일한다.**

`act.council`(Task 4 이전)과 `beats[].council`(Task 4 이후)을 **둘 다** 읽는다. 그래야 이 파일이 Task 4를 건너뛰고도 살아 있다.

```js
import { describe, it, expect } from 'vitest'
import { ACTS } from '../../src/data/acts.js'
import { PALACES } from '../../src/data/palaces.js'
import { SOURCES } from '../../src/data/sources.js'

const CARD_IDS = new Set(SOURCES.map(c => c.id))

function beatsOf(act) {
  return act.beats ?? []
}
function councilsOf(act) {
  const fromBeats = beatsOf(act)
    .filter(b => b.kind === 'council' || b.kind === 'orders')
    .map(b => b.council ?? (b.clauses ? { choices: b.clauses } : null))
    .filter(Boolean)
  return act.council ? [act.council, ...fromBeats] : fromBeats
}
function allPickups() {
  return Object.entries(PALACES).flatMap(([pid, def]) =>
    (def.pickups ?? []).map(p => ({ ...p, palace: pid })))
}

describe('사료 id 정합성 — 카드 22장·막 4개가 더 들어와도 조용히 어긋나지 않는다', () => {
  it('어전회의가 요구하는 사료가 모두 실재한다', () => {
    for (const act of ACTS) {
      for (const c of councilsOf(act)) {
        for (const ch of c.choices ?? []) {
          for (const id of ch.requires ?? []) {
            expect(CARD_IDS, `${act.id}/${ch.id}/${id}`).toContain(id)
          }
        }
      }
    }
  })

  it('궁에 놓인 사료 지점이 모두 실재하는 카드를 가리킨다', () => {
    for (const p of allPickups()) {
      expect(CARD_IDS, `${p.palace}/${p.cardId}`).toContain(p.cardId)
    }
  })

  it('사료 지점의 placeId 가 그 궁에 실재하는 방이다', () => {
    for (const [pid, def] of Object.entries(PALACES)) {
      const rooms = new Set(def.rooms.map(r => r.id))
      for (const p of def.pickups ?? []) {
        expect(rooms, `${pid}/${p.cardId}/${p.placeId}`).toContain(p.placeId)
      }
    }
  })

  // 궁끼리 비교하지 않는다 — 화재 변형(gyeongbok_burnt 등)은 같은 궁의 다른 상태이고
  // 같은 사료 지점을 물려받는다(Task 6의 burntVariant). 한 궁 안에서만 겹치지 않으면 된다.
  it('한 궁 안에서 같은 카드가 두 지점에 놓여 있지 않다', () => {
    for (const [pid, def] of Object.entries(PALACES)) {
      const ids = (def.pickups ?? []).map(p => p.cardId)
      expect(new Set(ids).size, `${pid}: ${ids.join(',')}`).toBe(ids.length)
    }
  })

  it('비트가 지목하는 카드가 모두 실재한다 — cardIds · grantCard', () => {
    for (const act of ACTS) {
      for (const b of beatsOf(act)) {
        for (const id of b.cardIds ?? []) expect(CARD_IDS, `${act.id}/${b.id}/${id}`).toContain(id)
        if (b.grantCard) expect(CARD_IDS, `${act.id}/${b.id}`).toContain(b.grantCard)
      }
    }
  })

  it('어전회의에는 언제나 아무것도 안 읽고도 고를 수 있는 선택지가 있다', () => {
    for (const act of ACTS) {
      for (const c of councilsOf(act)) {
        expect((c.choices ?? []).some(ch => (ch.requires ?? []).length === 0), act.id).toBe(true)
      }
    }
  })

  it('모든 사료 카드는 어디선가 손에 들어온다 — 줍거나, 직접 쓰거나', () => {
    const reachable = new Set(allPickups().map(p => p.cardId))
    for (const act of ACTS) {
      for (const b of beatsOf(act)) if (b.grantCard) reachable.add(b.grantCard)
    }
    for (const c of SOURCES) {
      expect(reachable, `${c.id} 를 손에 넣을 길이 없다`).toContain(c.id)
    }
  })

  it('모든 카드가 출처와 등급을 가진다', () => {
    for (const c of SOURCES) {
      expect(c.origin, c.id).toBeTruthy()
      expect(['textbook', 'source', 'staged'], c.id).toContain(c.grade)
    }
  })

  it('막이 가리키는 시작 궁이 실재한다', () => {
    for (const act of ACTS) expect(Object.keys(PALACES), act.id).toContain(act.palace)
  })
})
```

Run: `npx vitest run tests/data/integrity.test.js`
Expected: PASS 9/9.

> **한 가지 미리 말해 둔다.** 「모든 사료 카드는 어디선가 손에 들어온다」는 Task 3에서 카드 15장을 넣는 순간 **한 번 빨갛게 된다** — 카드가 먼저 들어오고 사료 지점은 Task 6에서 붙기 때문이다. 그때 이 테스트가 우는 것이 정상이며, Task 6이 끝나면 다시 녹색이 된다. **Task 3~6은 한 묶음으로 본다.**

- [ ] **Step 9: `main.js`를 새 모듈 위에 다시 얹는다**

**Step 1에서 읽은 것을 여기에 옮겨 담는다.** 마커를 만드는 줄이 있었으면 `boot()` 안에, 미니맵 점을 찍는 줄이 있었으면 `map.update(…)` 호출에 넣는다. 아래는 그 밖의 뼈대다.

`src/main.js` 전체:

```js
import { createScene } from './render/scene.js'
import { createInput } from './input/input.js'
import { PALACES, pickupNear } from './data/palaces.js'
import { createState } from './core/state.js'
import { spend, isDusk, DAY_UNITS } from './core/clock.js'
import { pickUp, markRead } from './systems/codex.js'
import { sourceById } from './data/sources.js'
import { ACTS } from './data/acts.js'
import { createFlow } from './core/flow.js'
import { step } from './systems/movement.js'
import { createHUD } from './ui/hud.js'
import { createMinimap } from './ui/minimap.js'
import { createDialog } from './ui/dialog.js'
import { createCouncil } from './ui/council-ui.js'
import { createSullyeom } from './ui/veil-screen.js'
import { createActEnd } from './ui/act-end.js'
import { banner } from './ui/banner.js'
import { startRush } from './systems/rush-scene.js'

// 프레임이 늦어도 왕만 느려지지 않게 한다 — 벽시계로 진행하는 추격과 어긋나면
// 촉박이 피하려던 바로 그 불공정이 된다 (1단계 최종 리뷰 Important)
const FIXED_DT = 1000 / 60
const MAX_CATCHUP = 250

export function boot(root) {
  const canvas = document.createElement('canvas')
  root.appendChild(canvas)

  const ctx = createScene(canvas)
  const input = createInput(canvas)
  const hud = createHUD(root)
  const dialog = createDialog(root)
  const council = createCouncil(root)
  const sullyeom = createSullyeom(root)
  const actEnd = createActEnd(root)

  const hint = document.createElement('div')
  hint.style.cssText = 'position:fixed;left:0;right:0;bottom:26px;text-align:center;' +
    'font-size:13px;color:#e0a23a;letter-spacing:2px;pointer-events:none;z-index:20'
  root.appendChild(hint)

  const onKey = (e) => handleKey(e)
  addEventListener('keydown', onKey)

  const act0 = ACTS[0]
  const flow = createFlow({
    acts: ACTS,
    state: { ...createState(), palace: act0.palace, control: act0.control },
    resources: {
      setPalace: (def) => ctx.setPalace(def),
      perPalace: {
        map: (def) => createMinimap(root, def),
      },
      lifetime: [
        input, hud, dialog,
        { dispose: () => removeEventListener('keydown', onKey) },
        { dispose: () => { hint.remove(); canvas.remove() } },
      ],
    },
  })

  flow.syncPalace(flow.state.palace)
  flow.setPhase('day')
  sullyeom.show()

  let session = null
  let running = true

  function handleKey(e) {
    if (flow.phase !== 'day') return
    if (e.code === 'KeyQ') {
      if (dialog.isOpen()) dialog.close(); else dialog.showCodex(flow.state)
      return
    }
    if (e.code !== 'KeyE') return
    if (dialog.isOpen()) { dialog.close(); return }

    if (flow.state.room === 'injeongjeon') { openCouncil(); return }

    const def = PALACES[flow.state.palace]
    const near = pickupNear(def, ctx.player.position.x, ctx.player.position.z)
    if (!near || flow.taken.has(near.cardId)) return
    const r = spend(flow.state, near.placeId)
    if (!r.ok) { banner(root, '해가 모자란다'); return }
    flow.taken.add(near.cardId)
    flow.state = markRead(pickUp(r.state, near.cardId), near.cardId)
    dialog.showCard(sourceById(near.cardId))
  }

  function openCouncil() {
    flow.setPhase('council')
    dialog.close()
    sullyeom.hide()
    hint.textContent = ''
    council.open(flow.state, flow.act(), async (choiceId, reason) => {
      flow.state = {
        ...flow.state,
        decisions: [...flow.state.decisions, { actIndex: flow.actIndex, choiceId, reason }],
      }
      const ended = flow.act()
      const last = flow.isLast()
      await actEnd.show({
        title: `${flow.actIndex + 1} 막 「${ended.title}」 끝`,
        lines: ['담 너머에서 경복궁 중건이 시작된다.'],
        read: `읽은 문서 ${flow.state.sources.read.length}장 · 남긴 말 ${reason ? '있음' : '없음'}`,
        last,
      })
      if (last) { flow.setPhase('done'); return }
      startAct()
    })
  }

  // 다음 막으로 넘어가는 유일한 길. Task 4 가 여기를 비트 러너로 갈아 끼운다
  function startAct() {
    if (!flow.nextAct()) { flow.setPhase('done'); return }
    const act = flow.act()
    flow.state = { ...flow.state, palace: act.palace, control: act.control, dayLeft: DAY_UNITS, room: null }
    flow.syncPalace(act.palace)
    const spawn = PALACES[act.palace].spawn
    ctx.player.position.set(spawn.x, ctx.player.position.y, spawn.z)
    flow.setPhase('day')
  }

  let last = performance.now()
  let acc = 0
  function frame(now) {
    if (!running) return
    acc = Math.min(MAX_CATCHUP, acc + (now - last))
    last = now

    while (acc >= FIXED_DT) {
      if (flow.phase === 'day') flow.state = step(ctx, input, flow.state, FIXED_DT)
      acc -= FIXED_DT
    }

    if (flow.phase === 'day') {
      hint.textContent = flow.state.room === 'injeongjeon' ? 'E — 어전회의를 연다' : ''
      if (session) {
        const r = session.tick(now, flow.state.room)
        if (r !== 'running') { banner(root, r === 'arrived' ? '닿았다' : '늦었다'); session = null }
      }
      if (isDusk(flow.state)) openCouncil()
    }

    ctx.render()
    hud.update({
      palaceName: PALACES[flow.state.palace].name,
      dateLabel: flow.act().dateLabel,
      dayLeft: flow.state.dayLeft,
      riceIndex: flow.state.riceIndex,
    })
    flow.get('map')?.update({
      playerX: ctx.player.position.x,
      playerZ: ctx.player.position.z,
      control: flow.state.control,
      rush: session?.rush ?? null,
      now,
    })
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  globalThis.__rushTest = () => {
    flow.state = { ...flow.state, control: 'A' }
    session = startRush({
      track: ['donhwamun', 'injeongjeon', 'huijeongdang', 'daejojeon'],
      totalMs: 30000, goalRoom: 'daejojeon', now: performance.now(),
    })
  }

  return {
    flow,
    dispose() { running = false; session = null; flow.dispose() },
  }
}

if (typeof document !== 'undefined') {
  const el = document.getElementById('root')
  if (el) globalThis.__game = boot(el)
}
```

> **`globalThis.__rushTest` 와 `__game` 은 임시 통로다. Task 17에서 둘 다 지운다.**

- [ ] **Step 10: 손으로 검증한다 — 새는 곳이 없는지 본다**

Run: `npm test && npm run build`, 브라우저에서 `dist/어전.html`.

1. 1막이 **전과 똑같이** 돈다 — 발이 드리워지고, 규장각·선정전에서 `E`로 카드를 줍고, 인정전에서 `E`로 회의가 열리고, 고르면 `1 막 「즉위」 끝`
2. 콘솔에 `__rushTest()` → 30초 뒤 **배너**로 `늦었다`. `alert` 창이 뜨면 실패다
3. 콘솔에 아래를 넣어 **누수를 눈으로 센다**

```js
const before = { style: document.head.querySelectorAll('style').length,
                 div: document.querySelectorAll('div').length }
__game.flow.syncPalace('changdeok')     // 같은 궁 — 아무 일도 없어야 한다
__game.flow.dispose()
const after = { style: document.head.querySelectorAll('style').length,
                div: document.querySelectorAll('div').length }
console.table({ before, after })
```

4. `dispose()` 뒤에 **미니맵·HUD·힌트가 화면에서 사라지고**, `div` 수가 줄어들며, 키보드를 눌러도 아무 반응이 없다
5. `dispose()`를 한 번 더 불러도 오류가 나지 않는다

4번이 이 태스크의 합격 기준이다. **지금까지 `dispose()`는 한 번도 불린 적이 없다.**

- [ ] **Step 11: 커밋**

```bash
git add src/core/flow.js src/systems/movement.js src/ui/banner.js src/ui/act-end.js src/main.js
git add tests/core/flow.test.js tests/systems/movement.test.js tests/data/integrity.test.js
git rm -f tests/movement.test.js 2>/dev/null || true
git commit -m "refactor: 막·궁 전이를 flow 로, 걷기를 movement 로 — dispose 를 처음으로 부른다"
```

---


### Task 2: 1단계 잔여분 마감 — 어전회의를 열고 1막을 끝낸다

**⚠ 이 태스크는 원래 1단계(Task 14·15·16)의 일이다.** 코드에 없으면 여기서 마감한다. **네 파일이 이미 존재한다면 인터페이스만 대조하고 Step 5·6으로 건너뛴다.** Task 1이 이미 `main.js`를 새 구조 위에 얹어 놓았으므로 **이 태스크는 `main.js`를 다시 쓰지 않는다.**

1단계 판정 문서의 **R2**(줍기 시간은 `near.placeId`로), **R3**(정전에서 `E`로 어전회의 소집 + 해가 지면 강제 개회), **R4**(`alert` 대신 배너)를 처음부터 반영해서 쓴다.

**Files:**
- Create: `src/data/acts.js`
- Create: `src/ui/council-ui.js`
- Create: `src/ui/veil-screen.js`
- Create: `src/systems/rush-scene.js`
- Modify: `src/data/palaces.js` (`councilRoom` 추가)
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `src/systems/council.js` → `evaluateChoices(state, council)`; `src/core/clock.js` → `spend`, `isDusk`; `src/core/countdown.js` → `createRush`, `reachedAt`, `isOverAt`
- Produces:
  - `ACTS: Array<ActDef>` — 이번 태스크에서는 1막 하나. `ActDef = { id, title, year, dateLabel, palace, control, council, actual, overturn? }`
  - `actById(id: string): ActDef | undefined`
  - `createCouncil(root): { open(state, act, onDecide): void }` — `onDecide(choiceId: string, reason: string)`
  - `createSullyeom(root): { show(): void, hide(): void }`
  - `startRush({ track: string[], totalMs: number, goalRoom: string, now: number }): RushSession`
    - `RushSession = { rush, goalRoom, tick(now: number, playerRoom: string|null): 'running'|'caught'|'arrived' }`
  - `PALACES.changdeok.councilRoom === 'injeongjeon'`
  - `src/main.js` → `boot(root): { flow, dispose(): void }` — **Task 1이 만든 서명 그대로다.** `step`은 `src/systems/movement.js`, `banner`는 `src/ui/banner.js`에 있고 이 태스크는 둘을 옮기지도 다시 정의하지도 않는다

- [ ] **Step 1: 1막 데이터 작성**

`src/data/acts.js`:

```js
export const ACTS = [
  {
    id: 'enthronement',
    title: '즉위',
    year: 1863,
    dateLabel: '고종 즉위년 · 1863',
    palace: 'changdeok',
    control: 'C',
    council: {
      question: '경복궁을 다시 짓는 비용을 어디서 걷는가',
      choices: [
        { id: 'levy',  text: '고을마다 원납전을 걷는다', requires: [] },
        { id: 'coin',  text: '당백전을 발행한다',        requires: ['dangbaekjeon'] },
        { id: 'defer', text: '중건을 미룬다',            requires: ['dangbaekjeon', 'wonnapjeon'] },
      ],
    },
    overturn: '전하께서는 아직 어리십니다. 이 일은 이 아비가 맡겠습니다.',
    actual: {
      line: '흥선 대원군은 경복궁 중건을 밀어붙였고, 원납전을 걷고 당백전을 발행하였다. 당백전은 물가를 크게 흔들었다.',
      origin: '『고종실록』 · 『고등 한국사1』 pp.104~107',
    },
  },
]

export function actById(id) {
  return ACTS.find(a => a.id === id)
}
```

- [ ] **Step 2: 어전회의 UI 작성**

`src/ui/council-ui.js`:

```js
import { evaluateChoices } from '../systems/council.js'

const CSS = `
.council{position:fixed;inset:0;background:#0f1113;z-index:50;display:flex;
  flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;overflow:auto}
.council h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:3px;font-weight:400}
.council .q{margin:0;font-size:24px;color:#e8e2d4;text-align:center;max-width:640px;line-height:1.5}
.council .read{font-size:12px;color:#8f8a7c}
.council .list{display:flex;flex-direction:column;gap:10px;width:100%;max-width:560px}
.council button.opt{padding:14px 16px;text-align:left;background:#23282c;color:#e8e2d4;
  border:1px solid #3a4248;border-radius:3px;font-size:15px;cursor:pointer}
.council button.opt:hover{background:#2f363c;border-color:#5a646c}
.council .locked{padding:14px 16px;border:1px dashed #3a4248;border-radius:3px;color:#5f6971;font-size:15px}
.council .locked small{display:block;margin-top:6px;color:#8f8a7c;font-size:12px}
.council .actual{max-width:600px;background:#e8e2d4;color:#23201a;border-radius:4px;
  padding:20px 22px;line-height:1.75}
.council .actual .you{color:#6b6558;font-size:13px;margin-bottom:10px}
.council .actual .origin{font-size:12px;color:#6b6558;margin-top:8px}
.council .actual blockquote{margin:14px 0 0;border-left:3px solid #8a6a44;padding-left:12px;font-size:14px}
.council textarea{width:100%;max-width:560px;min-height:74px;background:#1a1d21;color:#e8e2d4;
  border:1px solid #3a4248;border-radius:3px;padding:10px;font:14px/1.6 inherit;resize:none}
.council .go{padding:12px 28px;background:#3a2d20;border:1px solid #6a5230;color:#e0a23a;
  border-radius:3px;font-size:15px;cursor:pointer}
`

let styled = false
function ensureStyle() {
  if (styled) return
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  styled = true
}

export function createCouncil(root) {
  ensureStyle()

  return {
    open(state, act, onDecide) {
      const panel = document.createElement('div')
      panel.className = 'council'
      root.appendChild(panel)

      const evaluated = evaluateChoices(state, act.council)
      const openCount = evaluated.filter(c => c.unlocked).length

      const listHtml = evaluated.map(c => c.unlocked
        ? `<button class="opt" data-id="${c.id}">${c.text}</button>`
        : `<div class="locked">???${c.missing.map(m => `<small>← 『${m}』을 읽지 않았습니다</small>`).join('')}</div>`
      ).join('')

      panel.innerHTML = `
        <h2>어 전 회 의</h2>
        <p class="q">${act.council.question}</p>
        <div class="read">고를 수 있는 것 ${openCount} / ${evaluated.length}</div>
        <div class="list">${listHtml}</div>`

      panel.querySelectorAll('button.opt').forEach(btn => {
        btn.addEventListener('click', () => showAftermath(btn.dataset.id))
      })

      function showAftermath(choiceId) {
        const chosen = evaluated.find(c => c.id === choiceId)
        const overturn = act.overturn ? `<blockquote>${act.overturn}</blockquote>` : ''
        const quote = act.actual.quote
          ? `<blockquote>${act.actual.quote}<div class="origin">─ ${act.actual.quoteOrigin ?? ''}</div></blockquote>`
          : ''
        panel.innerHTML = `
          <div class="actual">
            <div class="you">당신은 ─ ${chosen.text}</div>
            <div>실제로는 ─ ${act.actual.line}</div>
            <div class="origin">${act.actual.origin}</div>
            ${quote}
            ${overturn}
          </div>
          <p class="q" style="font-size:17px">왜 그렇게 정하셨습니까</p>
          <textarea placeholder="사관이 받아 적는다"></textarea>
          <button class="go">밤이 깊었다</button>`
        const area = panel.querySelector('textarea')
        panel.querySelector('.go').addEventListener('click', () => {
          const reason = area.value.trim()
          panel.remove()
          onDecide(choiceId, reason)
        })
      }
    },
  }
}
```

- [ ] **Step 3: 발(簾) 연출 작성**

`src/ui/veil-screen.js`:

```js
const CSS = `
.sullyeom{position:fixed;left:0;right:0;top:0;height:42%;z-index:30;pointer-events:none;
  background:
    repeating-linear-gradient(to bottom, #1a140bcc 0 2px, #0000 2px 7px),
    linear-gradient(#0f1113ee, #0f111366);
  border-bottom:2px solid #3a2d20}
.sullyeom span{position:absolute;left:0;right:0;bottom:8px;text-align:center;
  font-size:11px;color:#8f8a7c;letter-spacing:4px}
`

let styled = false

export function createSullyeom(root) {
  if (!styled) {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    styled = true
  }
  let el = null
  return {
    show() {
      if (el) return
      el = document.createElement('div')
      el.className = 'sullyeom'
      el.innerHTML = '<span>수 렴 청 정</span>'
      root.appendChild(el)
    },
    hide() { el?.remove(); el = null },
  }
}
```

- [ ] **Step 4: 촉박 세션 작성**

`src/systems/rush-scene.js`:

```js
import { createRush, reachedAt, isOverAt } from '../core/countdown.js'

export function startRush({ track, totalMs, goalRoom, now }) {
  const rush = createRush({ track, totalMs, startedAt: now })
  let settled = null

  return {
    rush,
    goalRoom,
    tick(t, playerRoom) {
      if (settled) return settled
      if (playerRoom === goalRoom) { settled = 'arrived'; return settled }
      if (reachedAt(rush, goalRoom, t) || isOverAt(rush, t)) { settled = 'caught'; return settled }
      return 'running'
    },
  }
}
```

- [ ] **Step 5: `palaces.js`에 정전(어전회의 장소)을 데이터로 넣는다**

`src/data/palaces.js`의 `changdeok` 정의에 한 줄 추가한다. 정전 id를 `main.js`에 상수로 박아 두지 않는다 — 2막 후반부터 궁이 경복궁으로 바뀌기 때문이다.

```js
    name: '창덕궁',
    councilRoom: 'injeongjeon',
    ground: { w: 120, d: 140 },
```

- [ ] **Step 6: `main.js`가 정전을 데이터에서 읽게 한다**

**Task 1이 이미 `main.js`를 `flow`·`movement`·`banner`·`act-end` 위에 다시 얹어 놓았다.** 그러므로 여기서 `main.js` 전체를 다시 쓰지 않는다. **`step`과 `banner`를 이 파일에 다시 정의하지 않는다** — 각각 `src/systems/movement.js`·`src/ui/banner.js`에 있다.

고칠 곳은 **두 군데뿐이다.** 정전 id `'injeongjeon'`이 박혀 있는 자리를 `def.councilRoom`으로 바꾼다. 2막 후반부터 정전이 사정전으로 바뀌기 때문이다.

`handleKey()` — `def` 선언을 정전 판정보다 **위로** 올린다:

```js
  function handleKey(e) {
    if (flow.phase !== 'day') return
    if (e.code === 'KeyQ') {
      if (dialog.isOpen()) dialog.close(); else dialog.showCodex(flow.state)
      return
    }
    if (e.code !== 'KeyE') return
    if (dialog.isOpen()) { dialog.close(); return }

    const def = PALACES[flow.state.palace]
    if (flow.state.room === def.councilRoom) { openCouncil(); return }

    const near = pickupNear(def, ctx.player.position.x, ctx.player.position.z)
    if (!near || flow.taken.has(near.cardId)) return
    const r = spend(flow.state, near.placeId)
    if (!r.ok) { banner(root, '해가 모자란다'); return }
    flow.taken.add(near.cardId)
    flow.state = markRead(pickUp(r.state, near.cardId), near.cardId)
    dialog.showCard(sourceById(near.cardId))
  }
```

`frame()`의 힌트 한 줄:

```js
    if (flow.phase === 'day') {
      const def = PALACES[flow.state.palace]
      hint.textContent = flow.state.room === def.councilRoom ? 'E — 어전회의를 연다' : ''
      if (session) {
        const r = session.tick(now, flow.state.room)
        if (r !== 'running') { banner(root, r === 'arrived' ? '닿았다' : '늦었다'); session = null }
      }
      if (isDusk(flow.state)) openCouncil()
    }
```

이 두 곳 말고는 `main.js`를 건드리지 않는다. **판정 R2·R3·R4는 Task 1의 파일에 이미 들어 있다** — 줍기 시간은 `near.placeId`로 치르고(R2), 정전에서 `E`로 회의를 열며 해가 지면 강제로 열리고(R3), 촉박 결과는 `alert`이 아니라 배너다(R4).

- [ ] **Step 7: 손으로 검증한다 — 1막을 세 번 돈다**

Run: `npm run build`, 브라우저에서 `dist/어전.html` 열기.

**1회차 — 다 읽고 간다**
1. 화면 위에 발이 드리워져 있고 `수 렴 청 정`이 보인다
2. 규장각(왼쪽)에서 `E` → 「원납전(願納錢)」 카드. 해가 1칸 준다
3. 선정전(오른쪽)에서 `E` → 「당백전(當百錢)」. 해가 또 1칸 준다
4. 인정전으로 걸어가면 하단에 `E — 어전회의를 연다`가 뜬다. `E`
5. **세 선택지가 다 열려 있다.** 발이 걷힌다
6. 고르면 「실제로는」 + 대원군의 말 → 이유 입력 → `1 막 「즉 위」 끝`

**2회차 — 아무것도 안 읽고 간다** (새로고침)
1. 바로 인정전으로 가서 `E`
2. **첫 선택지만 열려 있고 나머지 둘은 `???`** 이며 `← 『당백전(當百錢)』을 읽지 않았습니다`가 보인다
3. 잠긴 항목은 눌리지 않는다

**3회차 — 촉박 배너 (판정 R4 확인)**
1. 새로고침 후 콘솔에 `__rushTest()`
2. 미니맵 네 방이 순서대로 붉게 차고 초가 준다
3. 가만히 두면 30초 뒤 **배너로** `늦었다`가 떴다 사라지고 **게임은 계속된다.** `alert` 창이 뜨면 실패다

- [ ] **Step 8: 전체 테스트와 커밋**

Run: `npm test && npm run build`
Expected: 전부 PASS, `dist/어전.html` 8MB 이하.

```bash
git add src/data/acts.js src/ui/council-ui.js src/ui/veil-screen.js src/systems/rush-scene.js src/data/palaces.js src/main.js dist/어전.html
git commit -m "feat: 1막 「즉위」 완주 — 정전에서 소집하는 어전회의, 수렴청정의 발, 촉박 배너"
```

---

### Task 3: 사료 카드 15장 추가 — 2·3막

설계서 9장의 #3~#16(14장)에 **#2 「경복궁 중건 공사 기록」**을 더해 15장을 넣는다. #2는 설계서 표에서 1막으로 잡혀 있지만 1막 카드는 이미 두 장으로 확정되어 커밋됐고, 중건이 **끝나는** 것은 1868년(2막)이므로 **2막 카드로 옮긴다.** 그래야 학생이 완성된 경복궁 앞에서 그 값을 읽는다.

**`src/data/sources.js`는 덧붙인다. 1막 두 장(`wonnapjeon`·`dangbaekjeon`)의 id·본문·등급은 손대지 않는다.**

> **먼저 파일을 열어 본다.** 병행 수정 물결이 사료 등급을 쪼개면서 카드에 **`rendering: '원문' | '우리말 옮김'`** 필드를 붙였을 수 있다(판정 R32). 있으면 **기존 두 장의 그 필드를 지우지 말고**, 새로 넣는 열다섯 장에도 같은 규칙으로 붙인다 — 이 계획의 `excerpt`는 전부 우리말로 새로 옮긴 것이므로 `rendering: '우리말 옮김'`이다. 한자 원문을 그대로 싣는 척화비 12자만 예외적으로 두 가지가 섞이므로, 그 카드는 `origin`에 이미 밝힌 대로 둔다.

**교과서 번역문을 옮겨 쓰지 않는다.** `excerpt`는 원문의 뜻을 우리말로 새로 옮긴 것이며, `origin`에 `『고등 한국사1』 p.○○○ 수록 · 우리말 옮김`이라고 밝힌다(설계서 16.6 미해소 항목 대응).

**Files:**
- Modify: `src/data/sources.js`
- Create: `tests/data/sources.test.js`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `SOURCES`에 `plunderable?: boolean` 필드가 추가된다 — **D1(외규장각 약탈) 대상**을 표시한다. **붙는 카드는 `oegyujanggak` 한 장뿐이다**(판정 R17 · 사료 검증 C 5항). 기존 `losable`은 **설계서 9장의 D2 표시를 그대로 옮긴 자료(資料)용 표식**이며, 실제 D2 소실은 `survive()`가 결정한다(Task 14 참조).
  - `plunderTargets(): SourceCard[]` — `plunderable === true`인 카드
  - 기존 `sourceById`·`sourcesOfAct`는 그대로

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/data/sources.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { SOURCES, sourceById, sourcesOfAct, plunderTargets } from '../../src/data/sources.js'

describe('사료 카드 전체', () => {
  it('1막의 두 장이 그대로 남아 있다', () => {
    expect(sourceById('wonnapjeon')?.act).toBe(1)
    expect(sourceById('dangbaekjeon')?.act).toBe(1)
    expect(sourcesOfAct(1)).toHaveLength(2)
  })

  it('모든 카드가 id·제목·출처·등급·발췌·의미를 가진다', () => {
    for (const c of SOURCES) {
      expect(c.id, 'id 없음').toBeTruthy()
      expect(c.title, `${c.id} 제목 없음`).toBeTruthy()
      expect(c.origin, `${c.id} 출처 없음`).toBeTruthy()
      expect(c.excerpt, `${c.id} 발췌 없음`).toBeTruthy()
      expect(c.meaning, `${c.id} 의미 없음`).toBeTruthy()
      expect(['textbook', 'source', 'staged'], `${c.id} 등급 이상`).toContain(c.grade)
    }
  })

  it('id 가 겹치지 않는다', () => {
    const ids = SOURCES.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('2막 7장 · 3막 8장이 들어 있다', () => {
    expect(sourcesOfAct(2)).toHaveLength(7)
    expect(sourcesOfAct(3)).toHaveLength(8)
    expect(SOURCES).toHaveLength(17)
  })

  it('교과서 등급 카드는 출처에 쪽수를 밝힌다', () => {
    for (const c of SOURCES.filter(c => c.grade === 'textbook')) {
      expect(c.origin, `${c.id}`).toMatch(/p{1,2}\.\d/)
    }
  })

  it('교과서 번역을 그대로 옮기지 않았음을 출처에 밝힌다', () => {
    for (const c of SOURCES.filter(c => c.origin.includes('한국사1'))) {
      expect(c.origin, `${c.id}`).toContain('우리말 옮김')
    }
  })

  it('D1 약탈 대상은 「외규장각 도서 목록」 한 장이다 — 판정 R17·검증 C', () => {
    expect(plunderTargets().map(c => c.id)).toEqual(['oegyujanggak'])
  })

  it('양헌수 장계는 약탈 대상이 아니다 — 장계는 강화도 서고에 있던 물건이 아니다', () => {
    expect(sourceById('yangheonsu').plunderable).toBeUndefined()
  })

  it('약탈 대상은 모두 2막 카드다', () => {
    for (const c of plunderTargets()) expect(c.act).toBe(2)
  })

  it('강화도 조약 세 조문이 모두 3막에 있다', () => {
    for (const id of ['ganghwa1', 'ganghwa7', 'ganghwa10']) {
      expect(sourceById(id)?.act, id).toBe(3)
    }
  })

  it('척화비 비문에 열두 글자가 들어 있다', () => {
    expect(sourceById('cheokhwabi').excerpt).toContain('洋夷侵犯 非戰則和 主和賣國')
  })

  it('척화비 카드가 「발췌」임을 밝히고 뒤따르는 구절을 함께 싣는다 — 검증 C', () => {
    const c = sourceById('cheokhwabi')
    expect(c.origin).toContain('발췌')
    expect(c.excerpt).toContain('戒我萬年子孫')
    expect(c.excerpt).toContain('丙寅作 辛未立')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/data/sources.test.js`
Expected: FAIL — `plunderTargets` 없음, 카드 수 2장.

- [ ] **Step 3: 카드 15장을 배열 끝에 덧붙인다**

`src/data/sources.js`의 `SOURCES` 배열에서 `dangbaekjeon` **다음에** 아래를 이어 붙인다. 배열 위쪽 두 항목은 건드리지 않는다.

```js
  // ── 2막 「양요」 · 1866~1871 ────────────────────────────────
  {
    id: 'bellonet',
    act: 2,
    title: '벨로네 대리공사의 서한',
    origin: '『고등 한국사1』 p.108 수록 · 우리말 옮김',
    grade: 'textbook',
    excerpt: '조선 국왕이 우리 선교사를 죽인 바로 그날이,\n조선 왕국 최후의 날이 될 것이다.',
    meaning: '프랑스는 선교사 처형을 구실로 삼아 처음부터 무력을 예고했다.',
    losable: false,
  },
  {
    id: 'sherman',
    act: 2,
    title: '제너럴 셔먼호 사건 보고',
    origin: '『고등 한국사1』 p.109 수록 · 우리말 옮김',
    grade: 'textbook',
    excerpt: '평양에 이양선 한 척이 대동강을 거슬러 올라와,\n물러가라는 말을 듣지 않고 사람을 붙잡아 갔으므로\n평안 감사가 군민과 함께 그 배를 불살랐다.',
    meaning: '1866년 평양에서 있었던 일이 다섯 해 뒤 신미양요의 구실이 된다. 그리고 이 소식은 강화도 소식보다 더 늦게 한양에 닿았다.',
    losable: false,
  },
  // ⚠ yangheonsu 에 plunderable 을 붙이지 말 것 — 판정 R17, 사료 검증 C 5항.
  // 장계(狀啓)는 지방에서 승정원을 거쳐 임금에게 '올라가는' 보고 문서다. 강화도 외규장각은
  // 어보·교명·어책·어필·의궤·지도 같은 '완성된 왕실 격식 기록물'을 보관하던 서고이므로,
  // 장계 원본이 그 서고에 안치되어 있다가 프랑스군에게 약탈당했다고 볼 근거가 없다.
  // D1 대상은 oegyujanggak 한 장뿐이다. 이 주석을 지우기 전에 R17을 먼저 읽을 것.
  {
    id: 'yangheonsu',
    act: 2,
    title: '양헌수의 정족산성 장계',
    origin: '『고종실록』 고종 3년(1866) · 우리말 옮김',
    grade: 'source',
    excerpt: '정족산성에 들어가 지키다가 저들이 오르기를 기다려 쳤더니,\n저들이 죽은 자를 끌고 물러갔습니다.',
    meaning: '강화도에서 무슨 일이 있었는지 왕이 알 수 있는 통로는 장계뿐이었다. 그리고 장계는 언제나 며칠 늦게 왔다.',
    losable: false,
  },
  {
    id: 'oegyujanggak',
    act: 2,
    title: '외규장각 도서 목록',
    origin: '『고종실록』 고종 3년(1866) · 우리말 옮김',
    grade: 'source',
    excerpt: '강화 외규장각에 봉안한 어람용 의궤와 어책·어필의 목록이다.',
    meaning: '임금만 보던 책들이 강화도에 있었다. 그리고 그해 겨울, 배에 실려 나갔다. 의궤 186종을 포함해 297책과 은괴 열아홉 상자였다.',
    losable: false,
    plunderable: true,          // D1 대상은 이 한 장뿐이다 (R17)
  },
  {
    id: 'junggeon',
    act: 2,
    title: '경복궁 중건 공사 기록',
    origin: '『고종실록』 고종 2~5년(1865~1868) · 우리말 옮김',
    grade: 'source',
    excerpt: '재목과 석재를 모으고 장정을 부역에 내어\n여러 해에 걸쳐 마침내 역사를 마쳤다.',
    meaning: '임진왜란 뒤 270여 년 비어 있던 터에 다시 궁을 세웠다. 그 값은 원납전과 당백전으로 치렀다.',
    losable: true,
  },
  {
    id: 'sinmi-officer',
    act: 2,
    title: '신미양요에 참전한 미군 장교의 회고',
    origin: '『고등 한국사1』 p.109 수록 · 우리말 옮김',
    grade: 'textbook',
    excerpt: '나는 이토록 처절하게 싸우다 죽는 국민을\n다시는 보지 못할 것이다.',
    meaning: '광성보에서 어재연과 군사들이 어떻게 싸웠는지를, 이긴 쪽이 적어 남겼다.',
    losable: false,
  },
  {
    id: 'cheokhwabi',
    act: 2,
    title: '척화비 비문 (앞부분)',
    origin: '『고등 한국사1』 p.108 수록 · 우리말 옮김 · 비문 일부 발췌',
    grade: 'textbook',
    excerpt: '洋夷侵犯 非戰則和 主和賣國\n\n서양 오랑캐가 침범하는데 싸우지 않으면 곧 화친하는 것이요,\n화친을 주장하는 것은 나라를 파는 것이다.\n\n― 여기까지가 발췌다. 비석은 이렇게 이어진다.\n戒我萬年子孫 — 우리 자손 만대에 경계하노라.\n丙寅作 辛未立 — 병인년(1866)에 짓고 신미년(1871)에 세운다.',
    meaning: '이 열두 글자를 전국 200여 곳에 세웠다. 이제 조정 안에서 다른 말을 꺼내기 어려워졌다. 다만 이 열두 자는 비문의 앞부분이며, 뒤에 여섯 자와 연호가 더 있다.',
    losable: false,
  },

  // ── 3막 「친정」 · 1873~1876 ────────────────────────────────
  {
    id: 'seogye',
    act: 3,
    title: '일본이 보내온 서계 (1868)',
    origin: '『고등 한국사1』 p.110 수록 · 우리말 옮김',
    grade: 'textbook',
    excerpt: '일본이 왕정을 회복하였음을 알리는 문서를 보내왔는데,\n그 글에 「황(皇)」과 「칙(勅)」의 글자가 있었다.',
    meaning: '조선은 그 두 글자를 받을 수 없었다. 문서 한 장의 표현이 국교를 여러 해 동안 막았다.',
    losable: true,
  },
  {
    id: 'choe-ikhyeon',
    act: 3,
    title: '최익현 「왜양일체론」',
    origin: '『고등 한국사1』 p.110 수록 · 우리말 옮김',
    grade: 'textbook',
    excerpt: '저들이 왜인이라고는 하나 실은 서양 오랑캐입니다.\n화친이 이루어지면 사학(邪學)의 책이 전해질 것입니다.',
    meaning: '일본과 서양을 하나로 본다. 그래서 개항은 곧 서양을 들이는 일이 된다.',
    losable: true,
  },
  {
    id: 'unyo',
    act: 3,
    title: '운요호 사건 『승정원일기』',
    origin: '『고등 한국사1』 p.110 수록 · 우리말 옮김',
    grade: 'textbook',
    excerpt: '이양선이 초지진에 다가와 포를 쏘았고 진에서도 마주 쏘았다.\n저들은 영종진에 올라 사람을 죽이고 물건을 빼앗아 갔다.',
    meaning: '누가 먼저 쏘았는지는 기록마다 다르다. 일본은 이 일을 들어 조약을 요구했다.',
    losable: false,
  },
  {
    id: 'gaehang-chanseong',
    act: 3,
    title: '개항에 찬성하는 말 『승정원일기』',
    origin: '『고등 한국사1』 p.110 수록 · 우리말 옮김',
    grade: 'textbook',
    excerpt: '저들이 바라는 것은 통상일 뿐이니,\n먼저 싸움을 열 까닭이 없습니다.',
    meaning: '조정 안에도 문을 열자는 말이 있었다. 어전회의는 한 목소리가 아니었다.',
    losable: true,
  },
  {
    id: 'ganghwa1',
    act: 3,
    title: '강화도 조약 제1관 — 자주국',
    origin: '조일수호조규 제1관 · 『고등 한국사1』 p.111 수록 · 우리말 옮김',
    grade: 'textbook',
    excerpt: '조선국은 자주의 나라이며 일본국과 평등한 권리를 가진다.',
    meaning: '자주라는 말이 조선을 위한 말이 아니다. 청의 간섭을 끊어 두려는 일본의 포석이다.',
    losable: false,
  },
  {
    id: 'ganghwa7',
    act: 3,
    title: '강화도 조약 제7관 — 해안 측량',
    origin: '조일수호조규 제7관 · 『고등 한국사1』 p.111 수록 · 우리말 옮김',
    grade: 'textbook',
    excerpt: '조선국 연해의 섬과 암초는 매우 위험하므로,\n일본국 항해자가 자유로이 해안을 측량하도록 허가한다.',
    meaning: '바닷길을 재는 것은 뱃길만 재는 일이 아니다. 어디로 들어올 수 있는지를 재는 일이다.',
    losable: true,
  },
  {
    id: 'ganghwa10',
    act: 3,
    title: '강화도 조약 제10관 — 영사 재판권',
    origin: '조일수호조규 제10관 · 『고등 한국사1』 p.111 수록 · 우리말 옮김',
    grade: 'textbook',
    excerpt: '일본국 인민이 조선국이 지정한 항구에 머무는 동안 죄를 지어\n조선국 인민과 관계되는 일이 생기더라도,\n모두 일본국 관원이 심판한다.',
    meaning: '조선 땅에서 조선 사람에게 저지른 일을 조선이 재판하지 못한다. 불평등의 자리가 여기다.',
    losable: true,
  },
  {
    id: 'joil-trade',
    act: 3,
    title: '조·일 무역 규칙 — 무관세와 곡물 유출',
    origin: '조일무역규칙(1876) · 『고등 한국사1』 p.111 수록 · 우리말 옮김',
    grade: 'textbook',
    excerpt: '일본국에 속한 선박은 항세를 내지 않으며,\n수출입하는 물품에도 따로 세를 매기지 않는다.\n조선국의 항구에서 양곡을 실어 내는 것을 허용한다.',
    meaning: '세금을 걷지 못하고 쌀이 빠져나간다. 화면 아래 쌀값 줄이 왜 오르는지가 여기에 있다.',
    losable: true,
  },
```

- [ ] **Step 4: `plunderTargets` 를 파일 끝에 추가**

`src/data/sources.js` 끝에 붙인다. `BY_ID`·`sourceById`·`sourcesOfAct`는 그대로 둔다.

```js
export function plunderTargets() {
  return SOURCES.filter(c => c.plunderable === true)
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run tests/data/sources.test.js`
Expected: PASS 12/12

- [ ] **Step 6: 전체 테스트**

Run: `npm test`
Expected: 전부 PASS. 1단계 `tests/systems/council.test.js`가 여전히 통과해야 한다 — 그 테스트는 `dangbaekjeon`·`wonnapjeon`의 제목을 그대로 쓰기 때문에, 두 장을 건드렸다면 여기서 깨진다.

- [ ] **Step 7: 커밋**

```bash
git add src/data/sources.js tests/data/sources.test.js
git commit -m "feat: 2·3막 사료 카드 15장 — 교과서 12장·실록 3장, 약탈 대상 표시"
```

---

### Task 4: 비트 시나리오 엔진과 막 러너

2막은 비트가 열 개, 3막은 열다섯 개다. 이걸 `main.js`의 `if`문으로 쓰면 3단계에서 손도 못 댄다. **막의 흐름을 `acts.js`에 선언으로 적고, 순수 함수가 상태 전이를 맡고, `main.js`는 비트 종류별 핸들러를 `await`으로 이어 붙이는 얇은 진행자가 된다.**

**Files:**
- Create: `src/systems/scenario.js`
- Create: `tests/systems/scenario.test.js`
- Create: `tests/data/acts.test.js`
- Modify: `src/data/acts.js` (1막을 비트 스키마로 이관)
- Modify: `src/main.js` (막 러너로 재구성)

**Interfaces:**
- Consumes: `src/core/control.js` → `RANK`; `src/core/clock.js` → `DAY_UNITS`; **Task 1이 만든 것** — `src/core/flow.js` → `createFlow`, `src/systems/movement.js` → `step`, `src/ui/banner.js` → `banner`
- Produces:
  - 비트 스키마
    ```
    BeatDef = {
      id: string,
      kind: 'note'|'explore'|'council'|'orders'|'move'|'rush'|'plunder'|'salvage'|'brush'|'dispatch',
      palace?: string,          // 값이 있고 현재와 다르면 궁을 바꾼다
      control?: 'A'|'B'|'C'|'D',
      dateLabel?: string,
      dayUnits?: number,        // explore 진입 시 낮을 이 칸수로 채운다
      flag?: string,            // state.flags[flag] = true
      veil?: boolean,           // 수렴청정 발 표시/해제 (1막 전용)
      ...kind별 추가 필드
    }
    ActDef = { id, title, year, dateLabel, palace, control, beats: BeatDef[] }
    ```
  - `beatsOf(act): BeatDef[]`
  - `beatAt(act, i: number): BeatDef | null`
  - `isActOver(state, act): boolean`
  - `enterAct(state, act, actIndex: number): GameState`
  - `applyBeat(state, beat): GameState` — 원본 불변
  - `advance(state): GameState`
  - `controlTimeline(act): string[]` — 조작권이 **바뀔 때마다** 한 칸
  - `palaceTimeline(act): string[]` — 궁이 **바뀔 때마다** 한 칸
  - `peakControl(act): 'A'|'B'|'C'|'D'` · `endControl(act): 'A'|'B'|'C'|'D'`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/systems/scenario.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { createState } from '../../src/core/state.js'
import {
  beatsOf, beatAt, isActOver, enterAct, applyBeat, advance,
  controlTimeline, palaceTimeline, peakControl, endControl,
} from '../../src/systems/scenario.js'

const act = {
  id: 'fixture', title: '시험막', year: 1873, dateLabel: '시험',
  palace: 'gyeongbok', control: 'B',
  beats: [
    { id: 'b0', kind: 'note' },
    { id: 'b1', kind: 'note', control: 'A', flag: 'daewongun-out' },
    { id: 'b2', kind: 'explore', dayUnits: 4 },
    { id: 'b3', kind: 'move', palace: 'changdeok', control: 'B' },
    { id: 'b4', kind: 'move', palace: 'gyeongbok', control: 'A' },
    { id: 'b5', kind: 'note', palace: 'changdeok', control: 'B' },
  ],
}

describe('비트 시나리오', () => {
  it('비트를 순서대로 읽는다', () => {
    expect(beatsOf(act)).toHaveLength(6)
    expect(beatAt(act, 0).id).toBe('b0')
    expect(beatAt(act, 5).id).toBe('b5')
    expect(beatAt(act, 6)).toBeNull()
  })

  it('비트가 없는 막도 안전하다', () => {
    expect(beatsOf({ id: 'x' })).toEqual([])
  })

  it('막에 들어가면 궁·조작권·비트가 초기화된다', () => {
    const s = enterAct(createState(), act, 2)
    expect(s.actIndex).toBe(2)
    expect(s.beatIndex).toBe(0)
    expect(s.palace).toBe('gyeongbok')
    expect(s.control).toBe('B')
    expect(s.dayLeft).toBe(6)
  })

  it('막에 들어가도 사초함과 결정 기록은 그대로다', () => {
    const before = { ...createState(), sources: { held: ['a'], read: ['a'], lost: [] } }
    const after = enterAct(before, act, 1)
    expect(after.sources).toEqual(before.sources)
  })

  it('비트가 조작권을 올린다', () => {
    const s = applyBeat(enterAct(createState(), act, 0), beatAt(act, 1))
    expect(s.control).toBe('A')
    expect(s.flags['daewongun-out']).toBe(true)
  })

  it('비트가 궁을 바꾼다', () => {
    const s = applyBeat(enterAct(createState(), act, 0), beatAt(act, 3))
    expect(s.palace).toBe('changdeok')
    expect(s.control).toBe('B')
  })

  it('dayUnits 가 있으면 낮을 다시 채운다', () => {
    const s0 = { ...enterAct(createState(), act, 0), dayLeft: 0 }
    expect(applyBeat(s0, beatAt(act, 2)).dayLeft).toBe(4)
  })

  it('원본 상태를 건드리지 않는다', () => {
    const s0 = enterAct(createState(), act, 0)
    applyBeat(s0, beatAt(act, 1))
    expect(s0.control).toBe('B')
    expect(s0.flags).toEqual({})
  })

  it('빈 비트는 상태를 그대로 돌려준다', () => {
    const s0 = enterAct(createState(), act, 0)
    expect(applyBeat(s0, beatAt(act, 0))).toBe(s0)
    expect(applyBeat(s0, null)).toBe(s0)
  })

  it('비트를 넘기면 인덱스가 오른다', () => {
    expect(advance(enterAct(createState(), act, 0)).beatIndex).toBe(1)
  })

  it('마지막 비트를 넘기면 막이 끝난다', () => {
    let s = enterAct(createState(), act, 0)
    for (let i = 0; i < 6; i++) { expect(isActOver(s, act)).toBe(false); s = advance(s) }
    expect(isActOver(s, act)).toBe(true)
  })

  it('조작권 흐름이 바뀔 때마다 기록된다', () => {
    expect(controlTimeline(act)).toEqual(['B', 'A', 'B', 'A', 'B'])
  })

  it('궁 흐름이 바뀔 때마다 기록된다 — 세 번 바뀐다', () => {
    expect(palaceTimeline(act)).toEqual(['gyeongbok', 'changdeok', 'gyeongbok', 'changdeok'])
    expect(palaceTimeline(act)).toHaveLength(4)
  })

  it('막의 정점과 끝을 알 수 있다 — 시작한 자리보다 낮게 끝난다', () => {
    expect(peakControl(act)).toBe('A')
    expect(endControl(act)).toBe('B')
  })
})
```

`tests/data/acts.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { ACTS, actById } from '../../src/data/acts.js'
import { beatsOf, controlTimeline, palaceTimeline } from '../../src/systems/scenario.js'

const KINDS = ['note', 'explore', 'council', 'orders', 'move', 'rush', 'plunder', 'salvage', 'brush', 'dispatch']

describe('막 정의', () => {
  it('모든 막이 id·제목·궁·조작권·비트를 가진다', () => {
    for (const a of ACTS) {
      expect(a.id).toBeTruthy()
      expect(a.title).toBeTruthy()
      expect(a.palace).toBeTruthy()
      expect(['A', 'B', 'C', 'D']).toContain(a.control)
      expect(beatsOf(a).length).toBeGreaterThan(0)
    }
  })

  it('모든 비트의 종류가 정해진 열 가지 안에 있다', () => {
    for (const a of ACTS) for (const b of beatsOf(a)) {
      expect(KINDS, `${a.id}/${b.id}`).toContain(b.kind)
    }
  })

  it('모든 비트의 조작권 값이 A~D 네 개 안에 있다', () => {
    for (const a of ACTS) for (const b of beatsOf(a)) {
      if (b.control) expect(['A', 'B', 'C', 'D'], `${a.id}/${b.id}`).toContain(b.control)
    }
  })

  it('비트 id 가 막 안에서 겹치지 않는다', () => {
    for (const a of ACTS) {
      const ids = beatsOf(a).map(b => b.id)
      expect(new Set(ids).size, a.id).toBe(ids.length)
    }
  })

  it('1막 「즉위」는 창덕궁에서 조작권 C 로 시작하고 끝까지 C 다', () => {
    const a = actById('enthronement')
    expect(a.palace).toBe('changdeok')
    expect(controlTimeline(a)).toEqual(['C'])
    expect(palaceTimeline(a)).toEqual(['changdeok'])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/systems/scenario.test.js tests/data/acts.test.js`
Expected: FAIL — `scenario.js` 없음, 1막에 `beats` 없음.

- [ ] **Step 3: 시나리오 엔진 구현**

`src/systems/scenario.js`:

```js
import { RANK } from '../core/control.js'
import { DAY_UNITS } from '../core/clock.js'

export function beatsOf(act) {
  return act?.beats ?? []
}

export function beatAt(act, i) {
  return beatsOf(act)[i] ?? null
}

export function isActOver(state, act) {
  return state.beatIndex >= beatsOf(act).length
}

export function enterAct(state, act, actIndex) {
  return {
    ...state,
    actIndex,
    beatIndex: 0,
    palace: act.palace,
    control: act.control,
    dayLeft: DAY_UNITS,
  }
}

export function applyBeat(state, beat) {
  if (!beat) return state
  let next = state
  if (beat.palace && beat.palace !== next.palace) next = { ...next, palace: beat.palace }
  if (beat.control && beat.control !== next.control) next = { ...next, control: beat.control }
  if (beat.dayUnits != null && beat.dayUnits !== next.dayLeft) next = { ...next, dayLeft: beat.dayUnits }
  if (beat.flag) next = { ...next, flags: { ...next.flags, [beat.flag]: true } }
  return next
}

export function advance(state) {
  return { ...state, beatIndex: state.beatIndex + 1 }
}

export function controlTimeline(act) {
  let c = act.control
  const out = [c]
  for (const b of beatsOf(act)) {
    if (b.control && b.control !== c) { c = b.control; out.push(c) }
  }
  return out
}

export function palaceTimeline(act) {
  let p = act.palace
  const out = [p]
  for (const b of beatsOf(act)) {
    if (b.palace && b.palace !== p) { p = b.palace; out.push(p) }
  }
  return out
}

export function peakControl(act) {
  return controlTimeline(act).reduce((best, c) => (RANK[c] > RANK[best] ? c : best))
}

export function endControl(act) {
  const t = controlTimeline(act)
  return t[t.length - 1]
}
```

- [ ] **Step 4: 1막을 비트 스키마로 이관**

`src/data/acts.js` 전체를 아래로 바꾼다. **회의 내용·「실제로는」 문구·대원군의 말은 한 글자도 바뀌지 않는다.** 담는 그릇만 바뀐다.

```js
export const ACTS = [
  {
    id: 'enthronement',
    title: '즉위',
    year: 1863,
    dateLabel: '고종 즉위년 · 1863',
    palace: 'changdeok',
    control: 'C',
    beats: [
      {
        id: 'throne',
        kind: 'note',
        veil: true,
        title: '1863, 창덕궁 인정전',
        lines: [
          '열두 살에 왕이 되었다.',
          '어전에는 발이 쳐져 있다. 조대비께서 그 뒤에 앉으신다.',
          '아버지는 발 밖에 서 계신다.',
        ],
        origin: '『고종실록』 · 『고등 한국사1』 pp.104~105',
        grade: 'source',
      },
      {
        id: 'day',
        kind: 'explore',
        dayUnits: 6,
        exit: { room: 'injeongjeon', label: 'E — 어전회의를 연다' },
      },
      {
        id: 'council',
        kind: 'council',
        veil: false,
        council: {
          question: '경복궁을 다시 짓는 비용을 어디서 걷는가',
          choices: [
            { id: 'levy',  text: '고을마다 원납전을 걷는다', requires: [] },
            { id: 'coin',  text: '당백전을 발행한다',        requires: ['dangbaekjeon'] },
            { id: 'defer', text: '중건을 미룬다',            requires: ['dangbaekjeon', 'wonnapjeon'] },
          ],
        },
        overturn: '전하께서는 아직 어리십니다. 이 일은 이 아비가 맡겠습니다.',
        actual: {
          line: '흥선 대원군은 경복궁 중건을 밀어붙였고, 원납전을 걷고 당백전을 발행하였다. 당백전은 물가를 크게 흔들었다.',
          origin: '『고종실록』 · 『고등 한국사1』 pp.104~107',
        },
      },
      {
        id: 'end',
        kind: 'note',
        title: '1 막 「즉 위」 끝',
        lines: ['담 너머에서 경복궁 중건이 시작된다.'],
      },
    ],
  },
]

export function actById(id) {
  return ACTS.find(a => a.id === id)
}
```

- [ ] **Step 5: `main.js`를 막 러너로 재구성**

`src/main.js` 전체. 지금은 `note`·`explore`·`council` 세 종류만 처리한다. 나머지 일곱 종류는 **뒤 태스크에서 `playBeat`의 `switch`에 한 줄씩 늘어난다.** 모르는 종류가 오면 조용히 넘어가지 않고 **소리 내어 던진다.**

**Task 1이 떼어낸 것을 다시 붙이지 않는다.** `step`은 `src/systems/movement.js`, `banner`는 `src/ui/banner.js`, 궁 전환과 자원 수명은 `src/core/flow.js`에 있다. 이 파일은 그것들을 **가져다 쓰기만 한다.** `live`는 여전히 여기에 있다 — `flow`가 **막·궁**을 맡고 `live`가 **비트 진행 중의 값**을 맡는 경계다.

```js
import { createScene } from './render/scene.js'
import { createInput } from './input/input.js'
import { PALACES, pickupNear } from './data/palaces.js'
import { createState } from './core/state.js'
import { spend, isDusk } from './core/clock.js'
import { pickUp, markRead } from './systems/codex.js'
import { sourceById } from './data/sources.js'
import { ACTS } from './data/acts.js'
import { createFlow } from './core/flow.js'
import { step } from './systems/movement.js'
import { beatAt, isActOver, enterAct, applyBeat, advance } from './systems/scenario.js'
import { createHUD } from './ui/hud.js'
import { createMinimap } from './ui/minimap.js'
import { createDialog } from './ui/dialog.js'
import { createCouncil } from './ui/council-ui.js'
import { createSullyeom } from './ui/veil-screen.js'
import { banner } from './ui/banner.js'

// 프레임이 늦어도 왕만 느려지지 않게 한다 (Task 1)
const FIXED_DT = 1000 / 60
const MAX_CATCHUP = 250

const NOTE_CSS = `
.note{position:fixed;inset:0;background:#0f1113;z-index:50;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:16px;padding:28px;text-align:center}
.note h2{margin:0;font-size:17px;color:#8f8a7c;letter-spacing:4px;font-weight:400}
.note p{margin:0;font-size:20px;color:#e8e2d4;line-height:1.8;max-width:620px}
.note .origin{font-size:12px;color:#6b6558}
.note .staged{border:1px dashed #6a5230;color:#8f8a7c;font-size:12px;padding:8px 12px;border-radius:3px}
.note button{margin-top:8px;padding:12px 28px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:15px;cursor:pointer}
`

export function showNote(root, beat) {
  return new Promise(resolve => {
    const el = document.createElement('div')
    el.className = 'note'
    const staged = beat.grade === 'staged'
      ? '<div class="staged">※ 이 장면은 기록이 남아있지 않아 재구성했습니다</div>' : ''
    el.innerHTML = `
      <h2>${beat.title ?? ''}</h2>
      ${(beat.lines ?? []).map(l => `<p>${l}</p>`).join('')}
      ${beat.origin ? `<div class="origin">${beat.origin}</div>` : ''}
      ${staged}
      ${beat.last ? '' : '<button>다음</button>'}`
    root.appendChild(el)
    if (beat.last) return   // 마지막 화면은 남긴다 (게임 오버 화면이 아니라 막의 끝이다)
    el.querySelector('button').addEventListener('click', () => { el.remove(); resolve() })
  })
}

export function boot(root) {
  const canvas = document.createElement('canvas')
  root.appendChild(canvas)

  const style = document.createElement('style')
  style.textContent = NOTE_CSS
  document.head.appendChild(style)

  const ctx = createScene(canvas)
  const input = createInput(canvas)
  const hud = createHUD(root)
  const dialog = createDialog(root)
  const council = createCouncil(root)
  const sullyeom = createSullyeom(root)

  const hint = document.createElement('div')
  hint.style.cssText = 'position:fixed;left:0;right:0;bottom:26px;text-align:center;' +
    'font-size:13px;color:#e0a23a;letter-spacing:2px;pointer-events:none;z-index:20'
  root.appendChild(hint)

  // 렌더 루프가 읽는 살아 있는 값. 핸들러는 여기에 쓴다.
  const live = {
    state: createState(),
    rush: null,
    dateLabel: '',
    exit: null,          // { room, label } — explore 중에만
    exitPressed: false,
    moving: false,       // WASD 를 받는가 (explore · rush)
    interactive: false,  // E/Q 를 받는가 (explore 만)
    taken: new Set(),
  }

  // 궁 전환과 자원 수명은 flow 가 맡는다 (Task 1). 여기서 미니맵을 손으로 부수지 않는다.
  const flow = createFlow({
    acts: ACTS,
    // state 를 넘기지 않는다 — 살아 있는 상태는 live.state 한 벌뿐이다
    resources: {
      setPalace: (def) => ctx.setPalace(def),
      perPalace: { map: (def) => createMinimap(root, def) },
      lifetime: [
        input, hud, dialog,
        { dispose: () => removeEventListener('keydown', onKey) },
        { dispose: () => { hint.remove(); canvas.remove(); style.remove() } },
      ],
    },
  })
  const syncPalace = (state) => flow.syncPalace(state.palace)

  const io = { root, ctx, input, hud, dialog, council, sullyeom, live, flow, syncPalace, banner: (t) => banner(root, t) }

  // ── 입력 ────────────────────────────────────────────────
  const onKey = (e) => {
    if (!live.interactive) return
    if (e.code === 'KeyQ') {
      if (dialog.isOpen()) dialog.close(); else dialog.showCodex(live.state)
      return
    }
    if (e.code !== 'KeyE') return
    if (dialog.isOpen()) { dialog.close(); return }

    const def = PALACES[live.state.palace]
    if (live.exit && live.state.room === live.exit.room) { live.exitPressed = true; return }

    const near = pickupNear(def, ctx.player.position.x, ctx.player.position.z)
    if (!near || live.taken.has(near.cardId)) return
    const r = spend(live.state, near.placeId)
    if (!r.ok) { banner(root, '해가 모자란다'); return }
    live.taken.add(near.cardId)
    live.state = markRead(pickUp(r.state, near.cardId), near.cardId)
    dialog.showCard(sourceById(near.cardId))
  }
  addEventListener('keydown', onKey)

  // ── 비트 핸들러 ─────────────────────────────────────────
  function playExplore(beat) {
    return new Promise(resolve => {
      live.exit = beat.exit ?? null
      live.exitPressed = false
      live.moving = true
      live.interactive = true
      const timer = setInterval(() => {
        if (!live.exitPressed && !isDusk(live.state)) return
        clearInterval(timer)
        live.moving = false
        live.interactive = false
        live.exit = null
        hint.textContent = ''
        dialog.close()
        resolve(live.state)
      }, 100)
    })
  }

  function playCouncil(beat) {
    return new Promise(resolve => {
      council.open(live.state, beat, (choiceId, reason) => {
        const s = live.state
        resolve({ ...s, decisions: [...s.decisions, { actIndex: s.actIndex, choiceId, reason }] })
      })
    })
  }

  async function playBeat(beat) {
    if (beat.veil === true) sullyeom.show()
    if (beat.veil === false) sullyeom.hide()
    switch (beat.kind) {
      case 'note':    await showNote(root, beat); return live.state
      case 'explore': return await playExplore(beat)
      case 'council': return await playCouncil(beat)
      default:
        throw new Error(`아직 구현하지 않은 비트 종류: ${beat.kind} (${beat.id})`)
    }
  }

  async function playAct(act, actIndex) {
    live.state = enterAct(live.state, act, actIndex)
    live.dateLabel = act.dateLabel
    while (!isActOver(live.state, act)) {
      const beat = beatAt(act, live.state.beatIndex)
      live.state = applyBeat(live.state, beat)
      if (beat.dateLabel) live.dateLabel = beat.dateLabel
      syncPalace(live.state)
      live.state = await playBeat(beat)
      live.state = advance(live.state)
    }
  }

  async function run() {
    for (let i = 0; i < ACTS.length; i++) await playAct(ACTS[i], i)
    // 마지막 막이 끝나면 화면을 남긴다. Task 17에서 진짜 3막 끝 화면으로 바뀐다.
    await showNote(root, { title: '여기까지', lines: ['다음 막은 아직 만들지 않았다.'], last: true })
  }

  // ── 렌더 루프 ───────────────────────────────────────────
  // 고정 타임스텝. dt 클램프를 쓰면 느린 PC 에서 왕만 느려지고 추격은 벽시계로 진행한다 (Task 1)
  let last = performance.now()
  let acc = 0
  function frame(now) {
    acc = Math.min(MAX_CATCHUP, acc + (now - last))
    last = now

    while (acc >= FIXED_DT) {
      if (live.moving) live.state = step(ctx, input, live.state, FIXED_DT)
      acc -= FIXED_DT
    }
    if (live.moving) {
      hint.textContent = (live.exit && live.state.room === live.exit.room) ? live.exit.label : ''
    }

    ctx.render()
    hud.update({
      palaceName: PALACES[live.state.palace].name,
      dateLabel: live.dateLabel,
      dayLeft: live.state.dayLeft,
      riceIndex: live.state.riceIndex,
    })
    flow.get('map')?.update({
      playerX: ctx.player.position.x,
      playerZ: ctx.player.position.z,
      control: live.state.control,
      rush: live.rush,
      now,
    })
    requestAnimationFrame(frame)
  }

  syncPalace(live.state)
  requestAnimationFrame(frame)
  run()

  io.dispose = () => flow.dispose()
  return io
}

if (typeof document !== 'undefined') {
  const el = document.getElementById('root')
  if (el) globalThis.__game = boot(el)
}
```

> **왜 `setInterval`로 explore 종료를 감시하나** — `await` 안에서 렌더 루프를 멈출 수 없기 때문이다. 렌더 루프는 계속 `requestAnimationFrame`으로 돌고, 핸들러는 100ms마다 조건만 본다. 100ms 지연은 탐색 비트에서 체감되지 않으며, **촉박 시퀀스는 이 경로를 쓰지 않는다**(Task 13은 렌더 루프 안에서 `session.tick(now, …)`을 직접 부른다). 카운트다운 정확도가 이 폴링에 얹히는 일은 없다.

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run tests/systems/scenario.test.js tests/data/acts.test.js`
Expected: PASS 14 + 5

- [ ] **Step 7: 손으로 검증한다 — 1막이 여전히 완주된다**

Run: `npm run build`, 브라우저에서 열기.

1. 검은 화면에 `1863, 창덕궁 인정전`과 세 줄, 아래 출처 → `다음`
2. 발이 드리워진 채 창덕궁이 나온다. 규장각·선정전에서 `E`로 두 장을 줍는다
3. 인정전에서 `E` → 발이 걷히고 어전회의
4. 고르고 이유를 적으면 `1 막 「즉 위」 끝` → `다음` → `여기까지` 화면이 **남는다**
5. 콘솔에 오류가 없다. 특히 `아직 구현하지 않은 비트 종류`가 뜨면 안 된다

- [ ] **Step 8: 커밋**

```bash
git add src/systems/scenario.js src/data/acts.js src/main.js tests/systems/scenario.test.js tests/data/acts.test.js dist/어전.html
git commit -m "feat: 비트 시나리오 엔진과 막 러너 — 막의 흐름을 데이터로 적는다"
```

---

### Task 5: G 물가 — 막간 상승과 상대 표기

설계서 5장 G. **1866년에 내린 결정이 1882년에 돌아온다.** 2단계에서는 그 숫자가 조용히 오르기 시작하는 데까지 만든다.

**⚠ 설계서 내부 충돌을 여기서 정리한다.** 5장 G의 예시 화면은 `쌀 한 섬 ···· ○○냥`으로 **절대 수치**를 보여주지만, 11장 검증표는 `쌀값 절대 수치 — 확인 불가 — 표시 안 함 — 상대 변화만`이라고 못 박았다. **11장(검증 규약)을 따른다.** 화면에는 `즉위 무렵의 ○.○배`만 나온다. 1단계 HUD가 그대로 찍던 `100`이라는 날숫자도 여기서 없어진다.

**Files:**
- Create: `src/systems/prices.js`
- Create: `tests/systems/prices.test.js`
- Modify: `src/ui/hud.js`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `RICE_BY_ACT: Record<number, number>` — 막 번호(1~5) → 지수
  - `riceIndexForAct(actNumber: number): number`
  - `riceRatio(index: number): number`
  - `riceLabel(index: number): string` — 예: `'쌀 한 섬  ····  즉위 무렵의 1.3배'`
  - `advancePrices(state, actNumber: number): GameState`
  - `RICE_NOTE: string` — 재구성 고지 문구
  - `createHUD(root)`의 `update(view)` 인자 형태는 **바뀌지 않는다** (`{ palaceName, dateLabel, dayLeft, riceIndex }`)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/systems/prices.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { createState } from '../../src/core/state.js'
import {
  RICE_BY_ACT, riceIndexForAct, riceRatio, riceLabel, advancePrices, RICE_NOTE,
} from '../../src/systems/prices.js'

describe('G 물가', () => {
  it('1막은 기준값 100 이다', () => {
    expect(riceIndexForAct(1)).toBe(100)
    expect(createState().riceIndex).toBe(100)
  })

  it('막이 넘어갈 때마다 오르기만 한다', () => {
    for (let a = 2; a <= 5; a++) {
      expect(riceIndexForAct(a), `${a}막`).toBeGreaterThan(riceIndexForAct(a - 1))
    }
  })

  it('다섯 막이 모두 정의되어 있다', () => {
    expect(Object.keys(RICE_BY_ACT).map(Number).sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('모르는 막 번호는 기준값으로 돌아간다', () => {
    expect(riceIndexForAct(99)).toBe(100)
  })

  it('배수를 계산한다', () => {
    expect(riceRatio(100)).toBe(1)
    expect(riceRatio(150)).toBe(1.5)
  })

  it('1막에서는 즉위 무렵과 같다고만 말한다', () => {
    expect(riceLabel(100)).toBe('쌀 한 섬  ····  즉위 무렵과 같다')
  })

  it('오르면 배수로 말한다', () => {
    expect(riceLabel(134)).toBe('쌀 한 섬  ····  즉위 무렵의 1.3배')
  })

  it('절대 수치를 절대 화면에 내지 않는다', () => {
    for (const a of [1, 2, 3, 4, 5]) {
      const label = riceLabel(riceIndexForAct(a))
      expect(label, `${a}막`).not.toContain('냥')
      expect(label, `${a}막`).not.toContain(String(riceIndexForAct(a)))
    }
  })

  it('막을 넘기면 상태의 지수가 갱신된다', () => {
    const s = advancePrices(createState(), 3)
    expect(s.riceIndex).toBe(riceIndexForAct(3))
  })

  it('같은 막을 다시 넘겨도 같은 객체를 돌려준다', () => {
    const s = createState()
    expect(advancePrices(s, 1)).toBe(s)
  })

  it('원본 상태를 건드리지 않는다', () => {
    const s = createState()
    advancePrices(s, 4)
    expect(s.riceIndex).toBe(100)
  })

  it('재구성 고지 문구가 있다', () => {
    expect(RICE_NOTE).toContain('사료')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/systems/prices.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/systems/prices.js`:

```js
// 절대 쌀값은 사료로 확정할 수 없다(설계서 11장). 여기 숫자는 화폐 단위가 아니라
// '즉위 무렵을 100으로 둔 상대 지수'이며, 화면에는 배수로만 나간다.
export const RICE_BY_ACT = {
  1: 100,   // 1863~1865  당백전 발행 직전
  2: 118,   // 1866~1871  당백전이 돌기 시작한다
  3: 134,   // 1873~1876  개항 직전
  4: 178,   // 1882       쌀 유출·흉년·매점매석이 겹친다
  5: 190,   // 1884
}

export const RICE_NOTE =
  '※ 당대의 쌀값은 사료로 수치를 확정할 수 없어, 오르는 추세만 보여줍니다.'

export function riceIndexForAct(actNumber) {
  return RICE_BY_ACT[actNumber] ?? RICE_BY_ACT[1]
}

export function riceRatio(index) {
  return index / RICE_BY_ACT[1]
}

export function riceLabel(index) {
  const r = riceRatio(index)
  if (r <= 1.001) return '쌀 한 섬  ····  즉위 무렵과 같다'
  return `쌀 한 섬  ····  즉위 무렵의 ${r.toFixed(1)}배`
}

export function advancePrices(state, actNumber) {
  const next = riceIndexForAct(actNumber)
  return next === state.riceIndex ? state : { ...state, riceIndex: next }
}
```

- [ ] **Step 4: HUD를 상대 표기로 바꾼다**

`src/ui/hud.js` 전체. 해 칸 수를 `DAY_UNITS`에서 읽고, `<style>` 중복 삽입 가드를 넣는다(1단계 리뷰의 Minor 지적).

```js
import { DAY_UNITS } from '../core/clock.js'
import { riceLabel, RICE_NOTE } from '../systems/prices.js'

const CSS = `
.hud{position:fixed;left:0;right:0;top:0;display:flex;gap:16px;align-items:center;
  padding:8px 14px;font-size:13px;color:#e8e2d4;
  background:linear-gradient(#0f1113ee,#0f111300);pointer-events:none;z-index:20}
.hud .where{font-size:16px;font-weight:700;letter-spacing:1px}
.hud .date{color:#8f8a7c}
.hud .sun{margin-left:auto;display:flex;gap:3px}
.hud .sun i{width:12px;height:12px;border-radius:50%;background:#3a3f45;display:block}
.hud .sun i.on{background:#e0a23a}
.rice{position:fixed;left:0;right:0;bottom:6px;text-align:center;
  font-size:11px;color:#8f8a7c;letter-spacing:2px;pointer-events:none;z-index:20}
.rice em{font-style:normal;color:#6b6558;font-size:10px;letter-spacing:0;display:block;margin-top:2px}
`

let styled = false

export function createHUD(root) {
  if (!styled) {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    styled = true
  }

  const bar = document.createElement('div')
  bar.className = 'hud'
  bar.innerHTML = `<span class="where"></span><span class="date"></span><span class="sun"></span>`
  root.appendChild(bar)

  const rice = document.createElement('div')
  rice.className = 'rice'
  root.appendChild(rice)

  const where = bar.querySelector('.where')
  const date = bar.querySelector('.date')
  const sun = bar.querySelector('.sun')

  let shownIndex = null

  return {
    update(view) {
      where.textContent = view.palaceName
      date.textContent = view.dateLabel
      sun.innerHTML = ''
      for (let i = 0; i < DAY_UNITS; i++) {
        const dot = document.createElement('i')
        if (i < view.dayLeft) dot.className = 'on'
        sun.appendChild(dot)
      }
      if (view.riceIndex !== shownIndex) {
        shownIndex = view.riceIndex
        rice.innerHTML = view.riceIndex == null
          ? ''
          : `${riceLabel(view.riceIndex)}<em>${RICE_NOTE}</em>`
      }
    },
    dispose() { bar.remove(); rice.remove() },
  }
}
```

- [ ] **Step 5: 막이 넘어갈 때 지수를 올린다**

`src/main.js`의 `playAct` 첫 줄 뒤에 한 줄을 넣는다.

```js
import { advancePrices } from './systems/prices.js'
```

```js
  async function playAct(act, actIndex) {
    live.state = enterAct(live.state, act, actIndex)
    live.state = advancePrices(live.state, actIndex + 1)
    live.dateLabel = act.dateLabel
```

- [ ] **Step 6: 테스트와 눈 검증**

Run: `npx vitest run tests/systems/prices.test.js && npm run build`
Expected: PASS 12/12.

브라우저에서 확인:
1. 1막 화면 하단에 `쌀 한 섬  ····  즉위 무렵과 같다` 와 그 아래 작은 고지 한 줄
2. **어디에도 `100` 이라는 날숫자가 없다**

- [ ] **Step 7: 커밋**

```bash
git add src/systems/prices.js src/ui/hud.js src/main.js tests/systems/prices.test.js dist/어전.html
git commit -m "feat: G 물가 — 막간 상승과 상대 표기, 절대 수치는 표시하지 않는다"
```

---

### Task 6: 경복궁 맵과 화재 상태 변형

설계서 8장. 광화문·근정전·사정전·수정전·자경전. **같은 맵을 세 상태로 쓴다 — 평상 / 불타는 중 / 불탄 뒤.** 「불타는 중」은 평상 맵 위에 불 파티클만 얹는 것이므로(Task 7) 여기서는 **평상과 불탄 뒤 두 가지 데이터**를 만든다.

3막에는 불이 **두 번** 난다. 그래서 「불탄 뒤」도 두 가지다 — 자경전 일곽만 탄 것(1873)과 830여 칸이 탄 것(1876).

**Files:**
- Modify: `src/data/palaces.js`
- Modify: `src/core/clock.js` — **`PLACE_COST` 표에 줄만 더한다. 함수는 한 글자도 안 고친다** (판정 R30, 잠금 파일 항목 참조)
- Modify: `src/systems/movement.js` (`passable` 한 줄)
- Create: `tests/data/palaces.test.js`
- Create: `tests/core/place-cost.test.js`

**Interfaces:**
- Consumes: `src/core/clock.js` → `DAY_UNITS`, `costOf`; `src/core/control.js` → `isRoomOpen`; `src/systems/scenario.js` → `beatsOf`, `enterAct`, `applyBeat` (**테스트에서만**)
- Produces:
  - `PALACES.gyeongbok` — `councilRoom: 'sajeongjeon'`, 방 5칸
  - `PALACES.gyeongbok_jagyeong` — 1873 자경전 일곽 화재 뒤
  - `PALACES.gyeongbok_burnt` — 1876 대화재 뒤
  - `burntVariant(def, { id, name, burnt: string[], sealed: string[] }): PalaceDef` — 순수
  - `isPassable(room): boolean` — `room.passable !== false`
  - `PALACE_BASE: Record<string,string>` · `baseOf(id: string): string`
  - `Room`에 `burnt?: boolean` · `passable?: boolean` 추가
  - `PLACE_COST`에 2·3막 장소 열두 줄 추가 — **`costOf`·`spend`·`isDusk`·`newDay`·`DAY_UNITS`는 그대로**
  - 기존 `roomAt`·`pickupNear`는 **서명도 동작도 그대로**

> **왜 `minControl`로 막지 않고 `passable`을 새로 두나** — 전역 제약이 조작권 문자열을 `'A'|'B'|'C'|'D'` 네 개로 못 박았다. 「불타서 못 들어간다」는 조작권이 아니다. 다섯 번째 등급을 만드는 대신 별개 축을 둔다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/data/palaces.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  PALACES, roomAt, pickupNear, burntVariant, isPassable, baseOf,
} from '../../src/data/palaces.js'
import { SOURCES } from '../../src/data/sources.js'

const ids = (def) => def.rooms.map(r => r.id)

describe('경복궁', () => {
  const g = PALACES.gyeongbok

  it('광화문·근정전·사정전·수정전·자경전 다섯 채가 있다', () => {
    expect(ids(g)).toEqual(['gwanghwamun', 'geunjeongjeon', 'sajeongjeon', 'sujeongjeon', 'jagyeongjeon'])
  })

  it('어전회의는 편전인 사정전에서 연다', () => {
    expect(g.councilRoom).toBe('sajeongjeon')
  })

  it('조작권 C 로는 자경전에 못 들어간다', () => {
    expect(g.rooms.find(r => r.id === 'jagyeongjeon').minControl).toBe('B')
  })

  it('모든 방의 minControl 이 A~D 안에 있다', () => {
    for (const def of Object.values(PALACES)) {
      for (const r of def.rooms) expect(['A', 'B', 'C', 'D'], `${def.id}/${r.id}`).toContain(r.minControl)
    }
  })

  it('스폰 지점이 광화문 안쪽 마당이다', () => {
    expect(roomAt(g, g.spawn.x, g.spawn.z)).toBeNull()
    expect(Math.abs(g.spawn.x)).toBeLessThan(g.ground.w / 2)
  })

  it('모든 궁의 pickup 카드가 실재하는 사료다', () => {
    const known = new Set(SOURCES.map(c => c.id))
    for (const def of Object.values(PALACES)) {
      for (const p of def.pickups ?? []) {
        expect(known, `${def.id}/${p.cardId}`).toContain(p.cardId)
        expect(p.placeId, `${def.id}/${p.cardId} 에 placeId 없음`).toBeTruthy()
      }
    }
  })

  it('같은 궁 안에서 pickup 끼리 10m 넘게 떨어져 있다', () => {
    for (const def of Object.values(PALACES)) {
      const ps = def.pickups ?? []
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const d = Math.hypot(ps[i].x - ps[j].x, ps[i].z - ps[j].z)
        expect(d, `${def.id}: ${ps[i].cardId} ↔ ${ps[j].cardId}`).toBeGreaterThan(10)
      }
    }
  })

  it('pickupNear 가 가까운 카드를 찾아 준다', () => {
    const p = g.pickups[0]
    expect(pickupNear(g, p.x, p.z)?.cardId).toBe(p.cardId)
    expect(pickupNear(g, p.x + 40, p.z + 40)).toBeNull()
  })
})

describe('화재 상태 변형', () => {
  const base = PALACES.gyeongbok

  it('탄 방에는 burnt 표시가 붙고 나머지는 안 붙는다', () => {
    const v = burntVariant(base, { id: 'v', name: '경복궁', burnt: ['jagyeongjeon'], sealed: [] })
    expect(v.rooms.find(r => r.id === 'jagyeongjeon').burnt).toBe(true)
    expect(v.rooms.find(r => r.id === 'sajeongjeon').burnt).toBe(false)
  })

  it('봉쇄한 방은 통행 불가가 된다', () => {
    const v = burntVariant(base, { id: 'v', name: '경복궁', burnt: ['jagyeongjeon'], sealed: ['jagyeongjeon'] })
    expect(isPassable(v.rooms.find(r => r.id === 'jagyeongjeon'))).toBe(false)
    expect(isPassable(v.rooms.find(r => r.id === 'gwanghwamun'))).toBe(true)
  })

  it('조작권 등급은 손대지 않는다', () => {
    const v = burntVariant(base, { id: 'v', name: '경복궁', burnt: ['jagyeongjeon'], sealed: ['jagyeongjeon'] })
    for (const r of v.rooms) expect(['A', 'B', 'C', 'D']).toContain(r.minControl)
  })

  it('탄 방에 있던 사료는 더 이상 주울 수 없다', () => {
    const v = burntVariant(base, { id: 'v', name: '경복궁', burnt: ['sajeongjeon'], sealed: ['sajeongjeon'] })
    expect((v.pickups ?? []).some(p => p.placeId === 'sajeongjeon')).toBe(false)
  })

  it('원본 정의를 건드리지 않는다', () => {
    burntVariant(base, { id: 'v', name: '경복궁', burnt: ['jagyeongjeon'], sealed: ['jagyeongjeon'] })
    expect(base.rooms.find(r => r.id === 'jagyeongjeon').burnt).toBeUndefined()
    expect(base.id).toBe('gyeongbok')
  })

  it('1873 변형은 자경전만 타고, 1876 변형은 네 채가 탄다', () => {
    const a = PALACES.gyeongbok_jagyeong
    const b = PALACES.gyeongbok_burnt
    expect(a.rooms.filter(r => r.burnt).map(r => r.id)).toEqual(['jagyeongjeon'])
    expect(b.rooms.filter(r => r.burnt).map(r => r.id))
      .toEqual(['geunjeongjeon', 'sajeongjeon', 'sujeongjeon', 'jagyeongjeon'])
  })

  it('불탄 뒤에도 광화문으로는 걸어 나갈 수 있다', () => {
    const b = PALACES.gyeongbok_burnt
    expect(isPassable(b.rooms.find(r => r.id === 'gwanghwamun'))).toBe(true)
    expect(isPassable(b.rooms.find(r => r.id === 'geunjeongjeon'))).toBe(true)
  })

  it('변형은 모두 경복궁이라는 이름과 같은 밑바탕을 가진다', () => {
    for (const id of ['gyeongbok', 'gyeongbok_jagyeong', 'gyeongbok_burnt']) {
      expect(baseOf(id)).toBe('gyeongbok')
      expect(PALACES[id].name).toContain('경복궁')
      expect(PALACES[id].ground).toEqual(PALACES.gyeongbok.ground)
    }
    expect(baseOf('changdeok')).toBe('changdeok')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/data/palaces.test.js`
Expected: FAIL — `PALACES.gyeongbok` 없음

- [ ] **Step 3: 창덕궁에 2·3막 사료 지점을 더한다**

`src/data/palaces.js`의 `changdeok.pickups`를 아래로 **교체**한다. 1막 두 장(`wonnapjeon`·`dangbaekjeon`)은 **id도 좌표도 그대로**다.

**문서를 종류대로 다른 건물에 둔다.** 규장각(서고)에는 **책과 목록**, 선정전(편전)에는 **조정 안에서 오간 말**, 희정당(편전)에는 **밖에서 올라온 문서 — 서한과 장계**. 이것은 연출이 아니라 판정 R17이 말한 그대로다 — **장계는 서고에 보관되는 물건이 아니라 임금에게 올라오는 문서다.** 그리고 희정당은 스폰에서 60m라 **2칸**이다(Step 5). 값이 여기서 갈린다.

**인정전에는 사료 지점을 두지 않는다.** 1막·2막·3막의 탐색 비트가 모두 인정전을 `exit.room`으로 쓴다 — 거기서 `E`를 누르면 회의로 넘어가므로 사료를 주울 수가 없다. Task 16의 `탐색 비트의 나가는 방에는 사료 지점이 없다`가 이것을 지킨다.

```js
    pickups: [
      // 규장각 — 책과 목록이 있는 서고. 스폰에서 55m. 1칸
      { cardId: 'wonnapjeon',        placeId: 'gyujanggak',    x: -36, z:   4 },
      { cardId: 'oegyujanggak',      placeId: 'gyujanggak',    x: -28, z:  -3 },
      // 선정전 — 정전 옆 편전. 조정 안에서 오간 말이 여기 있다. 47m. 1칸
      { cardId: 'dangbaekjeon',      placeId: 'seonjeongjeon', x:  26, z:   6 },
      { cardId: 'gaehang-chanseong', placeId: 'seonjeongjeon', x:  34, z:  13 },
      // 희정당 — 밖에서 올라온 문서를 임금이 읽는 곳. 60m. 2칸
      { cardId: 'bellonet',          placeId: 'huijeongdang',  x:  -4, z:  -7 },
      { cardId: 'sherman',           placeId: 'huijeongdang',  x: -13, z: -19 },
      { cardId: 'yangheonsu',        placeId: 'huijeongdang',  x:   5, z: -19 },
    ],
```

> **좌표는 모두 자기 `placeId` 방 안에 있다.** 초안은 네 지점이 규장각 상자(`x -45..-27`, `z -4..12`) 밖에 있었다 — 값은 규장각 값을 내면서 몸은 마당에 서 있었다. 고쳤다. 지점 간 최소 거리도 10m 넘게 유지된다(희정당 안 셋: 15·15·18m, 규장각 둘: 10.6m, 선정전 둘: 10.6m). Task 6 Step 1의 `같은 궁 안에서 pickup 끼리 10m 넘게 떨어져 있다`가 이것을 지킨다.

- [ ] **Step 4: 경복궁과 변형을 구현**

`src/data/palaces.js`의 `PALACES` 객체 안, `changdeok` 다음에 경복궁을 넣는다.

```js
  gyeongbok: {
    id: 'gyeongbok',
    name: '경복궁',
    councilRoom: 'sajeongjeon',
    ground: { w: 140, d: 160 },
    spawn: { x: 0, z: 50 },
    rooms: [
      { id: 'gwanghwamun',  name: '광화문', x:   0, z:  64, w: 28, d: 12, minControl: 'D' },
      { id: 'geunjeongjeon',name: '근정전', x:   0, z:  22, w: 36, d: 30, minControl: 'D' },
      { id: 'sajeongjeon',  name: '사정전', x:   0, z: -12, w: 26, d: 20, minControl: 'C' },
      { id: 'sujeongjeon',  name: '수정전', x: -36, z:  -8, w: 22, d: 18, minControl: 'C' },
      { id: 'jagyeongjeon', name: '자경전', x:  34, z: -38, w: 22, d: 18, minControl: 'B' },
    ],
    pickups: [
      // 수정전 — 중건 뒤 규장각이 있던 일곽. 기록이 모이는 곳이다. 68m. 2칸
      { cardId: 'junggeon',      placeId: 'sujeongjeon',   x: -43, z:  -3 },
      { cardId: 'sinmi-officer', placeId: 'sujeongjeon',   x: -29, z:  -3 },
      { cardId: 'seogye',        placeId: 'sujeongjeon',   x: -36, z: -15 },
      // 사정전 — 편전. 62m. 2칸. 조약 문서가 여기 쌓인다
      { cardId: 'choe-ikhyeon',  placeId: 'sajeongjeon',   x: -11, z:  -4 },
      { cardId: 'ganghwa1',      placeId: 'sajeongjeon',   x:   0, z:  -4 },
      { cardId: 'unyo',          placeId: 'sajeongjeon',   x:  11, z:  -4 },
      { cardId: 'ganghwa7',      placeId: 'sajeongjeon',   x: -11, z: -20 },
      { cardId: 'ganghwa10',     placeId: 'sajeongjeon',   x:   0, z: -20 },
      { cardId: 'joil-trade',    placeId: 'sajeongjeon',   x:  11, z: -20 },
    ],
  },
```

> **여기도 좌표를 방 안으로 넣었고, 나가는 방을 비웠다.** 초안의 `junggeon`(`z: 44`)·`ganghwa10`(`z: -28`)·`joil-trade`(`x: 18`) 셋은 자기 방 상자 밖이었다. 그리고 **광화문·근정전·자경전은 셋 다 어느 탐색 비트의 `exit.room`**이므로 사료 지점을 둘 수 없다 — `junggeon`을 근정전에서 수정전으로 옮긴 이유가 그것이다(초안에서는 좌표가 근정전 밖으로 빠져 있어 이 충돌이 우연히 감춰져 있었다). 사정전 여섯 지점은 `x ∈ {-11, 0, 11}` × `z ∈ {-4, -20}` 격자로 놓아 최소 간격 11m, 수정전 셋은 13.9~14m를 지킨다.

> **수정전이 규장각 자리다.** 경복궁 중건 뒤 규장각은 수정전 일곽에 있었다. 설계서 8장이 규장각을 「사료 수집의 중심」이라 한 것을 경복궁에서는 수정전이 받는다.

같은 파일 아래쪽, `roomAt` **앞에** 변형 생성기를 넣는다.

```js
export function burntVariant(def, { id, name, burnt = [], sealed = [] }) {
  const burntSet = new Set(burnt)
  const sealedSet = new Set(sealed)
  return {
    ...def,
    id,
    name,
    rooms: def.rooms.map(r => ({
      ...r,
      burnt: burntSet.has(r.id),
      passable: !sealedSet.has(r.id),
    })),
    pickups: (def.pickups ?? []).filter(p => !burntSet.has(p.placeId)),
  }
}

export function isPassable(room) {
  return room.passable !== false
}

export const PALACE_BASE = {
  gyeongbok_jagyeong: 'gyeongbok',
  gyeongbok_burnt: 'gyeongbok',
}

export function baseOf(id) {
  return PALACE_BASE[id] ?? id
}
```

`PALACES` 객체 **정의 뒤**(같은 파일 아래)에 두 변형을 등록한다.

```js
// 1873 겨울, 자경전 일곽이 탔다. 그 뒤 임금은 창덕궁으로 옮겼다가 1875년에 돌아온다.
PALACES.gyeongbok_jagyeong = burntVariant(PALACES.gyeongbok, {
  id: 'gyeongbok_jagyeong',
  name: '경복궁',
  burnt: ['jagyeongjeon'],
  sealed: ['jagyeongjeon'],
})

// 1876 겨울, 830여 칸이 탔다. 광화문과 근정전 마당으로만 걸어 나갈 수 있다.
PALACES.gyeongbok_burnt = burntVariant(PALACES.gyeongbok, {
  id: 'gyeongbok_burnt',
  name: '경복궁 (불탄 뒤)',
  burnt: ['geunjeongjeon', 'sajeongjeon', 'sujeongjeon', 'jagyeongjeon'],
  sealed: ['sajeongjeon', 'sujeongjeon', 'jagyeongjeon'],
})
```

- [ ] **Step 5: 장소 값을 `PLACE_COST`에 더한다 — 하루가 정말로 모자라게 만든다**

**판정 R30.** 초안은 2·3막의 사료 지점을 거의 전부 기본값 1칸짜리 장소에 두었다. 그래서 「해 6칸이 부족해 다 못 줍는다」가 **산술적으로 거짓**이었다 — 규장각 네 지점은 4칸이고 하루는 6칸이다. 설계 원칙 2(**기다리는 것이 안전하지 않다**)가 2막 내내 작동하지 않는다. 값이 데이터에 있으므로 데이터로 고친다.

**`src/core/clock.js`의 `PLACE_COST`에 줄을 더한다. 함수는 한 글자도 고치지 않는다.** 잠금의 뜻은 「그 파일의 테스트를 깨지 마라」이고, `tests/core/clock.test.js`의 아홉 개는 `gyujanggak`·`unhyeon`·`outside`와 모르는 키의 기본값 1만 단정하므로 **새 키를 더해도 전부 그대로 통과한다.**

**값 매기는 규칙 — 거리와 위험.** 그 궁의 스폰 지점에서 재서, **55m 이내 1칸 · 그보다 멀면 2칸 · 궁 밖은 3칸.** 규장각(55m)이 1칸이라는 1단계 값이 이 자의 눈금이 된다.

| 장소 | 스폰에서 | 칸 |
|---|---|---|
| 창덕궁 돈화문 | 10m | 1 |
| 창덕궁 인정전 | 28m | 1 |
| 창덕궁 선정전 | 47m | 1 |
| 창덕궁 **규장각** | 55m | **1 (1단계 값, 고치지 않는다)** |
| 창덕궁 희정당 | 60m | 2 |
| 창덕궁 관물헌 | 80m | 2 |
| 창덕궁 대조전 | 86m | 2 |
| 창덕궁 연경당 | 95m | 2 |
| 경복궁 광화문 | 14m | 1 |
| 경복궁 근정전 | 28m | 1 |
| 경복궁 사정전 | 62m | 2 |
| 경복궁 수정전 | 68m | 2 |
| 경복궁 자경전 | 94m | 2 |
| **운현궁** | 궁 밖 | **2 (1단계 값)** |
| **궁 밖** | — | **3 (1단계 값)** |

```js
export const PLACE_COST = {
  // ── 1단계 값. 고치지 않는다 (tests/core/clock.test.js 가 세 값을 못 박고 있다) ──
  gyujanggak: 1,
  unhyeon: 2,
  outside: 3,

  // ── 2·3막에서 쓰는 곳. 스폰에서 55m 이내 1칸, 그보다 멀면 2칸 (판정 R30) ──
  // 창덕궁
  donhwamun: 1,
  injeongjeon: 1,
  seonjeongjeon: 1,
  huijeongdang: 2,
  gwanmulheon: 2,
  daejojeon: 2,
  yeongyeongdang: 2,
  // 경복궁
  gwanghwamun: 1,
  geunjeongjeon: 1,
  sajeongjeon: 2,
  sujeongjeon: 2,
  jagyeongjeon: 2,
}
```

**이 값으로 하루가 어떻게 모자라는가.** 아래가 이 계획이 주장하는 산술이며, 다음 단계의 테스트가 이것을 기계로 확인한다.

| 세는 단위 | 있는 것 | 하루 | 판정 |
|---|---|---|---|
| **2막 사료 전체** | 외규장각 목록 1 + 벨로네 2 + 셔먼호 2 + 양헌수 2 + 중건 기록 2 + 미군 장교 2 = **11칸** | 6 | 못 다 줍는다 |
| **3막 사료 전체** | 개항 찬성 1 + 서계 2 + 최익현 2 + 운요호 2 + 조약 3관 6 + 무역 규칙 2 = **15칸** | 6+6+6 = 18 | 경복궁 몫만 **14칸**인데 경복궁 낮은 **12칸**이다 |
| **2막 창덕궁 낮** (1막 두 장은 이미 가져갔다) | 외규장각 1 + 개항 찬성 1 + 벨로네 2 + 셔먼호 2 + 양헌수 2 = **8칸** | 6 | **적어도 한 장은 두고 가야 한다.** 회의 선택지 셋을 다 열면(2+2+2=6) 외규장각 목록을 집을 손이 남지 않는다 |
| 2막 경복궁 낮 (조작권 C, 자경전 잠김) | 수정전 6 + 사정전 12 = **18칸** | 6 | 셋이 한계다 |
| 3막 경복궁 낮 ×2 (조작권 A) | 같은 18칸, 그중 3막 카드가 14칸 | 6+6 | **조약 문서 일곱 장을 다 읽는 길이 없다** |
| 3막 창덕궁 낮 | 창덕궁에 놓인 것 전부 **10칸** | 6 | 그중 3막 카드는 개항 찬성 한 장뿐이다 |
| 1막 창덕궁 낮 | 원납전 1 + 당백전 1 = **2칸** (그러나 마당에는 10칸어치가 있다) | 6 | **1막만은 「그 막의 사료」를 다 읽고 갈 수 있다** |

> **1막은 일부러 예외다.** 1막의 두 장은 합쳐서 2칸이고 하루는 6칸이다 — Task 2의 「1회차 — 다 읽고 간다」에서 **세 선택지가 다 열리는 것**이 1막의 합격 기준이기 때문이다. 사료가 이미 커밋되어 두 장으로 고정되어 있으므로 1막을 6칸 넘게 만들 방법도 없다. 대신 **1막의 마당에도 이미 10칸어치가 놓여 있다** — 학생은 1막에서도 「다 가질 수는 없다」를 보지만, 그날 필요한 두 장은 반드시 손에 넣을 수 있다. 다음 단계의 두 테스트가 이 둘을 각각 못 박는다.

- [ ] **Step 6: 값이 다시 물러지지 않게 테스트로 못 박는다**

`tests/core/place-cost.test.js`. **1막의 손맛을 지키는 테스트와, 2·3막의 압박을 지키는 테스트를 한 파일에 둔다.** 셋 다 `palaces.js`·`acts.js`의 **실제 데이터에서** 값을 뽑으므로, 누군가 싼 지점을 하나 더하는 순간 운다.

```js
import { describe, it, expect } from 'vitest'
import { DAY_UNITS, costOf } from '../../src/core/clock.js'
import { PALACES, baseOf, isPassable } from '../../src/data/palaces.js'
import { isRoomOpen } from '../../src/core/control.js'
import { createState } from '../../src/core/state.js'
import { SOURCES } from '../../src/data/sources.js'
import { ACTS } from '../../src/data/acts.js'
import { beatsOf, enterAct, applyBeat } from '../../src/systems/scenario.js'

const ACT_OF = new Map(SOURCES.map(c => [c.id, c.act]))

// 화재 변형(gyeongbok_burnt 등)은 같은 지점을 물려받으므로 두 번 세지 않는다
function basePalaces() {
  return Object.entries(PALACES).filter(([id]) => baseOf(id) === id).map(([, def]) => def)
}

function allPickups() {
  return basePalaces().flatMap(def => def.pickups ?? [])
}

function sumCost(pickups) {
  return pickups.reduce((n, p) => n + costOf(p.placeId), 0)
}

function pickupsOfAct(act) {
  return allPickups().filter(p => ACT_OF.get(p.cardId) === act)
}

// 막을 비트 순서대로 걸어가며 「온전한 하루가 주어지는 탐색 비트」를 뽑는다
function exploreDays(act, actIndex) {
  let s = enterAct(createState(), act, actIndex)
  const out = []
  for (const b of beatsOf(act)) {
    s = applyBeat(s, b)
    if (b.kind === 'explore') {
      out.push({ id: b.id, palace: s.palace, control: s.control, units: s.dayLeft })
    }
  }
  return out
}

describe('1단계 값은 그대로다 — 1막의 손맛을 다시 손대지 않는다', () => {
  it('규장각 1칸 · 운현궁 2칸 · 궁 밖 3칸', () => {
    expect(costOf('gyujanggak')).toBe(1)
    expect(costOf('unhyeon')).toBe(2)
    expect(costOf('outside')).toBe(3)
  })

  it('모르는 장소는 여전히 1칸이다', () => {
    expect(costOf('아무데나')).toBe(1)
    expect(costOf('')).toBe(1)
  })

  it('1막의 두 장은 하루 안에 다 읽을 수 있다 — 세 선택지가 다 열려야 하기 때문이다', () => {
    const act1 = pickupsOfAct(1)
    expect(act1).toHaveLength(2)
    expect(sumCost(act1)).toBeLessThan(DAY_UNITS)
  })
})

describe('하루는 모자라야 한다 — 설계 원칙 2', () => {
  it('2막·3막은 그 막의 사료를 하루에 다 줍지 못한다', () => {
    for (const act of [2, 3]) {
      const ps = pickupsOfAct(act)
      expect(sumCost(ps), `${act}막 ${ps.length}장 = ${sumCost(ps)}칸`).toBeGreaterThan(DAY_UNITS)
    }
  })

  it('온전한 하루가 주어지는 탐색 비트마다, 그 궁에서 갈 수 있는 것을 다 줍지 못한다', () => {
    for (const [i, act] of ACTS.entries()) {
      for (const d of exploreDays(act, i)) {
        // 불탄 궁을 2칸으로 걸어 나가는 것 같은 짧은 걸음은 줍는 자리가 아니다
        if (d.units < DAY_UNITS) continue
        const def = PALACES[d.palace]
        const open = new Set(
          def.rooms.filter(r => isRoomOpen(d.control, r) && isPassable(r)).map(r => r.id))
        const here = (def.pickups ?? []).filter(p => open.has(p.placeId))
        const cost = sumCost(here)
        expect(cost, `${act.id}/${d.id} · ${d.palace} · 조작권 ${d.control} · ${d.units}칸에 ${cost}칸어치`)
          .toBeGreaterThan(d.units)
      }
    }
  })

  it('모든 사료 지점의 장소가 값 표에 적혀 있다 — 기본값 1칸으로 조용히 새지 않게', () => {
    const known = new Set([
      'gyujanggak', 'unhyeon', 'outside',
      'donhwamun', 'injeongjeon', 'seonjeongjeon', 'huijeongdang',
      'gwanmulheon', 'daejojeon', 'yeongyeongdang',
      'gwanghwamun', 'geunjeongjeon', 'sajeongjeon', 'sujeongjeon', 'jagyeongjeon',
    ])
    for (const p of allPickups()) {
      expect(known, `${p.cardId} 의 ${p.placeId} 가 값 표에 없다 — 기본값 1칸으로 떨어진다`)
        .toContain(p.placeId)
    }
  })
})
```

Run: `npx vitest run tests/core/place-cost.test.js tests/core/clock.test.js`
Expected: PASS **6/6** (새 파일) + **9/9** (1단계 시계 테스트가 **한 글자도 안 바뀐 채로** 그대로 통과). 두 번째가 이 단계의 합격 기준이다 — **아홉 개가 하나라도 빨개지면 잠금을 어긴 것이다.**

- [ ] **Step 7: 이동에서 `passable` 을 지킨다**

**`src/systems/movement.js`의 `step()`**에서 방 판정 줄을 고친다(Task 1이 `main.js`에서 떼어낸 그 함수다). **조작권 검사는 그대로 두고 한 줄을 더한다.**

```js
import { PALACES, roomAt, isPassable } from '../data/palaces.js'
```

```js
  const here = roomAt(def, p.x, p.z)
  const room = roomAt(def, cx, cz)
  if (room && room.id !== here?.id) {
    if (!isRoomOpen(state.control, room)) return state
    if (!isPassable(room)) return state
  }
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `npx vitest run tests/data/palaces.test.js tests/core/place-cost.test.js tests/core/clock.test.js && npm test`
Expected: PASS 16/16 + 6/6 + **9/9**. **1단계 시계 테스트 아홉 개가 한 글자도 안 바뀐 채로 통과해야 한다** — 하나라도 빨개지면 `PLACE_COST`에 줄을 더한 것이 아니라 `clock.js`를 고친 것이다. 되돌린다.

- [ ] **Step 9: 눈으로 확인 (임시 통로)**

`boot` 안에 임시로 넣는다. **Task 17에서 지운다.**

```js
  globalThis.__go = (id) => { live.state = { ...live.state, palace: id }; syncPalace(live.state) }
```

Run: `npm run build`, 브라우저에서 열고 콘솔에:
1. `__go('gyeongbok')` → 광화문·근정전·사정전·수정전·자경전 다섯 채와 넓은 박석 마당. 미니맵도 바뀐다
2. `__go('gyeongbok_burnt')` → 같은 배치. (색은 아직 안 바뀐다 — Task 7에서 탄 재질을 입힌다)
3. `__go('changdeok')` → 창덕궁으로 돌아온다. 드로우콜이 **100 이하**를 유지한다

- [ ] **Step 10: 커밋**

```bash
git add src/data/palaces.js src/core/clock.js src/systems/movement.js
git add tests/data/palaces.test.js tests/core/place-cost.test.js dist/어전.html
git commit -m "feat: 경복궁 맵과 화재 변형 2종, 그리고 하루가 정말로 모자라도록 장소 값을 매긴다"
```

---

### Task 7: 불 렌더 — 파티클과 탄 전각

설계서 12.1 「불 — 캔버스 스프라이트 + 가산 블렌딩」. **`THREE.Points` 하나로 끝낸다.** 드로우콜 예산이 100이고 C1에서 60fps를 지켜야 하므로 불 하나에 여러 개를 쓸 수 없다.

**Files:**
- Create: `src/render/fire.js`
- Modify: `src/render/palace.js`
- Modify: `src/render/scene.js`

**Interfaces:**
- Consumes: `three` (인자로 받는다 — `palace.js`의 관례를 따른다)
- Produces:
  - `emberTexture(size = 64): HTMLCanvasElement`
  - `createFire(THREE, { count = 160 }): Fire`
    - `Fire = { object3D: THREE.Points, setSources(list: Array<{x, z, strength: number}>): void, update(nowMs: number): void, dispose(): void }`
    - `setSources([])`이면 보이지 않는다
  - `buildHall(THREE, tex, { w, d, h, bays, burnt })` — `burnt: true`면 지붕을 없애고 재질을 그을린 색으로 바꾼다
  - `buildPalace`는 각 방의 `r.burnt`를 읽어 `buildHall`에 넘긴다 (**서명 불변**)

- [ ] **Step 1: 불 파티클 구현**

`src/render/fire.js`:

```js
export function emberTexture(size = 64) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0.0, 'rgba(255,240,200,1)')
  grd.addColorStop(0.35, 'rgba(255,168,60,0.85)')
  grd.addColorStop(0.7, 'rgba(190,60,20,0.35)')
  grd.addColorStop(1.0, 'rgba(120,20,0,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, size, size)
  return c
}

export function createFire(THREE, { count = 160 } = {}) {
  const positions = new Float32Array(count * 3)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const tex = new THREE.CanvasTexture(emberTexture(64))
  const mat = new THREE.PointsMaterial({
    map: tex,
    size: 4.2,
    sizeAttenuation: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })

  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  points.visible = false

  // 입자마다 고정된 난수 — 프레임마다 새로 뽑으면 불이 지글거리지 않고 튄다
  const seed = Array.from({ length: count }, () => ({
    a: Math.random() * Math.PI * 2,
    r: Math.random(),
    speed: 0.6 + Math.random() * 1.1,
    phase: Math.random() * 1000,
    life: 1.1 + Math.random() * 1.4,
  }))

  let sources = []

  function setSources(list) {
    sources = list ?? []
    points.visible = sources.length > 0
  }

  function update(nowMs) {
    if (!points.visible) return
    const t = nowMs / 1000
    for (let i = 0; i < count; i++) {
      const s = sources[i % sources.length]
      const k = seed[i]
      const spread = 5 + 7 * s.strength
      const age = ((t * k.speed + k.phase) % k.life) / k.life
      positions[i * 3 + 0] = s.x + Math.cos(k.a) * k.r * spread
      positions[i * 3 + 1] = 1 + age * (6 + 10 * s.strength)
      positions[i * 3 + 2] = s.z + Math.sin(k.a) * k.r * spread
    }
    geo.attributes.position.needsUpdate = true
    mat.opacity = 0.55 + 0.25 * Math.sin(t * 7)
  }

  function dispose() {
    geo.dispose()
    mat.dispose()
    tex.dispose()
  }

  return { object3D: points, setSources, update, dispose }
}
```

- [ ] **Step 2: 탄 전각 재질**

`src/render/palace.js`의 `buildHall` 서명과 본문 앞부분을 고친다. **불타지 않은 전각의 결과는 한 픽셀도 바뀌지 않아야 한다.**

```js
export function buildHall(THREE, tex, { w, d, h = 7, bays = 5, burnt = false }) {
  const g = new THREE.Group()

  const charred = () => new THREE.MeshLambertMaterial({ color: 0x2a2622 })

  // 기단
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(w + 3, 1.2, d + 3),
    new THREE.MeshLambertMaterial({ color: burnt ? 0x6f6a60 : 0x9a9384 })
  )
  base.position.y = 0.6
  g.add(base)

  // 기둥 — InstancedMesh 로 드로우콜을 아낀다
  const colGeo = new THREE.CylinderGeometry(0.42, 0.46, burnt ? h * 0.45 : h, 8)
  const colMat = burnt ? charred() : new THREE.MeshLambertMaterial({ map: tex.wood })
  const rows = 2
  const count = bays * rows
  const cols = new THREE.InstancedMesh(colGeo, colMat, count)
  const m = new THREE.Matrix4()
  let i = 0
  for (let r = 0; r < rows; r++) {
    for (let b = 0; b < bays; b++) {
      const x = -w / 2 + (w / (bays - 1)) * b
      const z = r === 0 ? -d / 2 : d / 2
      m.makeTranslation(x, 1.2 + (burnt ? h * 0.225 : h / 2), z)
      cols.setMatrixAt(i++, m)
    }
  }
  cols.instanceMatrix.needsUpdate = true
  g.add(cols)

  if (burnt) return g   // 벽·창방·지붕은 타 없어졌다

  // 벽 (창호지)
  const wall = new THREE.Mesh(
    new THREE.BoxGeometry(w, h * 0.72, d),
    new THREE.MeshLambertMaterial({ map: tex.paper })
  )
  wall.position.y = 1.2 + h * 0.36
  g.add(wall)

  // 창방 (단청 띠)
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(w + 1.5, 0.9, d + 1.5),
    new THREE.MeshLambertMaterial({ map: tex.dancheong })
  )
  beam.position.y = 1.2 + h - 0.45
  g.add(beam)

  // 지붕 — 팔작지붕을 사각뿔대로 단순화
  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, Math.max(w, d) * 0.78, 3.2, 4),
    new THREE.MeshLambertMaterial({ map: tex.roof })
  )
  roof.rotation.y = Math.PI / 4
  roof.position.y = 1.2 + h + 1.6
  roof.scale.set(1, 1, d / w)
  g.add(roof)

  return g
}
```

`buildPalace`의 `buildHall` 호출에 한 줄을 더한다.

```js
    const hall = buildHall(THREE, tex, {
      w: r.w * 0.72,
      d: r.d * 0.72,
      h: r.id === 'injeongjeon' || r.id === 'geunjeongjeon' ? 10 : 7,
      bays: r.w > 24 ? 7 : 5,
      burnt: r.burnt === true,
    })
```

- [ ] **Step 3: 씬에 불을 붙인다**

`src/render/scene.js`에 두 줄을 더한다. `createScene`의 반환에 `fire`를 얹고, `render()`에서 갱신한다.

```js
import { createFire } from './fire.js'
```

`player`를 만든 뒤:

```js
  const fire = createFire(THREE, { count: 160 })
  scene.add(fire.object3D)
```

`render()`의 첫 줄 앞에:

```js
  function render() {
    fire.update(performance.now())
    camera.position.set(player.position.x, CAM_HEIGHT, player.position.z + CAM_DIST)
```

반환 객체에 추가:

```js
  return { THREE, scene, camera, renderer, player, fire, setPalace, resize, render, stats }
```

- [ ] **Step 4: 손으로 검증한다**

Run: `npm run build`, 브라우저에서 열고 콘솔에:

```js
__go('gyeongbok')
```
그다음 (렌더 컨텍스트를 잡기 위해 `boot`가 돌려준 `io`가 필요하므로, 이 검증만을 위해 `boot` 안에 `globalThis.__fire = (list) => ctx.fire.setSources(list)`를 임시로 둔다. **Task 17에서 지운다.**)

```js
__fire([{ x: 34, z: -38, strength: 1 }])
```

확인할 것:
1. 자경전 자리에서 주황색 불꽃이 위로 올라가며 밝기가 일렁인다
2. `__fire([])` 로 사라진다
3. 불이 켜진 상태에서도 **60fps · 드로우콜 100 이하**를 유지한다 (우상단 계측)
4. `__go('gyeongbok_burnt')` → 근정전·사정전·수정전·자경전이 **지붕 없이 그을린 기둥만** 남는다. 광화문은 멀쩡하다

3번이 미달이면 `count`를 100으로 줄이고 다시 잰다. 그래도 안 되면 멈추고 보고한다.

- [ ] **Step 5: 커밋**

```bash
git add src/render/fire.js src/render/palace.js src/render/scene.js src/main.js dist/어전.html
git commit -m "feat: 불 파티클(Points 1개)과 그을린 전각 — 같은 맵을 세 상태로 쓴다"
```

---

### Task 8: 이어(移御) 시퀀스

설계서 5장 B. **사건 목록이 아니라 임금이 집을 옮긴 기록이 이 게임의 뼈대다.** 그리고 엔딩에서 학생이 그 횟수를 세게 된다(4단계). 그러므로 옮길 때마다 **반드시 기록에 남겨야 한다.**

**⚠ 음력은 적고 양력은 적지 않는다.** `history-verification-A.md`가 네 건의 **음력 날짜를 실록 기사 ID까지 확정**했다. 양력 일 단위 환산만 「확인불가」다. 이어 화면은 **연도 + 음력 날짜**를 적고, 하단에 양력 미확정 고지를 붙인다.

**Files:**
- Create: `src/systems/relocate.js`
- Create: `tests/systems/relocate.test.js`
- Create: `src/ui/move-screen.js`
- Modify: `src/main.js` (`move` 비트 핸들러)

**Interfaces:**
- Consumes: `src/data/palaces.js` → `baseOf`
- Produces:
  - `relocate(state, { year, from, to, cause, self }): GameState` — `state.moves`에 한 줄을 더하고 `palace`를 바꾼다. 조작권은 **바꾸지 않는다** (비트의 `control`이 이미 `applyBeat`에서 처리했다)
  - `moveCount(state): number`
  - `selfChosenMoves(state): Move[]`
  - `lastMove(state): Move | null`
  - `createMoveScreen(root): { show(view): Promise<void> }`
    - `view = { year, lunarDate, fromName, toName, cause, self, note }`
    - `lunarDate`는 실록에서 확인한 음력 날짜 문자열(예: `'음력 7월 2일'`). 양력은 넣지 않는다

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/systems/relocate.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { createState } from '../../src/core/state.js'
import { relocate, moveCount, selfChosenMoves, lastMove } from '../../src/systems/relocate.js'

const move1868 = { year: 1868, from: 'changdeok', to: 'gyeongbok', cause: '중건 완료', self: false }
const move1875 = { year: 1875, from: 'changdeok', to: 'gyeongbok', cause: '환어', self: true }

describe('이어 기록', () => {
  it('옮기면 궁이 바뀌고 기록이 한 줄 남는다', () => {
    const s = relocate(createState(), move1868)
    expect(s.palace).toBe('gyeongbok')
    expect(s.moves).toEqual([move1868])
  })

  it('조작권은 건드리지 않는다', () => {
    const s = relocate({ ...createState(), control: 'B' }, move1868)
    expect(s.control).toBe('B')
  })

  it('원본 상태를 건드리지 않는다', () => {
    const s0 = createState()
    relocate(s0, move1868)
    expect(s0.moves).toEqual([])
    expect(s0.palace).toBe('changdeok')
  })

  it('여러 번 옮기면 순서대로 쌓인다', () => {
    let s = relocate(createState(), move1868)
    s = relocate(s, { year: 1873, from: 'gyeongbok', to: 'changdeok', cause: '자경전 화재', self: false })
    s = relocate(s, move1875)
    expect(moveCount(s)).toBe(3)
    expect(s.moves.map(m => m.year)).toEqual([1868, 1873, 1875])
    expect(s.palace).toBe('gyeongbok')
  })

  it('화재 변형으로 옮겨도 같은 궁이면 기록하지 않는다', () => {
    const s0 = { ...createState(), palace: 'gyeongbok' }
    const s = relocate(s0, { year: 1873, from: 'gyeongbok', to: 'gyeongbok_jagyeong', cause: '불탄 뒤', self: false })
    expect(s.palace).toBe('gyeongbok_jagyeong')
    expect(moveCount(s)).toBe(0)
  })

  it('스스로 정한 이동만 골라낼 수 있다', () => {
    let s = relocate(createState(), move1868)
    s = relocate(s, move1875)
    expect(selfChosenMoves(s).map(m => m.year)).toEqual([1875])
  })

  it('마지막 이동을 알 수 있다', () => {
    expect(lastMove(createState())).toBeNull()
    expect(lastMove(relocate(createState(), move1868)).year).toBe(1868)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/systems/relocate.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/systems/relocate.js`:

```js
import { baseOf } from '../data/palaces.js'

export function relocate(state, { year, from, to, cause, self }) {
  const sameHouse = baseOf(from) === baseOf(to)
  return {
    ...state,
    palace: to,
    moves: sameHouse ? state.moves : [...state.moves, { year, from, to, cause, self }],
  }
}

export function moveCount(state) {
  return state.moves.length
}

export function selfChosenMoves(state) {
  return state.moves.filter(m => m.self === true)
}

export function lastMove(state) {
  return state.moves.length ? state.moves[state.moves.length - 1] : null
}
```

> **같은 궁의 화재 변형으로 넘어가는 것은 이어가 아니다.** 불탄 경복궁도 경복궁이다. `baseOf`로 걸러야 엔딩에서 「여덟 번」이 맞는다.

- [ ] **Step 4: 이어 화면 구현**

`src/ui/move-screen.js`:

```js
const CSS = `
.move{position:fixed;inset:0;z-index:55;background:#0f1113;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:14px;padding:28px;text-align:center;
  animation:movein .5s ease-out}
@keyframes movein{from{opacity:0}to{opacity:1}}
.move .year{font-size:13px;color:#8f8a7c;letter-spacing:5px}
.move .lunar{font-size:12px;color:#6b6558;letter-spacing:2px;margin-top:-6px}
.move .path{font-size:30px;color:#e8e2d4;letter-spacing:4px}
.move .path b{font-weight:400;color:#e0a23a}
.move .cause{font-size:16px;color:#b9b2a1}
.move .self{font-size:13px;color:#8f8a7c;letter-spacing:2px}
.move .note{margin-top:6px;border:1px dashed #6a5230;color:#8f8a7c;font-size:12px;
  padding:8px 12px;border-radius:3px;max-width:480px;line-height:1.6;white-space:pre-line}
.move button{margin-top:10px;padding:12px 30px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:15px;cursor:pointer}
`

let styled = false

export function createMoveScreen(root) {
  if (!styled) {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    styled = true
  }

  return {
    show(view) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'move'
        el.innerHTML = `
          <div class="year">${view.year}</div>
          <div class="lunar">${view.lunarDate ?? ''}</div>
          <div class="path">${view.fromName} <b>→</b> ${view.toName}</div>
          <div class="cause">${view.cause}</div>
          <div class="self">${view.self ? '스스로 정하신 이동이다' : ''}</div>
          ${view.note ? `<div class="note">${view.note}</div>` : ''}
          <button>${view.self ? '돌아간다' : '옮긴다'}</button>`
        root.appendChild(el)
        el.querySelector('button').addEventListener('click', () => { el.remove(); resolve() })
      })
    },
  }
}
```

> **조작권이 왜 바뀌었는지 설명하지 않는다.** 설계서 5장 B — 「이동의 성격을 UI 텍스트로 설명하지 않는다. 키보드가 대신 말한다.」 이 화면에는 등급 글자가 한 개도 없다. 학생은 다음 낮에 문이 열리거나 막힌 것으로 안다. `스스로 정하신 이동이다` 한 줄만 예외로 두는데, 이것은 엔딩에서 학생이 세어야 할 것이기 때문이다.

- [ ] **Step 5: `move` 비트를 러너에 붙인다**

`src/main.js`:

```js
import { relocate } from './systems/relocate.js'
import { createMoveScreen } from './ui/move-screen.js'
```

`boot` 안, `sullyeom` 옆에:

```js
  const moveScreen = createMoveScreen(root)
```

`playBeat`의 `switch`에 한 줄:

```js
      case 'move':    return await playMove(beat)
```

핸들러:

```js
  const SOLAR_NOTE =
    '※ 음력 날짜는 『고종실록』에서 확인했습니다. 양력 일 단위 환산은 확정하지 못해 적지 않습니다.'

  async function playMove(beat) {
    const from = live.prevPalace ?? live.state.palace
    const fromName = PALACES[from].name
    const toName = PALACES[beat.palace].name
    await moveScreen.show({
      year: beat.year,
      lunarDate: beat.lunarDate ?? '',
      fromName, toName,
      cause: beat.cause,
      self: beat.self === true,
      note: `${beat.sillok ? beat.sillok + '\n' : ''}${SOLAR_NOTE}`,
    })
    return relocate(live.state, {
      year: beat.year, from, to: beat.palace, cause: beat.cause, self: beat.self === true,
    })
  }
```

`playAct` 안에서 `applyBeat` **앞에** 이전 궁을 기억한다. `applyBeat`이 이미 `palace`를 바꿔 놓기 때문이다.

```js
      const beat = beatAt(act, live.state.beatIndex)
      live.prevPalace = live.state.palace
      live.state = applyBeat(live.state, beat)
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run tests/systems/relocate.test.js`
Expected: PASS 7/7

- [ ] **Step 7: 커밋**

```bash
git add src/systems/relocate.js src/ui/move-screen.js src/main.js tests/systems/relocate.test.js
git commit -m "feat: 이어 시퀀스 — 옮긴 기록을 남기고, 확정 못 한 날짜는 적지 않는다"
```

---

### Task 9: E 지연 — 강화도에서 오는 장계

설계서 5장 E. **강화도에서 전쟁이 나는데 왕은 한양에 있다.** 지도에 뜨는 적 함대 위치는 어제의 정보다. 그리고 **왕은 강화도에 갈 수 없다.**

**Files:**
- Create: `src/systems/dispatch.js`
- Create: `tests/systems/dispatch.test.js`
- Create: `src/ui/dispatch-map.js`
- Modify: `src/main.js` (`dispatch` 비트 핸들러)

**Interfaces:**
- Consumes: 없음
- Produces:
  - ```
    Dispatch = {
      id: string, place: string, placeName: string,
      sentDay: number, lagDays: number,
      headline: string, body: string,
      origin: string, grade: 'textbook'|'source'|'staged',
      marker: { x: number, y: number }     // 지도 안 0~1 좌표
    }
    ```
  - `arrivalDay(d: Dispatch): number`
  - `arrivedAt(list: Dispatch[], day: number): Dispatch[]`
  - `pendingAt(list, day): Dispatch[]`
  - `latestAt(list, day): Dispatch | null` — 도착한 것 중 **가장 늦게 보낸** 것
  - `lagDaysAt(list, day): number | null`
  - `lagLabelAt(list, day): string`
  - `createDispatchMap(root): { show(view): Promise<void> }`
    - `view = { title, day, dispatches, cannotGo: string }`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/systems/dispatch.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  arrivalDay, arrivedAt, pendingAt, latestAt, lagDaysAt, lagLabelAt,
} from '../../src/systems/dispatch.js'

const list = [
  { id: 'a', place: 'ganghwa',    sentDay: 0, lagDays: 2, headline: '함대가 물길을 거슬러 올랐다' },
  { id: 'b', place: 'ganghwa',    sentDay: 2, lagDays: 2, headline: '갑곶에 내렸다' },
  { id: 'c', place: 'pyeongyang', sentDay: 0, lagDays: 6, headline: '평양의 일' },
]

describe('E 장계 지연', () => {
  it('도착일은 보낸 날 더하기 걸린 날이다', () => {
    expect(arrivalDay(list[0])).toBe(2)
    expect(arrivalDay(list[2])).toBe(6)
  })

  it('첫날에는 아무 장계도 안 왔다', () => {
    expect(arrivedAt(list, 0)).toEqual([])
    expect(pendingAt(list, 0)).toHaveLength(3)
  })

  it('이틀째에 첫 장계가 온다', () => {
    expect(arrivedAt(list, 2).map(d => d.id)).toEqual(['a'])
  })

  it('평양 소식은 강화도보다 늦게 온다', () => {
    expect(arrivedAt(list, 4).map(d => d.id)).toEqual(['a', 'b'])
    expect(arrivedAt(list, 6).map(d => d.id)).toEqual(['a', 'b', 'c'])
  })

  it('가장 늦게 보낸 도착분을 고른다', () => {
    expect(latestAt(list, 4).id).toBe('b')
    expect(latestAt(list, 2).id).toBe('a')
    expect(latestAt(list, 0)).toBeNull()
  })

  it('며칠 전 정보인지 센다', () => {
    expect(lagDaysAt(list, 4)).toBe(2)   // 2일에 보낸 것을 4일에 본다
    expect(lagDaysAt(list, 5)).toBe(3)
    expect(lagDaysAt(list, 0)).toBeNull()
  })

  it('화면 문구를 만든다', () => {
    expect(lagLabelAt(list, 4)).toBe('2일 전 장계 기준')
    expect(lagLabelAt(list, 0)).toBe('아직 장계가 오지 않았다')
  })

  it('보낸 그날 도착한 장계면 0일 전이라고 말하지 않는다', () => {
    const now = [{ id: 'z', place: 'hanyang', sentDay: 3, lagDays: 0, headline: '' }]
    expect(lagLabelAt(now, 3)).toBe('오늘 들어온 장계')
  })

  it('빈 목록도 안전하다', () => {
    expect(arrivedAt([], 5)).toEqual([])
    expect(lagLabelAt([], 5)).toBe('아직 장계가 오지 않았다')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/systems/dispatch.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/systems/dispatch.js`:

```js
export function arrivalDay(d) {
  return d.sentDay + d.lagDays
}

export function arrivedAt(list, day) {
  return (list ?? []).filter(d => arrivalDay(d) <= day)
}

export function pendingAt(list, day) {
  return (list ?? []).filter(d => arrivalDay(d) > day)
}

export function latestAt(list, day) {
  const arrived = arrivedAt(list, day)
  if (arrived.length === 0) return null
  return arrived.reduce((best, d) => (d.sentDay > best.sentDay ? d : best))
}

export function lagDaysAt(list, day) {
  const latest = latestAt(list, day)
  return latest ? day - latest.sentDay : null
}

export function lagLabelAt(list, day) {
  const lag = lagDaysAt(list, day)
  if (lag === null) return '아직 장계가 오지 않았다'
  if (lag === 0) return '오늘 들어온 장계'
  return `${lag}일 전 장계 기준`
}
```

- [ ] **Step 4: 장계 지도 구현**

`src/ui/dispatch-map.js`:

```js
import { arrivedAt, pendingAt, lagLabelAt } from '../systems/dispatch.js'

const W = 360
const H = 240

const CSS = `
.dispatch{position:fixed;inset:0;z-index:52;background:#0f1113ee;display:flex;
  flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;overflow:auto}
.dispatch h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:3px;font-weight:400}
.dispatch .lag{font-size:13px;color:#d2503a;letter-spacing:2px}
.dispatch canvas{background:#141a1e;border:1px solid #3a4248;border-radius:3px;width:${W}px;max-width:92vw}
.dispatch .rows{width:${W}px;max-width:92vw;display:flex;flex-direction:column;gap:6px}
.dispatch .row{text-align:left;padding:9px 12px;background:#23282c;border:1px solid #3a4248;
  border-radius:3px;color:#e8e2d4;font-size:14px;cursor:pointer}
.dispatch .row:hover{background:#2f363c}
.dispatch .row .org{display:block;font-size:11px;color:#8f8a7c;margin-top:3px}
.dispatch .body{width:${W}px;max-width:92vw;background:#e8e2d4;color:#23201a;border-radius:3px;
  padding:14px 16px;font-size:14px;line-height:1.75;white-space:pre-wrap}
.dispatch .pending{font-size:12px;color:#6b6558}
.dispatch .cannot{width:${W}px;max-width:92vw;padding:11px;text-align:center;border:1px dashed #4a3a2a;
  border-radius:3px;color:#6b6558;font-size:13px}
.dispatch button.go{padding:12px 28px;background:#3a2d20;border:1px solid #6a5230;color:#e0a23a;
  border-radius:3px;font-size:15px;cursor:pointer}
`

let styled = false

function drawMap(g, arrived) {
  g.clearRect(0, 0, W, H)
  // 바다
  g.fillStyle = '#16232b'
  g.fillRect(0, 0, W, H)
  // 뭍 — 실측 지도가 아니라 위치 관계만 보여주는 모식도다
  g.fillStyle = '#26302b'
  g.beginPath()
  g.moveTo(W * 0.42, 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(W * 0.34, H)
  g.closePath(); g.fill()
  // 강화도
  g.fillStyle = '#2e3a33'
  g.beginPath(); g.ellipse(W * 0.22, H * 0.52, W * 0.10, H * 0.17, 0, 0, Math.PI * 2); g.fill()

  const label = (x, y, text, color) => {
    g.fillStyle = color
    g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill()
    g.font = '12px system-ui, sans-serif'
    g.fillText(text, x + 8, y + 4)
  }
  label(W * 0.72, H * 0.45, '한양', '#e0a23a')
  label(W * 0.22, H * 0.52, '강화도', '#8f8a7c')
  label(W * 0.16, H * 0.13, '평양', '#8f8a7c')

  for (const d of arrived) {
    g.fillStyle = 'rgba(210,80,58,0.9)'
    g.beginPath(); g.arc(W * d.marker.x, H * d.marker.y, 6, 0, Math.PI * 2); g.fill()
    g.strokeStyle = 'rgba(210,80,58,0.35)'
    g.lineWidth = 2
    g.beginPath(); g.arc(W * d.marker.x, H * d.marker.y, 12, 0, Math.PI * 2); g.stroke()
  }
}

export function createDispatchMap(root) {
  if (!styled) {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    styled = true
  }

  return {
    show(view) {
      return new Promise(resolve => {
        const arrived = arrivedAt(view.dispatches, view.day)
        const waiting = pendingAt(view.dispatches, view.day)

        const el = document.createElement('div')
        el.className = 'dispatch'
        el.innerHTML = `
          <h2>${view.title}</h2>
          <div class="lag">${lagLabelAt(view.dispatches, view.day)}</div>
          <canvas width="${W}" height="${H}"></canvas>
          <div class="rows">${arrived.map(d => `
            <button class="row" data-id="${d.id}">${d.placeName} — ${d.headline}
              <span class="org">${d.origin}</span></button>`).join('')
            || '<div class="pending">아직 아무 장계도 닿지 않았다.</div>'}</div>
          <div class="body" hidden></div>
          <div class="pending">${waiting.length ? `아직 오지 않은 장계 ${waiting.length}통` : ''}</div>
          <div class="cannot">${view.cannotGo}</div>
          <button class="go">결정하러 간다</button>`
        root.appendChild(el)

        drawMap(el.querySelector('canvas').getContext('2d'), arrived)

        const body = el.querySelector('.body')
        el.querySelectorAll('.row').forEach(btn => {
          btn.addEventListener('click', () => {
            const d = arrived.find(x => x.id === btn.dataset.id)
            body.hidden = false
            body.textContent = `${d.body}\n\n${d.origin}`
          })
        })

        el.querySelector('.go').addEventListener('click', () => { el.remove(); resolve() })
      })
    },
  }
}
```

> **`cannotGo` 한 줄이 이 장면의 전부다.** 지도에 강화도가 보이는데 갈 수 없다. 설계서 7장 2막 비트 2 — 「강화도에 갈 수 없다. 장계만 온다.」

- [ ] **Step 5: `dispatch` 비트를 러너에 붙인다**

`src/main.js`:

```js
import { createDispatchMap } from './ui/dispatch-map.js'
```

```js
  const dispatchMap = createDispatchMap(root)
```

`playBeat`의 `switch`에:

```js
      case 'dispatch': return await playDispatch(beat)
```

핸들러:

```js
  async function playDispatch(beat) {
    await dispatchMap.show({
      title: beat.title,
      day: beat.day,
      dispatches: beat.dispatches,
      cannotGo: beat.cannotGo,
    })
    return live.state
  }
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run tests/systems/dispatch.test.js`
Expected: PASS 9/9

- [ ] **Step 7: 커밋**

```bash
git add src/systems/dispatch.js src/ui/dispatch-map.js src/main.js tests/systems/dispatch.test.js
git commit -m "feat: E 지연 — ○일 전 장계 기준으로만 보이는 지도, 강화도에는 갈 수 없다"
```

---

### Task 10: D1 소실 — 외규장각 도서 약탈

설계서 5장 D1. **모은 사료 카드가 사라진다. 영구히.** `plunder()`는 1단계에서 이미 구현·검증되었다(`src/systems/codex.js`, 잠금). 여기서는 **왜 사라졌는지를 사초함이 기억하게** 만들고 화면에 붙인다.

**Files:**
- Create: `src/systems/loss-log.js`
- Create: `tests/systems/loss-log.test.js`
- Create: `src/ui/loss-screen.js`
- Modify: `src/ui/dialog.js`
- Modify: `src/main.js` (`plunder` 비트 핸들러)

**Interfaces:**
- Consumes: `src/systems/codex.js` → `plunder`, `isLost` (**고치지 않는다**)
- Produces:
  - `LOSS_LABEL: { plunder: '약탈됨 · 프랑스', fire: '불탐' }`
  - `recordLoss(state, ids: string[], reason: 'plunder'|'fire'): GameState` — `state.lostBy`에 사유를 적는다
  - `lossReason(state, id): 'plunder'|'fire'|null`
  - `lossLabel(state, id): string` — 사유를 모르면 `'잃음'`
  - `lostWithReason(state, reason): string[]`
  - `createLossScreen(root): { show(view): Promise<void> }`
    - `view = { title, lines, cards: Array<{title, origin}>, origin, footer }`

> **`state.lostBy`는 `createState()`에 없는 필드다.** `src/core/state.js`는 잠금이고 이미 테스트로 고정되어 있으므로 **고치지 않는다.** `deserialize`는 `version`만 검사하므로 세이브에 섞여도 무해하다 — 1단계 판정 R5가 `state.room`에 대해 내린 것과 같은 판단이다. 모든 읽기는 `state.lostBy ?? {}`로 방어한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/systems/loss-log.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { createState } from '../../src/core/state.js'
import { pickUp, markRead, plunder, survive, isLost, isRead } from '../../src/systems/codex.js'
import {
  LOSS_LABEL, recordLoss, lossReason, lossLabel, lostWithReason,
} from '../../src/systems/loss-log.js'

function hold(state, ids) {
  return ids.reduce((s, id) => markRead(pickUp(s, id), id), state)
}

describe('소실 사유 기록', () => {
  it('사유가 없으면 그냥 잃음이다', () => {
    expect(lossReason(createState(), 'x')).toBeNull()
    expect(lossLabel(createState(), 'x')).toBe('잃음')
  })

  it('약탈로 기록하면 프랑스라고 말한다', () => {
    const s = recordLoss(createState(), ['oegyujanggak'], 'plunder')
    expect(lossReason(s, 'oegyujanggak')).toBe('plunder')
    expect(lossLabel(s, 'oegyujanggak')).toBe(LOSS_LABEL.plunder)
    expect(lossLabel(s, 'oegyujanggak')).toContain('프랑스')
  })

  it('화재로 기록하면 불탐이라고 말한다', () => {
    const s = recordLoss(createState(), ['a', 'b'], 'fire')
    expect(lossLabel(s, 'a')).toBe('불탐')
    expect(lostWithReason(s, 'fire').sort()).toEqual(['a', 'b'])
  })

  it('두 사유가 섞여도 구분된다', () => {
    let s = recordLoss(createState(), ['p'], 'plunder')
    s = recordLoss(s, ['f'], 'fire')
    expect(lostWithReason(s, 'plunder')).toEqual(['p'])
    expect(lostWithReason(s, 'fire')).toEqual(['f'])
  })

  it('원본 상태를 건드리지 않는다', () => {
    const s0 = createState()
    recordLoss(s0, ['x'], 'fire')
    expect(s0.lostBy).toBeUndefined()
  })

  it('lostBy 가 없는 옛 세이브에서도 터지지 않는다', () => {
    const old = createState()
    delete old.lostBy
    expect(() => lossLabel(old, 'x')).not.toThrow()
    expect(lostWithReason(old, 'fire')).toEqual([])
  })
})

describe('약탈이 사초함에 미치는 결과', () => {
  it('읽었던 카드도 열람에서 빠져 선택지가 다시 잠긴다', () => {
    let s = hold(createState(), ['oegyujanggak', 'yangheonsu', 'bellonet'])
    expect(isRead(s, 'oegyujanggak')).toBe(true)
    s = plunder(s, ['oegyujanggak'])
    s = recordLoss(s, ['oegyujanggak'], 'plunder')
    expect(isRead(s, 'oegyujanggak')).toBe(false)
    expect(isLost(s, 'oegyujanggak')).toBe(true)
    expect(isRead(s, 'bellonet')).toBe(true)
    expect(lossLabel(s, 'oegyujanggak')).toContain('프랑스')
  })

  it('양헌수 장계는 약탈에 휩쓸리지 않는다 — 강화도 서고에 있던 물건이 아니다 (R17)', () => {
    let s = hold(createState(), ['oegyujanggak', 'yangheonsu'])
    s = plunder(s, ['oegyujanggak'])
    s = recordLoss(s, ['oegyujanggak'], 'plunder')
    expect(isLost(s, 'yangheonsu')).toBe(false)
    expect(isRead(s, 'yangheonsu')).toBe(true)
    expect(lossReason(s, 'yangheonsu')).toBeNull()
  })

  it('약탈당한 카드는 다시 주울 수 없다', () => {
    let s = plunder(hold(createState(), ['oegyujanggak']), ['oegyujanggak'])
    s = pickUp(s, 'oegyujanggak')
    expect(s.sources.held).toEqual([])
  })

  it('불로 잃은 것과 약탈로 잃은 것이 사초함에서 다르게 보인다', () => {
    let s = hold(createState(), ['a', 'b', 'c', 'd'])
    s = plunder(s, ['a'])
    s = recordLoss(s, ['a'], 'plunder')
    const doomed = s.sources.held.filter(id => !['b'].includes(id))
    s = survive(s, ['b'])
    s = recordLoss(s, doomed, 'fire')
    expect(lossLabel(s, 'a')).toBe(LOSS_LABEL.plunder)
    expect(lossLabel(s, 'c')).toBe(LOSS_LABEL.fire)
    expect(s.sources.held).toEqual(['b'])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/systems/loss-log.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/systems/loss-log.js`:

```js
export const LOSS_LABEL = {
  plunder: '약탈됨 · 프랑스',
  fire: '불탐',
}

export function recordLoss(state, ids, reason) {
  const lostBy = { ...(state.lostBy ?? {}) }
  for (const id of ids) lostBy[id] = reason
  return { ...state, lostBy }
}

export function lossReason(state, id) {
  return (state.lostBy ?? {})[id] ?? null
}

export function lossLabel(state, id) {
  const r = lossReason(state, id)
  return r ? LOSS_LABEL[r] : '잃음'
}

export function lostWithReason(state, reason) {
  return Object.entries(state.lostBy ?? {})
    .filter(([, r]) => r === reason)
    .map(([id]) => id)
}
```

- [ ] **Step 4: 소실 화면 구현**

`src/ui/loss-screen.js`:

```js
const CSS = `
.loss{position:fixed;inset:0;z-index:54;background:#0f1113;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:14px;padding:28px;text-align:center}
.loss h2{margin:0;font-size:16px;color:#d2503a;letter-spacing:4px;font-weight:400}
.loss p{margin:0;font-size:18px;color:#e8e2d4;line-height:1.8;max-width:600px}
.loss .cards{display:flex;flex-direction:column;gap:6px;width:100%;max-width:480px;margin-top:6px}
.loss .card-row{padding:10px 14px;border:1px solid #4a3a2a;border-radius:3px;color:#a09884;
  text-decoration:line-through;text-align:left;font-size:14px}
.loss .card-row span{float:right;font-size:11px;color:#d2503a;text-decoration:none}
.loss .origin{font-size:12px;color:#6b6558}
.loss .footer{font-size:13px;color:#8f8a7c;max-width:520px;line-height:1.7}
.loss button{margin-top:8px;padding:12px 30px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:15px;cursor:pointer}
`

let styled = false

export function createLossScreen(root) {
  if (!styled) {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    styled = true
  }

  return {
    show(view) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'loss'
        el.innerHTML = `
          <h2>${view.title}</h2>
          ${(view.lines ?? []).map(l => `<p>${l}</p>`).join('')}
          <div class="cards">${view.cards.map(c =>
            `<div class="card-row">${c.title}<span>${view.tag}</span></div>`).join('')}</div>
          <div class="origin">${view.origin}</div>
          ${view.footer ? `<div class="footer">${view.footer}</div>` : ''}
          <button>사초함을 닫는다</button>`
        root.appendChild(el)
        el.querySelector('button').addEventListener('click', () => { el.remove(); resolve() })
      })
    },
  }
}
```

- [ ] **Step 5: 사초함이 소실 사유를 보여주게 한다**

`src/ui/dialog.js`의 `showCodex`를 고친다. import 한 줄과 `row` 함수만 바뀐다.

```js
import { SOURCES } from '../data/sources.js'
import { isRead, isLost } from '../systems/codex.js'
import { lossLabel } from '../systems/loss-log.js'
```

```js
    showCodex(state, onClose) {
      const row = (c) => {
        if (isLost(state, c.id)) {
          return `<div class="row gone">${c.title}<span class="tag">${lossLabel(state, c.id)}</span></div>`
        }
        if (isRead(state, c.id)) return `<div class="row">${c.title}</div>`
        return `<div class="row">${c.title}<span class="tag">아직 안 읽음</span></div>`
      }
      const held = SOURCES.filter(c => state.sources.held.includes(c.id))
      const gone = SOURCES.filter(c => state.sources.lost.includes(c.id))
      open(`<div class="card codex">
        <h3>사초함</h3>
        <div class="grp"><b>가지고 있는 문서 ${held.length}</b>${held.map(row).join('') || '<div class="row">아직 없다</div>'}</div>
        <div class="grp"><b>잃어버린 문서 ${gone.length}</b>${gone.map(row).join('') || '<div class="row">아직 없다</div>'}</div>
        <button class="close">닫기 (Q)</button>
      </div>`, onClose)
    },
```

- [ ] **Step 6: `plunder` 비트를 러너에 붙인다**

`src/main.js`:

```js
import { plunder } from './systems/codex.js'
import { recordLoss } from './systems/loss-log.js'
import { createLossScreen } from './ui/loss-screen.js'
```

`pickUp, markRead` import 줄에 `plunder`를 함께 넣어도 된다.

```js
  const lossScreen = createLossScreen(root)
```

`playBeat`의 `switch`에:

```js
      case 'plunder': return await playPlunder(beat)
```

핸들러 — **보유하지 않은 카드는 잃을 것도 없다.** 학생이 규장각에 안 갔다면 이 장면에서 잃는 것이 없고, 그것 또한 사실이다.

```js
  async function playPlunder(beat) {
    const taken = beat.cardIds.filter(id => live.state.sources.held.includes(id))
    let next = plunder(live.state, taken)
    next = recordLoss(next, taken, 'plunder')
    await lossScreen.show({
      title: beat.title,
      lines: beat.lines,
      tag: '약탈됨 · 프랑스',
      cards: taken.length
        ? taken.map(id => ({ title: sourceById(id).title }))
        : [{ title: '가지고 있던 것이 없다' }],
      origin: beat.origin,
      footer: beat.footer,
    })
    return next
  }
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npx vitest run tests/systems/loss-log.test.js && npm test`
Expected: PASS 10/10, 전체도 통과. **`tests/systems/codex.test.js`가 그대로 통과해야 한다** — `codex.js`를 한 글자도 안 고쳤기 때문이다.

- [ ] **Step 8: 커밋**

```bash
git add src/systems/loss-log.js src/ui/loss-screen.js src/ui/dialog.js src/main.js tests/systems/loss-log.test.js
git commit -m "feat: D1 외규장각 약탈 — 사초함이 왜 잃었는지 기억한다"
```

---

### Task 11: F1 친필 — 척화비 열두 글자

설계서 5장 F1. `洋夷侵犯 非戰則和 主和賣國` · 교과서 p.108 · 등급 **교과서**. **잘 쓸 필요는 없다. 자기 손이 움직였다는 감각이 목적이다.**

**Files:**
- Create: `src/systems/brush-trace.js`
- Create: `tests/systems/brush-trace.test.js`
- Create: `src/ui/brush.js`
- Modify: `src/main.js` (`brush` 비트 핸들러)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `CHEOKHWABI_LINES: string[]` — `['洋夷侵犯', '非戰則和', '主和賣國']`
  - `CHEOKHWABI_GLYPHS: string[]` — 열두 글자
  - `CHEOKHWABI_REST: Array<{ text: string, gloss: string }>` — **비문에서 이 열두 자 뒤에 이어지는 것**(`戒我萬年子孫` · `丙寅作 辛未立`). 검증 C 1항
  - `CHEOKHWABI_PARTIAL_NOTE: string` — 「비문 일부 발췌」 고지 한 줄
  - `HIT_RADIUS: number` · `DONE_RATIO: number`
  - `coverage(guides: Point[], marks: Point[], radius: number): number` — 0~1. `guides`가 비면 1
  - `isTraced(guides, marks, radius?, need?): boolean`
  - `createBrush(root): { open(view): Promise<void> }`
    - `view = { title, glyphs: string[], meaning, origin, grade, afterLines: string[], partial?: string, rest?: Array<{text, gloss}> }`
    - `partial`·`rest`는 생략하면 `CHEOKHWABI_PARTIAL_NOTE`·`CHEOKHWABI_REST`가 들어간다. **둘 다 화면에 반드시 뜬다** — 발췌를 발췌라고 밝히는 것이 이 화면의 조건이다

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/systems/brush-trace.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  CHEOKHWABI_LINES, CHEOKHWABI_GLYPHS, CHEOKHWABI_REST, CHEOKHWABI_PARTIAL_NOTE,
  HIT_RADIUS, DONE_RATIO, coverage, isTraced,
} from '../../src/systems/brush-trace.js'

const guides = [
  { x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 },
]

describe('척화비 글자', () => {
  it('세 마디 열두 글자다', () => {
    expect(CHEOKHWABI_LINES).toEqual(['洋夷侵犯', '非戰則和', '主和賣國'])
    expect(CHEOKHWABI_GLYPHS).toHaveLength(12)
    expect(CHEOKHWABI_GLYPHS.join('')).toBe('洋夷侵犯非戰則和主和賣國')
  })

  it('열두 자는 비문 전체가 아니라 앞부분이다 — 뒤가 무엇인지 데이터로 들고 있다 (검증 C)', () => {
    expect(CHEOKHWABI_REST.map(r => r.text)).toEqual(['戒我萬年子孫', '丙寅作 辛未立'])
    for (const r of CHEOKHWABI_REST) expect(r.gloss).toBeTruthy()
    expect(CHEOKHWABI_PARTIAL_NOTE).toContain('발췌')
    // 뒤따르는 구절이 학생이 쓰는 열두 자와 겹치지 않는다
    expect(CHEOKHWABI_REST.some(r => CHEOKHWABI_GLYPHS.join('').includes(r.text))).toBe(false)
  })
})

describe('획 판정', () => {
  it('아무것도 안 그으면 0 이다', () => {
    expect(coverage(guides, [], 0.1)).toBe(0)
  })

  it('안내점 위를 다 지나가면 1 이다', () => {
    expect(coverage(guides, guides, 0.01)).toBe(1)
  })

  it('절반만 지나가면 0.5 다', () => {
    expect(coverage(guides, [guides[0], guides[1]], 0.01)).toBe(0.5)
  })

  it('반지름 안이면 닿은 것으로 본다', () => {
    expect(coverage([{ x: 0.5, y: 0.5 }], [{ x: 0.54, y: 0.5 }], 0.05)).toBe(1)
    expect(coverage([{ x: 0.5, y: 0.5 }], [{ x: 0.6, y: 0.5 }], 0.05)).toBe(0)
  })

  it('안내점이 없으면 판정 없이 통과다 — 한자 글꼴이 없는 기기에서도 막히지 않는다', () => {
    expect(coverage([], [], 0.1)).toBe(1)
    expect(isTraced([], [])).toBe(true)
  })

  it('기준을 넘으면 다 쓴 것으로 본다', () => {
    expect(isTraced(guides, [guides[0]], 0.01)).toBe(false)
    expect(isTraced(guides, [guides[0], guides[1], guides[2]], 0.01)).toBe(true)
  })

  it('기본 기준은 반쯤만 지나가도 통과다 — 잘 쓸 필요는 없다', () => {
    expect(DONE_RATIO).toBeLessThanOrEqual(0.6)
    expect(HIT_RADIUS).toBeGreaterThan(0)
  })

  it('같은 곳을 여러 번 지나가도 한 번으로 센다', () => {
    const marks = [guides[0], guides[0], guides[0], guides[0]]
    expect(coverage(guides, marks, 0.01)).toBe(0.25)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/systems/brush-trace.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/systems/brush-trace.js`:

```js
export const CHEOKHWABI_LINES = ['洋夷侵犯', '非戰則和', '主和賣國']
export const CHEOKHWABI_GLYPHS = CHEOKHWABI_LINES.join('').split('')

// 학생이 쓰는 열두 자는 비문의 '앞부분'이다. 실제 비석은 여기서 끝나지 않는다 — 사료 검증 C 1항.
// 12자 본문은 현존 36기 사이에 이견이 없으나, 그 뒤에 경고문 6자와 연호 4자가 이어진다.
export const CHEOKHWABI_REST = [
  { text: '戒我萬年子孫', gloss: '우리 자손 만대에 경계하노라' },
  { text: '丙寅作 辛未立', gloss: '병인년(1866)에 짓고 신미년(1871)에 세운다' },
]
export const CHEOKHWABI_PARTIAL_NOTE =
  '※ 비문 일부 발췌 — 학생이 쓰는 열두 자는 비문의 앞부분이며, 실제 비석에는 뒤가 더 있습니다'

export const HIT_RADIUS = 0.06
export const DONE_RATIO = 0.55

export function coverage(guides, marks, radius = HIT_RADIUS) {
  if (!guides || guides.length === 0) return 1
  let hit = 0
  for (const g of guides) {
    for (const m of marks) {
      if (Math.hypot(g.x - m.x, g.y - m.y) <= radius) { hit++; break }
    }
  }
  return hit / guides.length
}

export function isTraced(guides, marks, radius = HIT_RADIUS, need = DONE_RATIO) {
  return coverage(guides, marks, radius) >= need
}
```

- [ ] **Step 4: 붓 화면 구현**

안내점은 **글자를 캔버스에 그려서 검은 픽셀을 뽑아 만든다.** 획 데이터를 손으로 적지 않아도 되고, 파일도 늘지 않는다(전역 제약: 외부 리소스 0건).

`src/ui/brush.js`:

```js
import {
  coverage, isTraced, HIT_RADIUS, CHEOKHWABI_REST, CHEOKHWABI_PARTIAL_NOTE,
} from '../systems/brush-trace.js'

const S = 320
const HANJA_FONT = '"Batang","BatangChe","Gungsuh","SimSun","MS Mincho","Noto Serif CJK KR",serif'

const CSS = `
.brush{position:fixed;inset:0;z-index:56;background:#0f1113;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:12px;padding:22px;text-align:center;overflow:auto}
.brush h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:4px;font-weight:400}
.brush .line{font-size:22px;color:#e8e2d4;letter-spacing:10px}
.brush .line b{color:#e0a23a;font-weight:400}
.brush .paper{background:#efe6cf;border:1px solid #8a6a44;border-radius:2px;touch-action:none;cursor:crosshair}
.brush .count{font-size:12px;color:#8f8a7c;letter-spacing:2px}
.brush .partial{font-size:12px;color:#8f8a7c;border:1px dashed #6a5230;border-radius:3px;
  padding:6px 12px;max-width:520px;line-height:1.6}
.brush .rest{max-width:520px;text-align:left;font-size:14px;color:#6b6558;line-height:1.9;
  border-top:1px solid #cfc4a8;padding-top:12px;margin-top:4px}
.brush .rest b{color:#23201a;font-weight:400;letter-spacing:4px}
.brush .meaning{font-size:14px;color:#b9b2a1;max-width:520px;line-height:1.8}
.brush .origin{font-size:12px;color:#6b6558}
.brush .row{display:flex;gap:10px}
.brush button{padding:10px 22px;background:#23282c;border:1px solid #3a4248;color:#e8e2d4;
  border-radius:3px;font-size:14px;cursor:pointer}
.brush button.go{background:#3a2d20;border-color:#6a5230;color:#e0a23a}
.brush .after{max-width:560px;background:#e8e2d4;color:#23201a;border-radius:4px;padding:20px 22px;
  line-height:1.9;font-size:16px;text-align:left;white-space:pre-wrap}
`

let styled = false

function glyphGuides(ch, want = 90) {
  const c = document.createElement('canvas')
  const N = 96
  c.width = c.height = N
  const g = c.getContext('2d', { willReadFrequently: true })
  g.fillStyle = '#fff'
  g.fillRect(0, 0, N, N)
  g.fillStyle = '#000'
  g.font = `${Math.round(N * 0.82)}px ${HANJA_FONT}`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(ch, N / 2, N / 2 + N * 0.04)

  const data = g.getImageData(0, 0, N, N).data
  const dark = []
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (data[(y * N + x) * 4] < 128) dark.push({ x: x / N, y: y / N })
    }
  }
  if (dark.length < 20) return []          // 글꼴이 이 글자를 못 그린다 — 판정 없이 통과시킨다
  const stride = Math.max(1, Math.floor(dark.length / want))
  const out = []
  for (let i = 0; i < dark.length; i += stride) out.push(dark[i])
  return out
}

export function createBrush(root) {
  if (!styled) {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    styled = true
  }

  return {
    open(view) {
      return new Promise(resolve => {
        const el = document.createElement('div')
        el.className = 'brush'
        // 이 열두 자는 비문 전체가 아니다. 쓰는 동안 화면에 그렇게 적어 둔다 — 사료 검증 C 1항
        const partial = view.partial ?? CHEOKHWABI_PARTIAL_NOTE
        const rest = view.rest ?? CHEOKHWABI_REST

        el.innerHTML = `
          <h2>${view.title}</h2>
          <div class="line"></div>
          <canvas class="paper" width="${S}" height="${S}"></canvas>
          <div class="count"></div>
          <div class="partial">${partial}</div>
          <div class="meaning">${view.meaning}</div>
          <div class="origin">${view.origin}</div>
          <div class="row"><button class="next">이 글자는 이만</button></div>`
        root.appendChild(el)

        const canvas = el.querySelector('canvas')
        const g = canvas.getContext('2d')
        const lineEl = el.querySelector('.line')
        const countEl = el.querySelector('.count')

        let index = 0
        let guides = []
        let marks = []
        let drawing = false

        function paint() {
          g.fillStyle = '#efe6cf'
          g.fillRect(0, 0, S, S)
          // 안내점
          g.fillStyle = 'rgba(138,106,68,0.28)'
          for (const p of guides) g.fillRect(p.x * S - 1, p.y * S - 1, 3, 3)
          // 학생의 획
          g.strokeStyle = '#1b1a17'
          g.lineWidth = 11
          g.lineCap = 'round'
          g.lineJoin = 'round'
          g.beginPath()
          let pen = false
          for (const m of marks) {
            if (m.break) { pen = false; continue }
            if (!pen) { g.moveTo(m.x * S, m.y * S); pen = true }
            else g.lineTo(m.x * S, m.y * S)
          }
          g.stroke()
        }

        function loadGlyph() {
          guides = glyphGuides(view.glyphs[index])
          marks = []
          lineEl.innerHTML = view.glyphs
            .map((ch, i) => (i === index ? `<b>${ch}</b>` : ch))
            .join('')
          countEl.textContent = `${index + 1} / ${view.glyphs.length} 자` +
            (guides.length === 0 ? '  ·  이 기기에는 한자 글꼴이 없어 안내선 없이 씁니다' : '')
          paint()
        }

        function nextGlyph() {
          index++
          if (index >= view.glyphs.length) { finish(); return }
          loadGlyph()
        }

        function at(ev) {
          const r = canvas.getBoundingClientRect()
          return { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height }
        }

        canvas.addEventListener('pointerdown', (ev) => {
          drawing = true
          canvas.setPointerCapture(ev.pointerId)
          marks.push({ break: true })
          marks.push(at(ev))
          paint()
        })
        canvas.addEventListener('pointermove', (ev) => {
          if (!drawing) return
          marks.push(at(ev))
          paint()
        })
        canvas.addEventListener('pointerup', () => {
          drawing = false
          if (isTraced(guides, marks.filter(m => !m.break), HIT_RADIUS)) {
            setTimeout(nextGlyph, 260)
          } else {
            countEl.textContent =
              `${index + 1} / ${view.glyphs.length} 자  ·  ${Math.round(coverage(guides, marks.filter(m => !m.break)) * 100)}%`
          }
        })

        el.querySelector('.next').addEventListener('click', nextGlyph)

        function finish() {
          // 다 쓰고 나서 비문의 나머지를 보여준다. 학생이 쓴 것이 전부가 아님을 여기서 밝힌다
          const restHtml = rest.length
            ? `<div class="rest">이 열두 자 뒤에 비석은 이렇게 이어진다.<br><br>` +
              rest.map(r => `<b>${r.text}</b> — ${r.gloss}`).join('<br>') +
              `<br><br>${partial}</div>`
            : ''
          el.innerHTML = `
            <h2>${view.title}</h2>
            <div class="after">${view.afterLines.join('\n')}${restHtml}</div>
            <div class="origin">${view.origin}</div>
            <div class="row"><button class="go">붓을 놓는다</button></div>`
          el.querySelector('.go').addEventListener('click', () => { el.remove(); resolve() })
        }

        loadGlyph()
      })
    },
  }
}
```

- [ ] **Step 5: `brush` 비트를 러너에 붙인다**

`src/main.js`:

```js
import { createBrush } from './ui/brush.js'
import { CHEOKHWABI_GLYPHS } from './systems/brush-trace.js'
```

```js
  const brush = createBrush(root)
```

`playBeat`의 `switch`에:

```js
      case 'brush': return await playBrush(beat)
```

핸들러 — **다 쓰고 나면 그 비문이 사초함에 카드로 들어온다.** 자기 손으로 쓴 것을 읽은 것으로 친다.

```js
  async function playBrush(beat) {
    await brush.open({
      title: beat.title,
      glyphs: beat.glyphs ?? CHEOKHWABI_GLYPHS,
      meaning: beat.meaning,
      origin: beat.origin,
      afterLines: beat.afterLines,
      partial: beat.partial,        // 없으면 CHEOKHWABI_PARTIAL_NOTE 가 들어간다
      rest: beat.rest,              // 없으면 CHEOKHWABI_REST 가 들어간다
    })
    if (!beat.grantCard) return live.state
    return markRead(pickUp(live.state, beat.grantCard), beat.grantCard)
  }
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run tests/systems/brush-trace.test.js`
Expected: PASS 10/10

- [ ] **Step 7: 손으로 검증한다 (Task 12에서 2막에 붙인 뒤 함께 확인해도 된다)**

임시 통로를 `boot`에 둔다. **Task 17에서 지운다.**

```js
  globalThis.__brush = () => brush.open({
    title: '척 화 비', glyphs: CHEOKHWABI_GLYPHS,
    meaning: '서양 오랑캐가 침범하는데 싸우지 않으면 곧 화친하는 것이요, 화친을 주장하는 것은 나라를 파는 것이다.',
    origin: '『고등 한국사1』 p.108 수록 · 우리말 옮김',
    afterLines: ['열두 글자를 다 썼다.'],
    // partial·rest 를 넘기지 않으면 CHEOKHWABI_PARTIAL_NOTE·CHEOKHWABI_REST 가 들어간다
  })
```

확인할 것:
1. `__brush()` → 창호지 빛 종이와 `洋` 자의 흐린 안내점, 위에 `洋夷侵犯非戰則和主和賣國` 중 현재 글자가 금색
2. 종이 아래에 **`※ 비문 일부 발췌 …` 한 줄이 쓰는 내내 떠 있다**
3. 마우스로 획을 그으면 검은 먹선이 남는다
4. 안내점을 반쯤 덮으면 **자동으로 다음 글자로 넘어간다**
5. 덜 덮으면 `○○%`가 뜬다. `이 글자는 이만` 버튼으로 언제든 넘어간다 — **막히는 곳이 없어야 한다**
6. 열두 자를 다 쓰면 마무리 화면에 **`戒我萬年子孫`과 `丙寅作 辛未立`이 뜻풀이와 함께 뜬다** → `붓을 놓는다`
7. 안내점이 아예 안 보이면 한자 글꼴이 없는 것이다. `이 기기에는 한자 글꼴이 없어…` 안내가 뜨고 **그래도 진행된다**

2번·5번·6번·7번이 이 태스크의 합격 기준이다. **친필은 실패할 수 없는 장면이고, 발췌는 발췌라고 말해야 한다.**

- [ ] **Step 8: 커밋**

```bash
git add src/systems/brush-trace.js src/ui/brush.js src/main.js tests/systems/brush-trace.test.js
git commit -m "feat: F1 척화비 열두 글자 — 획은 손으로, 판정은 느슨하게, 막히는 곳은 없게"
```

---

### Task 12: 2막 「양요」 완주

설계서 7장 2막. **창덕궁에서 시작해 1868년에 경복궁으로 옮긴다. 조작권은 처음부터 끝까지 C다.** 새 집인데 내 집이 아니다.

**주의**: 병인양요(1866)는 창덕궁 시기, 신미양요(1871)는 경복궁 시기다. **맵을 섞지 않는다.**

**Files:**
- Modify: `src/data/acts.js` (2막 추가)
- Modify: `tests/data/acts.test.js` (2막 검사 추가)

**Interfaces:**
- Consumes: Task 4~11에서 만든 비트 종류 `note`·`explore`·`dispatch`·`council`·`plunder`·`move`·`brush`
- Produces: `ACTS[1]` — id `'yangyo'`

- [ ] **Step 1: 2막 검사를 먼저 쓴다**

`tests/data/acts.test.js` 끝에 붙인다.

```js
describe('2막 「양요」', () => {
  const a = actById('yangyo')

  it('창덕궁에서 시작해 경복궁으로 한 번 옮긴다', () => {
    expect(a.palace).toBe('changdeok')
    expect(palaceTimeline(a)).toEqual(['changdeok', 'gyeongbok'])
    expect(beatsOf(a).filter(b => b.kind === 'move')).toHaveLength(1)
  })

  it('조작권이 처음부터 끝까지 C 다 — 새 집인데 내 집이 아니다', () => {
    expect(controlTimeline(a)).toEqual(['C'])
  })

  it('장계 비트가 두 번 — 병인양요와 신미양요 — 있다', () => {
    expect(beatsOf(a).filter(b => b.kind === 'dispatch')).toHaveLength(2)
  })

  it('병인양요 장계는 창덕궁 국면, 신미양요 장계는 경복궁 국면에 있다', () => {
    const ks = beatsOf(a).map(b => b.kind)
    const moveAt = ks.indexOf('move')
    const dispatchAt = ks.map((k, i) => (k === 'dispatch' ? i : -1)).filter(i => i >= 0)
    expect(dispatchAt[0]).toBeLessThan(moveAt)
    expect(dispatchAt[1]).toBeGreaterThan(moveAt)
  })

  it('모든 장계에 출처와 등급이 붙어 있다', () => {
    for (const b of beatsOf(a).filter(b => b.kind === 'dispatch')) {
      for (const d of b.dispatches) {
        expect(d.origin, d.id).toBeTruthy()
        expect(['textbook', 'source', 'staged'], d.id).toContain(d.grade)
        expect(d.marker, d.id).toBeTruthy()
      }
    }
  })

  it('어제의 정보만 보인다 — 모든 장계에 걸리는 날이 하루 이상이다', () => {
    for (const b of beatsOf(a).filter(b => b.kind === 'dispatch')) {
      for (const d of b.dispatches) expect(d.lagDays, d.id).toBeGreaterThan(0)
    }
  })

  it('D1 약탈 대상은 「외규장각 도서 목록」 한 장이다 — 판정 R17·검증 C', () => {
    const p = beatsOf(a).find(b => b.kind === 'plunder')
    expect(p.cardIds).toEqual(['oegyujanggak'])
    expect(p.cardIds).not.toContain('yangheonsu')
  })

  it('약탈은 이어보다 먼저 일어난다 — 1866년 일이고 이어는 1868년이다', () => {
    const ks = beatsOf(a).map(b => b.kind)
    expect(ks.indexOf('plunder')).toBeLessThan(ks.indexOf('move'))
  })

  it('척화비를 쓰고 나면 그 비문이 사초함에 들어온다', () => {
    const b = beatsOf(a).find(x => x.kind === 'brush')
    expect(b.grantCard).toBe('cheokhwabi')
    expect(b.glyphs.join('')).toBe('洋夷侵犯非戰則和主和賣國')
  })

  it('척화비 비트가 「발췌」임을 밝힌다 — 검증 C', () => {
    const b = beatsOf(a).find(x => x.kind === 'brush')
    expect(b.origin).toContain('발췌')
    expect(b.afterLines.join(' ')).toContain('앞부분')
  })

  it('어전회의의 요구 사료가 모두 실재하는 카드다', () => {
    const known = new Set(SOURCES.map(c => c.id))
    for (const act of ACTS) {
      for (const b of beatsOf(act).filter(b => b.kind === 'council')) {
        for (const ch of b.council.choices) {
          for (const id of ch.requires ?? []) expect(known, `${act.id}/${ch.id}/${id}`).toContain(id)
        }
      }
    }
  })

  it('어전회의에는 언제나 아무것도 안 읽고도 고를 수 있는 선택지가 있다 — 회의는 그냥 열린다', () => {
    for (const act of ACTS) {
      for (const b of beatsOf(act).filter(b => b.kind === 'council')) {
        expect(b.council.choices.some(c => (c.requires ?? []).length === 0), `${act.id}/${b.id}`).toBe(true)
      }
    }
  })
})
```

파일 위쪽 import 에 `actById`, `palaceTimeline`, `SOURCES`를 더한다.

```js
import { ACTS, actById } from '../../src/data/acts.js'
import { beatsOf, controlTimeline, palaceTimeline } from '../../src/systems/scenario.js'
import { SOURCES } from '../../src/data/sources.js'
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/data/acts.test.js`
Expected: FAIL — `actById('yangyo')` 가 `undefined`

- [ ] **Step 3: 2막을 `ACTS` 배열에 더한다**

`src/data/acts.js`의 `ACTS` 배열, 1막 다음에 넣는다.

```js
  {
    id: 'yangyo',
    title: '양요',
    year: 1866,
    dateLabel: '고종 3년 · 1866 · 창덕궁',
    palace: 'changdeok',
    control: 'C',
    beats: [
      {
        id: 'byeongin',
        kind: 'note',
        title: '1866, 창덕궁',
        lines: [
          '천주교를 금하고, 프랑스 신부와 신도들을 처형하였다.',
          '아버지는 그것을 나라의 기강이라 하신다.',
          '조정에서는 아직 아무도 그 뒤를 걱정하지 않는다.',
        ],
        origin: '『고등 한국사1』 p.108 · 『고종실록』 고종 3년(1866)',
        grade: 'source',
      },
      {
        id: 'day-changdeok',
        kind: 'explore',
        dayUnits: 6,
        dateLabel: '고종 3년 · 1866 · 창덕궁',
        exit: { room: 'injeongjeon', label: 'E — 들어온 장계를 살핀다' },
      },
      {
        id: 'byeongin-dispatch',
        kind: 'dispatch',
        title: '강 화 도',
        day: 3,
        cannotGo: '임금은 도성을 떠날 수 없다. 강화도의 일은 장계로만 들어온다.',
        dispatches: [
          {
            id: 'by1', place: 'ganghwa', placeName: '강화 앞바다',
            sentDay: 0, lagDays: 2,
            headline: '이양선 여러 척이 물길을 거슬러 올랐다',
            body: '양선(洋船) 여러 척이 강화 앞바다에 이르러 물길의 깊이를 재고 있습니다.',
            origin: '『고종실록』 고종 3년(1866) · 우리말 옮김',
            grade: 'source',
            marker: { x: 0.24, y: 0.60 },
          },
          {
            id: 'by2', place: 'ganghwa', placeName: '강화부',
            sentDay: 2, lagDays: 1,
            headline: '강화부가 저들의 손에 들어갔다',
            body: '저들이 갑곶에 내려 강화부로 들어갔습니다. 창고와 서고가 저들의 손에 있습니다.',
            origin: '『고종실록』 고종 3년(1866) · 우리말 옮김',
            grade: 'source',
            marker: { x: 0.20, y: 0.47 },
          },
          {
            id: 'by3', place: 'pyeongyang', placeName: '평양',
            sentDay: 0, lagDays: 6,
            headline: '대동강에서 이양선을 불살랐다',
            body: '평양의 일은 이미 여러 달 전이나, 문서가 이제야 닿았습니다.',
            origin: '『고등 한국사1』 p.109 수록 · 우리말 옮김',
            grade: 'textbook',
            marker: { x: 0.16, y: 0.14 },
          },
        ],
      },
      {
        id: 'council-byeongin',
        kind: 'council',
        council: {
          question: '프랑스 함대가 강화도에 있다. 맞설 것인가, 물러설 것인가',
          choices: [
            { id: 'fight',  text: '물러서지 않는다. 군사를 보내 지킨다',            requires: [] },
            { id: 'defer',  text: '장계가 더 올 때까지 대답을 미룬다',              requires: [] },
            { id: 'letter', text: '저들이 보낸 글을 근거로 그 뜻을 따진다',          requires: ['bellonet'] },
            { id: 'castle', text: '정족산성의 형세를 근거로 지킬 곳을 정한다',        requires: ['yangheonsu'] },
            { id: 'again',  text: '평양의 일을 들어, 저들이 다시 올 것을 말한다',     requires: ['sherman'] },
          ],
        },
        actual: {
          line: '조선은 물러서지 않았다. 양헌수가 정족산성에서 프랑스군을 물리쳤고, 프랑스 함대는 한 달여 만에 강화도에서 철수하였다. 물러가면서 외규장각에 있던 어람용 의궤와 어책·어필 297책, 그리고 은괴 열아홉 상자를 배에 실었다. 싣지 못한 나머지 서적과 서고 건물은 불태웠다.',
          origin: '『고등 한국사1』 p.108 · 『고종실록』 고종 3년(1866)',
        },
      },
      {
        // D1 대상은 외규장각 도서 목록 한 장뿐이다 — 판정 R17 · 사료 검증 C 5항.
        // 양헌수의 장계는 승정원으로 올라간 문서이므로 강화도 서고에서 실려 나가지 않는다.
        id: 'oegyujanggak-plunder',
        kind: 'plunder',
        cardIds: ['oegyujanggak'],
        title: '외 규 장 각',
        lines: [
          '프랑스 함대가 강화도에서 물러갔다.',
          '물러가면서, 임금만 보던 의궤와 어책을 배에 실었다. 은괴 열아홉 상자도 함께였다.',
          '싣지 못한 나머지는 서고째 불태웠다.',
          '사초함에서 그 문서가 사라진다. 되찾을 수 없다.',
        ],
        origin: '『고등 한국사1』 p.108 · 국가유산포털 외규장각 의궤',
        footer: '우리가 아는 역사는, 살아남은 기록뿐이다.',
      },
      {
        id: 'move-1868',
        kind: 'move',
        palace: 'gyeongbok',
        control: 'C',
        year: 1868,
        lunarDate: '고종 5년 음력 7월 2일',
        sillok: '『고종실록』 5권 · "移御于景福宮" — 대왕대비전·왕대비전·대비전·중궁전이 함께 이어하였다.',
        cause: '경복궁 중건이 끝났다. 아버지가 지으신 집이다.',
        self: false,
        dateLabel: '고종 5년 · 1868 · 경복궁',
      },
      {
        id: 'day-gyeongbok',
        kind: 'explore',
        dayUnits: 6,
        dateLabel: '고종 5년~8년 · 경복궁',
        exit: { room: 'gwanghwamun', label: 'E — 광화문에 나가 선다' },
      },
      {
        id: 'sinmi-dispatch',
        kind: 'dispatch',
        title: '광 성 보',
        day: 5,
        cannotGo: '임금은 도성을 떠날 수 없다. 광성보의 일도 장계로만 들어온다.',
        dispatches: [
          {
            id: 'sn1', place: 'ganghwa', placeName: '초지진',
            sentDay: 0, lagDays: 2,
            headline: '미국 함대가 초지진에 이르렀다',
            body: '이양선이 초지진 앞에 이르러 포를 쏘았고, 진에서도 마주 쏘았습니다.',
            origin: '『고종실록』 고종 8년(1871) · 우리말 옮김',
            grade: 'source',
            marker: { x: 0.26, y: 0.63 },
          },
          {
            id: 'sn2', place: 'ganghwa', placeName: '광성보',
            sentDay: 3, lagDays: 2,
            headline: '광성보가 무너지고 어재연이 전사하였다',
            body: '진무중군 어재연과 군사들이 끝까지 물러서지 않고 싸우다 모두 죽었습니다.',
            origin: '『고등 한국사1』 p.109 수록 · 우리말 옮김',
            grade: 'textbook',
            marker: { x: 0.21, y: 0.55 },
          },
        ],
      },
      {
        id: 'cheokhwabi-brush',
        kind: 'brush',
        title: '척 화 비',
        glyphs: ['洋', '夷', '侵', '犯', '非', '戰', '則', '和', '主', '和', '賣', '國'],
        grantCard: 'cheokhwabi',
        meaning: '서양 오랑캐가 침범하는데 싸우지 않으면 곧 화친하는 것이요, 화친을 주장하는 것은 나라를 파는 것이다.',
        origin: '『고등 한국사1』 p.108 수록 · 우리말 옮김 · 비문 일부 발췌',
        // partial·rest 를 넘기지 않으므로 brush.js 가 CHEOKHWABI_PARTIAL_NOTE·CHEOKHWABI_REST 를 쓴다.
        // 열두 자는 비문의 앞부분이며 뒤에 경고문 6자와 연호 4자가 이어진다 — 사료 검증 C 1항
        afterLines: [
          '열두 글자를 다 썼다.',
          '',
          '이 비석이 전국 200여 곳에 세워졌다.',
          '이제 조정 안에서 다른 말을 꺼내기가 어려워졌다.',
          '',
          '─ 이 열두 자는 교과서에 실린 것이다. 지어낸 글자가 하나도 없다.',
          '─ 다만 이것은 비문의 전부가 아니라 앞부분이다.',
        ],
      },
      {
        id: 'end',
        kind: 'note',
        title: '2 막 「양 요」 끝',
        lines: [
          '두 번 물리쳤다. 그리고 문은 더 굳게 닫혔다.',
          '경복궁에 들어와 살지만, 이 집을 지은 사람은 내가 아니다.',
        ],
      },
    ],
  },
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/data/acts.test.js`
Expected: PASS

- [ ] **Step 5: 손으로 2막을 완주한다**

Run: `npm run build`, 브라우저에서 열기. **1막을 마치고 이어서 2막으로 넘어가야 한다.**

**1회차 — 문서를 다 주우러 다닌다**
1. 1막을 끝낸다 (인정전 `E` → 회의 → 이유 → `다음`)
2. `1866, 창덕궁` 화면 → `다음`
3. 하단 쌀값이 `즉위 무렵의 1.2배`로 **올라 있다**
4. **창덕궁에 다섯 지점이 있고, 다 주우려면 여덟 칸이 든다. 하루는 여섯 칸이다.**

   | 어디 | 무엇 | 칸 |
   |---|---|---|
   | 규장각 | 외규장각 도서 목록 | 1 |
   | 선정전 | 개항에 찬성하는 말 | 1 |
   | 희정당 | 벨로네 서한 | 2 |
   | 희정당 | 셔먼호 보고 | 2 |
   | 희정당 | 양헌수 장계 | 2 |
   | | **합** | **8** |

   해 표시가 **1칸씩 / 2칸씩** 다르게 줄어드는 것을 눈으로 확인한다. 어전회의의 사료 선택지 셋을 다 열려면 벨로네·셔먼호·양헌수에 **여섯 칸을 전부** 써야 하고, **세 번째를 줍는 순간 그 자리에서 해가 져 낮이 끝난다** — 외규장각 목록을 집을 기회가 아예 없다. 그날 밤 프랑스가 실어 갈 바로 그 문서를. 반대로 외규장각 목록을 먼저 집으면 회의에서 선택지 하나가 `???`로 남는다. **다섯 장을 다 들고 회의에 들어가는 길은 없다. 여기가 이 막의 플레이다.**
5. 인정전에서 `E` → **장계 지도**. 위에 `1일 전 장계 기준`, 강화도에 붉은 점 둘, 아래 `아직 오지 않은 장계 1통`, 그리고 `임금은 도성을 떠날 수 없다`
6. `결정하러 간다` → 어전회의. **읽은 만큼만 열려 있다**
7. 「실제로는」 → 이유 → **외 규 장 각** 화면. **외규장각 목록 한 장만** 줄이 그어져 사라진다. **양헌수 장계는 사초함에 그대로 남아 있어야 한다** — 장계는 강화도 서고에 있던 물건이 아니다(판정 R17)
8. **이어 화면** — `1868` / `창덕궁 → 경복궁` / `경복궁 중건이 끝났다` / 날짜 미확정 고지
9. 경복궁이 나온다. 미니맵이 바뀌고 **자경전은 어둡다**(조작권 C, 자경전은 B)
10. `Q` → 사초함에 **「약탈됨 · 프랑스」**가 한 줄 — 외규장각 목록 하나다. **양헌수 장계는 「가지고 있는 문서」 쪽에 그대로 있다**
11. 경복궁 낮. **여기는 열여덟 칸어치가 놓여 있고 하루는 여섯 칸이다** — 수정전 세 장, 사정전 여섯 장, 전부 2칸씩. **한 낮에 세 장이 한계다.** 수정전에서 미군 장교 회고와 중건 기록을 줍고 광화문에서 `E` → 광성보 장계 → 척화비 열두 자(**「비문 일부 발췌」 고지가 뜬다**) → 마무리 화면에 **뒤따르는 구절** → `2 막 「양 요」 끝`

**2회차 — 아무 데도 안 들른다**
1. 1막·2막 낮을 마당에서만 보낸다
2. 어전회의에 **두 선택지만** 열려 있다 (`물러서지 않는다`, `대답을 미룬다`)
3. 외규장각 화면에 `가지고 있던 것이 없다`가 뜬다 — **잃을 것도 없었다**

**3회차 — 해가 모자라는 것을 손으로 확인한다**
1. 희정당에서 벨로네 서한과 셔먼호 보고를 줍는다(2+2). **해가 두 칸 남는다**
2. 규장각으로 가서 외규장각 목록을 줍는다(1). **해가 한 칸 남는다**
3. 다시 희정당의 양헌수 장계로 가서 `E` → **2칸이 드는데 1칸뿐이다. 아무 일도 일어나지 않고 배너로 `해가 모자란다`가 뜬다**
4. 선정전의 개항 찬성론(1칸)은 아직 주울 수 있다. 줍는 순간 **해가 0이 되고 그 자리에서 낮이 끝난다** — 어전회의가 저절로 열린다
5. 회의에 `정족산성의 형세를 근거로…`가 **`???`로 남아 있다.** 양헌수 장계를 못 읽었기 때문이다
6. 그날 밤 **외 규 장 각** 화면에서 애써 주운 그 목록이 줄이 그어져 사라진다

**반대로 회의만 노리면** — 희정당 세 장(2+2+2)으로 해를 다 쓰고 선택지 다섯이 모두 열리지만, 세 번째를 줍는 순간 낮이 끝나 **외규장각 목록을 집을 기회 자체가 없다.** 그날 밤 화면에는 `가지고 있던 것이 없다`가 뜬다.

4번(1회차)·11번(1회차)·2회차 3번·3회차 3번이 이 태스크의 합격 기준이다. **「가장 잘 준비한 학생이 그 문서만은 못 가졌다」가 이 게임이 하려는 말이다.**

- [ ] **Step 6: 커밋**

```bash
git add src/data/acts.js tests/data/acts.test.js dist/어전.html
git commit -m "feat: 2막 「양요」 — 지연되는 장계, 외규장각 약탈, 1868 이어, 척화비"
```

---

### Task 13: C1 촉박 — 1873 자경전 화재 90초

설계서 5장 C1. **90초. 불길이 방을 하나씩 삼킨다. 실패해도 그을린 채 나올 뿐 인명 피해는 없다 — 연습용이다.**
설계서 12.3 — **터치에서는 제한 시간을 1.3배로 준다.** 손가락이 키보드보다 느리다.

**Files:**
- Create: `src/systems/fire-rush.js`
- Create: `tests/systems/fire-rush.test.js`
- Modify: `src/main.js` (`rush` 비트 핸들러)

**Interfaces:**
- Consumes: `src/core/countdown.js` → `roomProgressAt`; `src/systems/rush-scene.js` → `startRush`
- Produces:
  - `rushDurationMs(baseMs: number, isTouch: boolean): number`
  - `fireSourcesAt(def: PalaceDef, rush: Rush, now: number): Array<{x, z, strength}>`
  - `isTouchDevice(): boolean`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/systems/fire-rush.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { createRush } from '../../src/core/countdown.js'
import { rushDurationMs, fireSourcesAt } from '../../src/systems/fire-rush.js'

const def = {
  id: 'gyeongbok',
  rooms: [
    { id: 'gwanghwamun',   x: 0,  z: 64 },
    { id: 'geunjeongjeon', x: 0,  z: 22 },
    { id: 'sajeongjeon',   x: 0,  z: -12 },
    { id: 'jagyeongjeon',  x: 34, z: -38 },
  ],
}

const TRACK = ['jagyeongjeon', 'sajeongjeon', 'geunjeongjeon', 'gwanghwamun']
const rush = createRush({ track: TRACK, totalMs: 90000, startedAt: 0 })

describe('촉박 시간 완화', () => {
  it('키보드는 그대로다', () => {
    expect(rushDurationMs(90000, false)).toBe(90000)
  })

  it('터치는 1.3배를 준다', () => {
    expect(rushDurationMs(90000, true)).toBe(117000)
  })

  it('언제나 정수 밀리초다', () => {
    expect(Number.isInteger(rushDurationMs(30001, true))).toBe(true)
  })
})

describe('불이 붙는 자리', () => {
  it('시작 순간에는 자경전 하나만 탄다', () => {
    const s = fireSourcesAt(def, rush, 0)
    expect(s).toHaveLength(1)
    expect(s[0]).toEqual({ x: 34, z: -38, strength: 1 })
  })

  it('절반이 지나면 자경전·사정전이 다 타고 근정전이 반쯤 탄다', () => {
    const s = fireSourcesAt(def, rush, 45000)
    expect(s).toHaveLength(3)
    expect(s.map(x => x.x)).toEqual([34, 0, 0])
    expect(s[0].strength).toBe(1)
    expect(s[1].strength).toBe(1)
    expect(s[2].strength).toBeCloseTo(0.5, 5)
  })

  it('끝나면 네 곳이 다 탄다', () => {
    expect(fireSourcesAt(def, rush, 90000)).toHaveLength(4)
  })

  it('트랙에 있어도 맵에 없는 방은 건너뛴다', () => {
    const r = createRush({ track: ['jagyeongjeon', '없는방'], totalMs: 1000, startedAt: 0 })
    expect(fireSourcesAt(def, r, 1000).map(s => s.x)).toEqual([34])
  })

  it('세기는 언제나 0 초과 1 이하다', () => {
    for (const t of [0, 1, 15000, 45000, 89999, 90000, 200000]) {
      for (const s of fireSourcesAt(def, rush, t)) {
        expect(s.strength, `t=${t}`).toBeGreaterThan(0)
        expect(s.strength, `t=${t}`).toBeLessThanOrEqual(1)
      }
    }
  })

  it('프레임과 무관하게 시각만 따른다', () => {
    expect(fireSourcesAt(def, rush, 33333)).toEqual(fireSourcesAt(def, rush, 33333))
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/systems/fire-rush.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/systems/fire-rush.js`:

```js
import { roomProgressAt } from '../core/countdown.js'

export const TOUCH_RELIEF = 1.3

export function rushDurationMs(baseMs, isTouch) {
  return Math.round(baseMs * (isTouch ? TOUCH_RELIEF : 1))
}

export function isTouchDevice() {
  if (typeof navigator === 'undefined') return false
  return (navigator.maxTouchPoints ?? 0) > 0
}

export function fireSourcesAt(def, rush, now) {
  const out = []
  for (const p of roomProgressAt(rush, now)) {
    if (p.filled <= 0) continue
    const room = def.rooms.find(r => r.id === p.id)
    if (!room) continue
    out.push({ x: room.x, z: room.z, strength: p.filled })
  }
  return out
}
```

- [ ] **Step 4: `rush` 비트를 러너에 붙인다**

**판정은 렌더 루프 안에서 `performance.now()`로만 한다.** `setInterval` 폴링을 쓰지 않는다 — 전역 제약이다.

`src/main.js`:

```js
import { startRush } from './systems/rush-scene.js'
import { rushDurationMs, fireSourcesAt, isTouchDevice } from './systems/fire-rush.js'
```

`playBeat`의 `switch`에:

```js
      case 'rush': return await playRush(beat)
```

핸들러:

```js
  function playRush(beat) {
    return new Promise((resolve) => {
      showNote(root, beat.intro).then(() => {
        const def = PALACES[live.state.palace]
        const from = def.rooms.find(r => r.id === beat.spawnRoom)
        ctx.player.position.set(from.x, 1.9, from.z)
        live.state = { ...live.state, room: from.id }

        live.session = startRush({
          track: beat.track,
          totalMs: rushDurationMs(beat.totalMs, isTouchDevice()),
          goalRoom: beat.goalRoom,
          now: performance.now(),
        })
        live.rush = live.session.rush
        live.moving = true
        live.interactive = false
        live.onRushEnd = (outcome) => {
          const caught = outcome === 'caught'
          banner(root, caught ? beat.onCaught : beat.onArrive)
          const next = caught && beat.caughtFlag
            ? { ...live.state, flags: { ...live.state.flags, [beat.caughtFlag]: true } }
            : live.state
          resolve(next)
        }
      })
    })
  }
```

프레임 루프의 `live.moving` 블록 **바로 뒤**에 넣는다.

```js
    if (live.session) {
      ctx.fire.setSources(fireSourcesAt(PALACES[live.state.palace], live.session.rush, now))
      const outcome = live.session.tick(now, live.state.room)
      if (outcome !== 'running') {
        const done = live.onRushEnd
        live.session = null
        live.rush = null
        live.moving = false
        live.onRushEnd = null
        ctx.fire.setSources([])
        done(outcome)
      }
    }
```

`live` 초기값에 **두 줄**을 더한다. 나머지 하나인 `rush: null`은 **Task 4에서 이미 넣었으므로 다시 넣지 않는다.**

```js
    session: null,
    onRushEnd: null,
```

- [ ] **Step 5: 3막의 C1 비트를 미리 넣는다**

Task 16에서 3막 전체를 쓰지만, **촉박은 여기서 검증해야 하므로** 비트 정의를 여기서 확정한다. Task 16은 이것을 그대로 3막 배열 안에 넣는다.

```js
      {
        id: 'jagyeong-fire',
        kind: 'rush',
        control: 'A',
        spawnRoom: 'jagyeongjeon',
        track: ['jagyeongjeon', 'sajeongjeon', 'geunjeongjeon', 'gwanghwamun'],
        goalRoom: 'gwanghwamun',
        totalMs: 90000,
        intro: {
          title: '고종 10년 음력 12월 10일 밤, 자경전에 불이 났다',
          lines: [
            '『고종실록』이 이 일에 대해 남긴 것은 네 글자다 ─ 「慈慶殿災」.',
            '불이 어디로 번졌는지, 임금이 어떻게 나왔는지는 실록에 없다.',
            '여기서부터는 재구성이다. Shift 를 눌러 달린다. 광화문까지 나가야 한다.',
          ],
          origin: '『고종실록』 10권, 고종 10년 음력 12월 10일 · 소실 규모(364칸 반)는 『승정원일기』 계통 기록이며 직접 대조하지 못했습니다',
          grade: 'staged',
        },
        onArrive: '그을리지 않고 나왔다',
        onCaught: '그을린 채 나왔다',
        caughtFlag: 'sootied',
      },
```

> **실패해도 역사는 바뀌지 않는다.** `caught`여도 다음 비트(창덕궁 이어)는 똑같이 일어난다. 남는 것은 `flags.sootied` 한 줄뿐이고, 그것은 4단계 엔딩의 기록에만 나온다. 여기에 게임 오버 화면은 없다.

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run tests/systems/fire-rush.test.js`
Expected: PASS 9/9

- [ ] **Step 7: 손으로 검증한다 — 이 태스크의 합격 기준**

임시 통로를 `boot`에 둔다. **Task 17에서 지운다.**

```js
  globalThis.__c1 = () => {
    live.state = { ...live.state, palace: 'gyeongbok', control: 'A' }
    syncPalace(live.state)
    return playRush(ACTS_C1_BEAT)   // 위 Step 5의 비트 객체를 상수로 잠시 둔다
  }
```

Run: `npm run build`, 브라우저에서.

**성공 경로**
1. `__c1()` → 자경전 자리에서 시작. 불꽃이 보이고 미니맵 자경전이 붉다
2. Shift로 달려 광화문까지 → `그을리지 않고 나왔다` 배너

**실패 경로**
1. 새로고침 후 `__c1()` → 가만히 있는다
2. 불이 사정전 → 근정전 → 광화문으로 번지고 90초 뒤 `그을린 채 나왔다`
3. **게임이 계속된다.** 실패 화면이 없다

**프레임 독립성 (합격 기준)**
1. `__c1()` 직후 개발자 도구에서 CPU 스로틀링 **6× slowdown**
2. 미니맵 아래 초 카운터가 **여전히 실시간으로** 줄어든다. 90초는 90초다
3. 불의 번짐도 실제 경과 시간과 맞는다

**성능 (합격 기준)**
- 창을 1280×720으로 맞추고 촉박 중 **60fps · 드로우콜 100 이하** 유지

**터치 완화**
- 개발자 도구 기기 모드(터치 에뮬레이션)로 새로고침 후 `__c1()` → 시작 초가 **117초**

이 네 가지 중 하나라도 미달이면 **멈추고 보고한다.** 설계서 14장이 M5를 기술 관문으로 못 박았다.

- [ ] **Step 8: 커밋**

```bash
git add src/systems/fire-rush.js src/main.js tests/systems/fire-rush.test.js dist/어전.html
git commit -m "feat: C1 자경전 화재 90초 — 불은 시각으로만 번지고, 터치는 1.3배를 준다"
```

---

### Task 14: D2 소실 — 불타는 궁에서 문서 세 장

설계서 5장 D2. **이 게임에서 가장 잔인한 선택이다.** 학생은 3막까지 모은 것 중 **세 장**을 고른다. 남긴 것은 4·5막에서 영영 쓸 수 없다.

**⚠ 세 가지를 분명히 한다.**
1. **여기에 카운트다운을 붙이지 않는다.** 촉박은 세 번뿐이다(C1·C2·C3). 불은 화면에만 있고 시계는 없다.
2. **`survive()`는 고르지 않은 것을 *전부* 잃게 만든다.** 설계서 9장의 `D2 대상` 표시와 무관하다. 5장 D2 본문("모은 15장 남짓 중 3장을 고른다")이 이 동작을 말하고 있고, `survive()`는 1단계에서 이미 그렇게 구현·검증되었다(잠금). **표(9장)와 본문(5장)이 어긋나면 본문을 따른다.**
3. 잃은 카드는 `recordLoss(..., 'fire')`로 사유를 남겨 사초함에 **「불탐」**으로 뜬다.

**Files:**
- Create: `src/ui/salvage.js`
- Modify: `src/main.js` (`salvage` 비트 핸들러)

**Interfaces:**
- Consumes: `src/systems/codex.js` → `survive` (**고치지 않는다**); `src/systems/loss-log.js` → `recordLoss`; `src/data/sources.js` → `sourceById`
- Produces:
  - `MAX_KEEP = 3`
  - `createSalvage(root): { open(view): Promise<string[]> }`
    - `view = { title, lines, cards: SourceCard[], origin }`
    - 정확히 세 장을 고르기 전까지 `확정` 버튼이 눌리지 않는다. 가진 것이 세 장 이하면 전부 가지고 나간다

- [ ] **Step 1: 고르기 화면 구현**

`src/ui/salvage.js`:

```js
export const MAX_KEEP = 3

const CSS = `
.salvage{position:fixed;inset:0;z-index:57;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:12px;padding:22px;overflow:auto;
  background:radial-gradient(120% 90% at 50% 110%, #3a1608 0%, #1a0d07 45%, #0f1113 100%)}
.salvage::after{content:'';position:fixed;inset:0;pointer-events:none;
  background:linear-gradient(0deg,#ff6a1e33,#0000 45%);animation:flick 1.7s ease-in-out infinite alternate}
@keyframes flick{from{opacity:.55}to{opacity:1}}
.salvage h2{margin:0;font-size:16px;color:#e08a3a;letter-spacing:5px;font-weight:400;z-index:1}
.salvage p{margin:0;font-size:17px;color:#e8e2d4;line-height:1.8;max-width:620px;text-align:center;z-index:1}
.salvage .grid{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;
  max-width:720px;max-height:46vh;overflow:auto;z-index:1;padding:2px}
.salvage .doc{width:214px;text-align:left;padding:10px 12px;border-radius:3px;cursor:pointer;
  background:#e8e2d4;color:#23201a;border:2px solid #e8e2d4;font-size:13px;line-height:1.5}
.salvage .doc small{display:block;color:#6b6558;font-size:11px;margin-top:4px}
.salvage .doc[aria-pressed="true"]{border-color:#e0a23a;box-shadow:0 0 0 3px #e0a23a55}
.salvage .doc[disabled]{opacity:.45;cursor:not-allowed}
.salvage .count{font-size:13px;color:#e0a23a;letter-spacing:3px;z-index:1}
.salvage .origin{font-size:12px;color:#8f8a7c;z-index:1}
.salvage button.go{z-index:1;padding:13px 32px;background:#3a2d20;border:1px solid #6a5230;
  color:#e0a23a;border-radius:3px;font-size:15px;cursor:pointer}
.salvage button.go[disabled]{opacity:.4;cursor:not-allowed}
`

let styled = false

export function createSalvage(root) {
  if (!styled) {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    styled = true
  }

  return {
    open(view) {
      return new Promise(resolve => {
        const limit = Math.min(MAX_KEEP, view.cards.length)
        const chosen = new Set()

        const el = document.createElement('div')
        el.className = 'salvage'
        el.innerHTML = `
          <h2>${view.title}</h2>
          ${view.lines.map(l => `<p>${l}</p>`).join('')}
          <div class="grid">${view.cards.map(c => `
            <button class="doc" data-id="${c.id}" aria-pressed="false">${c.title}
              <small>${c.origin}</small></button>`).join('')}</div>
          <div class="count"></div>
          <div class="origin">${view.origin}</div>
          <button class="go" disabled>들고 나간다</button>`
        root.appendChild(el)

        const go = el.querySelector('button.go')
        const count = el.querySelector('.count')

        function refresh() {
          count.textContent = `${chosen.size} / ${limit} 장`
          go.disabled = chosen.size !== limit
          el.querySelectorAll('.doc').forEach(b => {
            const on = chosen.has(b.dataset.id)
            b.setAttribute('aria-pressed', String(on))
            b.disabled = !on && chosen.size >= limit
          })
        }

        el.querySelectorAll('.doc').forEach(b => {
          b.addEventListener('click', () => {
            const id = b.dataset.id
            if (chosen.has(id)) chosen.delete(id)
            else if (chosen.size < limit) chosen.add(id)
            refresh()
          })
        })

        go.addEventListener('click', () => { el.remove(); resolve([...chosen]) })
        refresh()
      })
    },
  }
}
```

- [ ] **Step 2: `salvage` 비트를 러너에 붙인다**

`src/main.js`:

```js
import { survive } from './systems/codex.js'
import { createSalvage } from './ui/salvage.js'
```

```js
  const salvage = createSalvage(root)
```

`playBeat`의 `switch`에:

```js
      case 'salvage': return await playSalvage(beat)
```

핸들러 — **`survive` 전에 무엇이 사라질지를 먼저 셈한다.** 순서를 뒤집으면 사유를 못 적는다.

```js
  async function playSalvage(beat) {
    const held = live.state.sources.held
    if (held.length === 0) {
      await showNote(root, {
        title: beat.title,
        lines: ['사초함이 비어 있다.', '들고 나갈 것이 없다.'],
        origin: beat.origin,
      })
      return live.state
    }

    const kept = await salvage.open({
      title: beat.title,
      lines: beat.lines,
      cards: held.map(id => sourceById(id)),
      origin: beat.origin,
    })

    const doomed = held.filter(id => !kept.includes(id))
    let next = survive(live.state, kept)
    next = recordLoss(next, doomed, 'fire')
    if (doomed.length) {
      await lossScreen.show({
        title: '불 탄 것',
        lines: ['들고 나오지 못한 것은 여기서 끝났다.'],
        tag: '불탐',
        cards: doomed.map(id => ({ title: sourceById(id).title })),
        origin: beat.origin,
        footer: beat.footer,
      })
    }
    return next
  }
```

- [ ] **Step 3: 3막의 D2 비트를 확정한다** (Task 16이 그대로 쓴다)

```js
      {
        id: 'great-fire',
        kind: 'salvage',
        title: '경 복 궁 대 화 재',
        lines: [
          '고종 13년 음력 11월 4일, 경복궁에 큰 불이 났다.',
          '실록은 「830여 간이 연달아 불길에 휘감겼다」고 적었다.',
          '사초함에서 세 장만 들고 나갈 수 있다. 남긴 것은 다시 읽을 수 없다.',
        ],
        origin: '『고종실록』 13권, 고종 13년 음력 11월 4일 · 「830여 칸」은 실록 국역 원문의 표현입니다. 다만 같은 사건을 922칸으로 적은 학술 논문도 있어 수치는 갈립니다',
        footer: '남긴 문서를 근거로 삼는 선택지는, 다음 막의 어전회의에서 열리지 않는다.',
      },
```

- [ ] **Step 4: 손으로 검증한다**

임시 통로를 `boot`에 둔다. **Task 17에서 지운다.**

```js
  globalThis.__d2 = () => playSalvage(D2_BEAT)   // 위 Step 3의 비트 객체
```

Run: `npm run build`, 브라우저에서 1·2막을 돌아 사료를 대여섯 장 모은 뒤 콘솔에 `__d2()`.

확인할 것:
1. 불빛이 아래에서 일렁이는 화면. **시계가 없다** — 여기는 촉박이 아니다
2. 가진 문서가 모두 카드로 깔린다. 하나 누르면 금색 테두리
3. **세 장을 고르면 나머지가 눌리지 않는다.** `3 / 3 장`, `들고 나간다`가 켜진다
4. 확정하면 **불 탄 것** 화면에 버린 문서들이 줄이 그어져 나온다
5. `Q` → 사초함에 남은 세 장과 **「불탐」** 표시들. **약탈로 잃은 것은 여전히 「약탈됨 · 프랑스」다**
6. 가진 문서가 2장뿐일 때 `__d2()` → `2 / 2 장`으로 전부 들고 나간다

5번이 이 태스크의 합격 기준이다 — 두 소실이 화면에서 구별되어야 학생이 자기가 무엇을 어떻게 잃었는지 기억한다.

- [ ] **Step 5: 커밋**

```bash
git add src/ui/salvage.js src/main.js dist/어전.html
git commit -m "feat: D2 대화재 — 세 장만 들고 나간다, 시계는 없다"
```

---

### Task 15: 신헌에게 보낼 훈령과 3막 어전회의

설계서 7장 3막 비트 7·8. **읽은 사료만큼 훈령 문구가 열린다.** 그리고 조약 조문을 **읽어야만** 「이 조항은 주권을 침해한다」는 선택지가 열린다. 안 읽으면 「좋은 조건이다」밖에 못 고른다.

훈령은 어전회의와 다르다 — **하나를 고르는 것이 아니라 여러 줄을 담아 보낸다.** 그래서 화면이 따로 필요하다. 판정은 `evaluateChoices`를 그대로 재사용한다(`src/systems/council.js`는 잠금이며 **고치지 않는다**).

**Files:**
- Create: `src/ui/orders-ui.js`
- Modify: `src/main.js` (`orders` 비트 핸들러)

**Interfaces:**
- Consumes: `src/systems/council.js` → `evaluateChoices(state, { choices })`
- Produces:
  - `createOrders(root): { open(state, beat): Promise<{ picked: string[], reason: string }> }`
    - `beat = { title, question, clauses: Array<{id, text, requires: string[]}>, actual: {line, origin}, minPick? }`
    - 잠긴 문구는 `???`와 `← 『제목』을 읽지 않았습니다`로 뜨고 **누를 수 없다**
    - 한 줄도 안 고르고 보낼 수 있다. **보내지 않는 것도 결정이다**

- [ ] **Step 1: 훈령 화면 구현**

`src/ui/orders-ui.js`:

```js
import { evaluateChoices } from '../systems/council.js'

const CSS = `
.orders{position:fixed;inset:0;z-index:51;background:#0f1113;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:14px;padding:24px;overflow:auto}
.orders h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:3px;font-weight:400}
.orders .q{margin:0;font-size:21px;color:#e8e2d4;text-align:center;max-width:640px;line-height:1.5}
.orders .read{font-size:12px;color:#8f8a7c}
.orders .list{display:flex;flex-direction:column;gap:8px;width:100%;max-width:580px}
.orders .cl{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;text-align:left;
  background:#23282c;border:1px solid #3a4248;border-radius:3px;color:#e8e2d4;font-size:15px;cursor:pointer}
.orders .cl[aria-pressed="true"]{border-color:#6a5230;background:#2c2a24}
.orders .cl i{width:14px;height:14px;flex:none;margin-top:4px;border:1px solid #6a5230;border-radius:2px}
.orders .cl[aria-pressed="true"] i{background:#e0a23a}
.orders .locked{padding:12px 14px;border:1px dashed #3a4248;border-radius:3px;color:#5f6971;font-size:15px}
.orders .locked small{display:block;margin-top:5px;color:#8f8a7c;font-size:12px}
.orders textarea{width:100%;max-width:580px;min-height:64px;background:#1a1d21;color:#e8e2d4;
  border:1px solid #3a4248;border-radius:3px;padding:10px;font:14px/1.6 inherit;resize:none}
.orders .paper{max-width:600px;background:#e8e2d4;color:#23201a;border-radius:4px;padding:20px 22px;
  line-height:1.8;font-size:15px;text-align:left;white-space:pre-wrap}
.orders .origin{font-size:12px;color:#6b6558;margin-top:8px}
.orders button.go{padding:12px 28px;background:#3a2d20;border:1px solid #6a5230;color:#e0a23a;
  border-radius:3px;font-size:15px;cursor:pointer}
`

let styled = false

export function createOrders(root) {
  if (!styled) {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    styled = true
  }

  return {
    open(state, beat) {
      return new Promise(resolve => {
        const evaluated = evaluateChoices(state, { choices: beat.clauses })
        const openCount = evaluated.filter(c => c.unlocked).length
        const picked = new Set()

        const el = document.createElement('div')
        el.className = 'orders'
        el.innerHTML = `
          <h2>${beat.title}</h2>
          <p class="q">${beat.question}</p>
          <div class="read">쓸 수 있는 문구 ${openCount} / ${evaluated.length}</div>
          <div class="list">${evaluated.map(c => c.unlocked
            ? `<button class="cl" data-id="${c.id}" aria-pressed="false"><i></i><span>${c.text}</span></button>`
            : `<div class="locked">???${c.missing.map(m => `<small>← 『${m}』을 읽지 않았습니다</small>`).join('')}</div>`
          ).join('')}</div>
          <textarea placeholder="훈령 끝에 한 줄을 더 적을 수 있다"></textarea>
          <button class="go">봉하여 보낸다</button>`
        root.appendChild(el)

        el.querySelectorAll('.cl').forEach(b => {
          b.addEventListener('click', () => {
            const id = b.dataset.id
            if (picked.has(id)) picked.delete(id); else picked.add(id)
            b.setAttribute('aria-pressed', String(picked.has(id)))
          })
        })

        el.querySelector('.go').addEventListener('click', () => {
          const reason = el.querySelector('textarea').value.trim()
          const chosen = evaluated.filter(c => picked.has(c.id))
          el.innerHTML = `
            <h2>${beat.title}</h2>
            <div class="paper">${chosen.length
              ? chosen.map((c, i) => `${i + 1}. ${c.text}`).join('\n')
              : '(아무 문구도 담기지 않았다)'}${reason ? `\n\n${reason}` : ''}</div>
            <div class="paper">실제로는 ─ ${beat.actual.line}<div class="origin">${beat.actual.origin}</div></div>
            <button class="go">사신이 떠났다</button>`
          el.querySelector('.go').addEventListener('click', () => {
            el.remove()
            resolve({ picked: [...picked], reason })
          })
        })
      })
    },
  }
}
```

- [ ] **Step 2: `orders` 비트를 러너에 붙인다**

`src/main.js`:

```js
import { createOrders } from './ui/orders-ui.js'
```

```js
  const orders = createOrders(root)
```

`playBeat`의 `switch`에:

```js
      case 'orders': return await playOrders(beat)
```

핸들러:

```js
  async function playOrders(beat) {
    const { picked, reason } = await orders.open(live.state, beat)
    const flags = { ...live.state.flags }
    for (const id of picked) flags[`orders:${id}`] = true
    return {
      ...live.state,
      flags,
      decisions: [...live.state.decisions, {
        actIndex: live.state.actIndex,
        choiceId: `orders:${picked.join('+') || 'none'}`,
        reason,
      }],
    }
  }
```

- [ ] **Step 3: 3막의 훈령·어전회의 비트를 확정한다** (Task 16이 그대로 쓴다)

```js
      {
        id: 'orders-sinheon',
        kind: 'orders',
        title: '훈 령',
        question: '강화도로 가는 신헌에게 무엇을 적어 보낼 것인가',
        clauses: [
          { id: 'greet',  text: '예로써 맞이하되, 경솔히 허락하지 말라',                 requires: [] },
          { id: 'seogye', text: '저들이 보낸 서계의 글자부터 바로잡게 하라',              requires: ['seogye'] },
          { id: 'unyo',   text: '초지진에 먼저 포를 쏜 것이 누구인지 따져 물으라',        requires: ['unyo'] },
          { id: 'survey', text: '해안을 재게 하는 조항은 받을 수 없다고 이르라',          requires: ['ganghwa7'] },
          { id: 'judge',  text: '우리 땅에서 지은 죄는 우리가 다스린다고 이르라',          requires: ['ganghwa10'] },
          { id: 'tax',    text: '세를 매기지 못하고 곡물이 나가는 조항은 고치게 하라',      requires: ['joil-trade'] },
          { id: 'both',   text: '저들이 왜인의 탈을 쓴 서양이라면 논할 것이 없다고 이르라', requires: ['choe-ikhyeon'] },
        ],
        actual: {
          line: '조선은 신헌을 접견대관으로 보내 일본 사신과 강화도에서 협상하게 하였다. 협상은 조선이 조문 하나하나를 따지기에는 너무 짧았고, 조약은 그해 2월에 맺어졌다.',
          origin: '『고등 한국사1』 pp.110~111 · 양력 1876년 2월 27일 / 음력 2월 3일',
        },
      },
      {
        id: 'council-treaty',
        kind: 'council',
        council: {
          question: '조약을 받아들일 것인가',
          choices: [
            { id: 'accept',   text: '받아들인다. 좋은 조건이다',                        requires: [] },
            { id: 'delay',    text: '대답을 미룬다',                                   requires: [] },
            { id: 'sovereign',text: '제1관의 「자주」라는 말이 무엇을 노리는지 따진다',    requires: ['ganghwa1'] },
            { id: 'survey',   text: '해안을 재는 것은 나라의 문을 재는 일이라 이른다',     requires: ['ganghwa7'] },
            { id: 'consular', text: '저들의 죄를 저들이 심판한다는 조항을 고치라 이른다',   requires: ['ganghwa10'] },
            { id: 'grain',    text: '세를 못 걷고 쌀이 나가는 조항을 막으라 이른다',       requires: ['joil-trade'] },
            { id: 'reject',   text: '거절한다. 왜양은 하나다',                          requires: ['choe-ikhyeon', 'ganghwa10'] },
          ],
        },
        actual: {
          line: '조선 정부는 논의 끝에 개항을 결정하고 일본과 강화도 조약(조일 수호 조규)을 맺었다(1876). 제1관의 「자주」는 청의 간섭을 끊으려는 일본의 포석이었고, 해안 측량권과 영사 재판권은 조선의 주권을 침해하는 조항이었다.',
          origin: '『고등 한국사1』 pp.110~111 · 양력 2월 27일 / 음력 2월 3일',
          quote: '저들이 왜인이라고는 하나 실은 서양 오랑캐입니다.',
          quoteOrigin: '최익현 · 『고등 한국사1』 p.110 수록 · 우리말 옮김',
        },
      },
```

- [ ] **Step 4: 손으로 검증한다** (임시 통로는 Task 17에서 지운다)

```js
  globalThis.__orders = () => playOrders(ORDERS_BEAT)   // 위 Step 3의 비트 객체
```

Run: `npm run build`, 브라우저에서 사료를 몇 장 읽은 뒤 `__orders()`.

확인할 것:
1. 안 읽은 조문의 문구는 `???` 와 `← 『강화도 조약 제10관 — 영사 재판권』을 읽지 않았습니다`
2. 열린 문구는 체크가 켜졌다 꺼진다. **여러 개를 동시에 고를 수 있다**
3. `봉하여 보낸다` → 담긴 문구가 번호를 달고 훈령 종이로 나온다. 아무것도 안 골라도 보낼 수 있다
4. 그 아래에 「실제로는」과 출처

- [ ] **Step 5: 커밋**

```bash
git add src/ui/orders-ui.js src/main.js dist/어전.html
git commit -m "feat: 신헌에게 보낼 훈령 — 읽은 사료만큼 문구가 열린다"
```

---

### Task 16: 3막 「친정」 완주

**이 막이 게임의 전환점이다.** 궁이 세 번 바뀌고, 조작권이 **B → A → B → A → B**로 오르내리며, **막의 정점은 A인데 끝은 B다.** 시작한 자리보다 낮은 데서 끝나는 유일한 막이다.

**⚠ 설계서 내부 표기 충돌을 여기서 정리한다.** 설계서 7장 3막의 제목줄은 `조작권 B → A → B`라고 하고 본문은 「A로 시작해 B로 끝나는 유일한 막」이라고 한다. 두 문장은 그대로는 양립하지 않는다. 5장 B의 **이어 표**(1873 화재 이어 = B / 1875 환어 = A / 1876 대화재 이어 = B)가 가장 구체적이므로 그것을 기준으로 삼아 **B → A → B → A → B**로 편다. 이러면 제목줄의 큰 흐름(B로 시작해 A를 거쳐 B로 끝난다)과 본문이 말한 것(정점 A, 끝 B)이 **둘 다 성립한다.** 테스트가 이 두 가지를 다 지킨다.

**Files:**
- Modify: `src/data/acts.js` (3막 추가)
- Modify: `tests/data/acts.test.js` (3막 검사 추가)

**Interfaces:**
- Consumes: Task 13·14·15에서 확정한 `rush`·`salvage`·`orders`·`council` 비트 정의
- Produces: `ACTS[2]` — id `'chinjeong'`

- [ ] **Step 1: 3막 검사를 먼저 쓴다**

`tests/data/acts.test.js` 끝에 붙인다.

맨 위 import 묶음에 세 줄을 더한다 (파일 중간에 새 `import` 문을 두지 않는다).

```js
import { PALACES, roomAt } from '../../src/data/palaces.js'
import { RANK } from '../../src/core/control.js'
import { beatsOf, controlTimeline, palaceTimeline, peakControl, endControl } from '../../src/systems/scenario.js'
```

그리고 파일 끝에 붙인다.

```js
describe('3막 「친정」', () => {
  const a = actById('chinjeong')

  it('경복궁에서 시작한다 — 2막에서 옮겨온 그 집이다', () => {
    expect(a.palace).toBe('gyeongbok')
    expect(a.control).toBe('B')
  })

  it('조작권이 B → A → B → A → B 로 오르내린다', () => {
    expect(controlTimeline(a)).toEqual(['B', 'A', 'B', 'A', 'B'])
  })

  it('정점은 A 인데 끝은 B 다 — 오른 자리보다 낮게 끝난다', () => {
    expect(peakControl(a)).toBe('A')
    expect(endControl(a)).toBe('B')
    expect(RANK[endControl(a)]).toBeLessThan(RANK[peakControl(a)])
  })

  it('궁이 세 번 바뀐다', () => {
    expect(beatsOf(a).filter(b => b.kind === 'move')).toHaveLength(3)
  })

  it('그중 스스로 정한 이동은 1875 환어 하나뿐이다', () => {
    const self = beatsOf(a).filter(b => b.kind === 'move' && b.self === true)
    expect(self).toHaveLength(1)
    expect(self[0].year).toBe(1875)
  })

  it('불이 두 번 난다 — 1873 자경전과 1876 대화재', () => {
    expect(beatsOf(a).filter(b => b.kind === 'rush')).toHaveLength(1)
    expect(beatsOf(a).filter(b => b.kind === 'salvage')).toHaveLength(1)
  })

  it('촉박은 90초이며 광화문까지 나가는 것이 목표다', () => {
    const r = beatsOf(a).find(b => b.kind === 'rush')
    expect(r.totalMs).toBe(90000)
    expect(r.goalRoom).toBe('gwanghwamun')
    expect(r.track[0]).toBe('jagyeongjeon')
    expect(r.track.at(-1)).toBe('gwanghwamun')
  })

  it('자경전이 탄 뒤 돌아온 경복궁은 자경전이 봉쇄된 변형이다', () => {
    const back = beatsOf(a).find(b => b.kind === 'move' && b.year === 1875)
    expect(back.palace).toBe('gyeongbok_jagyeong')
  })

  it('대화재 뒤에는 불탄 경복궁을 걸어 나온다', () => {
    const ks = beatsOf(a)
    const salvageAt = ks.findIndex(b => b.kind === 'salvage')
    const walk = ks.slice(salvageAt).find(b => b.kind === 'explore')
    expect(walk.palace).toBe('gyeongbok_burnt')
    expect(walk.exit.room).toBe('gwanghwamun')
  })

  it('D2 는 촉박이 아니다 — 시계를 붙이지 않는다', () => {
    const s = beatsOf(a).find(b => b.kind === 'salvage')
    expect(s.totalMs).toBeUndefined()
    expect(s.track).toBeUndefined()
  })

  it('조약 어전회의는 D2 보다 먼저다 — 읽고 정한 뒤에 잃는다', () => {
    const ks = beatsOf(a).map(b => b.kind)
    expect(ks.lastIndexOf('council')).toBeLessThan(ks.indexOf('salvage'))
  })

  it('모든 이어가 실록에서 확인한 음력 날짜와 근거를 달고 있다', () => {
    for (const b of ACTS.flatMap(x => beatsOf(x)).filter(b => b.kind === 'move')) {
      expect(b.lunarDate, `${b.id}`).toMatch(/고종 \d+년 음력 \d+월 \d+일/)
      expect(b.sillok, `${b.id}`).toContain('『고종실록』')
      expect(b.lunarDate, `${b.id} — 양력을 적으면 안 된다`).not.toContain('양력')
    }
  })

  it('대화재 뒤 창덕궁 이어는 1876년이 아니라 1877년이다', () => {
    const last = beatsOf(a).filter(b => b.kind === 'move').at(-1)
    expect(last.year).toBe(1877)
    expect(last.lunarDate).toContain('고종 14년')
  })

  it('자경전 화재 장면은 재구성으로 표시한다 — 실록에는 「慈慶殿災」 네 글자뿐이다', () => {
    const r = beatsOf(a).find(b => b.kind === 'rush')
    expect(r.intro.grade).toBe('staged')
    expect(r.intro.origin).toContain('음력 12월 10일')
  })

  it('「830여 칸」이 실록 원문 표현임을 밝히고 이견도 적는다', () => {
    const s = beatsOf(a).find(b => b.kind === 'salvage')
    expect(s.origin).toContain('실록 국역 원문의 표현')
    expect(s.origin).toContain('922칸')
  })
})

describe('막 전체를 가로지르는 규칙', () => {
  it('탐색 비트의 나가는 방에는 사료 지점이 없다 — E 가 겹치면 사료를 못 줍는다', () => {
    for (const act of ACTS) {
      let palace = act.palace
      for (const b of beatsOf(act)) {
        if (b.palace) palace = b.palace
        if (b.kind !== 'explore' || !b.exit) continue
        const def = PALACES[palace]
        const clash = (def.pickups ?? [])
          .filter(p => roomAt(def, p.x, p.z)?.id === b.exit.room)
          .map(p => p.cardId)
        expect(clash, `${act.id}/${b.id} — ${b.exit.room}`).toEqual([])
      }
    }
  })

  it('모든 비트가 지금 있는 궁에 실재하는 방만 가리킨다', () => {
    for (const act of ACTS) {
      let palace = act.palace
      for (const b of beatsOf(act)) {
        if (b.palace) palace = b.palace
        const ids = new Set(PALACES[palace].rooms.map(r => r.id))
        for (const roomId of [b.exit?.room, b.spawnRoom, b.goalRoom, ...(b.track ?? [])]) {
          if (roomId) expect(ids, `${act.id}/${b.id} → ${roomId}`).toContain(roomId)
        }
      }
    }
  })

  it('세 막을 다 합쳐 촉박은 한 번뿐이다 — 나머지 둘은 3단계 몫이다', () => {
    const rushes = ACTS.flatMap(a => beatsOf(a)).filter(b => b.kind === 'rush')
    expect(rushes).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/data/acts.test.js`
Expected: FAIL — `actById('chinjeong')` 가 `undefined`

- [ ] **Step 3: 3막을 `ACTS` 배열에 더한다**

`src/data/acts.js`의 `ACTS` 배열, 2막 다음에 넣는다. `jagyeong-fire`·`orders-sinheon`·`council-treaty`·`great-fire`는 Task 13·14·15에서 확정한 그대로다.

```js
  {
    id: 'chinjeong',
    title: '친정',
    year: 1873,
    dateLabel: '고종 10년 · 1873 · 경복궁',
    palace: 'gyeongbok',
    control: 'B',
    beats: [
      {
        id: 'gyeyu-sangso',
        kind: 'note',
        title: '1873, 경복궁',
        lines: [
          '최익현이 상소를 올렸다.',
          '임금이 이미 장성하였으니 정사를 임금께 돌려드려야 한다는 말이었다.',
          '아버지가 운현궁으로 물러가셨다.',
        ],
        origin: '『고종실록』 고종 10년(1873) · 날짜는 확정하지 못했습니다',
        grade: 'source',
      },
      {
        id: 'doors-open',
        kind: 'note',
        control: 'A',
        title: '문 이 열 린 다',
        lines: [
          '어제까지 신하가 서 있던 자리에 아무도 없다.',
          '가 보지 못한 곳으로 갈 수 있다.',
        ],
      },
      {
        id: 'day-1873',
        kind: 'explore',
        dayUnits: 6,
        dateLabel: '고종 10년 · 1873 · 경복궁',
        exit: { room: 'jagyeongjeon', label: 'E — 자경전으로 든다' },
      },
      {
        id: 'jagyeong-fire',
        kind: 'rush',
        control: 'A',
        spawnRoom: 'jagyeongjeon',
        track: ['jagyeongjeon', 'sajeongjeon', 'geunjeongjeon', 'gwanghwamun'],
        goalRoom: 'gwanghwamun',
        totalMs: 90000,
        intro: {
          title: '고종 10년 음력 12월 10일 밤, 자경전에 불이 났다',
          lines: [
            '『고종실록』이 이 일에 대해 남긴 것은 네 글자다 ─ 「慈慶殿災」.',
            '불이 어디로 번졌는지, 임금이 어떻게 나왔는지는 실록에 없다.',
            '여기서부터는 재구성이다. Shift 를 눌러 달린다. 광화문까지 나가야 한다.',
          ],
          origin: '『고종실록』 10권, 고종 10년 음력 12월 10일 · 소실 규모(364칸 반)는 『승정원일기』 계통 기록이며 직접 대조하지 못했습니다',
          grade: 'staged',
        },
        onArrive: '그을리지 않고 나왔다',
        onCaught: '그을린 채 나왔다',
        caughtFlag: 'sootied',
      },
      {
        id: 'move-1873',
        kind: 'move',
        palace: 'changdeok',
        control: 'B',
        year: 1873,
        lunarDate: '고종 10년 음력 12월 20일',
        sillok: '『고종실록』 10권 · 불이 난 것은 열흘 전인 12월 10일이다. 그날 밤에 곧바로 옮긴 것이 아니다.',
        cause: '자경전이 탔다. 열흘 뒤, 창덕궁으로 옮긴다.',
        self: false,
        dateLabel: '고종 10년 겨울 · 창덕궁',
      },
      {
        id: 'day-changdeok',
        kind: 'explore',
        dayUnits: 6,
        dateLabel: '고종 11~12년 · 창덕궁',
        exit: { room: 'injeongjeon', label: 'E — 환어를 이르신다' },
      },
      {
        id: 'move-1875',
        kind: 'move',
        palace: 'gyeongbok_jagyeong',
        control: 'A',
        year: 1875,
        lunarDate: '고종 12년 음력 5월 27일',
        sillok: '『고종실록』 12권 · "移御于景福宮". 일부 자료가 5월 28일로 적으나 실록은 27일이다.',
        cause: '경복궁으로 돌아간다.',
        self: true,
        dateLabel: '고종 12년 · 1875 · 경복궁',
      },
      {
        id: 'unyo-dispatch',
        kind: 'dispatch',
        title: '초 지 진',
        day: 4,
        cannotGo: '임금은 도성을 떠날 수 없다. 강화도의 일은 또 장계로만 들어온다.',
        dispatches: [
          {
            id: 'un1', place: 'ganghwa', placeName: '초지진',
            sentDay: 0, lagDays: 2,
            headline: '일본 배가 초지진에 다가와 포를 쏘았다',
            body: '이양선이 초지진 앞에 이르러 포를 쏘았고, 진에서도 마주 쏘았습니다.',
            origin: '『고등 한국사1』 p.110 수록 · 우리말 옮김',
            grade: 'textbook',
            marker: { x: 0.26, y: 0.63 },
          },
          {
            id: 'un2', place: 'ganghwa', placeName: '영종진',
            sentDay: 2, lagDays: 2,
            headline: '저들이 영종진에 올라 사람을 죽이고 물건을 빼앗아 갔다',
            body: '영종진이 무너지고 사람이 상하였으며, 병기와 물건을 실어 갔습니다.',
            origin: '『고등 한국사1』 p.110 수록 · 우리말 옮김',
            grade: 'textbook',
            marker: { x: 0.30, y: 0.52 },
          },
        ],
      },
      {
        id: 'day-1875',
        kind: 'explore',
        dayUnits: 6,
        dateLabel: '고종 12~13년 · 경복궁',
        exit: { room: 'geunjeongjeon', label: 'E — 훈령을 쓰러 간다' },
      },
      {
        id: 'orders-sinheon',
        kind: 'orders',
        title: '훈 령',
        question: '강화도로 가는 신헌에게 무엇을 적어 보낼 것인가',
        clauses: [
          { id: 'greet',  text: '예로써 맞이하되, 경솔히 허락하지 말라',                 requires: [] },
          { id: 'seogye', text: '저들이 보낸 서계의 글자부터 바로잡게 하라',              requires: ['seogye'] },
          { id: 'unyo',   text: '초지진에 먼저 포를 쏜 것이 누구인지 따져 물으라',        requires: ['unyo'] },
          { id: 'survey', text: '해안을 재게 하는 조항은 받을 수 없다고 이르라',          requires: ['ganghwa7'] },
          { id: 'judge',  text: '우리 땅에서 지은 죄는 우리가 다스린다고 이르라',          requires: ['ganghwa10'] },
          { id: 'tax',    text: '세를 매기지 못하고 곡물이 나가는 조항은 고치게 하라',      requires: ['joil-trade'] },
          { id: 'both',   text: '저들이 왜인의 탈을 쓴 서양이라면 논할 것이 없다고 이르라', requires: ['choe-ikhyeon'] },
        ],
        actual: {
          line: '조선은 신헌을 접견대관으로 보내 일본 사신과 강화도에서 협상하게 하였다. 협상은 조선이 조문 하나하나를 따지기에는 너무 짧았고, 조약은 그해 2월에 맺어졌다.',
          origin: '『고등 한국사1』 pp.110~111 · 양력 1876년 2월 27일 / 음력 2월 3일',
        },
      },
      {
        id: 'council-treaty',
        kind: 'council',
        council: {
          question: '조약을 받아들일 것인가',
          choices: [
            { id: 'accept',    text: '받아들인다. 좋은 조건이다',                        requires: [] },
            { id: 'delay',     text: '대답을 미룬다',                                   requires: [] },
            { id: 'sovereign', text: '제1관의 「자주」라는 말이 무엇을 노리는지 따진다',    requires: ['ganghwa1'] },
            { id: 'survey',    text: '해안을 재는 것은 나라의 문을 재는 일이라 이른다',     requires: ['ganghwa7'] },
            { id: 'consular',  text: '저들의 죄를 저들이 심판한다는 조항을 고치라 이른다',   requires: ['ganghwa10'] },
            { id: 'grain',     text: '세를 못 걷고 쌀이 나가는 조항을 막으라 이른다',       requires: ['joil-trade'] },
            { id: 'reject',    text: '거절한다. 왜양은 하나다',                          requires: ['choe-ikhyeon', 'ganghwa10'] },
          ],
        },
        actual: {
          line: '조선 정부는 논의 끝에 개항을 결정하고 일본과 강화도 조약(조일 수호 조규)을 맺었다(1876). 제1관의 「자주」는 청의 간섭을 끊으려는 일본의 포석이었고, 해안 측량권과 영사 재판권은 조선의 주권을 침해하는 조항이었다.',
          origin: '『고등 한국사1』 pp.110~111 · 양력 2월 27일 / 음력 2월 3일',
          quote: '저들이 왜인이라고는 하나 실은 서양 오랑캐입니다.',
          quoteOrigin: '최익현 · 『고등 한국사1』 p.110 수록 · 우리말 옮김',
        },
      },
      {
        id: 'great-fire',
        kind: 'salvage',
        title: '경 복 궁 대 화 재',
        dateLabel: '고종 13년 겨울 · 1876 · 경복궁',
        lines: [
          '고종 13년 음력 11월 4일, 경복궁에 큰 불이 났다.',
          '실록은 「830여 간이 연달아 불길에 휘감겼다」고 적었다.',
          '사초함에서 세 장만 들고 나갈 수 있다. 남긴 것은 다시 읽을 수 없다.',
        ],
        origin: '『고종실록』 13권, 고종 13년 음력 11월 4일 · 「830여 칸」은 실록 국역 원문의 표현입니다. 다만 같은 사건을 922칸으로 적은 학술 논문도 있어 수치는 갈립니다',
        footer: '남긴 문서를 근거로 삼는 선택지는, 다음 막의 어전회의에서 열리지 않는다.',
      },
      {
        id: 'walk-out',
        kind: 'explore',
        palace: 'gyeongbok_burnt',
        control: 'B',
        dayUnits: 2,
        dateLabel: '고종 13년 겨울 · 불탄 경복궁',
        exit: { room: 'gwanghwamun', label: 'E — 광화문 밖으로 나간다' },
      },
      {
        id: 'move-1877',
        kind: 'move',
        palace: 'changdeok',
        control: 'B',
        year: 1877,
        lunarDate: '고종 14년 음력 3월 10일',
        sillok: '『고종실록』 14권 · 불이 난 것은 넉 달 전인 고종 13년 11월 4일이다. 임금은 넉 달을 불탄 궁에서 더 지냈다.',
        cause: '불탄 경복궁을 두고, 다시 창덕궁으로 옮긴다.',
        self: false,
        dateLabel: '고종 14년 · 1877 · 창덕궁',
      },
      {
        id: 'end',
        kind: 'note',
        title: '3 막 「친 정」 끝',
        lines: [
          '스스로 정해 돌아간 집이 한 해 만에 불탔다.',
          '불탄 궁에서 넉 달을 더 지내고서야 창덕궁으로 옮겼다.',
          '아버지가 없는 조정에서, 문은 다시 반쯤 닫혔다.',
        ],
      },
    ],
  },
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/data/acts.test.js && npm test`
Expected: 전부 PASS

- [ ] **Step 5: 손으로 3막을 완주한다**

Run: `npm run build`. **1막부터 이어서 3막 끝까지 간다.**

1. 2막이 끝나면 `1873, 경복궁` → `문 이 열 린 다`
2. **자경전이 미니맵에서 밝아졌다.** 조작권 A다 — 2막 내내 못 가던 곳이다
3. 자경전에서 `E` → `1873년 겨울, 밤` → **90초 촉박.** 광화문으로 달린다
4. 결과와 상관없이 **이어 화면** `1873 / 고종 10년 음력 12월 20일 / 경복궁 → 창덕궁`. 하단에 「불이 난 것은 열흘 전인 12월 10일이다」와 양력 미확정 고지
5. 창덕궁. **자경전에 못 가던 때처럼 다시 막힌 곳이 생긴다** (조작권 B)
6. 인정전에서 `E` → **이어 화면에 `스스로 정하신 이동이다`** / `1875 / 창덕궁 → 경복궁`
7. 경복궁으로 돌아오면 **자경전이 검게 그을린 기둥만 남아 있고 들어갈 수 없다**
8. 초지진 장계 → 낮 → 근정전에서 `E` → **훈령** (읽은 만큼 문구가 열린다)
9. **어전회의 「조약을 받아들일 것인가」** — 조문을 안 읽었으면 `받아들인다`와 `대답을 미룬다`뿐이다
10. **경복궁 대화재** → 세 장 고르기 → 불 탄 것
11. **불탄 경복궁**을 걸어 광화문으로 나간다. 근정전·사정전·수정전이 지붕 없이 서 있다
12. `1877 / 고종 14년 음력 3월 10일 / 경복궁 → 창덕궁` → `3 막 「친 정」 끝`

7번과 9번과 11번이 이 태스크의 합격 기준이다.

- [ ] **Step 6: 커밋**

```bash
git add src/data/acts.js tests/data/acts.test.js dist/어전.html
git commit -m "feat: 3막 「친정」 — 조작권 B→A→B→A→B, 궁 세 번, 오른 자리보다 낮게 끝난다"
```

---

### Task 17: 1~3막 이어달리기 · 저장 · 성능과 빌드 게이트

**2단계가 그 자체로 플레이 가능한 물건이 되는 태스크다.** 1차시(45분) 분량이 통째로 돌아가야 한다. 그리고 검증용으로 심어 둔 `globalThis.__*` 통로를 **전부 걷어낸다.**

**Files:**
- Create: `src/ui/pause.js`
- Modify: `src/ui/act-end.js` (Task 1이 만든 `show(view)` 위에 `showFinal(state)`을 더한다 — 서명을 갈아 끼우지 않는다)
- Modify: `src/data/acts.js` (`FUTURE_COUNCIL` 추가)
- Modify: `src/main.js` (저장·이어하기·임시 통로 제거·`taken` 정리)

**Interfaces:**
- Consumes: `src/core/state.js` → `SAVE_KEY`, `serialize`, `deserialize`, `createState` (**고치지 않는다**); `src/systems/council.js` → `evaluateChoices`; `src/systems/loss-log.js` → `lostWithReason`, `lossLabel`
- Produces:
  - `FUTURE_COUNCIL: { question, choices }` — 4·5막에서 열릴 수 있었던 선택지 표본
  - `createPause(root): { toggle({ onSave: () => boolean, onRestart: () => void }): void, isOpen(): boolean, close(): void }`
  - `createActEnd(root): { show(view): Promise<void>, showFinal(state): Promise<void> }` — **Task 1의 `show(view)`는 그대로 두고 `showFinal`을 더한다.** 서명을 갈아 끼우지 않는다
  - `saveGame(state): boolean` · `loadGame(): GameState | null` · `clearSave(): void` (main.js 안)

- [ ] **Step 1: 임시 통로를 모두 지운다**

`src/main.js`에서 아래 줄들을 **찾아서 지운다.** 하나라도 남으면 학생 화면에서 콘솔로 게임을 건너뛸 수 있다.

```
globalThis.__setControl
globalThis.__setRush
globalThis.__rushTest
globalThis.__go
globalThis.__fire
globalThis.__brush
globalThis.__c1
globalThis.__d2
globalThis.__orders
globalThis.__game          ← Task 1 이 dispose 를 손으로 시험하려고 둔 것. 이것도 지운다
```

`__game`을 지울 때 파일 맨 아래를 이렇게 되돌린다.

```js
if (typeof document !== 'undefined') {
  const el = document.getElementById('root')
  if (el) boot(el)
}
```

확인: `grep -n "globalThis.__" src/*.js src/**/*.js` 의 결과가 **비어 있어야 한다.**

- [ ] **Step 2: 주운 카드 판정을 상태에서 읽는다**

`live.taken` 이라는 별도 `Set`은 세이브에 안 들어가므로 이어하기 뒤에 같은 사료를 또 줍게 된다. **상태만 보고 판정한다.**

`src/main.js`의 `live` 초기값에서 `taken: new Set(),` 줄을 지우고, 키 입력 핸들러를 고친다.

```js
import { pickUp, markRead, isLost, plunder, survive } from './systems/codex.js'
```

```js
    const near = pickupNear(def, ctx.player.position.x, ctx.player.position.z)
    if (!near) return
    const already =
      live.state.sources.held.includes(near.cardId) || isLost(live.state, near.cardId)
    if (already) return
    const r = spend(live.state, near.placeId)
    if (!r.ok) { banner(root, '해가 모자란다'); return }
    live.state = markRead(pickUp(r.state, near.cardId), near.cardId)
    dialog.showCard(sourceById(near.cardId))
```

- [ ] **Step 3: 4·5막에서 열릴 수 있었던 선택지를 데이터로 적는다**

`src/data/acts.js` 끝에 붙인다. **D2에서 무엇을 버렸는지가 여기서 이름으로 되돌아온다** — 설계서 9장 「4·5막에서 잠기는 선택지는 어느 카드가 없어서인지 이름으로 알려준다」.

```js
// 3막 끝 화면이 「무엇을 버렸는가」를 보여주기 위해 쓰는 표본이다.
// 4·5막의 실제 어전회의는 3단계에서 만든다.
export const FUTURE_COUNCIL = {
  question: '다음 막의 어전회의에서 열릴 수 있었던 것',
  choices: [
    { id: 'f-consular', text: '제물포 조약의 배상을 조문에 근거해 따진다',   requires: ['ganghwa10'] },
    { id: 'f-grain',    text: '쌀이 빠져나가는 까닭을 조문으로 짚는다',      requires: ['joil-trade'] },
    { id: 'f-both',     text: '왜양일체의 논리로 개화당의 주장을 반박한다',   requires: ['choe-ikhyeon'] },
    { id: 'f-seogye',   text: '서계의 전례를 들어 청과 일본의 지위를 가른다', requires: ['seogye'] },
    { id: 'f-survey',   text: '해안 측량권이 무엇을 열었는지 말한다',        requires: ['ganghwa7'] },
  ],
}
```

- [ ] **Step 4: 일시정지·저장 화면**

`src/ui/pause.js`:

```js
const CSS = `
.pause{position:fixed;inset:0;z-index:70;background:#0f1113dd;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:12px;padding:24px}
.pause h2{margin:0;font-size:15px;color:#8f8a7c;letter-spacing:6px;font-weight:400}
.pause .msg{font-size:13px;color:#8f8a7c;min-height:18px}
.pause button{width:260px;padding:13px;background:#23282c;border:1px solid #3a4248;color:#e8e2d4;
  border-radius:3px;font-size:15px;cursor:pointer}
.pause button.go{background:#3a2d20;border-color:#6a5230;color:#e0a23a}
`

let styled = false

export function createPause(root) {
  if (!styled) {
    const style = document.createElement('style')
    style.textContent = CSS
    document.head.appendChild(style)
    styled = true
  }
  let el = null

  function close() { el?.remove(); el = null }

  return {
    isOpen: () => el !== null,
    close,
    toggle({ onSave, onRestart }) {
      if (el) { close(); return }
      el = document.createElement('div')
      el.className = 'pause'
      el.innerHTML = `
        <h2>잠 시 멈 춤</h2>
        <div class="msg"></div>
        <button class="save go">저장하고 계속한다</button>
        <button class="resume">닫는다</button>
        <button class="restart">처음부터 다시</button>`
      root.appendChild(el)
      const msg = el.querySelector('.msg')
      el.querySelector('.save').addEventListener('click', () => {
        msg.textContent = onSave() ? '저장했다. 이 브라우저에서 이어할 수 있다.' : '저장하지 못했다.'
      })
      el.querySelector('.resume').addEventListener('click', close)
      el.querySelector('.restart').addEventListener('click', () => { close(); onRestart() })
    },
  }
}
```

- [ ] **Step 5: 막 끝 화면 — 무엇을 잃었는가**

`src/ui/act-end.js`. **Task 1이 만든 `show(view)`와 그 CSS는 그대로 두고**, 아래를 더한다 — import 세 줄, 마지막 화면용 CSS 한 덩이, 그리고 반환 객체에 `showFinal(state)`.

```js
import { SOURCES, sourceById } from '../data/sources.js'
import { evaluateChoices } from '../systems/council.js'
import { lostWithReason } from '../systems/loss-log.js'
import { FUTURE_COUNCIL } from '../data/acts.js'
```

Task 1의 `CSS` 문자열 끝에 이어 붙인다(`.actend` 클래스를 함께 쓰되 마지막 화면은 위에서부터 쌓는다):

```js
const FINAL_CSS = `
.actend.final{justify-content:flex-start;gap:12px;padding:36px 22px;overflow:auto;z-index:58}
.actend.final h2{font-size:17px;color:#e8e2d4;letter-spacing:6px}
.actend .sub{font-size:14px;color:#8f8a7c;text-align:center;max-width:620px;line-height:1.8}
.actend .box{width:100%;max-width:560px;background:#15181b;border:1px solid #2a3035;border-radius:3px;
  padding:14px 16px}
.actend .box b{display:block;font-size:12px;color:#8f8a7c;letter-spacing:2px;margin-bottom:8px}
.actend .row{font-size:14px;color:#e8e2d4;padding:4px 0;border-bottom:1px solid #22272b}
.actend .row.gone{color:#a09884;text-decoration:line-through}
.actend .row .tag{float:right;font-size:11px;color:#a0522d;text-decoration:none}
.actend .row.locked{color:#5f6971}
.actend .row.locked small{display:block;color:#8f8a7c;font-size:11px;text-decoration:none}
.actend .foot{font-size:13px;color:#8f8a7c;text-align:center;max-width:560px;line-height:1.9}
`
```

`ensureStyle()`이 `CSS + FINAL_CSS`를 넣도록 한 글자를 고치고, 반환 객체에 **`show(view)`는 그대로 둔 채** 아래 메서드를 더한다.

```js
    showFinal(state) {
      return new Promise(() => {   // 마지막 화면이다. 닫지 않는다.
        const kept = state.sources.held.map(id => sourceById(id)).filter(Boolean)
        const burnt = lostWithReason(state, 'fire').map(id => sourceById(id)).filter(Boolean)
        const taken = lostWithReason(state, 'plunder').map(id => sourceById(id)).filter(Boolean)
        const future = evaluateChoices(state, FUTURE_COUNCIL).filter(c => !c.unlocked)
        const read = state.sources.read.length

        const el = document.createElement('div')
        el.className = 'actend final'
        el.innerHTML = `
          <h2>1 차 시 여 기 까 지</h2>
          <div class="sub">1863년부터 1877년까지, 열네 해를 지났다.<br>
            궁을 ${state.moves.length}번 옮겼고, 그중 스스로 정한 것은
            ${state.moves.filter(m => m.self).length}번이었다.</div>

          <div class="box"><b>들고 나온 문서 ${kept.length}</b>
            ${kept.map(c => `<div class="row">${c.title}</div>`).join('') || '<div class="row">없다</div>'}</div>

          <div class="box"><b>불에 잃은 문서 ${burnt.length}</b>
            ${burnt.map(c => `<div class="row gone">${c.title}<span class="tag">불탐</span></div>`).join('') || '<div class="row">없다</div>'}</div>

          <div class="box"><b>약탈로 잃은 문서 ${taken.length}</b>
            ${taken.map(c => `<div class="row gone">${c.title}<span class="tag">약탈됨 · 프랑스</span></div>`).join('') || '<div class="row">없다</div>'}</div>

          <div class="box"><b>이제 열리지 않는 것</b>
            ${future.map(c => `<div class="row locked">???${c.missing.map(m => `<small>← 『${m}』이 사초함에 없다</small>`).join('')}</div>`).join('') || '<div class="row">없다</div>'}</div>

          <div class="foot">
            읽은 문서 ${read}장 / 전체 ${SOURCES.length}장.<br>
            불타는 궁에서 무엇을 골랐나요? 왜 그것이었나요?<br>
            버린 것 때문에 나중에 곤란해질까요?
          </div>`
        root.appendChild(el)
      })
    },
```

(`show(view)` 다음에 이 메서드를 넣는다. 반환 객체와 함수를 닫는 `  }` · `}` 는 Task 1이 쓴 것을 그대로 둔다.)

- [ ] **Step 6: 저장·이어하기·시작 화면을 `main.js`에 붙인다**

import 를 더한다.

```js
import { createState, SAVE_KEY, serialize, deserialize } from './core/state.js'
import { createPause } from './ui/pause.js'
import { createActEnd } from './ui/act-end.js'
```

파일 위쪽(모듈 스코프)에 저장 함수 셋을 둔다.

```js
export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, serialize(state))
    return true
  } catch {
    return false
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? deserialize(raw) : null
  } catch {
    return null
  }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY) } catch { /* 사생활 모드 */ }
}
```

`boot` 안에 붙인다.

```js
  const pause = createPause(root)
  const actEnd = createActEnd(root)

  addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return
    pause.toggle({
      onSave: () => saveGame(live.state),
      onRestart: () => { clearSave(); location.reload() },
    })
  })
```

`playAct` 를 이어하기가 가능한 형태로 바꾼다.

```js
  async function playAct(act, actIndex, resumeAt = 0) {
    live.state = resumeAt > 0
      ? { ...live.state, actIndex, beatIndex: resumeAt }
      : enterAct(live.state, act, actIndex)
    live.state = advancePrices(live.state, actIndex + 1)
    live.dateLabel = act.dateLabel
    while (!isActOver(live.state, act)) {
      const beat = beatAt(act, live.state.beatIndex)
      live.prevPalace = live.state.palace
      live.state = applyBeat(live.state, beat)
      if (beat.dateLabel) live.dateLabel = beat.dateLabel
      syncPalace(live.state)
      live.state = await playBeat(beat)
      live.state = advance(live.state)
      saveGame(live.state)          // 비트마다 자동 저장
    }
  }
```

`run` 을 시작 지점을 받는 형태로 바꾸고, 끝나면 막 끝 화면을 띄운다.

```js
  async function run(start) {
    for (let i = start.actIndex; i < ACTS.length; i++) {
      await playAct(ACTS[i], i, i === start.actIndex ? start.beatIndex : 0)
    }
    clearSave()
    await actEnd.showFinal(live.state)
  }
```

시작 화면을 둔다. `boot` 맨 끝의 `run()` 호출을 이것으로 바꾼다.

```js
  const saved = loadGame()
  if (!saved) {
    run({ actIndex: 0, beatIndex: 0 })
  } else {
    const gate = document.createElement('div')
    gate.className = 'note'
    gate.innerHTML = `
      <h2>어 전 御 前</h2>
      <p>이어하던 기록이 있다.</p>
      <div class="row" style="display:flex;gap:10px">
        <button class="cont">${saved.actIndex + 1}막부터 이어한다</button>
        <button class="fresh">처음부터 한다</button>
      </div>`
    root.appendChild(gate)
    gate.querySelector('.cont').addEventListener('click', () => {
      gate.remove()
      live.state = saved
      syncPalace(live.state)
      run({ actIndex: saved.actIndex, beatIndex: saved.beatIndex })
    })
    gate.querySelector('.fresh').addEventListener('click', () => {
      gate.remove()
      clearSave()
      live.state = createState()
      run({ actIndex: 0, beatIndex: 0 })
    })
  }
```

`NOTE_CSS` 에 버튼 배치를 위한 한 줄을 더한다.

```
.note .row{display:flex;gap:10px}
```

- [ ] **Step 7: 전체를 처음부터 끝까지 완주한다 — 2단계의 합격 기준**

Run: `npm test && npm run build`
Expected: 전부 PASS, `dist/어전.html` **8MB 이하**, 외부 리소스 0건.

브라우저에서 `dist/어전.html`을 열고 **1막부터 3막 끝까지 한 번도 콘솔을 만지지 않고** 완주한다.

**A. 흐름**
1. 1막 즉위 → 발 → 어전회의 → 「실제로는」
2. 2막 병인양요 → 장계 지도 → 회의 → **외규장각 약탈** → 1868 이어 → 신미양요 → **척화비 12자**
3. 3막 최익현 상소 → 문이 열린다 → **자경전 90초** → 1873 이어 → 1875 **스스로 정한 환어** → 초지진 장계 → **훈령** → **조약 회의** → **대화재 3장** → 불탄 궁을 걸어 나감 → 1876 이어
4. `1 차 시 여 기 까 지` 화면

**B. 사초함이 이야기를 기억하는가**
- 마지막 화면에 **들고 나온 문서 3장 · 불에 잃은 문서 · 약탈로 잃은 문서**가 따로 나온다
- **「이제 열리지 않는 것」**에 `← 『강화도 조약 제10관 — 영사 재판권』이 사초함에 없다` 같은 줄이 나온다
- 궁을 옮긴 횟수가 **4번**, 스스로 정한 것이 **1번**이라고 나온다

**C. 저장과 이어하기**
1. 2막 도중 `Esc` → `저장하고 계속한다` → `저장했다`
2. 새로고침 → **이어하던 기록이 있다** 화면 → `2막부터 이어한다`
3. 이미 주운 사료를 **다시 줍지 못한다** (해가 또 깎이면 실패다)
4. `Esc` → `처음부터 다시` → 세이브가 지워지고 1막부터 시작한다

**D. 성능과 크기**
- 1280×720에서 **60fps · 드로우콜 100 이하** (특히 촉박 중과 불탄 경복궁에서)
- `dist/어전.html` **8MB 이하**, 첫 화면까지 3초 이내

**E. 있으면 안 되는 것**
- `grep -n "globalThis.__" src/` 결과 없음
- 화면 어디에도 **점수 · 정답률 · 게임 오버**가 없다
- 화면 어디에도 **쌀값 절대 수치**가 없다
- 콘솔 오류 0건

**F. 검증표 대조** — 아래 다섯 곳에 출처·등급 표기가 붙어 있는지 눈으로 확인한다
- 사료 카드 17장 전부 (`Q` 사초함 → 카드 열람)
- 장계 4종
- 이어 화면 4회의 **음력 날짜 + 실록 근거 + 양력 미확정 고지**
- 자경전 화재 안내의 **재구성 표시**와 「『승정원일기』 계통 기록이며 직접 대조하지 못했습니다」
- 대화재 안내의 **「「830여 칸」은 실록 국역 원문의 표현입니다 … 922칸으로 적은 학술 논문도 있어」**

- [ ] **Step 8: 커밋**

```bash
git add src/ui/pause.js src/ui/act-end.js src/data/acts.js src/main.js dist/어전.html
git commit -m "feat: 1~3막 이어달리기 · Esc 저장/이어하기 · 1차시 끝 화면 — 무엇을 버렸는지 이름으로 돌려준다"
```

---

## 2단계 완료 기준

전부 만족해야 3단계로 넘어간다.

- [ ] `npm test` 전부 통과 — 1단계 7개(`build`·`core/*` 넷·`systems/codex`·`systems/council`, 여기에 병행 물결의 `systems/rush-scene`이 더해질 수 있다) + **2단계 14개**(Task 1의 `core/flow`·`systems/movement`·`data/integrity`, Task 6의 `core/place-cost` 포함)
- [ ] **`tests/core/clock.test.js`의 아홉 개가 한 글자도 안 바뀐 채로 통과한다** — `PLACE_COST`에 줄을 더했을 뿐 `clock.js`의 함수를 고치지 않았다는 증거다 (판정 R30)
- [ ] `dist/어전.html` 하나로 **1막부터 3막 끝까지 완주**된다. 외부 요청 0건 · 8MB 이하
- [ ] 1280×720 통합 그래픽에서 **60fps · 드로우콜 100 이하** (촉박 중 포함)
- [ ] **C1 자경전 90초가 CPU 6× 스로틀링에서도 실시간을 지킨다.** 터치에서는 117초
- [ ] **D1** — 「외규장각 도서 목록」이 영구히 잠기고 사초함에 「약탈됨 · 프랑스」로 뜬다. **양헌수 장계는 잠기지 않는다**(R17)
- [ ] **D2** — 세 장만 들고 나가고, 버린 것이 「불탐」으로 남으며, **막 끝 화면이 그 때문에 잠긴 선택지를 이름으로 알려준다**
- [ ] **E** — 장계 지도에 `○일 전 장계 기준`이 뜨고 **강화도에는 갈 수 없다**
- [ ] **F1** — 척화비 열두 글자를 손으로 쓴다. 한자 글꼴이 없는 기기에서도 **막히지 않는다**. 화면에 **「비문 일부 발췌」**가 뜨고 마무리에 뒤따르는 구절(戒我萬年子孫 · 丙寅作 辛未立)이 함께 보인다
- [ ] **하루가 모자란다** — 2·3막의 모든 온전한 낮에서 **그 궁에 놓인 사료를 다 줍지 못한다**(2막 창덕궁 8칸 대 6칸, 경복궁 17칸 대 6칸). 장소마다 해가 **1칸 또는 2칸** 줄어드는 것이 화면에 보인다
- [ ] **G** — 쌀값이 막마다 오르되 **절대 수치가 화면에 없다**
- [ ] 3막의 조작권이 **B → A → B → A → B**이고 **정점 A · 끝 B**다
- [ ] **실패해도 역사가 바뀌지 않는다** — C1을 놓쳐도 1873 이어는 똑같이 일어나고, 게임 오버 화면이 없다
- [ ] 네 건의 이어에 **실록에서 확인한 음력 날짜**가 적혀 있고, **양력은 어디에도 없으며**, 양력 미확정 고지가 붙어 있다
- [ ] 대화재 뒤 창덕궁 이어가 **1877년(고종 14년 음력 3월 10일)**으로 되어 있다 — 설계서의 「1876 겨울」이 아니다
- [ ] 자경전 화재 장면에 **재구성 표시**가 뜬다 — 실록에는 「慈慶殿災」 네 글자뿐이다
- [ ] **막·궁을 넘길 때 새지 않는다** — `flow.syncPalace()`가 미니맵을 부수고 다시 세우고, `flow.dispose()`가 리스너·DOM·`<style>`을 걷는다. 3막이 끝날 때까지 `document.head`의 `<style>` 수가 늘지 않는다
- [ ] **정합성 테스트가 녹색이다** — `acts.js`의 `requires[]`·`cardIds`·`grantCard`와 `palaces.js`의 `pickups[].cardId`가 모두 실재하는 `SOURCES` id이고, 모든 카드가 어디선가 손에 들어온다
- [ ] `globalThis.__*` 임시 통로가 하나도 남아 있지 않다

## 3단계로 넘길 것 (이번에 만들지 않음)

- 4막 「임오」 · 5막 「갑신」, 사료 카드 #17~#24
- **C2 임오군란** 실시간 카운트다운과 **7.6 실패 분기**(국상 선포 · 의복장 하교)
- **C3 북묘로** · 경우궁·계동궁·우정총국·북묘 맵
- **F2 「日使來衛」 친필과 사료 비판 화면** (검증표 등급 **2차문헌·논쟁적**, 표기 3갈래를 그대로 보여준다)
- **G 회수** — 종로 쌀가게와 무위영의 겨·모래
- 인물 빌보드와 캔버스 골격 애니메이션, 운현궁·궁 밖 거리
- 조작권 **D** 등급의 실제 사용 (지금은 판정만 있고 쓰는 장면이 없다)

## 4단계로 넘길 것

- 엔딩(북묘 · 실록의 마지막 줄) · 「내 기록 복사」
- 검증표 최종 대조 · 24장 출처 점검
- 모바일/태블릿 터치 이동 다듬기 · 접근성 · Cloudflare Pages 배포

---

## Self-Review 기록

### 1. 스펙 커버리지 — 2단계 범위(M6~M7)

| 설계서 항목 | 태스크 | 비고 |
|---|---|---|
| A 사료 해금 | 3, 12, 15, 16 | 카드 15장 추가, 어전회의 2회 + 훈령 1회 |
| B 이어·조작권 | 4, 6, 8, 12, 16 | 2막 1회 + 3막 3회. 조작권 B↔A 오르내림 |
| C1 촉박 90초 | 13 | 프레임 독립·터치 1.3배·게임 오버 없음 |
| D1 소실(약탈) | 3, 10, 12 | `plunder()` 재사용, 사유는 새 모듈이 기억 |
| D2 소실(화재) | 10, 14, 16, 17 | `survive()` 재사용, 3장, 시계 없음, 결과를 막 끝 화면이 이름으로 되돌려 줌 |
| E 지연 | 9, 12, 16 | 장계 3회(병인·신미·운요), `○일 전 장계 기준` |
| F1 친필 | 3, 11, 12 | 척화비 12자(발췌 표시 포함), 실패 불가 |
| G 물가 | 5 | 막간 상승 + **상대 표기만** |
| 경복궁 맵 · 화재 변형 | 6, 7 | 5채 + 변형 2종 + 불 파티클 + 장소별 칸 값 |
| 하루 루프 | 4, 6, 12, 16 | 해가 지면 회의는 그냥 열린다. **장소마다 드는 칸이 달라 하루가 정말로 모자란다**(판정 R30) |
| 「실제로는」 카드 | 2, 12, 16 | 출처·인용 포함 |
| 단일 HTML · 8MB · 60fps | 7, 13, 17 | 촉박 중 계측 포함 |
| 게임 오버 없음 | 13, 17 | 실패는 배너 한 줄과 `flags.sootied` 뿐 |
| 저장·이어하기 | 17 | 1단계에서 만든 직렬화 함수를 처음 쓴다 |
| **막·궁 전이 구조**(1단계 최종 리뷰 「2단계 선결」) | **1** | `core/flow.js`·`systems/movement.js`·`ui/banner.js`·`ui/act-end.js`. `dispose()`를 처음으로 부른다 |
| **데이터 정합성 자물쇠**(같은 리뷰) | **1** | `tests/data/integrity.test.js` — `requires[]`·`pickups[].cardId`를 실재 `SOURCES` id에 묶는다 |

**2단계 범위 밖(3·4단계 몫)**: C2·C3·F2·F3·D 등급 사용·G 회수·엔딩·모바일·배포.

### 2. 플레이스홀더 점검

모든 코드 단계에 **실제로 붙여 넣으면 도는 코드**가 들어 있다. `TODO`·`이하 생략`·「Task N과 비슷하게」가 한 곳도 없다. 초안에서 다음 세 곳을 잡아 고쳤다.

- `tests/systems/fire-rush.test.js`의 `expect(s.map(x => x.strength[0])).not.toBeDefined` — 의미 없는 단정이었다. `expect(s.map(x => x.x)).toEqual([34, 0, 0])` 로 교체.
- `fire-rush` 테스트 통과 개수를 10으로 적었으나 실제 9개였다. 수정.
- Task 4 `main.js`가 마지막 막 뒤에 아무 화면도 안 남기고 끝났다. `run()` 끝에 임시 종료 화면을 넣고 Task 17에서 진짜 막 끝 화면으로 바꾸도록 했다.

**구문 검사(개정 2차).** 문서의 모든 코드 블록을 뽑아 `node --check`로 돌렸다(130개 블록 중 `js` 표시가 붙은 것 전부).

- **진짜 구문 오류 1건 — Task 8 `playMove()`.** 작은따옴표 문자열 안에 **생 개행**이 들어가 `Invalid or unexpected token`으로 실패했다(판정 R24). 두 글자 이스케이프 `'\n'`으로 고쳤다. 겸해서 `.move .note`에 `white-space:pre-line`을 넣었다 — 그 `\n`이 화면에서 실제로 줄을 바꾸게 하려면 필요하다.
- **나머지 실패는 전부 「조각」이다.** `case 'move': return …`, `title: '양요',` 같은 삽입용 단편과, 넣을 자리를 보여주려고 일부러 끊어 놓은 두 조각(Task 5 `playAct` 앞 세 줄, Task 7 `render()` 앞 두 줄)이다. 감싸서 다시 검사하면 모두 통과한다. **파일 하나가 통째로 들어 있는 블록 중 실패한 것은 없다.**

### 3. 타입 일관성 — 실재하는 서명과 대조

**잠금 모듈의 서명을 하나하나 파일에서 확인하고 맞췄다.**

| 쓰는 곳 | 실재 서명 | 확인 |
|---|---|---|
| `spend(state, placeId)` | `{ ok, state }` 반환 | Task 2·17이 `r.ok`/`r.state`로 받는다 |
| `costOf` 기본값 | `PLACE_COST[id] ?? 1` | **판정 R30으로 바뀌었다.** 초안은 「표에 없으니 1칸」에 기대어 2·3막 장소를 전부 1칸으로 두었고, 그래서 「하루가 모자라다」가 거짓이 되었다. Task 6 Step 5가 표에 열두 줄을 더한다. `costOf`·`spend`·`DAY_UNITS`는 그대로이고, `tests/core/place-cost.test.js`가 기본값 1과 1단계 세 값을 다시 못 박는다 |
| `tests/core/clock.test.js` 아홉 개 | `gyujanggak`/`unhyeon`/`outside` 세 값과 모르는 키의 1만 단정 | **새 키를 더해도 아홉 개가 그대로 통과한다.** 파일에서 직접 확인했다 — 나머지 여섯 개는 `DAY_UNITS`·`spend`·`isDusk`·`newDay`만 본다 |
| `pickupNear(def,x,z,radius=5)` | 항목 전체 반환 | `placeId`가 딸려 온다(판정 R2). 첫 일치만 돌려주므로 **지점 간 10m 이상**을 테스트로 강제 |
| `evaluateChoices(state, council)` | `council.choices`만 읽는다 | 훈령에서 `{ choices: beat.clauses }`로 재사용. `council.js` 무수정 |
| `survive(state, keepIds)` | 고르지 않은 **보유분 전부** 소실 | Task 14가 이 동작을 그대로 쓴다(아래 4-② 참조) |
| `plunder(state, ids)` | `held`·`read`에서 빼고 `lost`에 넣음 | 읽었던 카드도 다시 잠긴다 — Task 10 테스트가 확인 |
| `createMinimap(root, def)` | 생성 시 `def` 고정, 교체 함수 없음, `dispose()` 있음 | **Task 1의 `flow.syncPalace()`가 「먼저 부수고 그다음 세운다」로 감싼다.** Task 4의 `syncPalace(state)`는 그 얇은 겉껍질이다 |
| `createInput(target)` 반환 | `{ axis, running, tap, dispose }` | `dispose`가 `keydown`·`keyup`·`blur`·`pointerdown` 넷을 모두 뗀다 — Task 1이 `flow`의 `lifetime`에 넣어 **처음으로 부른다** |
| `createHUD(root)` 반환 | `{ update, dispose }` — `dispose`가 `bar`·`rice`·`style` 셋을 지운다 | 같음. `<style>` 누수가 여기서 닫힌다 |
| `canMove(control)` · `isRoomOpen(control, room)` | `control.js` 무의존 순수 함수 | `movement.js`가 그대로 가져다 쓴다. `step()` 본문은 한 글자도 바뀌지 않았다 |
| `PALACES[id].spawn` | `{ x, z }` (`y` 없음) | Task 1의 `startAct()`가 `ctx.player.position.set(spawn.x, ctx.player.position.y, spawn.z)`로 **높이는 그대로 둔다** |
| `createState()` 반환 | `room`·`lostBy` 필드 **없음** | 판정 R5·R21대로 미선언 필드를 허용하고 모든 읽기를 `?? {}`로 방어한다. `state.js`를 고치지 않는다 |
| `createHUD(...).update(view)` | `{palaceName,dateLabel,dayLeft,riceIndex}` | 키 이름 유지. 화면 표시만 배수로 바뀐다 |
| `createScene(canvas)` 반환 | `{THREE,scene,camera,renderer,player,setPalace,resize,render,stats}` | `fire` 한 키를 **추가**만 한다 |
| `RANK`/`isRoomOpen` | `'A'|'B'|'C'|'D'` 네 값 | 「불타서 못 간다」는 다섯째 등급이 아니라 `passable` 별도 축 |
| `roomProgressAt(rush, now)` | `[{id, filled}]` | `fireSourcesAt`이 그대로 소비 |

**id 일관성** — `sources.js`의 `id`, `palaces.js`의 `pickups[].cardId`, `acts.js`의 `requires[]`·`cardIds`·`grantCard`가 같은 문자열을 쓴다. Task 6·12의 테스트가 셋을 교차 검사한다(`모든 궁의 pickup 카드가 실재하는 사료다`, `어전회의의 요구 사료가 모두 실재하는 카드다`).
**방 id 일관성** — 비트의 `exit.room`·`spawnRoom`·`goalRoom`·`track[]`이 그 시점의 궁에 실재하는지 Task 16의 `모든 비트가 지금 있는 궁에 실재하는 방만 가리킨다`가 검사한다.
**그리고 이제 자물쇠가 먼저 걸린다** — Task 1의 `tests/data/integrity.test.js`가 **막이 하나뿐인 지금부터** 세 파일의 id를 묶어 둔다. 카드 22장과 막 4개가 3단계에 들어올 때, 오타는 「영원히 잠긴 선택지」가 아니라 **빨간 테스트**가 된다.

**`flow`와 `scenario`의 경계** — `flow.js`(Task 1)는 **막·국면·궁·자원 수명**, `scenario.js`(Task 4)는 **비트 단위 전이**. 겹치는 함수가 없다. Task 4의 `main.js`는 `flow`에 `state`를 넘기지 않는다 — 살아 있는 상태는 `live.state` 한 벌뿐이며, 두 벌이 되면 반드시 어긋난다.

### 4. 설계서·검증표·코드가 어긋나는 곳과, 이 계획이 내린 판정

**① 3막 조작권 표기** — 설계서 7장 제목줄 `B → A → B` vs 본문 「A로 시작해 B로 끝나는」. 5장 B의 이어 표(1873=B, 1875=A, 1876=B)를 기준으로 **B→A→B→A→B**로 폈다. 제목줄의 큰 흐름과 본문의 「정점 A · 끝 B」가 둘 다 성립한다. Task 16의 테스트가 두 가지를 다 못 박는다.

**② D2가 잃게 하는 범위** — 설계서 9장 표는 D2 대상을 카드별로 표시하고 본문은 「D2 대상 8장 중 3장」이라 하지만, **표에 실제로 표시된 것은 7장**이다. 그리고 5장 D2 본문은 「모은 15장 남짓 중 3장」이라고 한다. 이미 테스트로 고정된 `survive()`는 **고르지 않은 보유분을 전부** 잃게 한다. **5장 본문과 `survive()`를 따랐다.** `losable` 필드는 설계서 추적용으로 남기되 동작에는 관여하지 않는다.

**③ 쌀값 표기** — 5장 G의 `○○냥` 예시 vs 11장의 「절대 수치 표시 안 함」. **11장을 따랐다.** 1단계 HUD가 찍던 날숫자 `100`도 없앴다.

**④ 카드 #2의 막 배정** — 설계서 9장은 「경복궁 중건 공사 기록」을 1막으로 잡았으나 1막 카드는 이미 두 장으로 확정 커밋되었고, 중건이 *끝나는* 것은 1868년이다. **2막 카드로 옮겼다.**

**⑤ D1 대상에서 「양헌수 정족산성 장계」를 뺐다 — 해소되었다.** 설계서 9장은 이 장계를 D1(외규장각 약탈) 대상으로 지정하고, 초안은 「설계서가 구속력 있다」는 이유로 그 지정을 따랐다. **그것이 잘못이었다.** 판정 **R17**이 이미 「D1 대상은 「외규장각 도서 목록」 한 장으로 한다」고 정해 두었는데, 초안이 근거를 대지도 인용하지도 않고 뒤집었다(판정 **R23**이 이를 적발). 사료 검증 C 5항이 이유를 확정한다 — **외규장각은 어보·교명·어책·어필·의궤·지도 같은 「이미 완성된 왕실 격식 기록물」의 서고**이고, **장계(狀啓)는 지방에서 승정원을 거쳐 임금에게 올라가는 보고 문서**다. 장계 원본이 강화도 서고에 안치되어 있다가 약탈당했다고 볼 근거가 없다.

그래서 이 개정에서 **`plunderable` 플래그 · `plunder()` 대상 목록 · 2막 서사 문장 · 관련 테스트 넷 모두에서 `yangheonsu`를 뺐다.** D1 대상은 `oegyujanggak` 한 장이며, 프랑스군이 실어 간 것은 **의궤와 어책 297책과 은괴 열아홉 상자, 싣지 못한 나머지는 불태웠다**로 고쳤다(실제로 일어난 일이다). 데이터 자리에 **왜 뺐는지 주석을 남겨** 다음 사람이 무심코 되붙이지 못하게 했다. 양헌수 장계 자체는 남는다 — 규장각에서 줍고, 2막 어전회의의 `castle` 선택지를 여는 카드이며, **약탈 화면에서 살아남는다.** 「무엇이 왜 사라졌는가」가 이 게임의 주제이므로, **사라지지 않은 것이 사라지지 않은 이유**도 정확해야 한다.

**⑤-2 판정이 문서를 갈아타며 증발하지 않게 한다.** R23이 지적한 실패 방식(「한 번 내린 판정이 문서를 옮기며 사라진다」)에 대한 이 계획의 대응은 세 겹이다 — (a) 문서 머리에 진행 원장을 근거로 걸었고, (b) 데이터 자리에 판정 번호를 적은 주석을 남겼고, (c) **「양헌수 장계는 약탈 대상이 아니다」를 테스트로 못 박았다.** 주석은 지워질 수 있지만 테스트는 운다.

**⑥ 날짜 4건과 「830여 칸」 — 해소되었고, 설계서가 한 곳 틀렸다.** 이 계획을 쓰는 도중 `history-verification-A.md`가 저장소에 들어왔다. 네 건의 **음력 날짜가 실록 기사 ID 단위로 확정**되었고(설계서 16장 1번 해소), **「830여 칸」이 실록 국역 원문의 표현임도 확인**되었다(16장 2번 해소, 단 학술 논문의 922칸과 불일치). 계획 전체를 이 결과에 맞춰 고쳤다 — 음력은 적고, **양력 일 단위는 「확인불가」이므로 화면 어디에도 넣지 않는다.**

그리고 검증 A가 설계서 5장 B의 이어 표에서 **한 행이 틀렸음**을 드러냈다. 표는 「1876 겨울 · 경복궁 → 창덕궁」이라 하지만, 실록상 **대화재는 고종 13년(1876) 음 11월 4일이고 창덕궁 이어는 고종 14년(1877) 음 3월 10일** — **넉 달 뒤, 해가 바뀐 뒤다.** 임금은 불탄 궁에서 넉 달을 더 지냈다. **검증 A를 따라 1877년으로 고쳤고**, 그 넉 달의 간격을 이어 화면과 막 끝 대사에 살렸다. 같은 이유로 1873년 이어도 화재 당일이 아니라 **열흘 뒤**임을 화면에 적는다. **보고 대상.**

**⑥-2 C1 장면의 등급이 내려갔다.** 실록이 자경전 화재에 대해 남긴 것은 「慈慶殿災」 네 글자뿐이고, **불이 사정전·근정전으로 번지는 경로는 어떤 기록에도 없다.** 초안은 이 장면을 `grade: 'source'`로 두었는데, 검증 A를 반영해 **`'staged'`로 내리고 화면에 재구성 표시를 띄우도록 고쳤다.** 게임에서 가장 손에 땀이 나는 장면이 동시에 가장 지어낸 장면이라는 사실을 학생에게 숨기지 않는다.

**⑦ 교과서 번역 저작권(16장 6번)** — 미해소다. 모든 `excerpt`를 **우리말로 새로 옮긴 것**으로 두고 `origin`에 `수록 · 우리말 옮김`을 밝혔다. Task 3의 테스트가 이 표기를 강제한다.

**⑧ 2막 사료 검증이 도착했다 — 해소되었다.** 초안을 쓸 때는 `history-verification-A.md`(이어 날짜·화재)와 `B.md`(4·5막)뿐이었고 **병인양요·신미양요·강화도 조약 조문에 대한 검증이 없었다**(판정 R22가 2단계 실행의 선결조건으로 걸어 둔 항목). **`history-verification-C.md`가 그 자리를 채웠고**, 이 개정이 결과를 전부 반영했다.

- **바로잡은 것 셋**: 양헌수 장계의 D1 지정(위 ⑤), 자경전 화재 실록 기사의 글자 수(다섯 → **넉 자**), 척화비 12자가 **비문 전체가 아니라 앞부분 발췌**라는 사실.
- **오히려 올라간 것 하나**: 신미양요 참전 장교 회고는 **1904년 슐리 원서 95쪽 원문과 직접 대조되어** 「출처 불명의 유행어」가 아님이 확인되었다. 교과서 수록만을 근거로 삼던 것이 원사료로 뒷받침된다.
- **고치지 않은 것**: 어재연·수자기, 강화도 조약 제1·7·10관 번호, 조·일 무역 규칙 제6·7칙, 최익현 왜양일체 문구, 운요호 사실관계, 「830여 칸」 대 922칸, 1877년 이어까지 넉 달 — 모두 확인되었다.
- **남는 확인불가 둘**: 벨로네 서한과 운요호 『승정원일기』의 **인용 문장이 원문 번역으로 충실한지**는 대조하지 못했다. 다만 **확인불가인 것은 사실관계가 아니라 옮긴 문장**이므로 등급을 내리지 않고 내용도 바꾸지 않는다. 이 계획은 애초에 모든 `excerpt`를 「우리말 옮김」으로 밝히고 있어(⑦) 화면 표기가 이미 정확하다. **보고 대상 — 3단계에서 원문 접근이 열리면 다시 본다.**
- **한 줄 더**: 1876년 대화재 뒤 넉 달간의 임시 거처는 확인불가이므로, **어떤 대사에도 건물 이름을 넣지 않는다.**

**⑨ 1단계가 미완이다** — Task 14·15·16의 산출물이 코드에 없다. Task 2가 이를 마감한다. 이 판단은 실제 작업 트리(HEAD `6e9957e`)를 확인해서 내렸다.

**⑩ 1단계 최종 전체 리뷰의 「2단계 선결」을 Task 1로 앞세웠다.** `main.js`가 단일 막 클로저이고 `dispose()`가 한 번도 안 불린다는 지적은 **2막을 얹기 전에 반드시 처리해야 하는 것**이므로, 계획 맨 앞에 구조 분리 태스크를 새로 넣고 나머지를 한 칸씩 밀었다(태스크 16 → **17**). `flow.js`·`movement.js`·`banner.js`·`act-end.js`가 여기서 나오고, Task 2와 Task 4의 `main.js`는 그 위에 얹힌다 — **`step`과 `banner`를 두 번 다시 정의하지 않는다.** 동시에 `main.js`에 **병행 수정 물결이 내려앉는 중**이므로(마커·고정 타임스텝·새 테스트 둘), Task 1의 첫 걸음을 「지금의 `main.js`를 읽는 것」으로 못 박고 이 계획서의 인용본을 **뼈대**라고 명시했다. **보고 대상 — 두 손이 같은 파일에 닿는다.**

**⑪-2 「하루가 모자라다」가 산술적으로 거짓이었다 — 판정 R30으로 고쳤다.** 초안은 2·3막 사료 지점을 거의 전부 `PLACE_COST`에 없는 장소에 두었고, `costOf`의 기본값은 1이다. 그래서 규장각 네 지점은 **4칸**이고 하루는 **6칸**이었다 — Task 12가 「해 6칸이 부족해 넷을 다 못 줍는다. 무엇을 포기할지가 플레이다」라고 적어 놓은 그 선택이 **존재하지 않았다.** 설계 원칙 2(기다리는 것이 안전하지 않다)가 2막 내내 작동하지 않는 셈이다.

R30이 `PLACE_COST`에 **줄을 더하는 것**을 허용했다(잠금은 「그 파일의 테스트를 깨지 마라」이지 「조회표를 늘리지 마라」가 아니다). Task 6 Step 5가 **스폰에서 55m 이내 1칸 · 그보다 멀면 2칸 · 궁 밖 3칸**이라는 자로 열두 줄을 더하고, Step 3·4가 문서를 **종류대로 다른 건물에** 나눠 놓는다 — 규장각에는 책과 목록, 편전에는 밖에서 올라온 서한과 장계. 이 배치는 값을 만들려고 지어낸 것이 아니라 **판정 R17이 말한 그대로다.** 결과: 2막 창덕궁 낮 **8칸 대 6칸**, 2막 경복궁 낮 **17칸 대 6칸**, 3막 경복궁 낮 **17칸 대 6칸씩 두 번**. 회의 선택지 셋을 다 여는 학생은 **외규장각 목록을 집을 손이 남지 않는다** — 그날 밤 프랑스가 실어 갈 바로 그 문서를.

**1막만은 예외다.** 1막 두 장은 합쳐 2칸이라 다 읽고 갈 수 있다(Task 2의 「1회차」 합격 기준). 대신 **1막의 마당에도 이미 11칸어치가 놓여 있어** 「다 가질 수는 없다」는 1막에서도 보인다. `tests/core/place-cost.test.js`가 두 가지를 각각 못 박는다 — 「1막 두 장은 하루보다 싸다」와 「온전한 하루가 주어지는 모든 탐색 비트에서 그 궁의 것을 다 줍지 못한다」. 뒤엣것은 `palaces.js`·`acts.js`의 실제 데이터를 걸어가며 계산하므로 **싼 지점을 하나 더하는 순간 운다.** 난도는 데이터에 있고 다시 조정하기 싸다.

**⑪-3 좌표 일곱 개가 자기 방 밖에 있었고, 그 덕에 충돌 하나가 숨어 있었다.** `oegyujanggak`·`gaehang-chanseong`·`sherman`·`yangheonsu`(창덕궁)와 `junggeon`·`ganghwa10`·`joil-trade`(경복궁)의 좌표가 `placeId`가 가리키는 방의 상자 밖이었다 — 값은 그 방 값을 내면서 몸은 마당에 서 있는 꼴이다. `pickupNear`가 좌표만 보므로 게임은 돌지만 값과 자리가 어긋난다.

**그리고 좌표를 방 안으로 되돌리자 Task 16의 `탐색 비트의 나가는 방에는 사료 지점이 없다`가 켜졌다.** `junggeon`이 명목상 근정전에 있는데 근정전은 3막 `day-1875`의 `exit.room`이다 — 거기서 `E`를 누르면 훈령으로 넘어가므로 **그 카드는 영영 주울 수 없다.** 초안에서는 좌표가 `z: 44`로 방 밖에 빠져 있어 이 충돌이 우연히 감춰져 있었다. `junggeon`을 **수정전**으로 옮겼다. 같은 이유로 `gaehang-chanseong`도 인정전(1·2·3막 세 번의 `exit.room`)에 두지 않고 **선정전**에 둔다. 나가는 방 넷 — 인정전·광화문·근정전·자경전 — 은 전부 비워 두었다.

**⑪ Task 13의 「세 줄」이 두 줄이었다.** `live` 초기값에 더할 것을 「세 줄」이라 적고 두 줄만 보였다. 셋째인 `rush: null`은 **Task 4에서 이미 넣는다.** 문구를 「두 줄」로 고치고 이유를 적었다.

### 5. 검증 가능성

- **순수 로직 모듈**(`flow`·`movement`·`scenario`·`prices`·`relocate`·`dispatch`·`loss-log`·`brush-trace`·`fire-rush` + 데이터 3종)은 Vitest로 자동 검증한다. DOM·WebGL을 import하지 않는다. `flow.js`는 DOM 을 **만들지 않고 주입받으므로**(`resources`) 가짜 자원으로 궁 전환·`dispose`까지 테스트된다.
- **데이터 자체를 테스트한다.** 「어전회의에는 언제나 아무것도 안 읽고도 고를 수 있는 선택지가 있다」, 「탐색 비트의 나가는 방에는 사료 지점이 없다」, 「모든 비트가 실재하는 방만 가리킨다」, 「확정 못 한 날짜에 고지가 붙는다」 — 계획서가 틀린 데이터를 만들면 테스트가 먼저 운다.
- **난도도 데이터로 테스트한다**(판정 R30). 「온전한 하루가 주어지는 탐색 비트마다, 그 궁에서 조작권으로 갈 수 있는 사료를 다 줍지 못한다」가 `palaces.js`·`acts.js`·`clock.js`의 실제 값을 걸어가며 계산한다. **싼 지점을 하나 더해 압박을 조용히 없애면 그 자리에서 빨개진다.** 짝으로 「1막 두 장은 하루보다 싸다」가 반대편을 지킨다 — 압박을 올리다가 1막의 손맛을 부수는 것도 막는다.
- **렌더·UI·입력은 자동 테스트하지 않는다.** 대신 태스크마다 「손으로 검증한다」에 **무엇을 눌러 무엇이 보여야 하는지**를 적었고, 각 태스크의 **합격 기준**을 한 문장으로 못 박았다.

| 태스크 | 합격 기준 |
|---|---|
| 1 | `dispose()` 뒤에 미니맵·HUD·힌트가 사라지고 키보드가 죽는다 — **지금까지 한 번도 안 불린 함수다** |
| 2 | 안 읽고 회의에 가면 `???`가 뜬다 · 촉박 실패가 `alert`이 아니라 배너다 |
| 6 | 2막 창덕궁 낮에 **여덟 칸어치가 놓여 있고 하루는 여섯 칸이다** · `tests/core/clock.test.js` 아홉 개가 한 글자도 안 바뀐 채 통과한다 |
| 7 | 불이 켜진 채로 60fps · 드로우콜 100 이하 |
| 11 | 한자 글꼴이 없어도 **막히지 않는다** |
| 12 | 사초함에 「약탈됨 · 프랑스」 한 줄(양헌수 장계는 남는다) · 안 주웠으면 「가지고 있던 것이 없다」 |
| 13 | **CPU 6× 스로틀링에서도 90초는 90초** · 터치는 117초 |
| 14 | 「불탐」과 「약탈됨 · 프랑스」가 사초함에서 구별된다 |
| 16 | 돌아온 경복궁의 자경전이 그을린 채 막혀 있다 · 조문을 안 읽으면 두 선택지뿐 |
| 17 | 콘솔을 한 번도 안 만지고 1~3막 완주 · `globalThis.__*` 0건 |
