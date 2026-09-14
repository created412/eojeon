# 「어전」 앞부분 보강 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 1~3막 앞부분에 고종의 사적인 삶(운현궁 소년 명복·철렴·가례·완화군·원자의 죽음·친정)을 끼우고, 알현 장면에서 전각 안을 걸을 수 있게 한다.

**Architecture:** 데이터(`src/data/acts.js`·`npcs.js`·`palaces.js`)에 비트·인물·궁을 더하고, 등급 `rumor`를 화면 두 곳(`note-screen`·`dialog.noticeFor`)에 연결한다. 알현 걷기는 `movement.step()`에 `confineRoom` 선택 인자를 더하고 `systems/audience.js`에 순수 함수(`visitorSpotFor`·`audienceLeft`)를 더해 `main.js`가 잇는다. 여성 인물은 `voice:true` 인물로, 3D 몸 없이 대화판(이름·대사)만 뜬다.

**Tech Stack:** 순수 ES 모듈 + three.js, vitest, esbuild(`node build.mjs`) 단일 HTML.

**Spec:** `docs/superpowers/specs/2026-09-13-eojeon-early-life-design.md`

## Global Constraints

- 막 번호(ACTS 배열 순서·길이 5)는 바꾸지 않는다.
- 운현궁→창덕궁은 `kind:'move'`를 쓰지 않는다 — 다음 비트의 `palace:'changdeok'`로 바꾼다(이어 9회 유지).
- 등급 값은 `source | textbook | staged | rumor` 넷. 사실과 소문을 한 비트에 섞지 않는다.
- 게임 글의 「N 해」 표현은 `tests/data/year-counts.test.js`에 등록해야 한다 → 새 글에서는 「N 해」를 쓰지 않는다(「육십여 년」처럼 쓴다).
- 여성 인물(`jodaebi`·`wangbi`·`mother`·`gungin`)은 `voice: true` — 3D 몸 없음, 초상 없음.
- 새 장면에 시간 제한을 넣지 않는다.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>` / `Claude-Session: https://claude.ai/code/session_01UQeGVmcsfEv5jincLcyXSi`.
- 전체 시험: `npx vitest run` — 매 태스크 끝에 전부 통과.

---

### Task 1: 네 번째 등급 「소문(rumor)」

**Files:**
- Modify: `src/ui/note-screen.js` (staged 고지 줄)
- Modify: `src/ui/dialog.js` (`noticeFor`)
- Modify: `tests/data/grade-honesty.test.js:35` (`GRADE_WORD`)
- Test: `tests/ui/dialog.test.js`

**Interfaces:**
- Produces: `RUMOR_NOTICE` 문자열 (export, `src/ui/dialog.js`), `noticeFor({grade:'rumor'})`가 `class="rumor"` div를 돌려준다. note 비트의 `grade:'rumor'`는 note 화면에 같은 고지를 낸다.

- [ ] **Step 1: 실패하는 시험**

`tests/ui/dialog.test.js` 끝에 추가:
```js
import { noticeFor, RUMOR_NOTICE } from '../../src/ui/dialog.js'
it('소문 등급은 확인된 기록이 아니라고 따로 밝힌다', () => {
  const html = noticeFor({ grade: 'rumor' })
  expect(html).toContain('class="rumor"')
  expect(html).toContain(RUMOR_NOTICE)
  expect(RUMOR_NOTICE).toContain('소문')
})
```
`tests/data/grade-honesty.test.js:35`를 `const GRADE_WORD = { textbook: '교과서', source: '사료', staged: '재구성', rumor: '소문' }`로, 131행 시험 이름을 `'모든 grade 값이 넷 중 하나다 — 소문은 드러내 놓고 더했다'`로 바꾼다.

- [ ] **Step 2:** `npx vitest run tests/ui/dialog.test.js` → FAIL (`RUMOR_NOTICE` 없음)

- [ ] **Step 3: 구현**

`src/ui/dialog.js`의 `noticeFor` 위에:
```js
export const RUMOR_NOTICE = '※ 이 대목은 확인된 기록이 아니라 당시에 돌았다고 전하는 이야기입니다. 이런 것을 「소문」이라고 합니다.'
```
`noticeFor` 첫 줄에:
```js
  if (card.grade === 'rumor') return `<div class="rumor">${RUMOR_NOTICE}</div>`
```
`src/ui/note-screen.js`에서 `const staged = ...` 식을:
```js
        const staged = beat.grade === 'staged'
          ? '<div class="staged">※ 이 대목은 기록에 남아 있지 않습니다. 게임이 지어내 채운 장면입니다. 이런 것을 「재구성」이라고 합니다.</div>'
          : beat.grade === 'rumor' ? `<div class="staged rumor">${RUMOR_NOTICE}</div>` : ''
```
그리고 파일 위에 `import { RUMOR_NOTICE } from './dialog.js'`. (순환 import가 생기면 `RUMOR_NOTICE`를 `src/ui/copy.js`로 옮기고 두 곳에서 import.)

- [ ] **Step 4:** `npx vitest run` → 전부 PASS
- [ ] **Step 5:** 커밋 `feat: 네 번째 등급 「소문」을 드러내 놓고 더한다`

---

### Task 2: 알현 방 안에서 걷기

**Files:**
- Modify: `src/systems/movement.js` (`step` 다섯째 인자)
- Modify: `src/systems/audience.js` (순수 함수 둘)
- Modify: `src/main.js` (알현 입력 블록 ~1770, 걷기 블록 ~1795, `playAudience` ~1034)
- Test: `tests/systems/movement.test.js`, `tests/systems/audience.test.js`

