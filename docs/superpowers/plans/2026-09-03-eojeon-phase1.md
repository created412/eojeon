# 「어전 御前」 1단계 구현 계획 — 엔진 · 1막 · 촉박 엔진

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 창덕궁을 3D로 걸어다니며 사료를 주워 읽고, 읽은 만큼 열린 선택지로 어전회의를 마치는 **1막 「즉위」를 처음부터 끝까지 플레이**할 수 있게 만든다. 여기에 이 게임 재미의 절반이 걸린 **촉박(카운트다운) 엔진**을 시간 기반으로 구현해 기술 관문을 통과한다.

**Architecture:** ES 모듈로 `src/`를 나누고 esbuild로 번들한 뒤, Node 스크립트가 JS·CSS·에셋을 하나의 `dist/어전.html`로 인라인한다. 순수 로직(상태·조작권·시계·사초함·해금·촉박)은 DOM/WebGL 없이 Vitest로 테스트하고, 렌더링은 절차적 지오메트리 + 캔버스 텍스처로 파일 의존 없이 코드로 생성한다.

**Tech Stack:** JavaScript(ES2022) · three.js 0.185.1 · esbuild · Vitest · Node 24

**Spec:** `docs/superpowers/specs/2026-09-03-gojong-metaverse-design.md`

## 전체 단계 분할

설계서 M1~M11을 4개 계획으로 나눈다. 각 계획은 그 자체로 플레이 가능한 결과물을 낸다.

| 계획 | 범위 | 결과물 |
|---|---|---|
| **1단계 (이 문서)** | M1~M5 | 창덕궁 이동 · 사료 해금 · 하루 루프 · 조작권 A~D · **1막 완주** · 촉박 엔진 |
| 2단계 | M6~M7 | 2·3막 · 경복궁 · D1 약탈 · D2 화재 3장 · E 지연 · F1 척화비 |
| 3단계 | M8~M9 | 4·5막 · C2 임오군란 · 7.6 실패 분기 · G 회수 · F2 친필 · 경우궁 |
| 4단계 | M10~M11 | 엔딩 · 기록 복사 · 검증표 대조 · 모바일 · 배포 |

## Global Constraints

설계서의 프로젝트 전역 요구사항. **모든 태스크의 요구사항에 암묵적으로 포함된다.**

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

---

## File Structure

```
package.json                      npm 스크립트 · 의존성
vitest.config.js                  테스트 설정
build.mjs                         esbuild 번들 → 단일 HTML 인라인
index.html                        개발용 셸 (빌드 시 템플릿으로도 사용)
src/
  main.js                         부트 · 메인 루프 · 화면 전환
  core/
    state.js                      게임 전역 상태 + localStorage 직렬화
    control.js                    조작권 등급 A~D 판정
    clock.js                      하루 시간 소모 · 해 지기
    countdown.js                  촉박 엔진 (시간 기반 진격 트랙)
  data/
    sources.js                    사료 카드 데이터
    palaces.js                    궁궐 정의 (방 · 문 · 스폰)
    acts.js                       막 정의 (비트 · 어전회의 · 선택지)
  systems/
    codex.js                      사초함 — 보유 · 열람 · 소실
    council.js                    어전회의 해금 판정
  render/
    textures.js                   캔버스 텍스처 (단청 · 기와 · 박석 · 창호)
    palace.js                     절차적 전각 · 궁궐 조립
    scene.js                      three 씬 · 카메라 · 렌더 루프
  input/
    input.js                      키보드 + 터치 통합 입력
  ui/
    hud.js                        상시 표시 (궁 · 날짜 · 해 · 쌀값)
    minimap.js                    지도 + 촉박 진격 표시
    dialog.js                     대화 · 사료 카드 · 사초함
    council-ui.js                 어전회의 화면 + 「실제로는」 카드
tests/
  core/state.test.js
  core/control.test.js
  core/clock.test.js
  core/countdown.test.js
  systems/codex.test.js
  systems/council.test.js
  build.test.js
dist/
  어전.html                       산출물 (git 추적)
```

**결정 근거**: 순수 로직(`core/`, `systems/`, `data/`)은 DOM·WebGL을 import하지 않는다. 그래야 Vitest가 브라우저 없이 돈다. 렌더·UI·입력은 테스트하지 않고 수동 플레이로 검증한다.

---

### Task 1: 프로젝트 스캐폴드와 단일 HTML 빌드 파이프라인

가장 먼저 "빌드하면 정말 파일 하나가 나오는가"를 증명한다. 이게 안 되면 나머지가 전부 무의미하다.

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `build.mjs`
- Create: `tests/build.test.js`
- Create: `.gitignore`

**Interfaces:**
- Consumes: 없음 (첫 태스크)
- Produces:
  - npm 스크립트: `npm test`, `npm run build`, `npm run dev`
  - `build.mjs`가 `dist/어전.html`을 생성한다
  - `src/main.js`가 `export function boot(root: HTMLElement): void`를 내보낸다

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "eojeon",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "node build.mjs",
    "dev": "node build.mjs --watch"
  },
  "dependencies": {
    "three": "0.185.1"
  },
  "devDependencies": {
    "esbuild": "^0.25.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: 의존성 설치**

Run: `npm install`
Expected: `node_modules/` 생성, 에러 없음. `three@0.185.1` 설치 확인.

- [ ] **Step 3: .gitignore 작성**

```
node_modules/
*.log
```

`dist/`는 **추적한다** — 산출물이 곧 배포물이기 때문이다.

- [ ] **Step 4: vitest.config.js 작성**

```js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
  },
})
```

- [ ] **Step 5: index.html 템플릿 작성**

빌드 스크립트가 `/*__BUNDLE__*/` 자리에 번들을 밀어 넣는다.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>어전 御前 — 1863~1884</title>
<style>
  :root{
    --ink:#e8e2d4; --ink-dim:#8f8a7c; --bg:#0f1113;
  }
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  html,body{margin:0;height:100%;background:#0f1113;color:#e8e2d4;overflow:hidden;
    font-family:system-ui,'Malgun Gothic',sans-serif;user-select:none}
  #root{position:fixed;inset:0}
  canvas{display:block;width:100%;height:100%}
</style>
</head>
<body>
<div id="root"></div>
<script>/*__BUNDLE__*/</script>
</body>
</html>
```

- [ ] **Step 6: src/main.js 최소 구현**

```js
export function boot(root) {
  root.textContent = '어전 御前'
}

if (typeof document !== 'undefined') {
  const el = document.getElementById('root')
  if (el) boot(el)
}
```

- [ ] **Step 7: build.mjs 작성**

```js
import { build, context } from 'esbuild'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = join(here, 'dist', '어전.html')
const MARKER = '/*__BUNDLE__*/'

async function bundle() {
  const result = await build({
    entryPoints: [join(here, 'src', 'main.js')],
    bundle: true,
    format: 'iife',
    minify: true,
    target: 'es2022',
    write: false,
    legalComments: 'none',
  })
  return result.outputFiles[0].text
}

async function emit() {
  const [shell, js] = await Promise.all([
    readFile(join(here, 'index.html'), 'utf8'),
    bundle(),
  ])
  if (!shell.includes(MARKER)) throw new Error('index.html에 ' + MARKER + ' 자리가 없다')
  // </script> 가 문자열 안에 있으면 HTML 파서가 스크립트를 끊는다
  const safe = js.replaceAll('</script', '<\\/script')
  const html = shell.replace(MARKER, safe)
  await mkdir(join(here, 'dist'), { recursive: true })
  await writeFile(OUT, html, 'utf8')
  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(0)
  console.log(`dist/어전.html  ${kb} KB`)
}

if (process.argv.includes('--watch')) {
  const ctx = await context({ entryPoints: [join(here, 'src', 'main.js')], bundle: true, write: false })
  await ctx.watch()
  setInterval(emit, 1000)
} else {
  await emit()
}
```

- [ ] **Step 8: 빌드 검증 테스트 작성 (실패해야 한다)**

`tests/build.test.js`:

```js
import { describe, it, expect, beforeAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFile, stat } from 'node:fs/promises'

const OUT = 'dist/어전.html'

describe('단일 HTML 빌드', () => {
  beforeAll(() => {
    execFileSync('node', ['build.mjs'], { stdio: 'inherit' })
  }, 120000)

  it('dist/어전.html 을 만든다', async () => {
    const s = await stat(OUT)
    expect(s.isFile()).toBe(true)
  })

  it('외부 리소스를 참조하지 않는다', async () => {
    const html = await readFile(OUT, 'utf8')
    expect(html).not.toMatch(/<script[^>]+src=/i)
    expect(html).not.toMatch(/<link[^>]+href=/i)
    expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org)/i)
  })

  it('8MB 이하다', async () => {
    const s = await stat(OUT)
    expect(s.size).toBeLessThan(8 * 1024 * 1024)
  })
})
```

- [ ] **Step 9: 테스트를 돌려 실패를 확인**

Run: `npm test`
Expected: FAIL — `dist/어전.html` 이 아직 없거나 빌드가 안 됨.

만약 이미 통과한다면 Step 7이 제대로 실행된 것이니 그대로 진행한다.

- [ ] **Step 10: 빌드 실행 후 테스트 통과 확인**

Run: `npm run build && npm test`
Expected: PASS 3/3. 콘솔에 `dist/어전.html  ○○ KB` 출력.

- [ ] **Step 11: 브라우저로 눈으로 확인**

`dist/어전.html`을 브라우저에서 열어 화면에 `어전 御前`이 보이는지 확인한다.

- [ ] **Step 12: 커밋**

```bash
git add package.json package-lock.json vitest.config.js index.html build.mjs src/main.js tests/build.test.js .gitignore dist/어전.html
git commit -m "feat: 단일 HTML 빌드 파이프라인 — esbuild 번들을 index.html에 인라인"
```

---

### Task 2: 게임 상태와 localStorage 직렬화

**Files:**
- Create: `src/core/state.js`
- Create: `tests/core/state.test.js`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `CONTROL: { FREE:'A', LIMITED:'B', ESCORTED:'C', LOST:'D' }`
  - `SAVE_KEY: string`
  - `createState(): GameState`
  - `serialize(state: GameState): string`
  - `deserialize(json: string): GameState | null` — 버전 불일치·파손 시 `null`
  - `GameState` 형태:
    ```
    {
      version: 1,
      actIndex: number,        // 0..4
      beatIndex: number,
      palace: string,          // 'changdeok' | 'gyeongbok' | ...
      control: 'A'|'B'|'C'|'D',
      dayLeft: number,         // 남은 낮 시간 단위
      sources: { held: string[], read: string[], lost: string[] },
      decisions: Array<{ actIndex: number, choiceId: string, reason: string }>,
      moves: Array<{ year: number, from: string, to: string, cause: string, self: boolean }>,
      riceIndex: number,       // G 물가 상대 지수, 시작 100
      flags: Record<string, boolean>
    }
    ```

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/core/state.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { createState, serialize, deserialize, CONTROL, SAVE_KEY } from '../../src/core/state.js'

describe('게임 상태', () => {
  it('새 게임은 1막 · 창덕궁 · 조작권 C 로 시작한다', () => {
    const s = createState()
    expect(s.actIndex).toBe(0)
    expect(s.palace).toBe('changdeok')
    expect(s.control).toBe(CONTROL.ESCORTED)
    expect(s.control).toBe('C')
  })

  it('쌀값 지수는 100에서 시작한다', () => {
    expect(createState().riceIndex).toBe(100)
  })

  it('사료 보유·열람·소실이 모두 빈 배열이다', () => {
    const s = createState()
    expect(s.sources).toEqual({ held: [], read: [], lost: [] })
  })

  it('직렬화한 뒤 되돌리면 같은 상태다', () => {
    const s = createState()
    s.sources.held.push('cheokhwabi')
    s.decisions.push({ actIndex: 0, choiceId: 'wonnapjeon', reason: '백성에게서 걷었다' })
    expect(deserialize(serialize(s))).toEqual(s)
  })

  it('버전이 다르면 null 을 준다', () => {
    const s = createState()
    const tampered = JSON.stringify({ ...s, version: 999 })
    expect(deserialize(tampered)).toBeNull()
  })

  it('깨진 JSON 이면 null 을 준다', () => {
    expect(deserialize('{{{')).toBeNull()
  })

  it('저장 키가 정해져 있다', () => {
    expect(SAVE_KEY).toBe('eojeon.save.v1')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/core/state.test.js`