**Interfaces:**
- Produces: `step(ctx, input, state, dtMs, { confineRoom = null } = {})` — `confineRoom`이 있으면 그 방 밖으로 나가는 걸음을 막고 `blocked: 'confine:<id>'`.
- Produces: `visitorSpotFor(room, king)` → `{x,z}` 임금 기준 아뢰는 자리(방 안으로 clamp).
- Produces: `audienceLeft(def, roomId, x, z)` → `boolean` 그 좌표가 알현 방 밖인가.

- [ ] **Step 1: 실패하는 시험 — movement**

`tests/systems/movement.test.js` 끝에:
```js
describe('step() — 알현 중에는 그 방 안에서만', () => {
  // 인정전: x:0, z:12, w:22, d:18 → 문은 앞면 z=21 쪽. 방 안 (0,14)에서 문 쪽(+z)으로 오래 민다.
  it('confineRoom 이면 문밖으로 나가지 못하고 confine 으로 알린다', () => {
    const ctx = { player: { position: { x: 0, y: 0, z: 14 } } }
    const state = { ...createState(), control: 'C', room: 'injeongjeon' }
    let s = state
    for (let i = 0; i < 40; i++) s = step(ctx, makeInput({ x: 0, z: 1 }), s, 100, { confineRoom: 'injeongjeon' })
    expect(Math.abs(ctx.player.position.z - 12)).toBeLessThanOrEqual(9)
    expect(s.blocked).toBe('confine:injeongjeon')
  })
  it('confineRoom 이어도 방 안에서는 움직인다', () => {
    const ctx = { player: { position: { x: 0, y: 0, z: 14 } } }
    const state = { ...createState(), control: 'C', room: 'injeongjeon' }
    step(ctx, makeInput({ x: 1, z: 0 }), state, 100, { confineRoom: 'injeongjeon' })
    expect(ctx.player.position.x).toBeGreaterThan(0)
  })
  it('confineRoom 이 없으면 문으로 나간다 — 아룀이 끝난 뒤', () => {
    const ctx = { player: { position: { x: 0, y: 0, z: 14 } } }
    let s = { ...createState(), control: 'C', room: 'injeongjeon' }
    for (let i = 0; i < 40; i++) s = step(ctx, makeInput({ x: 0, z: 1 }), s, 100)
    expect(ctx.player.position.z).toBeGreaterThan(21)
  })
})
```

- [ ] **Step 2: 실패하는 시험 — audience**

`tests/systems/audience.test.js` import에 `visitorSpotFor, audienceLeft` 추가, 끝에:
```js
import { PALACES } from '../../src/data/palaces.js'
describe('알현 — 임금이 걸은 뒤', () => {
  it('아뢰는 사람은 임금이 지금 선 자리 앞에 선다', () => {
    const k = { x: -3, z: 14 }
    const v = visitorSpotFor(ROOM, k)
    expect(v.x).toBeCloseTo(k.x + VISITOR_SIDE_T, 5)
    expect(v.z).toBeCloseTo(k.z + VISITOR_GAP, 5)
  })
  it('임금이 벽에 붙어 서도 아뢰는 자리는 방 안이다', () => {
    const v = visitorSpotFor(ROOM, { x: 7.5, z: 18 })
    expect(Math.abs(v.x - ROOM.x)).toBeLessThan((ROOM.w * ROOM_SHRINK) / 2)
    expect(Math.abs(v.z - ROOM.z)).toBeLessThan((ROOM.d * ROOM_SHRINK) / 2)
  })
  it('audienceLeft — 방 안이면 false, 문밖 마당이면 true', () => {
    const def = PALACES.changdeok
    expect(audienceLeft(def, 'injeongjeon', 0, 14)).toBe(false)
    expect(audienceLeft(def, 'injeongjeon', 0, 26)).toBe(true)
  })
})
```
(import 줄에 `VISITOR_SIDE as VISITOR_SIDE_T`도 더한다.)

- [ ] **Step 3:** `npx vitest run tests/systems/movement.test.js tests/systems/audience.test.js` → FAIL

- [ ] **Step 4: 구현 — movement**

`src/systems/movement.js`:
```js
export function step(ctx, input, state, dtMs, { confineRoom = null } = {}) {
```
`blocksTo` 안 첫 줄로:
```js
    if (confineRoom && roomAt(def, x, z)?.id !== confineRoom) return `confine:${confineRoom}`
```
그리고 벽 태그를 만드는 두 곳을 confine을 살리게 바꾼다:
```js
  const tagOf = w => (String(w).startsWith('confine:') ? w : `wall:${w}`)
  if (wall && Math.hypot(nx-p.x,nz-p.z)<.00001) {
    const tag = tagOf(wall)
    return state.blocked === tag ? state : { ...state, blocked: tag }
  }
  ...
  const blocked=wall&&barelyMoved?tagOf(wall):null
```
맨 앞의 잠긴 방 검사(`if (room && room.id !== here?.id && ...)`)는 그대로 둔다.

- [ ] **Step 5: 구현 — audience.js**

`visitorSpot` 아래에:
```js
import { roomAt } from '../data/palaces.js'

// 임금이 방 안을 걸은 뒤의 아뢰는 자리 — 임금이 지금 선 자리 앞, 오른쪽. 벽을 넘지 않게 방 안으로 당긴다.
export function visitorSpotFor(room, king) {
  const halfW = (room.w * ROOM_SHRINK) / 2 - 1.2
  const halfD = (room.d * ROOM_SHRINK) / 2 - 1.2
  const clamp = (v, c, h) => Math.max(c - h, Math.min(c + h, v))
  return { x: clamp(king.x + VISITOR_SIDE, room.x, halfW), z: clamp(king.z + VISITOR_GAP, room.z, halfD) }
}

// 알현 방을 벗어났는가 — 아룀이 끝난 뒤 문으로 걸어 나가면 다음 비트로 넘어간다.
export function audienceLeft(def, roomId, x, z) {
  return roomAt(def, x, z)?.id !== roomId
}
```

- [ ] **Step 6: 구현 — main.js 잇기**

1. import에 `visitorSpotFor, audienceLeft` 추가.
2. `let audienceExitOpen = false` 를 `let lastRebukeAt` 옆에 선언.
3. `playAudience`: `const stand = visitorSpot(room)` 대신 방문자마다 루프 안에서
   ```js
   const kingNow = { x: ctx.player.position.x, z: ctx.player.position.z }
   const stand = visitorSpotFor(room, kingNow)
   ```
   `walkNpc(v.npc, door, stand, APPROACH_MS, kingNow)`; `propSpot`은 `{ x:(kingNow.x+stand.x)/2, z:(kingNow.z+stand.z)/2 }`로. `departIds` 루프의 `stand` 참조는 `visitorSpotFor(room, kingNow)`로.
   아룀이 끝나 힌트를 띄우는 자리에서 `audienceExitOpen = true`, 힌트 기본 문구를 `beat.exit?.label ?? 'E — 다음으로'` 뒤에 `' · 또는 문으로 나간다'`를 붙인다. 끝나며 `audienceExitOpen = false`.
4. 알현 입력 블록(`if (flow.phase === 'audience') { ... rebuke() }`)을 통째로 바꾼다:
   ```js
   if (flow.phase === 'audience' && audienceBeat && !procession) {
     const busy = !!audienceWalk || speak.isOpen() || dialog.isOpen()
     const tapped = input.tap()
     if (!busy) {
       if (tapped) { const p = ctx.pickGround(tapped.x, tapped.y); if (p) tapTarget = p }
       const def = PALACES[flow.state.palace]
       const roomId = audienceBeat.room ?? def.councilRoom
       acc = Math.min(acc + dt, FIXED_MS * MAX_STEPS)
       let steps = 0
       while (acc >= FIXED_MS && steps < MAX_STEPS) {
         flow.state = step(ctx, inputForStep(), flow.state, FIXED_MS, { confineRoom: audienceExitOpen ? null : roomId })
         acc -= FIXED_MS; steps++
       }
       if (String(flow.state.blocked ?? '').startsWith('confine:') && now - lastRebukeAt >= REBUKE_MS) {
         lastRebukeAt = now; rebuke()
       }
       if (audienceExitOpen && audienceLeft(def, roomId, ctx.player.position.x, ctx.player.position.z)) resolveAudience?.()
     }
   }
   ```
   행렬 중(`procession`)에는 예전처럼 입력을 꾸중으로 받는다:
   ```js
   if (flow.phase === 'audience' && procession) {
     const a = input.axis(); const tapped = input.tap()
     if ((a.x !== 0 || a.z !== 0 || tapped) && now - lastRebukeAt >= REBUKE_MS) { lastRebukeAt = now; rebuke() }
   }
   ```
5. 1막 `blockLine`을 문밖 말투로: `'전하, 아직 어전회의가 끝나지 않았습니다. 자리를 뜨지 마시옵소서.'` — 다른 알현들의 blockLine은 뜻이 이미 「자리를 지키라」이므로 그대로 둔다.

- [ ] **Step 7:** `npx vitest run` → PASS. 실패하는 기존 시험이 「알현 중 움직이면 꾸중만」을 붙들고 있으면 그 시험을 새 규칙(방 안 이동 가능·문밖 꾸중)으로 고친다.
- [ ] **Step 8:** 커밋 `feat: 알현 중에는 전각 안을 걷고, 아룀이 끝나야 문밖으로 나간다`

---

### Task 3: 목소리로만 나오는 인물 (`voice: true`)

**Files:**
- Modify: `src/render/scene.js` (`setNpcs`)
- Modify: `src/systems/audience.js` (`castOf`)
- Modify: `src/main.js` (`speakVisitor` 초상)
- Test: `tests/systems/audience.test.js`, `tests/data/npcs.test.js`

**Interfaces:**
- Produces: NPC 필드 `voice: true` — `castOf`에서 빠진다(3D로 세우지 않음). 알현 방문자 `from: 'voice'` — 걸어 들어오지 않고 제자리 말. `portraitKeyOf(voiceNpc)` → `null`.

- [ ] **Step 1: 실패하는 시험**

`tests/systems/audience.test.js`:
```js
it('목소리로만 나오는 사람은 무대에 세우지 않고, 걸어 들어오지도 않는다', () => {
  const beat = { beside: 'heungseon', visitors: [{ npc: 'jodaebi', from: 'voice' }, { npc: 'hojo' }] }
  expect(castOf(beat)).toEqual(['heungseon', 'hojo'])
  expect(entersOf({ npc: 'jodaebi', from: 'voice' })).toBe(false)
})
```
`tests/data/npcs.test.js`:
```js
import { portraitKeyOf } from '../../src/data/npcs.js'
it('목소리로만 나오는 인물은 얼굴이 없다', () => {
  expect(portraitKeyOf({ voice: true, rank: 'mid' })).toBe(null)
})
```