Expected: FAIL — `Failed to resolve import "../../src/core/state.js"`

- [ ] **Step 3: 구현**

`src/core/state.js`:

```js
export const CONTROL = { FREE: 'A', LIMITED: 'B', ESCORTED: 'C', LOST: 'D' }
export const SAVE_KEY = 'eojeon.save.v1'
const VERSION = 1

export function createState() {
  return {
    version: VERSION,
    actIndex: 0,
    beatIndex: 0,
    palace: 'changdeok',
    control: CONTROL.ESCORTED,
    dayLeft: 6,
    sources: { held: [], read: [], lost: [] },
    decisions: [],
    moves: [],
    riceIndex: 100,
    flags: {},
  }
}

export function serialize(state) {
  return JSON.stringify(state)
}

export function deserialize(json) {
  let data
  try {
    data = JSON.parse(json)
  } catch {
    return null
  }
  if (!data || data.version !== VERSION) return null
  return data
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/core/state.test.js`
Expected: PASS 7/7

- [ ] **Step 5: 커밋**

```bash
git add src/core/state.js tests/core/state.test.js
git commit -m "feat: 게임 상태와 localStorage 직렬화"
```

---

### Task 3: 조작권 등급 A~D 판정

설계서 5장 B — 이동의 성격을 키보드가 대신 말한다.

**Files:**
- Create: `src/core/control.js`
- Create: `tests/core/control.test.js`

**Interfaces:**
- Consumes: `src/core/state.js` → `CONTROL`
- Produces:
  - `RANK: { D:0, C:1, B:2, A:3 }`
  - `canMove(control: string): boolean` — `'D'`면 false
  - `isRoomOpen(control: string, room: { minControl: string }): boolean` — 방의 `minControl` 이상이면 열림
  - `openRooms(control: string, rooms: Array<Room>): Array<Room>`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/core/control.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { RANK, canMove, isRoomOpen, openRooms } from '../../src/core/control.js'

const rooms = [
  { id: 'injeongjeon', minControl: 'D' },
  { id: 'huijeongdang', minControl: 'C' },
  { id: 'daejojeon', minControl: 'B' },
  { id: 'yeongyeongdang', minControl: 'A' },
]