- [ ] **Step 2:** FAIL 확인
- [ ] **Step 3: 구현**

`audience.js`:
```js
export function entersOf(visitor) {
  return visitor?.from !== 'beside' && visitor?.from !== 'voice'
}
export function castOf(beat) {
  const out = []
  const voiced = new Set(visitorsOf(beat).filter(v => v.from === 'voice').map(v => v.npc))
  for (const id of [...besideIds(beat), ...escortIds(beat), ...visitorsOf(beat).map(v => v.npc)]) {
    if (!voiced.has(id) && !out.includes(id)) out.push(id)
  }
  return out
}
```
`npcs.js` `portraitKeyOf` 첫 줄 뒤: `if (npc.voice) return null`.
`scene.js` `setNpcs` 루프 첫 줄: `if (n.voice) continue` (키 계산은 그대로 두어도 된다).
`main.js` 탐색 대화(`case 'talk'`)는 `portraitKeyOf`가 null을 주므로 얼굴 없이 뜬다 — 추가 코드 없음.

- [ ] **Step 4:** `npx vitest run` PASS
- [ ] **Step 5:** 커밋 `feat: 발·문 너머 목소리로만 나오는 인물`

---

### Task 4: 운현궁 — 궁·인물·1막 앞머리

**Files:**
- Modify: `src/data/palaces.js` (`unhyeon`)
- Modify: `src/data/npcs.js` (`mother`, `haein`, `jaemyeon`, `kimjwageun`, `minchisang`, `jodaebi`, `wangbi`, `gungin`)
- Modify: `src/data/acts.js` (1막 `palace`, 앞 비트 넷, `throne`에 `palace:'changdeok'`)
- Modify: `tests/data/audience.test.js:204` , `tests/systems/king-age.test.js:9`
- Test: `tests/data/acts.test.js`

**Interfaces:**
- Consumes: Task 1 `grade:'rumor'`(여기서는 안 씀), Task 3 `voice`.
- Produces: 궁 id `unhyeon`, 방 id `sarang`·`anchae`·`daemun`. 비트 id `unhyeon-note`·`unhyeon-day`·`unhyeon-summons`·`unhyeon-procession`.

- [ ] **Step 1: 실패하는 시험**

`tests/data/acts.test.js` 끝에:
```js
describe('1막 앞머리 — 운현궁의 명복', () => {
  const beats = beatsOf(ACTS[0])
  it('운현궁에서 시작해 인정전으로 간다', () => {
    expect(ACTS[0].palace).toBe('unhyeon')
    expect(beats.slice(0, 4).map(b => b.id)).toEqual(['unhyeon-note', 'unhyeon-day', 'unhyeon-summons', 'unhyeon-procession'])
    expect(beats.find(b => b.id === 'throne').palace).toBe('changdeok')
  })
  it('운현궁에서 창덕궁으로 가는 길은 이어가 아니다', () => {
    expect(beats.filter(b => b.kind === 'move')).toHaveLength(0)
  })
  it('모시러 온 사람은 실록대로 김좌근과 민치상이다', () => {
    const s = beats.find(b => b.id === 'unhyeon-summons')
    expect(s.visitors.map(v => v.npc)).toEqual(expect.arrayContaining(['kimjwageun', 'minchisang']))
    expect(s.origin).toContain('철종실록')
  })
})
```
`tests/data/audience.test.js:204` 시험을 바꾼다:
```js
  it('왕이 된 뒤 1막에는 탐색 비트가 없다 — 걷는 낮은 즉위 전 운현궁뿐이다', () => {
    const explores = beatsOf(ACTS[0]).filter(b => b.kind === 'explore')
    expect(explores.map(b => b.id)).toEqual(['unhyeon-day'])
    expect(beatsOf(ACTS[0]).some(b => b.kind === 'audience')).toBe(true)
  })
```
그리고 210행 `find(b => b.kind === 'audience')`를 `find(b => b.id === 'audience')`로.
`tests/systems/king-age.test.js:9`는 첫 비트의 lines에 「열두 살」이 있어야 하므로 새 첫 비트에 넣는다(시험은 그대로 둔다).

- [ ] **Step 2:** FAIL 확인
- [ ] **Step 3: 구현 — palaces.js** (`gyedong` 앞에)
```js
  // 운현궁 — 흥선군의 사저. 1863년 겨울까지 명복이 자란 집이다.
  // ⚠ 방 배치는 복원이 아니라 재구성이다(경우궁과 같다). 노안당(사랑채)·노락당(안채)·대문 셋만 둔다.
  unhyeon: {
    id: 'unhyeon',
    name: '운현궁',
    councilRoom: 'sarang',
    ground: { w: 48, d: 44 },
    spawn: { x: 0, z: 10 },
    rooms: [
      { id: 'sarang', name: '노안당', gloss: '사랑채', x: -8, z: -8, w: 18, d: 12, minControl: 'D' },
      { id: 'anchae', name: '노락당', gloss: '안채',   x: 12, z: -10, w: 16, d: 12, minControl: 'D' },
      { id: 'daemun', name: '대문',                    x: 0,  z: 18, w: 8,  d: 4,  minControl: 'D', gate: true },
    ],
    pickups: [],
  },
```
`npx vitest run tests/data/palaces.test.js tests/data/yard.test.js` — `yard`가 없는 궁을 허용하는지 확인(경우궁·계동궁도 없다).

- [ ] **Step 4: 구현 — npcs.js** (배열 끝에)
```js
  // ── 운현궁·1863 ── 즉위 전의 집. 3D 몸이 있는 사람은 남자뿐이다 — 여성 인물은 voice.
  { id: 'jaemyeon', name: '이재면', title: '형', palace: 'unhyeon', x: -2, z: 2, rank: 'mid', hatStyle: 'samo', actsVisible: [0],
    lines: ['「궁에서 사람들이 자꾸 드나든다. 임금께서 위중하시다는구나.」', '「아버지께서 오늘은 아무도 들이지 말라 하셨다.」'] },
  { id: 'haein', name: '청지기', title: '운현궁', palace: 'unhyeon', x: 4, z: 13, rank: 'messenger', hatStyle: 'samo', actsVisible: [0],
    lines: ['「도련님, 대문 밖이 오늘 유난히 소란스럽습니다.」', '「대감마님께서 조 대비전에 몇 번이나 다녀오셨다고들 합니다.」'] },
  { id: 'mother', name: '여흥부대부인 민씨', title: '어머니', palace: 'unhyeon', x: 12, z: -3, rank: 'mid', voice: true, actsVisible: [0],
    lines: ['안채 문 너머에서 어머니의 목소리가 들린다.', '「명복아, 오늘은 옷을 단정히 하고 사랑에 가 있거라.」', '「무슨 일이 있어도 아버지 말씀을 따르거라.」'] },
  { id: 'kimjwageun', name: '김좌근', title: '영의정', palace: 'unhyeon', x: 0, z: 30, rank: 'senior', hatStyle: 'samo', actsVisible: [], lines: [] },
  { id: 'minchisang', name: '민치상', title: '도승지', palace: 'unhyeon', x: 0, z: 30, rank: 'senior', hatStyle: 'samo', actsVisible: [], lines: [] },
  { id: 'jodaebi', name: '대왕대비 조씨', title: '발 뒤에서', palace: 'changdeok', x: 0, z: 0, rank: 'mid', voice: true, actsVisible: [], lines: [] },
  { id: 'wangbi', name: '왕비 민씨', title: '', palace: 'changdeok', x: 0, z: 0, rank: 'mid', voice: true, actsVisible: [], lines: [] },
  { id: 'gungin', name: '궁인', title: '', palace: 'gyeongbok', x: 0, z: 0, rank: 'mid', voice: true, actsVisible: [], lines: [] },
```
`voice` 인물은 `safePosition` 정규화를 그대로 받아도 된다(보이지 않는다). `tests/data/npcs.test.js`가 「actsVisible 안 적으면 실패」·「좌표가 방/벽과 겹치지 않음」을 검사하므로 실패 시 좌표만 조정한다. 좌표 (0,0)이 벽과 겹치면 `x: 0, z: 30`으로 옮긴다.

`npcsAt`이 `voice` 인물도 돌려주므로 `mother`는 말 걸기 대상이 된다(몸은 안 그려짐). 대화 힌트는 `안채 문 앞`에서 뜨도록 좌표를 노락당 앞문 (12,-3)에 둔다.

- [ ] **Step 5: 구현 — acts.js 1막**