describe('조작권 등급', () => {
  it('등급 순서는 D < C < B < A 다', () => {
    expect(RANK.D).toBeLessThan(RANK.C)
    expect(RANK.C).toBeLessThan(RANK.B)
    expect(RANK.B).toBeLessThan(RANK.A)
  })

  it('D 등급에서는 움직일 수 없다', () => {
    expect(canMove('D')).toBe(false)
  })

  it('A·B·C 등급에서는 움직일 수 있다', () => {
    expect(canMove('A')).toBe(true)
    expect(canMove('B')).toBe(true)
    expect(canMove('C')).toBe(true)
  })

  it('자기 등급 이하를 요구하는 방만 열린다', () => {
    expect(isRoomOpen('C', { minControl: 'C' })).toBe(true)
    expect(isRoomOpen('C', { minControl: 'D' })).toBe(true)
    expect(isRoomOpen('C', { minControl: 'B' })).toBe(false)
    expect(isRoomOpen('C', { minControl: 'A' })).toBe(false)
  })

  it('A 등급은 모든 방이 열린다', () => {
    expect(openRooms('A', rooms)).toHaveLength(4)
  })

  it('C 등급은 두 방만 열린다', () => {
    expect(openRooms('C', rooms).map(r => r.id)).toEqual(['injeongjeon', 'huijeongdang'])
  })

  it('D 등급에서도 방 목록은 계산되지만 이동이 막힌다', () => {
    expect(openRooms('D', rooms).map(r => r.id)).toEqual(['injeongjeon'])
    expect(canMove('D')).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/core/control.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/core/control.js`:

```js
export const RANK = { D: 0, C: 1, B: 2, A: 3 }

export function canMove(control) {
  return control !== 'D'
}

export function isRoomOpen(control, room) {
  return RANK[control] >= RANK[room.minControl]
}

export function openRooms(control, rooms) {
  return rooms.filter(r => isRoomOpen(control, r))
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/core/control.test.js`
Expected: PASS 7/7

- [ ] **Step 5: 커밋**

```bash
git add src/core/control.js tests/core/control.test.js
git commit -m "feat: 조작권 등급 A~D 판정"
```

---

### Task 4: 하루 시계 — 낮 시간 소모와 해 지기

설계서 6장. **해가 지면 회의는 준비가 안 돼도 열린다.**

**Files:**
- Create: `src/core/clock.js`
- Create: `tests/core/clock.test.js`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `DAY_UNITS = 6`
  - `PLACE_COST: Record<string, number>` — 기본 1, 궁 밖 3, 운현궁 2
  - `costOf(placeId: string): number`
  - `spend(state: GameState, placeId: string): { ok: boolean, state: GameState }` — 시간이 모자라면 `ok:false`, 상태는 그대로
  - `isDusk(state: GameState): boolean` — `dayLeft <= 0`
  - `newDay(state: GameState): GameState` — `dayLeft`를 `DAY_UNITS`로 되돌림

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/core/clock.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { createState } from '../../src/core/state.js'
import { DAY_UNITS, costOf, spend, isDusk, newDay } from '../../src/core/clock.js'

describe('하루 시계', () => {
  it('하루는 6칸이다', () => {
    expect(DAY_UNITS).toBe(6)
    expect(createState().dayLeft).toBe(6)
  })

  it('규장각은 1칸, 운현궁은 2칸, 궁 밖은 3칸이다', () => {
    expect(costOf('gyujanggak')).toBe(1)
    expect(costOf('unhyeon')).toBe(2)
    expect(costOf('outside')).toBe(3)
  })

  it('모르는 장소는 1칸이다', () => {
    expect(costOf('아무데나')).toBe(1)
  })

  it('시간을 쓰면 줄어든다', () => {
    const r = spend(createState(), 'unhyeon')
    expect(r.ok).toBe(true)
    expect(r.state.dayLeft).toBe(4)
  })

  it('원본 상태를 건드리지 않는다', () => {
    const s = createState()
    spend(s, 'outside')
    expect(s.dayLeft).toBe(6)
  })

  it('시간이 모자라면 거절하고 상태를 그대로 둔다', () => {
    const s = { ...createState(), dayLeft: 2 }
    const r = spend(s, 'outside')
    expect(r.ok).toBe(false)
    expect(r.state.dayLeft).toBe(2)
  })

  it('딱 맞으면 쓸 수 있고 해가 진다', () => {
    const s = { ...createState(), dayLeft: 3 }
    const r = spend(s, 'outside')
    expect(r.ok).toBe(true)
    expect(r.state.dayLeft).toBe(0)
    expect(isDusk(r.state)).toBe(true)
  })

  it('낮이 남아 있으면 해가 지지 않았다', () => {
    expect(isDusk(createState())).toBe(false)
  })

  it('새 날이 오면 6칸으로 돌아온다', () => {
    const s = { ...createState(), dayLeft: 0 }
    expect(newDay(s).dayLeft).toBe(6)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/core/clock.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/core/clock.js`:

```js
export const DAY_UNITS = 6

export const PLACE_COST = {
  gyujanggak: 1,
  unhyeon: 2,
  outside: 3,
}

export function costOf(placeId) {
  return PLACE_COST[placeId] ?? 1
}

export function spend(state, placeId) {
  const cost = costOf(placeId)
  if (state.dayLeft < cost) return { ok: false, state }
  return { ok: true, state: { ...state, dayLeft: state.dayLeft - cost } }
}

export function isDusk(state) {
  return state.dayLeft <= 0
}

export function newDay(state) {
  return { ...state, dayLeft: DAY_UNITS }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/core/clock.test.js`
Expected: PASS 9/9

- [ ] **Step 5: 커밋**

```bash
git add src/core/clock.js tests/core/clock.test.js
git commit -m "feat: 하루 시계 — 낮 시간 소모와 해 지기"
```

---

### Task 5: 사초함 — 보유 · 열람 · 소실

설계서 5장 A·D. **레퍼런스 도서관의 도감은 영원하지만 우리 사초함은 잃을 수 있다.**

**Files:**
- Create: `src/systems/codex.js`
- Create: `tests/systems/codex.test.js`

**Interfaces:**
- Consumes: `src/core/state.js` → `GameState`
- Produces:
  - `pickUp(state, cardId: string): GameState` — 이미 있으면 그대로, 소실된 카드는 다시 못 줍는다
  - `markRead(state, cardId: string): GameState` — 보유하지 않은 카드는 읽을 수 없다
  - `isRead(state, cardId: string): boolean`
  - `isLost(state, cardId: string): boolean`
  - `plunder(state, cardIds: string[]): GameState` — D1. 보유·열람에서 빼고 소실로 옮긴다
  - `survive(state, keepIds: string[]): GameState` — D2. `keepIds`(최대 3장)만 남기고 나머지 보유분을 소실 처리. 3장을 넘기면 앞 3장만 남긴다

> **읽었다가 잃은 카드는 `read`에서도 빠진다.** 그래야 4·5막 어전회의 선택지가 다시 잠긴다 — D2가 아프려면 이래야 한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/systems/codex.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { createState } from '../../src/core/state.js'
import { pickUp, markRead, isRead, isLost, plunder, survive } from '../../src/systems/codex.js'

const held = (s) => s.sources.held
const read = (s) => s.sources.read
const lost = (s) => s.sources.lost

describe('사초함', () => {
  it('사료를 주우면 보유에 들어간다', () => {
    const s = pickUp(createState(), 'cheokhwabi')
    expect(held(s)).toEqual(['cheokhwabi'])
  })

  it('같은 사료를 두 번 주워도 하나다', () => {
    let s = pickUp(createState(), 'cheokhwabi')
    s = pickUp(s, 'cheokhwabi')
    expect(held(s)).toEqual(['cheokhwabi'])
  })

  it('원본 상태를 건드리지 않는다', () => {
    const s = createState()
    pickUp(s, 'cheokhwabi')
    expect(held(s)).toEqual([])
  })

  it('보유한 사료만 읽을 수 있다', () => {
    const s = markRead(createState(), 'cheokhwabi')
    expect(isRead(s, 'cheokhwabi')).toBe(false)
  })

  it('주운 사료를 읽으면 열람으로 들어간다', () => {
    let s = pickUp(createState(), 'cheokhwabi')
    s = markRead(s, 'cheokhwabi')
    expect(isRead(s, 'cheokhwabi')).toBe(true)
  })

  it('약탈당하면 보유·열람에서 빠지고 소실로 간다', () => {
    let s = pickUp(createState(), 'oegyujanggak')
    s = markRead(s, 'oegyujanggak')
    s = plunder(s, ['oegyujanggak'])
    expect(held(s)).toEqual([])
    expect(read(s)).toEqual([])
    expect(lost(s)).toEqual(['oegyujanggak'])
    expect(isLost(s, 'oegyujanggak')).toBe(true)
    expect(isRead(s, 'oegyujanggak')).toBe(false)
  })

  it('소실된 사료는 다시 주울 수 없다', () => {
    let s = plunder(pickUp(createState(), 'oegyujanggak'), ['oegyujanggak'])
    s = pickUp(s, 'oegyujanggak')
    expect(held(s)).toEqual([])
    expect(lost(s)).toEqual(['oegyujanggak'])
  })

  it('화재에서 고른 3장만 남는다', () => {
    let s = createState()
    for (const id of ['a', 'b', 'c', 'd', 'e']) s = markRead(pickUp(s, id), id)
    s = survive(s, ['a', 'c', 'e'])
    expect(held(s).sort()).toEqual(['a', 'c', 'e'])
    expect(read(s).sort()).toEqual(['a', 'c', 'e'])
    expect(lost(s).sort()).toEqual(['b', 'd'])
  })

  it('4장 이상 고르면 앞 3장만 살아남는다', () => {
    let s = createState()
    for (const id of ['a', 'b', 'c', 'd']) s = pickUp(s, id)
    s = survive(s, ['a', 'b', 'c', 'd'])
    expect(held(s).sort()).toEqual(['a', 'b', 'c'])
    expect(lost(s)).toEqual(['d'])
  })

  it('보유하지 않은 것을 고르면 무시한다', () => {
    let s = pickUp(createState(), 'a')
    s = survive(s, ['a', '없는카드'])
    expect(held(s)).toEqual(['a'])
    expect(lost(s)).toEqual([])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/systems/codex.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/systems/codex.js`:

```js
const MAX_SURVIVORS = 3

function clone(state) {
  return {
    ...state,
    sources: {
      held: [...state.sources.held],
      read: [...state.sources.read],
      lost: [...state.sources.lost],
    },
  }
}

export function isLost(state, cardId) {
  return state.sources.lost.includes(cardId)
}

export function isRead(state, cardId) {
  return state.sources.read.includes(cardId)
}

export function pickUp(state, cardId) {
  if (isLost(state, cardId)) return state
  if (state.sources.held.includes(cardId)) return state
  const next = clone(state)
  next.sources.held.push(cardId)
  return next
}

export function markRead(state, cardId) {
  if (!state.sources.held.includes(cardId)) return state
  if (isRead(state, cardId)) return state
  const next = clone(state)
  next.sources.read.push(cardId)
  return next
}

function lose(state, ids) {
  const gone = new Set(ids)
  const next = clone(state)
  next.sources.held = next.sources.held.filter(id => !gone.has(id))
  next.sources.read = next.sources.read.filter(id => !gone.has(id))
  for (const id of gone) if (!next.sources.lost.includes(id)) next.sources.lost.push(id)
  return next
}

export function plunder(state, cardIds) {
  return lose(state, cardIds)
}

export function survive(state, keepIds) {
  const kept = keepIds
    .filter(id => state.sources.held.includes(id))
    .slice(0, MAX_SURVIVORS)
  const doomed = state.sources.held.filter(id => !kept.includes(id))
  return lose(state, doomed)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/systems/codex.test.js`
Expected: PASS 11/11

- [ ] **Step 5: 커밋**

```bash
git add src/systems/codex.js tests/systems/codex.test.js
git commit -m "feat: 사초함 — 보유·열람·소실(약탈/화재)"
```

---

### Task 6: 사료 데이터와 어전회의 해금 판정

설계서 5장 A — **이 게임의 심장.** 잠긴 선택지는 무엇 때문에 잠겼는지 이름을 보여준다.

**Files:**
- Create: `src/data/sources.js`
- Create: `src/systems/council.js`
- Create: `tests/systems/council.test.js`

**Interfaces:**
- Consumes: `src/systems/codex.js` → `isRead`
- Produces:
  - `SOURCES: Array<SourceCard>` where
    ```
    SourceCard = {
      id: string, act: number, title: string,
      origin: string,                       // 출처 표기 (예: '교과서 p.108')
      grade: 'textbook'|'source'|'staged',
      excerpt: string,                      // 원문 발췌
      meaning: string,                      // "이 문서가 말하는 것" 한 줄
      losable: boolean                      // D2 대상 여부
    }
    ```
  - `sourceById(id: string): SourceCard | undefined`
  - `sourcesOfAct(act: number): SourceCard[]`
  - `evaluateChoices(state, council): Array<{ id, text, unlocked, missing: string[] }>`
    - `council = { question: string, choices: Array<{ id, text, requires: string[] }> }`
    - `missing`은 **아직 읽지 않은 필수 사료의 제목** 배열 (id가 아니라 제목 — 화면에 그대로 쓴다)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/systems/council.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { createState } from '../../src/core/state.js'
import { pickUp, markRead } from '../../src/systems/codex.js'
import { SOURCES, sourceById, sourcesOfAct } from '../../src/data/sources.js'
import { evaluateChoices } from '../../src/systems/council.js'

const council = {
  question: '경복궁을 다시 짓는 비용을 어디서 걷는가',
  choices: [
    { id: 'levy', text: '원납전을 걷는다', requires: [] },
    { id: 'coin', text: '당백전을 발행한다', requires: ['dangbaekjeon'] },
    { id: 'refuse', text: '중건을 미룬다', requires: ['dangbaekjeon', 'wonnapjeon'] },
  ],
}

function read(state, ids) {
  return ids.reduce((s, id) => markRead(pickUp(s, id), id), state)
}

describe('사료 데이터', () => {
  it('모든 카드가 id·출처·등급을 가진다', () => {
    for (const c of SOURCES) {
      expect(c.id, `${c.title} 에 id 없음`).toBeTruthy()
      expect(c.origin, `${c.title} 에 출처 없음`).toBeTruthy()
      expect(['textbook', 'source', 'staged']).toContain(c.grade)
    }
  })

  it('id 가 겹치지 않는다', () => {
    const ids = SOURCES.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('id 로 찾을 수 있다', () => {
    expect(sourceById('dangbaekjeon')?.act).toBe(1)
  })

  it('막으로 추릴 수 있다', () => {
    expect(sourcesOfAct(1).every(c => c.act === 1)).toBe(true)
    expect(sourcesOfAct(1).length).toBeGreaterThan(0)
  })
})

describe('어전회의 해금', () => {
  it('요구 사료가 없는 선택지는 항상 열려 있다', () => {
    const r = evaluateChoices(createState(), council)
    expect(r[0]).toEqual({ id: 'levy', text: '원납전을 걷는다', unlocked: true, missing: [] })
  })

  it('안 읽으면 잠기고, 무엇이 없는지 제목으로 알려준다', () => {
    const r = evaluateChoices(createState(), council)
    expect(r[1].unlocked).toBe(false)
    expect(r[1].missing).toEqual([sourceById('dangbaekjeon').title])
  })

  it('읽으면 열린다', () => {
    const s = read(createState(), ['dangbaekjeon'])
    const r = evaluateChoices(s, council)
    expect(r[1].unlocked).toBe(true)
    expect(r[1].missing).toEqual([])
  })

  it('두 장이 필요한 선택지는 한 장만으로는 안 열린다', () => {
    const s = read(createState(), ['dangbaekjeon'])
    const r = evaluateChoices(s, council)
    expect(r[2].unlocked).toBe(false)
    expect(r[2].missing).toEqual([sourceById('wonnapjeon').title])
  })

  it('줍기만 하고 안 읽으면 잠겨 있다', () => {
    const s = pickUp(createState(), 'dangbaekjeon')
    expect(evaluateChoices(s, council)[1].unlocked).toBe(false)
  })

  it('선택지 순서를 그대로 지킨다', () => {
    expect(evaluateChoices(createState(), council).map(c => c.id))
      .toEqual(['levy', 'coin', 'refuse'])
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/systems/council.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 사료 데이터 구현 (1막분)**

`src/data/sources.js` — 1단계에서는 1막 카드 2장만 넣는다. 나머지 22장은 2·3단계에서 추가한다.

```js
export const SOURCES = [
  {
    id: 'wonnapjeon',
    act: 1,
    title: '원납전(願納錢)',
    origin: '『고종실록』 · 재구성',
    grade: 'source',
    excerpt: '스스로 원하여 바치는 돈이라 하였으나, 고을마다 액수가 내려왔다.',
    meaning: '자원이라는 이름이 붙었지만 실제로는 걷어 들이는 돈이었다.',
    losable: false,
  },
  {
    id: 'dangbaekjeon',
    act: 1,
    title: '당백전(當百錢)',
    origin: '『고종실록』 · 재구성',
    grade: 'source',
    excerpt: '한 닢을 상평통보 백 닢으로 쳐서 쓰게 하였다.',
    meaning: '백 배라고 정했을 뿐, 그만한 값어치가 있는 것은 아니었다.',
    losable: false,
  },
]

const BY_ID = new Map(SOURCES.map(c => [c.id, c]))

export function sourceById(id) {
  return BY_ID.get(id)
}

export function sourcesOfAct(act) {
  return SOURCES.filter(c => c.act === act)
}
```

- [ ] **Step 4: 해금 판정 구현**

`src/systems/council.js`:

```js
import { isRead } from './codex.js'
import { sourceById } from '../data/sources.js'

export function evaluateChoices(state, council) {
  return council.choices.map(choice => {
    const missing = (choice.requires ?? [])
      .filter(id => !isRead(state, id))
      .map(id => sourceById(id)?.title ?? id)
    return { id: choice.id, text: choice.text, unlocked: missing.length === 0, missing }
  })
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run tests/systems/council.test.js`
Expected: PASS 10/10

- [ ] **Step 6: 커밋**

```bash
git add src/data/sources.js src/systems/council.js tests/systems/council.test.js
git commit -m "feat: 사료 데이터와 어전회의 해금 판정 — 잠긴 선택지는 이름을 보여준다"
```

---

### Task 7: 촉박 엔진 — 시간 기반 진격 트랙

**이 태스크가 1단계의 기술 관문이다.** 설계서 M5. 여기서 막히면 즉시 보고한다.

핵심 제약: **프레임 드랍이 난도를 바꾸면 안 된다.** 진격은 `performance.now()` 차이로만 계산하고, 프레임 수를 세지 않는다.

**Files:**
- Create: `src/core/countdown.js`
- Create: `tests/core/countdown.test.js`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `createRush({ track: string[], totalMs: number, startedAt: number }): Rush`
    - `Rush = { track, totalMs, startedAt }` (불변)
  - `frontAt(rush, now: number): number` — 난군의 선두 위치를 실수로. 0이면 트랙 첫 칸, `track.length - 1`이면 마지막 칸 도달
  - `reachedAt(rush, roomId: string, now: number): boolean` — 그 방까지 밀려왔는가
  - `remainingMs(rush, now: number): number` — 마지막 칸까지 남은 시간, 최소 0
  - `isOverAt(rush, now: number): boolean`
  - `roomProgressAt(rush, now: number): Array<{ id: string, filled: number }>` — 미니맵 막대용. `filled`는 0~1

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/core/countdown.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  createRush, frontAt, reachedAt, remainingMs, isOverAt, roomProgressAt,
} from '../../src/core/countdown.js'

const TRACK = ['donhwamun', 'injeongjeon', 'huijeongdang', 'daejojeon']

function rush(startedAt = 1000, totalMs = 30000) {
  return createRush({ track: TRACK, totalMs, startedAt })
}

describe('촉박 엔진', () => {
  it('시작 순간 선두는 첫 칸에 있다', () => {
    const r = rush()
    expect(frontAt(r, 1000)).toBe(0)
  })

  it('절반이 지나면 선두도 절반이다', () => {
    const r = rush()
    expect(frontAt(r, 1000 + 15000)).toBeCloseTo(1.5, 5)
  })

  it('끝나면 마지막 칸이다', () => {
    const r = rush()
    expect(frontAt(r, 1000 + 30000)).toBe(3)
  })

  it('시간이 더 지나도 마지막 칸을 넘지 않는다', () => {
    const r = rush()
    expect(frontAt(r, 1000 + 999999)).toBe(3)
  })

  it('시작 전 시각이 들어와도 0 밑으로 안 간다', () => {
    const r = rush()
    expect(frontAt(r, 0)).toBe(0)
  })

  it('선두가 닿은 방만 reached 다', () => {
    const r = rush()
    const t = 1000 + 15000 // front = 1.5
    expect(reachedAt(r, 'donhwamun', t)).toBe(true)
    expect(reachedAt(r, 'injeongjeon', t)).toBe(true)
    expect(reachedAt(r, 'huijeongdang', t)).toBe(false)
    expect(reachedAt(r, 'daejojeon', t)).toBe(false)
  })

  it('트랙에 없는 방은 영영 안 닿는다', () => {
    const r = rush()
    expect(reachedAt(r, 'yeongyeongdang', 1000 + 999999)).toBe(false)
  })

  it('남은 시간을 알려준다', () => {
    const r = rush()
    expect(remainingMs(r, 1000)).toBe(30000)
    expect(remainingMs(r, 1000 + 12000)).toBe(18000)
  })

  it('남은 시간은 음수가 되지 않는다', () => {
    const r = rush()
    expect(remainingMs(r, 1000 + 40000)).toBe(0)
  })

  it('시간이 다 되면 끝난다', () => {
    const r = rush()
    expect(isOverAt(r, 1000 + 29999)).toBe(false)
    expect(isOverAt(r, 1000 + 30000)).toBe(true)
  })

  it('프레임 수와 무관하게 같은 시각이면 같은 결과다', () => {
    const r = rush()
    // 60프레임을 돈 척, 6프레임을 돈 척 — 결과는 시각만 따른다
    expect(frontAt(r, 1000 + 7777)).toBe(frontAt(r, 1000 + 7777))
    expect(frontAt(r, 1000 + 7777)).toBeCloseTo(3 * (7777 / 30000), 10)
  })

  it('미니맵 막대는 칸마다 0~1 로 찬다', () => {
    const r = rush()
    const p = roomProgressAt(r, 1000 + 15000) // front = 1.5
    expect(p.map(x => x.id)).toEqual(TRACK)
    expect(p[0].filled).toBe(1)
    expect(p[1].filled).toBe(1)
    expect(p[2].filled).toBeCloseTo(0.5, 5)
    expect(p[3].filled).toBe(0)
  })

  it('총 시간이 0이면 즉시 끝난 것으로 본다', () => {
    const r = createRush({ track: TRACK, totalMs: 0, startedAt: 1000 })
    expect(frontAt(r, 1000)).toBe(3)
    expect(isOverAt(r, 1000)).toBe(true)
  })

  it('칸이 하나뿐이면 선두는 늘 0 이다', () => {
    const r = createRush({ track: ['only'], totalMs: 5000, startedAt: 0 })
    expect(frontAt(r, 2500)).toBe(0)
    expect(reachedAt(r, 'only', 0)).toBe(true)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/core/countdown.test.js`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/core/countdown.js`:

```js
export function createRush({ track, totalMs, startedAt }) {
  return Object.freeze({ track: [...track], totalMs, startedAt })
}

function ratio(rush, now) {
  if (rush.totalMs <= 0) return 1
  const t = (now - rush.startedAt) / rush.totalMs
  if (t < 0) return 0
  if (t > 1) return 1
  return t
}

export function frontAt(rush, now) {
  const last = rush.track.length - 1
  if (last <= 0) return 0
  return ratio(rush, now) * last
}

export function reachedAt(rush, roomId, now) {
  const i = rush.track.indexOf(roomId)
  if (i < 0) return false
  return frontAt(rush, now) >= i
}

export function remainingMs(rush, now) {
  return Math.max(0, rush.totalMs - (now - rush.startedAt))
}

export function isOverAt(rush, now) {
  return remainingMs(rush, now) <= 0
}

export function roomProgressAt(rush, now) {
  const front = frontAt(rush, now)
  return rush.track.map((id, i) => ({
    id,
    filled: Math.min(1, Math.max(0, front - i + 1 > 1 ? 1 : front - (i - 1))),
  }))
}
```

- [ ] **Step 4: 테스트 실행 — `roomProgressAt`이 틀릴 것이다**

Run: `npx vitest run tests/core/countdown.test.js`
Expected: 마지막에서 두 번째 테스트(`미니맵 막대`)만 FAIL.

- [ ] **Step 5: `roomProgressAt` 을 바르게 고친다**

칸 `i`의 막대는 선두가 `i-1`에서 `i`로 가는 동안 0→1로 찬다. 칸 0은 시작부터 꽉 차 있다.

```js
export function roomProgressAt(rush, now) {
  const front = frontAt(rush, now)
  return rush.track.map((id, i) => {
    if (i === 0) return { id, filled: 1 }
    const filled = front - (i - 1)
    return { id, filled: Math.min(1, Math.max(0, filled)) }
  })
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npx vitest run tests/core/countdown.test.js`
Expected: PASS 14/14

- [ ] **Step 7: 전체 테스트 확인**

Run: `npm test`
Expected: 전부 PASS.

- [ ] **Step 8: 커밋**

```bash
git add src/core/countdown.js tests/core/countdown.test.js
git commit -m "feat: 촉박 엔진 — 시간 기반 진격 트랙 (프레임 독립)"
```

---

### Task 8: 캔버스 텍스처 — 단청 · 기와 · 박석 · 창호

이미지 파일 없이 코드로 텍스처를 그린다. 단일 HTML 제약을 지키는 핵심.

**Files:**
- Create: `src/render/textures.js`

**Interfaces:**
- Consumes: 없음 (브라우저 Canvas API만)
- Produces: 각 함수는 `HTMLCanvasElement`를 돌려준다. `three.CanvasTexture`로 감싸는 것은 `scene.js`의 몫이다.
  - `dancheong(size = 256): HTMLCanvasElement` — 단청 (기둥 상부 · 창방)
  - `roofTile(size = 256): HTMLCanvasElement` — 기와 결
  - `baksok(size = 256): HTMLCanvasElement` — 박석 마당
  - `changhoji(size = 256): HTMLCanvasElement` — 창호지 격자
  - `woodGrain(size = 256): HTMLCanvasElement` — 기둥 나뭇결

- [ ] **Step 1: 구현**

`src/render/textures.js`:

```js
function surface(size) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  return { c, g: c.getContext('2d') }
}

export function woodGrain(size = 256) {
  const { c, g } = surface(size)
  g.fillStyle = '#6b3f2a'
  g.fillRect(0, 0, size, size)
  for (let i = 0; i < size; i += 2) {
    g.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.06})`
    g.beginPath()
    g.moveTo(i + Math.random() * 3, 0)
    g.lineTo(i + Math.random() * 3, size)
    g.stroke()
  }
  return c
}

export function dancheong(size = 256) {
  const { c, g } = surface(size)
  g.fillStyle = '#1d4f43'
  g.fillRect(0, 0, size, size)
  const bands = ['#c0392b', '#2e6f5e', '#e8e2d4', '#204a86']
  const h = size / bands.length
  bands.forEach((col, i) => {
    g.fillStyle = col
    g.fillRect(0, i * h, size, h * 0.62)
  })
  g.globalAlpha = 0.5
  g.strokeStyle = '#e8e2d4'
  g.lineWidth = 2
  for (let x = 0; x < size; x += size / 8) {
    g.beginPath()
    g.arc(x + size / 16, size / 2, size / 20, 0, Math.PI * 2)
    g.stroke()
  }
  g.globalAlpha = 1
  return c
}

export function roofTile(size = 256) {
  const { c, g } = surface(size)
  g.fillStyle = '#3a3f45'
  g.fillRect(0, 0, size, size)
  const step = size / 8
  for (let x = 0; x < size; x += step) {
    const grd = g.createLinearGradient(x, 0, x + step, 0)
    grd.addColorStop(0, 'rgba(255,255,255,0.10)')
    grd.addColorStop(0.5, 'rgba(0,0,0,0.00)')
    grd.addColorStop(1, 'rgba(0,0,0,0.28)')
    g.fillStyle = grd
    g.fillRect(x, 0, step, size)
  }
  return c
}

export function baksok(size = 256) {
  const { c, g } = surface(size)
  g.fillStyle = '#9a9384'
  g.fillRect(0, 0, size, size)
  const step = size / 4
  g.strokeStyle = 'rgba(0,0,0,0.22)'
  g.lineWidth = 2
  for (let y = 0; y < size; y += step) {
    const off = (y / step) % 2 ? step / 2 : 0
    for (let x = -step; x < size; x += step) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.07})`
      g.fillRect(x + off, y, step, step)
      g.strokeRect(x + off, y, step, step)
    }
  }
  return c
}

export function changhoji(size = 256) {
  const { c, g } = surface(size)
  g.fillStyle = '#efe6cf'
  g.fillRect(0, 0, size, size)
  g.strokeStyle = '#8a6a44'
  g.lineWidth = size / 42
  const step = size / 6
  for (let i = 0; i <= size; i += step) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, size); g.stroke()
    g.beginPath(); g.moveTo(0, i); g.lineTo(size, i); g.stroke()
  }
  return c
}
```

- [ ] **Step 2: 눈으로 확인할 임시 페이지로 검증**

`src/main.js`를 잠시 다음으로 바꾼다:

```js
import { dancheong, roofTile, baksok, changhoji, woodGrain } from './render/textures.js'

export function boot(root) {
  root.style.cssText = 'display:flex;gap:8px;padding:16px;flex-wrap:wrap;background:#111'
  for (const fn of [woodGrain, dancheong, roofTile, baksok, changhoji]) {
    const c = fn(160)
    c.style.cssText = 'width:160px;height:160px;image-rendering:pixelated'
    root.appendChild(c)
  }
}

if (typeof document !== 'undefined') {
  const el = document.getElementById('root')
  if (el) boot(el)
}
```

Run: `npm run build`
그리고 `dist/어전.html`을 브라우저에서 연다.
Expected: 나뭇결 · 단청 · 기와 · 박석 · 창호 다섯 장이 나란히 보인다. 단청은 초록·빨강·흰색·파랑 띠가, 창호는 격자가 보여야 한다.

- [ ] **Step 3: 커밋**

```bash
git add src/render/textures.js src/main.js dist/어전.html
git commit -m "feat: 캔버스 텍스처 — 단청·기와·박석·창호·나뭇결 (이미지 파일 없음)"
```

---

### Task 9: 절차적 전각과 창덕궁 조립

**Files:**
- Create: `src/data/palaces.js`
- Create: `src/render/palace.js`

**Interfaces:**
- Consumes: `src/render/textures.js`
- Produces:
  - `PALACES: Record<string, PalaceDef>` where
    ```
    PalaceDef = {
      id: string, name: string,
      spawn: { x: number, z: number },
      rooms: Array<{ id, name, x, z, w, d, minControl: 'A'|'B'|'C'|'D' }>,
      ground: { w: number, d: number }
    }
    ```
  - `roomAt(def: PalaceDef, x: number, z: number): Room | null`
  - `buildHall(THREE, textures, { w, d, h, bays }): THREE.Group` — 기둥 + 창방 + 지붕 한 채
  - `buildPalace(THREE, textures, def): THREE.Group` — 마당 + 전각 전부

> **좌표계**: x는 동서, z는 남북, y는 높이. 단위는 미터로 읽는다. 방의 `x,z`는 중심점, `w,d`는 가로·세로 크기.

- [ ] **Step 1: 창덕궁 데이터 작성**

`src/data/palaces.js` — 1단계는 창덕궁만. 1막에서 열리는 방은 `minControl:'C'` 이하.

```js
export const PALACES = {
  changdeok: {
    id: 'changdeok',
    name: '창덕궁',
    ground: { w: 120, d: 140 },
    spawn: { x: 0, z: 46 },
    rooms: [
      { id: 'donhwamun',    name: '돈화문',   x:   0, z:  56, w: 22, d: 10, minControl: 'D' },
      { id: 'injeongjeon',  name: '인정전',   x:   0, z:  18, w: 30, d: 24, minControl: 'D' },
      { id: 'seonjeongjeon',name: '선정전',   x:  26, z:   6, w: 18, d: 16, minControl: 'C' },
      { id: 'huijeongdang', name: '희정당',   x:  -4, z: -14, w: 26, d: 18, minControl: 'C' },
      { id: 'daejojeon',    name: '대조전',   x:  -4, z: -40, w: 26, d: 18, minControl: 'B' },
      { id: 'gwanmulheon',  name: '관물헌',   x:  28, z: -30, w: 14, d: 12, minControl: 'B' },
      { id: 'gyujanggak',   name: '규장각',   x: -36, z:   4, w: 18, d: 16, minControl: 'C' },
      { id: 'yeongyeongdang', name: '연경당', x: -34, z: -44, w: 20, d: 16, minControl: 'A' },
    ],
  },
}

export function roomAt(def, x, z) {
  for (const r of def.rooms) {
    if (Math.abs(x - r.x) <= r.w / 2 && Math.abs(z - r.z) <= r.d / 2) return r
  }
  return null
}
```

- [ ] **Step 2: 전각 생성기 구현**

`src/render/palace.js`:

```js
import { woodGrain, dancheong, roofTile, baksok, changhoji } from './textures.js'

export function makeTextures(THREE) {
  const wrap = (canvas, repeatX = 1, repeatY = 1) => {
    const t = new THREE.CanvasTexture(canvas)
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(repeatX, repeatY)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }
  return {
    wood: wrap(woodGrain(256), 1, 4),
    dancheong: wrap(dancheong(256), 3, 1),
    roof: wrap(roofTile(256), 6, 2),
    ground: wrap(baksok(256), 24, 28),
    paper: wrap(changhoji(256), 2, 1),
  }
}

export function buildHall(THREE, tex, { w, d, h = 7, bays = 5 }) {
  const g = new THREE.Group()

  // 기단
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(w + 3, 1.2, d + 3),
    new THREE.MeshLambertMaterial({ color: 0x9a9384 })
  )
  base.position.y = 0.6
  g.add(base)

  // 기둥 — InstancedMesh 로 드로우콜을 아낀다
  const colGeo = new THREE.CylinderGeometry(0.42, 0.46, h, 8)
  const colMat = new THREE.MeshLambertMaterial({ map: tex.wood })
  const rows = 2
  const count = bays * rows
  const cols = new THREE.InstancedMesh(colGeo, colMat, count)
  const m = new THREE.Matrix4()
  let i = 0
  for (let r = 0; r < rows; r++) {
    for (let b = 0; b < bays; b++) {
      const x = -w / 2 + (w / (bays - 1)) * b
      const z = r === 0 ? -d / 2 : d / 2
      m.makeTranslation(x, 1.2 + h / 2, z)
      cols.setMatrixAt(i++, m)
    }
  }
  cols.instanceMatrix.needsUpdate = true
  g.add(cols)

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

export function buildPalace(THREE, tex, def) {
  const root = new THREE.Group()

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(def.ground.w, def.ground.d),
    new THREE.MeshLambertMaterial({ map: tex.ground })
  )
  ground.rotation.x = -Math.PI / 2
  root.add(ground)

  for (const r of def.rooms) {
    const hall = buildHall(THREE, tex, {
      w: r.w * 0.72,
      d: r.d * 0.72,
      h: r.id === 'injeongjeon' ? 10 : 7,
      bays: r.w > 24 ? 7 : 5,
    })
    hall.position.set(r.x, 0, r.z)
    hall.userData.roomId = r.id
    root.add(hall)
  }

  return root
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/data/palaces.js src/render/palace.js
git commit -m "feat: 절차적 전각 생성기와 창덕궁 데이터"
```

---

### Task 10: three 씬 · 카메라 · 렌더 루프 · 성능 계측

**Files:**
- Create: `src/render/scene.js`
- Modify: `src/main.js` (전체 교체)

**Interfaces:**
- Consumes: `three`, `src/render/palace.js` → `makeTextures`, `buildPalace`; `src/data/palaces.js` → `PALACES`
- Produces:
  - `createScene(canvas: HTMLCanvasElement): SceneCtx`
    - `SceneCtx = { THREE, scene, camera, renderer, player: THREE.Object3D, setPalace(def), resize(), render(), stats: { fps: number, calls: number } }`
  - 카메라는 플레이어 뒤 위쪽 고정 아이소메트릭. 각도 45°, 거리 34.

- [ ] **Step 1: 구현**

`src/render/scene.js`:

```js
import * as THREE from 'three'
import { makeTextures, buildPalace } from './palace.js'

const CAM_DIST = 34
const CAM_HEIGHT = 30

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1d21)
  scene.fog = new THREE.Fog(0x1a1d21, 70, 150)

  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 400)

  scene.add(new THREE.AmbientLight(0xffffff, 0.55))
  const sun = new THREE.DirectionalLight(0xffe9c4, 0.9)
  sun.position.set(40, 70, 30)
  scene.add(sun)

  const player = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.9, 1.8, 4, 8),
    new THREE.MeshLambertMaterial({ color: 0xd9c27a })
  )
  player.position.set(0, 1.9, 0)
  scene.add(player)

  const tex = makeTextures(THREE)
  let palaceGroup = null

  function setPalace(def) {
    if (palaceGroup) scene.remove(palaceGroup)
    palaceGroup = buildPalace(THREE, tex, def)
    scene.add(palaceGroup)
    player.position.set(def.spawn.x, 1.9, def.spawn.z)
  }

  function resize() {
    const w = canvas.clientWidth || innerWidth
    const h = canvas.clientHeight || innerHeight
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  const stats = { fps: 0, calls: 0 }
  let frames = 0
  let mark = performance.now()

  function render() {
    camera.position.set(player.position.x, CAM_HEIGHT, player.position.z + CAM_DIST)
    camera.lookAt(player.position.x, 0, player.position.z)
    renderer.render(scene, camera)

    frames++
    const now = performance.now()
    if (now - mark >= 1000) {
      stats.fps = Math.round((frames * 1000) / (now - mark))
      stats.calls = renderer.info.render.calls
      frames = 0
      mark = now
    }
  }

  resize()
  addEventListener('resize', resize)

  return { THREE, scene, camera, renderer, player, setPalace, resize, render, stats }
}
```

- [ ] **Step 2: main.js 를 씬 부팅으로 교체**

`src/main.js`:

```js
import { createScene } from './render/scene.js'
import { PALACES } from './data/palaces.js'

export function boot(root) {
  const canvas = document.createElement('canvas')
  root.appendChild(canvas)

  const ctx = createScene(canvas)
  ctx.setPalace(PALACES.changdeok)

  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;right:8px;top:8px;font:12px monospace;color:#8f8a7c'
  root.appendChild(probe)

  function frame() {
    ctx.render()
    probe.textContent = `${ctx.stats.fps} fps · ${ctx.stats.calls} calls`
    requestAnimationFrame(frame)
  }
  frame()
}

if (typeof document !== 'undefined') {
  const el = document.getElementById('root')
  if (el) boot(el)
}
```

- [ ] **Step 3: 빌드하고 성능을 눈으로 확인**

Run: `npm run build`
`dist/어전.html`을 브라우저에서 열고 창을 1280×720으로 맞춘다.

Expected:
- 박석 마당 위에 여덟 채의 전각이 보인다
- 우상단에 **60 fps**, **드로우콜 100 이하**
- 파일 크기가 콘솔에 찍히고 **8MB 이하**

만약 fps가 60에 못 미치면 `renderer.setPixelRatio(1)`로 낮추고 다시 잰다. 그래도 안 되면 **여기서 멈추고 보고한다** — 절차적 지오메트리 예산을 다시 짜야 한다.

- [ ] **Step 4: 빌드 테스트 통과 확인**

Run: `npm test`
Expected: 전부 PASS (특히 8MB 제한과 외부 리소스 0건).

- [ ] **Step 5: 커밋**

```bash
git add src/render/scene.js src/main.js dist/어전.html
git commit -m "feat: three 씬·고정 아이소메트릭 카메라·렌더 루프·성능 계측"
```

---

### Task 11: 입력과 이동 — 조작권 연동

**D 등급에서 WASD가 정말로 안 먹혀야 한다.** 이게 이 게임의 서사 장치다.

**Files:**
- Create: `src/input/input.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `src/core/control.js` → `canMove`, `isRoomOpen`; `src/data/palaces.js` → `roomAt`
- Produces:
  - `createInput(target: HTMLElement): Input`
    - `Input = { axis(): { x: number, z: number }, running(): boolean, tap(): { x: number, z: number } | null, dispose(): void }`
    - `axis()`는 정규화된 방향. 입력이 없으면 `{x:0,z:0}`
  - `src/main.js` 안에 `step(ctx, input, state, dtMs)` — 이동 적용 + 방 판정

- [ ] **Step 1: 입력 모듈 구현**

`src/input/input.js`:

```js
const KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1],  ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0],  ArrowRight: [1, 0],
}

export function createInput(target) {
  const down = new Set()
  let shift = false
  let pending = null

  const onKeyDown = (e) => {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shift = true
    if (KEYS[e.code]) { down.add(e.code); e.preventDefault() }
  }
  const onKeyUp = (e) => {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shift = false
    down.delete(e.code)
  }
  const onBlur = () => { down.clear(); shift = false }
  const onPointer = (e) => {
    const r = target.getBoundingClientRect()
    pending = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }

  addEventListener('keydown', onKeyDown)
  addEventListener('keyup', onKeyUp)
  addEventListener('blur', onBlur)
  target.addEventListener('pointerdown', onPointer)

  return {
    axis() {
      let x = 0, z = 0
      for (const code of down) { x += KEYS[code][0]; z += KEYS[code][1] }
      const len = Math.hypot(x, z)
      return len === 0 ? { x: 0, z: 0 } : { x: x / len, z: z / len }
    },
    running() { return shift },
    tap() { const t = pending; pending = null; return t },
    dispose() {
      removeEventListener('keydown', onKeyDown)
      removeEventListener('keyup', onKeyUp)
      removeEventListener('blur', onBlur)
      target.removeEventListener('pointerdown', onPointer)
    },
  }
}
```

- [ ] **Step 2: main.js 에 이동과 방 판정을 붙인다**

`src/main.js`:

```js
import { createScene } from './render/scene.js'
import { createInput } from './input/input.js'
import { PALACES, roomAt } from './data/palaces.js'
import { createState } from './core/state.js'
import { canMove, isRoomOpen } from './core/control.js'

const WALK = 9    // m/s
const RUN = 15

export function step(ctx, input, state, dtMs) {
  if (!canMove(state.control)) return state
  const a = input.axis()
  if (a.x === 0 && a.z === 0) return state

  const speed = (input.running() ? RUN : WALK) * (dtMs / 1000)
  const p = ctx.player.position
  const nx = p.x + a.x * speed
  const nz = p.z + a.z * speed

  const def = PALACES[state.palace]
  const half = { w: def.ground.w / 2 - 2, d: def.ground.d / 2 - 2 }
  const cx = Math.max(-half.w, Math.min(half.w, nx))
  const cz = Math.max(-half.d, Math.min(half.d, nz))

  const room = roomAt(def, cx, cz)
  if (room && !isRoomOpen(state.control, room)) return state

  p.x = cx
  p.z = cz
  return { ...state, room: room?.id ?? null }
}

export function boot(root) {
  const canvas = document.createElement('canvas')
  root.appendChild(canvas)

  const ctx = createScene(canvas)
  const input = createInput(canvas)
  let state = createState()
  ctx.setPalace(PALACES[state.palace])

  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;right:8px;top:8px;font:12px monospace;color:#8f8a7c;text-align:right'
  root.appendChild(probe)

  let last = performance.now()
  function frame(now) {
    const dt = Math.min(50, now - last)
    last = now
    state = step(ctx, input, state, dt)
    ctx.render()
    probe.textContent =
      `${ctx.stats.fps} fps · ${ctx.stats.calls} calls\n조작권 ${state.control} · ${state.room ?? '마당'}`
    probe.style.whiteSpace = 'pre'
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  // 손으로 조작권을 바꿔 보기 위한 임시 통로 (Task 15에서 제거한다)
  globalThis.__setControl = (c) => { state = { ...state, control: c } }
}

if (typeof document !== 'undefined') {
  const el = document.getElementById('root')
  if (el) boot(el)
}
```

- [ ] **Step 3: 손으로 검증한다**

Run: `npm run build`, 브라우저에서 `dist/어전.html` 열기.

확인할 것:
1. WASD로 걸어다닌다. Shift를 누르면 빨라진다.
2. 우상단에 현재 있는 방 이름이 뜬다 (`인정전`, `마당` 등).
3. 조작권 C 상태에서 **대조전(minControl B)에 못 들어간다.**
4. 콘솔에 `__setControl('A')` 를 치면 대조전·연경당에 들어갈 수 있다.
5. 콘솔에 `__setControl('D')` 를 치면 **WASD가 완전히 안 먹힌다.**

5번이 이 태스크의 합격 기준이다.

- [ ] **Step 4: 커밋**

```bash
git add src/input/input.js src/main.js dist/어전.html
git commit -m "feat: 입력과 이동 — 조작권 등급이 이동을 막는다"
```

---

### Task 12: HUD와 미니맵 (촉박 진격 표시 포함)

**Files:**
- Create: `src/ui/hud.js`
- Create: `src/ui/minimap.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `src/core/countdown.js` → `roomProgressAt`, `remainingMs`; `src/data/palaces.js` → `PalaceDef`
- Produces:
  - `createHUD(root): { update(view): void, dispose(): void }`
    - `view = { palaceName: string, dateLabel: string, dayLeft: number, riceIndex: number }`
  - `createMinimap(root, def: PalaceDef): { update(view): void, dispose(): void }`
    - `view = { playerX, playerZ, control, rush: Rush|null, now: number }`
    - `rush`가 있으면 트랙 칸마다 붉은 막대를 `roomProgressAt` 값으로 채운다

- [ ] **Step 1: HUD 구현**

`src/ui/hud.js`:

```js
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
`

export function createHUD(root) {
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)

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

  return {
    update(view) {
      where.textContent = view.palaceName
      date.textContent = view.dateLabel
      sun.innerHTML = ''
      for (let i = 0; i < 6; i++) {
        const dot = document.createElement('i')
        if (i < view.dayLeft) dot.className = 'on'
        sun.appendChild(dot)
      }
      rice.textContent = view.riceIndex == null ? '' : `쌀 한 섬  ····  ${view.riceIndex}`
    },
    dispose() { bar.remove(); rice.remove(); style.remove() },
  }
}
```

- [ ] **Step 2: 미니맵 구현**

`src/ui/minimap.js`:

```js
import { roomProgressAt, remainingMs } from '../core/countdown.js'
import { isRoomOpen } from '../core/control.js'

const SIZE = 168

export function createMinimap(root, def) {
  const wrap = document.createElement('div')
  wrap.style.cssText =
    `position:fixed;right:10px;bottom:10px;width:${SIZE}px;z-index:20;pointer-events:none`
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  canvas.style.cssText = 'width:100%;background:#0f1113cc;border:1px solid #3a3f45;border-radius:3px'
  const clock = document.createElement('div')
  clock.style.cssText = 'text-align:center;font:13px monospace;color:#d2503a;padding-top:4px;min-height:18px'
  wrap.append(canvas, clock)
  root.appendChild(wrap)

  const g = canvas.getContext('2d')
  const sx = SIZE / def.ground.w
  const sz = SIZE / def.ground.d
  const px = (x) => SIZE / 2 + x * sx
  const pz = (z) => SIZE / 2 + z * sz

  return {
    update(view) {
      g.clearRect(0, 0, SIZE, SIZE)

      const progress = view.rush ? roomProgressAt(view.rush, view.now) : null
      const filledOf = (id) => progress?.find(p => p.id === id)?.filled ?? 0

      for (const r of def.rooms) {
        const x = px(r.x - r.w / 2)
        const y = pz(r.z - r.d / 2)
        const w = r.w * sx
        const h = r.d * sz
        g.fillStyle = isRoomOpen(view.control, r) ? '#4a5158' : '#262b30'
        g.fillRect(x, y, w, h)
        const f = filledOf(r.id)
        if (f > 0) {
          g.fillStyle = 'rgba(210,80,58,0.75)'
          g.fillRect(x, y, w * f, h)
        }
        g.strokeStyle = '#0f1113'
        g.strokeRect(x, y, w, h)
      }

      g.fillStyle = '#e0a23a'
      g.beginPath()
      g.arc(px(view.playerX), pz(view.playerZ), 3.5, 0, Math.PI * 2)
      g.fill()

      if (view.rush) {
        const s = Math.ceil(remainingMs(view.rush, view.now) / 1000)
        clock.textContent = `${s}초`
      } else {
        clock.textContent = ''
      }
    },
    dispose() { wrap.remove() },
  }
}
```

- [ ] **Step 3: main.js 에 붙인다**

`src/main.js`의 `boot` 안에서 `probe`를 지우고 대신:

```js
import { createHUD } from './ui/hud.js'
import { createMinimap } from './ui/minimap.js'
```

`boot` 안:

```js
  const hud = createHUD(root)
  const map = createMinimap(root, PALACES[state.palace])
  let rush = null
  globalThis.__setRush = (r) => { rush = r }
```

프레임 안에서:

```js
    hud.update({
      palaceName: PALACES[state.palace].name,
      dateLabel: '고종 즉위년 · 1863',
      dayLeft: state.dayLeft,
      riceIndex: state.riceIndex,
    })
    map.update({
      playerX: ctx.player.position.x,
      playerZ: ctx.player.position.z,
      control: state.control,
      rush,
      now,
    })
```

- [ ] **Step 4: 손으로 검증한다**

Run: `npm run build`, 브라우저에서 열기.

확인할 것:
1. 상단에 `창덕궁 · 고종 즉위년 · 1863`, 오른쪽에 해 6칸
2. 하단 가운데에 `쌀 한 섬 ···· 100`
3. 우하단 미니맵에 방들이 보이고, **조작권 C에서 잠긴 방은 어둡다**
4. 콘솔에서 촉박을 켜 본다:
   ```js
   __setRush({ track:['donhwamun','injeongjeon','huijeongdang','daejojeon'], totalMs:30000, startedAt:performance.now() })
   ```
   → 미니맵의 네 방이 순서대로 붉게 차오르고, 아래에 남은 초가 줄어든다.

- [ ] **Step 5: 커밋**

```bash
git add src/ui/hud.js src/ui/minimap.js src/main.js dist/어전.html
git commit -m "feat: HUD와 미니맵 — 해·쌀값·조작권별 방 개폐·촉박 진격 표시"
```

---

### Task 13: 상호작용 — 사료 줍기 · 카드 열람 · 사초함

**Files:**
- Create: `src/ui/dialog.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `src/data/sources.js` → `sourceById`, `SOURCES`; `src/systems/codex.js` → `pickUp`, `markRead`, `isRead`, `isLost`
- Produces:
  - `createDialog(root): Dialog`
    - `Dialog = { showCard(card, onClose): void, showCodex(state, onClose): void, isOpen(): boolean, close(): void }`
  - `showCard`는 제목 · 원문 발췌 · 출처 · "이 문서가 말하는 것"을 띄운다. `grade === 'staged'`면 재구성 안내 박스를 함께 띄운다.
  - `showCodex`는 보유·열람·소실 세 묶음을 보여준다. 소실된 것은 「약탈됨 · 프랑스」/「불탐」으로 표시한다.

- [ ] **Step 1: 다이얼로그 구현**

`src/ui/dialog.js`:

```js
import { SOURCES } from '../data/sources.js'
import { isRead, isLost } from '../systems/codex.js'

const CSS = `
.veil{position:fixed;inset:0;background:#0f1113cc;z-index:40;display:flex;
  align-items:center;justify-content:center;padding:20px}
.card{max-width:560px;width:100%;max-height:80vh;overflow:auto;background:#e8e2d4;color:#23201a;
  border-radius:4px;padding:22px 24px;line-height:1.7;box-shadow:0 12px 40px #000a}
.card h3{margin:0 0 4px;font-size:19px}
.card .origin{font-size:12px;color:#6b6558;margin-bottom:14px}
.card .excerpt{border-left:3px solid #8a6a44;padding:6px 0 6px 14px;margin:0 0 14px;
  font-size:15px;white-space:pre-wrap}
.card .meaning{font-size:14px;color:#3b362c}
.card .staged{margin-top:16px;border:1px dashed #8a6a44;padding:8px 10px;font-size:12px;color:#6b6558}
.card .close{margin-top:18px;width:100%;padding:10px;border:1px solid #8a6a44;background:#dcd4c2;
  color:#23201a;border-radius:3px;font-size:14px;cursor:pointer}
.codex h3{margin:0 0 12px}
.codex .grp{margin-bottom:14px}
.codex .grp b{font-size:13px;color:#6b6558;display:block;margin-bottom:4px}
.codex .row{padding:5px 0;border-bottom:1px solid #cfc7b4;font-size:14px}
.codex .row.gone{color:#a09884;text-decoration:line-through}
.codex .row .tag{float:right;font-size:11px;color:#a0522d;text-decoration:none}
`

export function createDialog(root) {
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  let veil = null

  function close() {
    if (veil) { veil.remove(); veil = null }
  }

  function open(html, onClose) {
    close()
    veil = document.createElement('div')
    veil.className = 'veil'
    veil.innerHTML = html
    veil.querySelector('.close').addEventListener('click', () => { close(); onClose?.() })
    root.appendChild(veil)
  }

  return {
    isOpen: () => veil !== null,
    close,
    showCard(card, onClose) {
      const staged = card.grade === 'staged'
        ? `<div class="staged">※ 이 대목은 기록이 남아있지 않아 재구성했습니다</div>` : ''
      open(`<div class="card">
        <h3>${card.title}</h3>
        <div class="origin">${card.origin}</div>
        <p class="excerpt">${card.excerpt}</p>
        <div class="meaning">${card.meaning}</div>
        ${staged}
        <button class="close">닫기 (E)</button>
      </div>`, onClose)
    },
    showCodex(state, onClose) {
      const row = (c) => {
        if (isLost(state, c.id)) return `<div class="row gone">${c.title}<span class="tag">잃음</span></div>`
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
  }
}
```

- [ ] **Step 2: 사료를 줍는 지점을 만든다**

`src/data/palaces.js`의 `changdeok`에 `pickups`를 추가한다:

```js
    pickups: [
      { cardId: 'wonnapjeon',   x: -36, z:   4 },  // 규장각
      { cardId: 'dangbaekjeon', x:  26, z:   6 },  // 선정전
    ],
```

같은 파일에 헬퍼를 추가한다:

```js
export function pickupNear(def, x, z, radius = 5) {
  for (const p of def.pickups ?? []) {
    if (Math.hypot(x - p.x, z - p.z) <= radius) return p
  }
  return null
}
```

- [ ] **Step 3: main.js 에 E / Q 키를 붙인다**

`boot` 안에 추가:

```js
  const dialog = createDialog(root)

  addEventListener('keydown', (e) => {
    if (e.code === 'KeyQ') {
      if (dialog.isOpen()) dialog.close()
      else dialog.showCodex(state)
      return
    }
    if (e.code !== 'KeyE') return
    if (dialog.isOpen()) { dialog.close(); return }
    const def = PALACES[state.palace]
    const near = pickupNear(def, ctx.player.position.x, ctx.player.position.z)
    if (!near) return
    state = pickUp(state, near.cardId)
    state = markRead(state, near.cardId)
    dialog.showCard(sourceById(near.cardId))
  })
```

import 를 보강한다:

```js
import { PALACES, roomAt, pickupNear } from './data/palaces.js'
import { createDialog } from './ui/dialog.js'
import { pickUp, markRead } from './systems/codex.js'
import { sourceById } from './data/sources.js'
```

- [ ] **Step 4: 손으로 검증한다**

Run: `npm run build`, 브라우저에서 열기.

확인할 것:
1. 규장각(왼쪽)으로 걸어가 `E` → 「원납전(願納錢)」 카드가 뜬다. 원문·출처·의미가 다 보인다.
2. `E` 또는 닫기로 닫힌다.
3. `Q` → 사초함에 「원납전」이 들어 있다.
4. 선정전으로 가서 `E` → 「당백전」을 줍는다. `Q`로 두 장이 보인다.

- [ ] **Step 5: 커밋**

```bash
git add src/ui/dialog.js src/data/palaces.js src/main.js dist/어전.html
git commit -m "feat: 사료 줍기·카드 열람·사초함 (E/Q)"
```

---

### Task 14: 어전회의 UI와 「실제로는」 카드

**Files:**
- Create: `src/ui/council-ui.js`
- Create: `src/data/acts.js`

**Interfaces:**
- Consumes: `src/systems/council.js` → `evaluateChoices`
- Produces:
  - `ACTS: Array<ActDef>` where
    ```
    ActDef = {
      id: string, title: string, year: number, dateLabel: string,
      palace: string, control: 'A'|'B'|'C'|'D',
      council: { question: string, choices: Array<{ id, text, requires: string[] }> },
      actual: { line: string, origin: string, quote?: string, quoteOrigin?: string },
      overturn?: string     // 1막 전용: 무엇을 골라도 대원군이 뒤집는 말
    }
    ```
  - `createCouncil(root): { open(state, act, onDecide): void }`
    - `onDecide(choiceId: string, reason: string)` — 학생이 고른 뒤 밤에 남긴 한 줄까지 받아 돌려준다
    - 잠긴 선택지는 `???`로 표시하고 그 아래에 `← 『제목』을 읽지 않았습니다`를 붙인다. **누를 수 없다.**

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
        { id: 'levy',   text: '고을마다 원납전을 걷는다', requires: [] },
        { id: 'coin',   text: '당백전을 발행한다',        requires: ['dangbaekjeon'] },
        { id: 'defer',  text: '중건을 미룬다',            requires: ['dangbaekjeon', 'wonnapjeon'] },
      ],
    },
    overturn: '전하께서는 아직 어리십니다. 이 일은 이 아비가 맡겠습니다.',
    actual: {
      line: '흥선 대원군은 경복궁 중건을 밀어붙였고, 원납전을 걷고 당백전을 발행하였다. 당백전은 물가를 크게 흔들었다.',
      origin: '『고종실록』 · 한국사1 pp.104~107 단원 도입',
    },
  },
]
```

- [ ] **Step 2: 어전회의 UI 구현**

`src/ui/council-ui.js`:

```js
import { evaluateChoices } from '../systems/council.js'

const CSS = `
.council{position:fixed;inset:0;background:#0f1113;z-index:50;display:flex;
  flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px}
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

export function createCouncil(root) {
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)

  return {
    open(state, act, onDecide) {
      const panel = document.createElement('div')
      panel.className = 'council'
      root.appendChild(panel)

      const evaluated = evaluateChoices(state, act.council)
      const readCount = evaluated.filter(c => c.unlocked).length

      const listHtml = evaluated.map(c => c.unlocked
        ? `<button class="opt" data-id="${c.id}">${c.text}</button>`
        : `<div class="locked">???${c.missing.map(m => `<small>← 『${m}』을 읽지 않았습니다</small>`).join('')}</div>`
      ).join('')

      panel.innerHTML = `
        <h2>어 전 회 의</h2>
        <p class="q">${act.council.question}</p>
        <div class="read">고를 수 있는 것 ${readCount} / ${evaluated.length}</div>
        <div class="list">${listHtml}</div>`

      panel.querySelectorAll('button.opt').forEach(btn => {
        btn.addEventListener('click', () => showAftermath(btn.dataset.id))
      })

      function showAftermath(choiceId) {
        const chosen = evaluated.find(c => c.id === choiceId)
        const overturn = act.overturn
          ? `<blockquote>${act.overturn}</blockquote>` : ''
        panel.innerHTML = `
          <div class="actual">
            <div class="you">당신은 ─ ${chosen.text}</div>
            <div>실제로는 ─ ${act.actual.line}</div>
            <div class="origin">${act.actual.origin}</div>
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

- [ ] **Step 3: 커밋**

```bash
git add src/ui/council-ui.js src/data/acts.js
git commit -m "feat: 어전회의 UI와 「실제로는」 카드 — 잠긴 선택지는 이름을 보여준다"
```

---

### Task 15: 1막 완주 — 발(簾) 연출과 해 지기

**Files:**
- Modify: `src/main.js` (전체 재구성)
- Create: `src/ui/veil-screen.js`

**Interfaces:**
- Consumes: 앞선 모든 모듈
- Produces:
  - `createSullyeom(root): { show(): void, hide(): void }` — 수렴청정의 발. 화면 위쪽 42%를 반투명 발로 덮는다. 1막 전용.
  - `src/main.js` 흐름: 부팅 → 1막 낮(자유 탐색) → 해가 지면 어전회의 → 이유 입력 → 1막 종료 화면

- [ ] **Step 1: 발(簾) 연출 구현**

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

export function createSullyeom(root) {
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
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

- [ ] **Step 2: main.js 를 1막 흐름으로 재구성**

`src/main.js` 전체:

```js
import { createScene } from './render/scene.js'
import { createInput } from './input/input.js'
import { PALACES, roomAt, pickupNear } from './data/palaces.js'
import { createState } from './core/state.js'
import { canMove, isRoomOpen } from './core/control.js'
import { spend, isDusk } from './core/clock.js'
import { pickUp, markRead } from './systems/codex.js'
import { sourceById } from './data/sources.js'
import { ACTS } from './data/acts.js'
import { createHUD } from './ui/hud.js'
import { createMinimap } from './ui/minimap.js'
import { createDialog } from './ui/dialog.js'
import { createCouncil } from './ui/council-ui.js'
import { createSullyeom } from './ui/veil-screen.js'

const WALK = 9
const RUN = 15

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

  const room = roomAt(def, cx, cz)
  if (room && !isRoomOpen(state.control, room)) return state

  p.x = cx
  p.z = cz
  return state.room === (room?.id ?? null) ? state : { ...state, room: room?.id ?? null }
}

export function boot(root) {
  const canvas = document.createElement('canvas')
  root.appendChild(canvas)

  const act = ACTS[0]
  const ctx = createScene(canvas)
  const input = createInput(canvas)
  const hud = createHUD(root)
  const dialog = createDialog(root)
  const council = createCouncil(root)
  const sullyeom = createSullyeom(root)

  let state = { ...createState(), palace: act.palace, control: act.control }
  ctx.setPalace(PALACES[state.palace])
  const map = createMinimap(root, PALACES[state.palace])
  sullyeom.show()

  let phase = 'day'   // 'day' | 'council' | 'done'
  const visited = new Set()

  addEventListener('keydown', (e) => {
    if (phase !== 'day') return
    if (e.code === 'KeyQ') {
      dialog.isOpen() ? dialog.close() : dialog.showCodex(state)
      return
    }
    if (e.code !== 'KeyE') return
    if (dialog.isOpen()) { dialog.close(); return }
    const def = PALACES[state.palace]
    const near = pickupNear(def, ctx.player.position.x, ctx.player.position.z)
    if (!near || visited.has(near.cardId)) return
    const r = spend(state, near.cardId === 'wonnapjeon' ? 'gyujanggak' : 'unhyeon')
    if (!r.ok) return
    visited.add(near.cardId)
    state = markRead(pickUp(r.state, near.cardId), near.cardId)
    dialog.showCard(sourceById(near.cardId))
  })

  function openCouncil() {
    phase = 'council'
    dialog.close()
    sullyeom.hide()
    council.open(state, act, (choiceId, reason) => {
      state = { ...state, decisions: [...state.decisions, { actIndex: 0, choiceId, reason }] }
      phase = 'done'
      const end = document.createElement('div')
      end.className = 'council'
      end.innerHTML = `<h2>1 막 「즉 위」 끝</h2>
        <p class="q">담 너머에서 경복궁 중건이 시작된다.</p>
        <div class="read">읽은 문서 ${state.sources.read.length}장 · 남긴 말 ${reason ? '있음' : '없음'}</div>`
      root.appendChild(end)
    })
  }

  let last = performance.now()
  function frame(now) {
    const dt = Math.min(50, now - last)
    last = now

    if (phase === 'day') {
      state = step(ctx, input, state, dt)
      if (isDusk(state)) openCouncil()
    }

    ctx.render()
    hud.update({
      palaceName: PALACES[state.palace].name,
      dateLabel: act.dateLabel,
      dayLeft: state.dayLeft,
      riceIndex: state.riceIndex,
    })
    map.update({
      playerX: ctx.player.position.x,
      playerZ: ctx.player.position.z,
      control: state.control,
      rush: null,
      now,
    })
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

if (typeof document !== 'undefined') {
  const el = document.getElementById('root')
  if (el) boot(el)
}
```

- [ ] **Step 3: 1막을 두 번 완주해 검증한다**

Run: `npm run build`, 브라우저에서 열기.

**1회차 — 사료를 다 읽고 간다**
1. 화면 위에 발이 드리워져 있고 `수 렴 청 정` 글자가 보인다
2. 규장각(왼쪽)에서 `E` → 원납전 획득. 해가 1칸 줄어든다
3. 선정전(오른쪽)에서 `E` → 당백전 획득. 해가 2칸 줄어든다
4. 남은 시간을 다 쓰고 나면 자동으로 어전회의가 열린다
5. **세 선택지가 다 열려 있다.** 발이 걷힌다
6. 고르면 「실제로는」 카드 + 대원군의 말이 뜨고, 이유를 적는다
7. `1 막 「즉 위」 끝`

**2회차 — 아무것도 안 읽고 간다** (브라우저 새로고침)
1. 사료를 줍지 않고 마당만 돌아다닌다
2. 해가 다 질 때까지 기다린다 → 어전회의가 **그냥 열린다**
3. **첫 선택지만 열려 있고 나머지 둘은 `???`** 이며 `← 『당백전(當百錢)』을 읽지 않았습니다`가 보인다
4. 잠긴 항목은 눌리지 않는다

2회차가 이 게임의 심장이 뛰는지 보는 검사다.

> 해가 저절로 지지 않으면(사료 지점 두 곳만으로는 3칸밖에 안 씀) 콘솔에서 `__dusk()`를 부를 수 있도록 `boot` 안에 `globalThis.__dusk = () => { state = { ...state, dayLeft: 0 } }` 를 임시로 두고 검증한 뒤, 검증이 끝나면 그 줄을 지운다.

- [ ] **Step 4: 전체 테스트와 빌드 확인**

Run: `npm test && npm run build`
Expected: 전부 PASS. `dist/어전.html` 8MB 이하.

- [ ] **Step 5: 커밋**

```bash
git add src/ui/veil-screen.js src/main.js dist/어전.html
git commit -m "feat: 1막 「즉위」 완주 — 수렴청정의 발, 해가 지면 열리는 어전회의"
```

---

### Task 16: 촉박 시퀀스 통합과 성능 게이트

**M5 기술 관문.** 촉박 엔진(Task 7)을 실제 화면에 붙이고, **프레임이 떨어져도 난도가 안 바뀌는지** 확인한다.

**Files:**
- Create: `src/systems/rush-scene.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `src/core/countdown.js` → `createRush`, `reachedAt`, `isOverAt`
- Produces:
  - `startRush({ track, totalMs, goalRoom }): RushSession`
    - `RushSession = { rush, goalRoom: string, tick(now, playerRoom): 'running'|'caught'|'arrived' }`
    - `'arrived'` — 난군이 닿기 전에 목표 방에 들어갔다
    - `'caught'` — 난군이 목표 방에 먼저 닿았다
  - 판정은 오직 `now`와 `playerRoom`으로만 한다. 프레임 수를 세지 않는다.

- [ ] **Step 1: 촉박 세션 구현**

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

- [ ] **Step 2: 연습 시퀀스를 main.js 에 붙인다**

1막 완주 뒤 이어서 촉박 엔진을 시험할 수 있게 임시 진입점을 둔다. (3막 자경전 화재 C1은 2단계에서 정식 구현한다.)

`boot` 안에 추가:

```js
  let session = null
  globalThis.__rushTest = () => {
    state = { ...state, control: 'A' }
    session = startRush({
      track: ['donhwamun', 'injeongjeon', 'huijeongdang', 'daejojeon'],
      totalMs: 30000,
      goalRoom: 'daejojeon',
      now: performance.now(),
    })
  }
```

프레임 안 `phase === 'day'` 블록에:

```js
      if (session) {
        const r = session.tick(now, state.room)
        if (r !== 'running') {
          alert(r === 'arrived' ? '닿았다' : '늦었다')
          session = null
        }
      }
```

미니맵 호출을 바꾼다:

```js
      rush: session?.rush ?? null,
```

import 를 보강한다:

```js
import { startRush } from './systems/rush-scene.js'
```

- [ ] **Step 3: 촉박을 손으로 검증한다**

Run: `npm run build`, 브라우저에서 열기.

**성공 경로**
1. 콘솔에 `__rushTest()`
2. 미니맵의 돈화문→인정전→희정당→대조전이 순서대로 붉게 차오르고, 아래 초가 줄어든다
3. Shift로 달려 대조전에 들어간다 → `닿았다`

**실패 경로**
1. 새로고침 후 `__rushTest()`
2. 가만히 있는다 → 30초 뒤 `늦었다`

**프레임 독립성 검증 (이 태스크의 합격 기준)**
1. `__rushTest()` 직후 개발자 도구 Performance 탭에서 CPU 스로틀링을 **6× slowdown**으로 건다
2. 초 카운터가 **여전히 실시간으로** 줄어드는지 본다 — 프레임이 뚝뚝 끊겨도 30초는 30초여야 한다
3. 붉은 막대의 진행도 실제 경과 시간과 맞아야 한다

3번이 어긋나면 `countdown.js`가 어딘가에서 프레임에 의존하고 있는 것이다. **여기서 멈추고 보고한다.**

- [ ] **Step 4: 성능 게이트 확인**

창을 1280×720으로 맞추고 `__rushTest()` 실행 중에:
- **60 fps 유지**
- **드로우콜 100 이하**

미달이면 멈추고 보고한다.

- [ ] **Step 5: 전체 테스트와 빌드**

Run: `npm test && npm run build`
Expected: 전부 PASS, 8MB 이하, 외부 리소스 0건.

- [ ] **Step 6: 커밋**

```bash
git add src/systems/rush-scene.js src/main.js dist/어전.html
git commit -m "feat: 촉박 시퀀스 통합 — 프레임과 무관하게 시간으로만 쫓아온다"
```

---

## 1단계 완료 기준

전부 만족해야 2단계로 넘어간다.

- [ ] `npm test` 전부 통과 (상태 · 조작권 · 시계 · 사초함 · 해금 · 촉박 · 빌드)
- [ ] `dist/어전.html` 하나로 게임이 돌고, **외부 요청 0건 · 8MB 이하**
- [ ] 1280×720 통합 그래픽에서 **60fps · 드로우콜 100 이하**
- [ ] 1막 「즉위」를 처음부터 끝까지 플레이할 수 있다
- [ ] **사료를 안 읽고 회의에 가면 선택지가 `???`로 잠기고, 무엇이 없는지 제목으로 알려준다**
- [ ] 조작권 `D`에서 WASD가 완전히 안 먹힌다
- [ ] 촉박 카운트다운이 **CPU 6× 스로틀링에서도 실시간을 지킨다**

## 2단계로 넘길 것 (이번에 만들지 않음)

- 사료 카드 나머지 22장 · 경복궁 맵 · 인물 빌보드와 골격 애니
- D1 외규장각 약탈 · D2 화재 3장 고르기 · E 장계 지연 · F1 척화비 친필
- G 쌀값 지수의 막간 상승 (지금은 100 고정 표시만)
- 저장/이어하기 UI (직렬화 함수는 이미 있다)
- 터치 조작 다듬기 · 촉박 시간 1.3배 완화

---

## Self-Review 기록

**1. 스펙 커버리지** — 1단계 범위(M1~M5)에 대해:

| 설계서 항목 | 태스크 |
|---|---|
| A 사료 해금 | Task 5, 6, 13, 14 |
| B 이어·조작권 A~D | Task 3, 11 |
| C 촉박 엔진 | Task 7, 16 |
| D 소실 (로직만) | Task 5 (`plunder`/`survive` 구현 완료, 화면 연결은 2단계) |
| E 지연 | 2단계 |
| F 친필 | 2단계 |
| G 물가 (표시만) | Task 12 (지수 표시), 상승 로직은 2단계 |
| 하루 루프 | Task 4, 15 |
| 「실제로는」 카드 | Task 14 |
| 절차적 궁궐 · 캔버스 텍스처 | Task 8, 9, 10 |
| 단일 HTML · 8MB · 60fps | Task 1, 10, 16 |
| 게임 오버 없음 | Task 16 (`caught`도 alert 한 줄, 실패 화면 없음) |

**2. 플레이스홀더 점검** — 모든 코드 단계에 실제 코드가 들어 있다. 초안에 있던 `--ink-dim` 오타와 "나중에 고쳐라" 주석은 계획서 실패이므로 제거하고 올바른 값(`#8f8a7c`)으로 고쳤다.

**4. 검증 가능성** — 순수 로직 6개 모듈은 Vitest로 자동 검증한다. 렌더·UI·입력은 자동 테스트하지 않으므로 **각 태스크마다 "손으로 검증한다" 단계에 무엇을 눌러 무엇이 보여야 하는지 구체적으로 적었다.** Task 11 Step 3의 5번(D 등급에서 WASD 불통), Task 15 Step 3의 2회차(안 읽고 가면 `???`), Task 16 Step 3의 3번(6× 스로틀링에서 실시간 유지)이 각각의 합격 기준이다.

**3. 타입 일관성** — 조작권은 전 구간 `'A'|'B'|'C'|'D'` 문자열. 사료 id는 `sources.js`의 `id`와 `palaces.js`의 `pickups[].cardId`, `acts.js`의 `requires[]`가 같은 값(`wonnapjeon`, `dangbaekjeon`)을 쓴다. `roomProgressAt`은 Task 7에서 정의하고 Task 12에서만 쓴다. `startRush`의 반환은 Task 16에서 정의·사용한다.