1막 머리: `palace: 'unhyeon'`, `dateLabel: '철종 14년 · 1863 겨울 · 운현궁'`. `beats` 맨 앞에:
```js
      {
        id: 'unhyeon-note',
        kind: 'note',
        title: '1863 겨울, 운현궁',
        lines: [
          '열두 살 명복의 집이다. 아버지는 흥선군, 왕실의 먼 친척이지만 벼슬도 힘도 없다.',
          '조정은 육십여 년 동안 안동 김씨 집안이 쥐고 있다.',
          '요 며칠, 창덕궁의 임금께서 위중하시다는 말이 돈다. 임금께는 아들이 없다.',
        ],
        origin: '『철종실록』 14년 12월 · 『고등 한국사1』 세도 정치 · 집 안의 하루는 재구성',
        grade: 'staged',
      },
      {
        id: 'unhyeon-day',
        kind: 'explore',
        dateLabel: '철종 14년 · 1863년 음력 12월 8일 · 운현궁',
        exit: { room: 'sarang', label: 'E — 사랑채(노안당)에 들어 아버지를 기다린다' },
      },
      {
        id: 'unhyeon-summons',
        kind: 'audience',
        room: 'sarang',
        beside: 'heungseon',
        dateLabel: '철종 14년 · 1863년 음력 12월 8일 · 운현궁',
        blockLine: '명복아, 가만히 있거라. 오늘 너를 찾아온 손님이다.',
        visitors: [
          { npc: 'kimjwageun', lines: [
            '대문으로 관복을 갖춘 사람들이 들어온다. 앞선 사람은 영의정 김좌근 — 안동 김씨 집안의 어른이다.',
            '「오늘 대행대왕께서 대조전에서 승하하셨습니다.」',
            '「대왕대비전께서 흥선군의 둘째 아들에게 대통을 잇게 하라 명하셨습니다. 신들이 모시러 왔습니다.」',
          ] },
          { npc: 'minchisang', lines: [
            '「도승지 민치상입니다. 가마를 대문 밖에 대 두었습니다.」',
          ] },
          { npc: 'heungseon', from: 'beside', lines: [
            '아버지가 명복의 어깨에 손을 얹는다.',
            '「가거라. 이제부터 너를 이 이름으로 부를 사람은 없다.」',
          ] },
        ],
        origin: '『철종실록』 14년 12월 8일 「대왕 대비전에서 흥선군의 제2자에게 사위를 시킬 것을 명하다」(영의정 김좌근·도승지 민치상을 보내 사저에서 모셔 오게 함) · 대사는 우리말 재구성',
        grade: 'source',
        exit: { label: 'E — 대문으로 나선다' },
      },
      {
        id: 'unhyeon-procession',
        kind: 'procession',
        room: 'sarang',
        to: 'daemun',
        dateLabel: '철종 14년 · 1863년 음력 12월 8일 · 운현궁',
        blockLine: '도련님, 저희가 모시겠습니다.',
        escort: [
          { npc: 'kimjwageun', dx: -2.6, dz: 4.2 },
          { npc: 'minchisang', dx: 2.6, dz: 3.2 },
          { npc: 'heungseon', dx: -3.0, dz: -1.0 },
        ],
        lines: [
          '어제까지 명복이었다.',
          '가마를 모시러 온 사람은 안동 김씨의 어른이다.',
          '그 집안의 세도가 오늘로 저문다는 것을, 그는 알고 왔을까.',
        ],
        exit: { label: 'E — 가마에 오른다' },
      },
```
`throne` 비트에 `palace: 'changdeok',`을 더하고 `lines`를 바꾼다(「열두 살」은 첫 비트로 옮겨 가지 않았으므로 king-age 시험이 첫 비트를 본다 → `unhyeon-note` 첫 줄에 이미 「열두 살」이 있다):
```js
        lines: [
          '御 임금 · 前 앞. 이 게임에서 모든 결정은 임금 앞에서 이루어진다.',
          '닷새 뒤 창덕궁 인정전. 명복은 익종의 아들이 되어 왕위를 이었다.',
          '그래서 이제 흥선군을 아버지라 부를 수 없다. 그 사람은 대원군이 되었다.',
          '어전에는 발(簾)이 쳐져 있다. 조대비께서 그 뒤에 앉으신다.',
          '아버지는 발 밖에 서 계신다.',
        ],
        origin: '『고종실록』 즉위년 12월 13일 · 우리역사넷 「고종」 · 『고등 한국사1』 pp.104~105',
```
(「닷새」는 「N 해」가 아니므로 year-counts에 걸리지 않는다.)

- [ ] **Step 6:** `npx vitest run` → 실패 목록을 보고 **데이터 정합 시험**(interaction/integrity/readability/branch)이 요구하는 필드를 채운다. 예: procession 비트가 `escort`의 인물이 NPCS에 있어야 함, explore 비트 exit room이 그 궁 방이어야 함. 시험의 요구를 바꾸지 말고 데이터를 맞춘다. 단 「1막에는 탐색 없음」처럼 이번 설계가 의도적으로 뒤집는 시험만 고친다.
- [ ] **Step 7:** 커밋 `feat: 운현궁의 명복 — 1막 앞머리에 즉위 전 하루를 붙인다`

---

### Task 5: 1막 알현에 조 대비와 김좌근

**Files:**
- Modify: `src/data/acts.js` (1막 `audience` 비트)
- Test: `tests/data/acts.test.js`

- [ ] **Step 1: 실패하는 시험**
```js
it('1막 알현 — 발 뒤의 조 대비가 먼저 말하고, 김좌근이 물러간다', () => {
  const a = beatsOf(ACTS[0]).find(b => b.id === 'audience')
  expect(a.visitors[0]).toMatchObject({ npc: 'jodaebi', from: 'voice' })
  expect(a.visitors.some(v => v.npc === 'kimjwageun')).toBe(true)
})
```
- [ ] **Step 2:** FAIL
- [ ] **Step 3: 구현** — `audience` 비트 `visitors` 맨 앞에:
```js
          { npc: 'jodaebi', from: 'voice', lines: [
            '발 뒤에서 늙은 목소리가 들린다.',
            '「주상은 아직 어리니, 이 늙은이가 발을 드리우고 함께 듣겠소.」',
          ] },
```
맨 뒤(호조 관리 다음)에:
```js
          { npc: 'kimjwageun', lines: [
            '영의정 김좌근이 나와 엎드린다. 닷새 전 운현궁에 가마를 끌고 왔던 그 사람이다.',
            '「신은 늙었습니다. 조정의 일은 대원위 대감께서 살피실 것입니다.」',
          ] },
```
`beside`는 그대로 `heungseon`. `castOf`가 `jodaebi`를 빼므로 3D에는 대원군·호조·김좌근만 선다.
- [ ] **Step 4:** `npx vitest run` PASS
- [ ] **Step 5:** 커밋 `feat: 1막 알현 — 발 뒤의 목소리와 물러나는 세도가`

---

### Task 6: 2막 — 철렴·가례·완화군·원자

**Files:**
- Modify: `src/data/acts.js` (2막 beats)
- Test: `tests/data/acts.test.js`

- [ ] **Step 1: 실패하는 시험**
```js
describe('2막 — 고종의 사사로운 삶', () => {
  const ids = beatsOf(ACTS[1]).map(b => b.id)
  it('시간 순서로 끼운다 — 박해 → 철렴 → 가례 → … → 경복궁 → 완화군 → … → 척화비 → 원자', () => {
    const order = ['byeongin-audience', 'cheolryeom', 'garye-note', 'garye-audience', 'day-changdeok',
      'day-gyeongbok', 'wanhwa', 'wanhwa-rumor', 'sinmi-dispatch', 'cheokhwabi-brush', 'wonja', 'wonja-rumor', 'end']
    const at = order.map(id => ids.indexOf(id))
    expect(at.every(i => i >= 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })
  it('소문은 제 비트에 따로 선다', () => {
    for (const id of ['wanhwa-rumor', 'wonja-rumor']) {
      expect(beatsOf(ACTS[1]).find(b => b.id === id).grade).toBe('rumor')
    }
  })
  it('원자의 날짜는 실록대로다', () => {
    const w = beatsOf(ACTS[1]).find(b => b.id === 'wonja')
    expect(w.origin).toContain('고종실록')
    expect(w.lines.join(' ')).toContain('11월 4일')
    expect(w.lines.join(' ')).toContain('11월 8일')
  })
})
```
- [ ] **Step 2:** FAIL
- [ ] **Step 3: 구현** — `byeongin-audience` 뒤에:
```js
      {
        id: 'cheolryeom',
        kind: 'audience',
        room: 'injeongjeon',
        dateLabel: '고종 3년 · 1866년 음력 2월 13일 · 창덕궁',
        beside: 'heungseon',
        veil: false,
        blockLine: '전하, 대왕대비전의 말씀이 아직 끝나지 않았습니다.',
        visitors: [
          { npc: 'jodaebi', from: 'voice', lines: [
            '발 뒤의 목소리가 마지막으로 들린다.',
            '「주상의 나이 이미 장성하였으니, 이제부터 모든 정사를 친히 맡아 보시오.」',
            '발이 걷힌다.',
          ] },
          { npc: 'heungseon', from: 'beside', lines: [
            '아버지가 반 걸음 앞에 선 채 말씀하신다.',
            '「이제 전하께서 정사를 보십니다. 다만 무엇이든 이 아비에게 먼저 물으십시오.」',
          ] },
        ],
        origin: '『고종실록』 3년 2월 13일 「대왕대비가 수렴청정을 그만두다」 · 대원군의 말은 재구성',
        grade: 'source',
        exit: { label: 'E — 발이 걷힌 어전을 나선다' },
      },
      {
        id: 'garye-note',
        kind: 'note',
        title: '1866 봄, 가례',
        lines: [
          '3월 6일, 왕비를 고르는 마지막 간택이 끝났다. 고(故) 민치록의 딸이다. 아버지는 이미 세상에 없다.',
          '3월 21일, 임금은 별궁 — 운현궁 — 으로 나아가 신부를 맞았다. 세 해 전 가마를 타고 떠난 그 집이다.',
          '임금은 열다섯, 왕비는 열여섯이다.',
        ],
        origin: '『고종실록』 3년 3월 6일·21일 · 우리역사넷 「명성황후」',
        grade: 'source',
      },
      {
        id: 'garye-audience',
        kind: 'audience',
        room: 'injeongjeon',
        dateLabel: '고종 3년 · 1866년 음력 3월 · 창덕궁',
        beside: 'heungseon',
        blockLine: '전하, 하례가 아직 끝나지 않았습니다.',
        visitors: [
          { npc: 'heungseon', from: 'beside', lines: [
            '「아비 없는 집안의 딸입니다. 외척이 조정을 흔들 일은 없을 것입니다.」',
            '「세도가 어떻게 나라를 망쳤는지, 전하께서도 운현궁에서 보셨지요.」',
          ] },
          { npc: 'wangbi', from: 'voice', lines: [
            '대조전 쪽에서 새 왕비가 인사를 올린다는 전갈이 온다. 얼굴은 아직 제대로 보지 못했다.',
          ] },
        ],
        origin: '간택·가례: 『고종실록』 3년 3월 · 대원군이 외척 걱정 없는 집안을 골랐다는 동기는 통설이며 실록 문장이 아니다 — 대사는 재구성',
        grade: 'staged',
        exit: { label: 'E — 오늘 하루를 시작한다' },
      },
```
그리고 기존 `byeongin-audience`의 `exit` 라벨을 `'E — 다음으로'`로 바꾼다(하루 시작은 가례 뒤로 옮겨 갔다).

`day-gyeongbok` 뒤에:
```js
      {
        id: 'wanhwa',
        kind: 'audience',
        room: 'geunjeongjeon',
        dateLabel: '고종 5년 · 1868년 윤4월 10일 · 경복궁',
        beside: 'heungseon',
        blockLine: '전하, 경사를 아뢰는 중입니다.',
        visitors: [
          { npc: 'gungin', from: 'voice', lines: [
            '문밖에서 궁인이 아뢴다.',
            '「영보당 귀인 이씨께서 왕자를 낳으셨습니다.」',
          ] },
          { npc: 'heungseon', from: 'beside', lines: [
            '아버지의 얼굴이 환해진다. 첫 손자다.',
            '「경사입니다, 전하. 참으로 경사입니다.」',
          ] },
          { npc: 'wangbi', from: 'voice', lines: [
            '왕비전에서는 아무 말도 전해 오지 않는다. 혼인한 지 두 해, 왕비에게는 아직 아이가 없다.',
          ] },
        ],
        origin: '완화군 출생: 고종 5년(1868) 윤4월 10일 · 대원군과 왕비의 반응은 재구성',
        grade: 'staged',
        exit: { label: 'E — 광화문에 나가 선다' },
      },
      {
        id: 'wanhwa-rumor',
        kind: 'note',
        title: '궁 안에 도는 말',
        lines: [
          '대원군이 이 아기 — 완화군 — 를 원자로 세우려 한다는 말이 돌았다.',
          '왕비와 대원군 사이가 벌어진 것이 이때부터라고들 한다.',
        ],
        origin: '후대의 서술·야사 · 실록에서 확인되지 않음',
        grade: 'rumor',
      },
```
기존 `day-gyeongbok`의 `exit`는 `{ room: 'geunjeongjeon', label: 'E — 근정전으로 간다' }`로 바꾼다(완화군 소식은 근정전에서 받는다. 광화문 출구는 wanhwa exit가 대신한다).

`cheokhwabi-brush` 뒤, `end` 앞에:
```js
      {
        id: 'wonja',
        kind: 'note',
        title: '1871 겨울',
        year: 1871,
        lines: [
          '고종 8년 11월 4일, 왕비가 원자를 낳았다. 온 조정이 하례를 올렸다.',
          '11월 8일, 원자가 세상을 떠났다.',
          '임금은 스물이다.',
        ],
        origin: '『고종실록』 8년 11월 4일 「원자가 탄생하다」 · 11월 8일 「원자가 졸하다」',
        grade: 'source',
      },
      {
        id: 'wonja-rumor',
        kind: 'note',
        title: '궁 안에 도는 말',
        lines: [
          '대원군이 보낸 산삼을 달여 먹인 것이 탈이었다는 말이 돌았다.',
          '왕비는 그 일을 잊지 않았다고 전한다.',
        ],
        origin: '황현 『매천야록』 등 야사 · 사실 여부는 확인되지 않음',
        grade: 'rumor',
      },
```
`end` 비트 `lines`:
```js
        lines: [
          '두 번 물리쳤다. 그리고 문은 더 굳게 닫혔다.',
          '그해 겨울, 아들을 잃었다.',
          '경복궁에 살지만, 이 집을 지은 사람도 이 집의 일을 정하는 사람도 내가 아니다.',
        ],
```
- [ ] **Step 4:** `npx vitest run` → year-counts·readability·integrity 시험이 새 글을 붙들면 글을 고친다(「세 해 전」은 **「N 해」라 등록 필요** → `year-counts.test.js`의 등록 목록에 `beat:garye-note` 자리를 1863↔1866으로 등록하는 형식을 따라 추가한다). `geunjeongjeon` 방이 탐색 비트 exit로 쓰일 수 있는지(minControl D) 확인.
- [ ] **Step 5:** 커밋 `feat: 2막 — 발이 걷히고, 혼인하고, 첫아들을 잃는다`

---

### Task 7: 3막 — 친정의 한 줄과 순종

**Files:**
- Modify: `src/data/acts.js` (3막 `choeikhyeon` 알현 뒤 비트, 1874~75 note)
- Test: `tests/data/acts.test.js`

- [ ] **Step 1:** 시험
```js
it('3막 — 아버지가 물러간 자리를 고종이 말한다', () => {
  const text = JSON.stringify(beatsOf(ACTS[2]))
  expect(text).toContain('처음으로 아무도 곁에 서 있지 않다')
  expect(text).toContain('이번 아이는 살았다')
})
```
- [ ] **Step 2:** FAIL
- [ ] **Step 3:** 구현 — `acts.js` 3막 `doors-open`(「문 이 열 린 다」) note `lines` 끝에 `'열두 살에 발 앞에서 시작했다. 처음으로 아무도 곁에 서 있지 않다.'`를 더한다. 3막에서 창덕궁으로 옮겨 가는 1874년 이후 note(`실 제 로 는` 앞의 가장 가까운 1874 note, 없으면 `rush` 뒤 note)에 `'1874년 2월 8일, 왕비가 다시 원자를 낳았다. 이번 아이는 살았다 — 훗날의 순종이다.'`를 더하고 origin에 `· 우리역사넷 「고종」(순종 탄생)`을 붙인다.
- [ ] **Step 4:** `npx vitest run` PASS
- [ ] **Step 5:** 커밋 `feat: 3막 — 곁이 비고, 아이가 산다`

---

### Task 8: 교사용 안내·빌드·눈으로 확인

**Files:**
- Modify: `docs/teacher-guide.md` (장면 수, 등급 표에 소문, 1막·2막 흐름, 여성 인물은 목소리만)
- Build: `dist/어전.html`, `어전.html`

- [ ] **Step 1:** `docs/teacher-guide.md`에서 「장면은 모두 **62개**」와 막별 흐름 목록을 새 비트 수로 고친다(`node -e "import('./src/data/acts.js').then(m=>console.log(m.ACTS.map(a=>a.beats.length)))"`로 센 값). 등급 설명에 「소문 — 당시 돌았다고 전하는 이야기. 사실로 가르치지 않는다」 한 줄. 알현 걷기 규칙 한 문단.
- [ ] **Step 2:** `npm run build` → `어전.html + dist/어전.html  N KB`
- [ ] **Step 3:** `node tools/metaverse-preview.cjs`(사용법은 파일 머리말) 또는 `tools/visual-check.cjs`로 운현궁 탐색·알현 걷기·2막 소문 note 스크린샷을 찍어 확인. 도구가 새 비트를 모르면 브라우저로 `dist/어전.html`을 열어 확인한다.
- [ ] **Step 4:** `npx vitest run` 전체 PASS
- [ ] **Step 5:** 커밋 `docs: 교사용 안내에 운현궁·소문·알현 걷기를 적는다` (dist 포함)
