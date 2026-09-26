// 기존 선형 경로의 저장 효과와 공통 저장 배선을 검사한다.
// 자유 여정의 모든 새 저장 경계는 freedom-full-run.test.js가 실제 진행자 본문으로 검사한다.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ACTS } from '../src/data/acts.js'
import { createState } from '../src/core/state.js'
import { beatAt, isActOver, applyBeat, advance, enterAct, beatsOf, isBeatActive } from '../src/systems/scenario.js'
import { dryRun } from '../src/systems/branch.js'
// 거울(runBeats 를 순수 함수로 재현한 것)은 tests/helpers/beat-mirror.js 한 벌뿐이다 —
// full-run.test.js 도 같은 것을 쓴다. 여기 베껴 두면 두 시험이 서로 다른 게임을 검사한다.
import { firstChoiceDecider, runAct, MIRRORED_KINDS } from './helpers/beat-mirror.js'
import { bodyOf } from './helpers/body-of.js'
import { stopAt, markStopDone, isStopDone, stopsOfAct } from '../src/systems/outing.js'
import { spend, costOf } from '../src/core/clock.js'

// CRITICAL 1 — main.js 의 runBeats() 는 이제 advance() 뒤에만 저장한다(src/main.js).
// 이 파일은 main.js 의 실제 DOM 진행자를 구동하지 않는다(캔버스·three.js 없이는
// Node 에서 boot() 를 띄울 수 없다) — 대신 같은 계약을 순수 함수만으로 재현해,
// "advance() 뒤에 저장한 지점에서 이어하면, 이미 끝난 비트가 다시 돌지 않는다"는
// 불변식을 실제 1~3막 데이터(acts.js)로 검증한다. main.js 의 각 play*() 핸들러가
// 부르는 것과 같은 순수 함수(codex.js·loss-log.js·relocate.js)만 쓴다.
// 약탈·소실이 실제로 뭔가를 잃도록, 그 막에서 주울 수 있는 카드를 미리 손에
// 쥐여 둔다 — 안 그러면 taken·doomed 가 늘 빈 배열이라 "중복되면 안 되는 손실"을
// 하나도 검증하지 못한다. held 는 언제나 read 의 부분집합이다(실제 게임 불변식 —
// pickUp 은 항상 markRead 와 함께 불린다).
const SEED_HELD = {
  yangyo: ['oegyujanggak'],
  chinjeong: ['junggeon', 'sinmi-officer', 'seogye', 'choe-ikhyeon', 'ganghwa1'],
}

describe('CRITICAL 1 — advance() 뒤에 저장하면 이어하기가 끝난 비트를 다시 돌리지 않는다', () => {
  for (const act of ACTS) {
    const decisionBearing = beatsOf(act).filter(b =>
      ['council', 'orders', 'plunder', 'brush'].includes(b.kind))

    for (const stopBeat of decisionBearing) {
      it(`${act.id}/${stopBeat.id} 직후 "저장"했다가 이어하면 이 비트가 한 번만 돈다`, () => {
        const heldIds = SEED_HELD[act.id] ?? []
        const seed = {
          ...createState(),
          palace: act.palace,
          control: act.control,
          sources: { held: [...heldIds], read: [...heldIds], lost: [] },
        }
        const started = enterAct(seed, act, ACTS.indexOf(act))

        // 1) 중단 없이 끝까지 — 기준값
        const full = runAct(act, started, { invoked: [] })

        // 2) stopBeat 까지 처리하고 "저장"한 뒤 멈춘다(그 지점의 state 가 저장된 값)
        const firstRunInvoked = []
        const saved = runAct(act, started, { stopAfter: stopBeat.id, invoked: firstRunInvoked })
        expect(firstRunInvoked.filter(id => id === stopBeat.id)).toHaveLength(1)

        // 3) "이어하기" — 저장된 state.beatIndex 는 이미 stopBeat 를 지나 있다.
        //    다음 비트가 stopBeat 와 같을 수 없다(중복 재생의 핵심 불변식).
        const next = isActOver(saved, act) ? null : beatAt(act, saved.beatIndex)
        if (next) expect(next.id).not.toBe(stopBeat.id)

        // 4) 이어서 끝까지 — main.js 의 resumeAct() 와 같은 규칙으로 resumeMidBeat 를
        //    정한다: saved.beatEntered 를 그대로 믿는다(비트 종류나 beatIndex 로
        //    짐작하지 않는다 — great-fire 뒤의 walk-out 처럼 'explore' 인데도 이번
        //    세션에서 한 번도 안 들어갔을 수 있다). stopBeat 는 두 번째 실행에서
        //    다시 나타나면 안 된다.
        const secondRunInvoked = []
        const resumed = runAct(act, saved, { resumeMidBeat: saved.beatEntered === true, invoked: secondRunInvoked })
        expect(secondRunInvoked).not.toContain(stopBeat.id)

        // 5) 결과가 중단 없이 돈 것과 정확히 같다 — 결정이 두 번 쌓이지 않고,
        //    잃은 카드가 두 번 기록되지 않고, 낮도 공짜로 되살아나지 않는다
        expect(resumed.decisions).toEqual(full.decisions)
        expect(resumed.sources).toEqual(full.sources)
        expect(resumed.flags).toEqual(full.flags)
        expect(resumed.dayLeft).toBe(full.dayLeft)
        expect(resumed.palace).toBe(full.palace)
        expect(resumed.control).toBe(full.control)
      })
    }
  }
})

// 대조군 — 위 runAct() 가 그냥 항상 통과하는 헛시험이 아님을 보인다. "비트 안에서
// 효과를 만든 直後(advance() 전)에 저장"하던 예전 자리를 그대로 흉내 내면, 정확히
// 리뷰가 짚은 그 증상(결정이 두 번 쌓인다)이 재현된다.
describe('대조군 — advance() 앞에서 저장하면(예전 버그) 실제로 어전회의가 중복된다', () => {
  it('council 비트 직후 · advance 전에 저장하고 이어하면 같은 회의가 다시 열려 결정이 두 번 남는다', () => {
    // 1막의 어전회의가 셈판으로 바뀌어(2026-09-26) 여기서는 2막의 회의로 본다.
    const act = ACTS[1]
    const councilBeat = beatsOf(act).find(b => b.kind === 'council')
    const seed = { ...createState(), palace: act.palace, control: act.control }
    const started = enterAct(seed, act, 1)

    let state = started
    while (!isActOver(state, act)) {
      const beat = beatAt(act, state.beatIndex)
      state = applyBeat(state, beat)
      state = firstChoiceDecider(beat, state)
      if (beat.id === councilBeat.id) break   // 예전 버그: advance() 전에 "저장"
      state = advance(state)   // councilBeat 이전 비트는 정상적으로 넘어간다
    }
    const buggySave = state   // beatIndex 는 아직 councilBeat 를 가리킨다

    // 이어하기 — resumeMidBeat 지만 skipApply 만 건너뛸 뿐, beatIndex 가 그대로라
    // 같은 councilBeat 가 다시 처리된다(main.js 의 옛 증상)
    let resumed = buggySave
    let skipApply = true
    while (!isActOver(resumed, act)) {
      const beat = beatAt(act, resumed.beatIndex)
      if (!skipApply) resumed = applyBeat(resumed, beat)
      skipApply = false
      resumed = firstChoiceDecider(beat, resumed)
      resumed = advance(resumed)
    }

    const councilDecisions = resumed.decisions.filter(d => d.choiceId === councilBeat.council.choices[0].id)
    expect(councilDecisions.length).toBeGreaterThan(1)   // 중복 — 이게 CRITICAL 1이 고친 증상이다
  })
})

// CRITICAL 1 을 고치며 딸려 온 함정 — beatEntered. 저장이 advance() 뒤로만 옮겨가면
// "이어하기 시점의 beatIndex 는 언제나 아직 안 들어간 새 비트"라고 짐작하기 쉽다.
// 하지만 문서를 줍거나(pressE) Esc 로 저장할 때는 예외다 — 그 비트(explore)는
// 이미 이번 세션에서 들어와 낮을 쓴 채다. beatIndex 나 비트 종류만으로는 이 둘을
// 구분할 수 없다 — state.beatEntered 를 명시적으로 들고 다녀야 한다.
describe('beatEntered — 문서를 줍다 저장한 것과 막 도착해 저장한 것을 가른다', () => {
  it('탐색 비트 도중(문서를 주운 뒤) 저장하고 이어하면, 이미 쓴 낮이 되살아나지 않는다', () => {
    // 1막에는 탐색 비트가 없다 — 알현(kind:'audience')이 그 자리를 대신한다.
    // 그래서 「탐색 비트를 가진 첫 막」을 찾아서 걷는다. 막 번호를 손으로 박아 두면
    // 다음에 또 한 막이 알현으로 바뀔 때 이 시험이 조용히 엉뚱한 것을 검사한다.
    // free(문서 없는 낮 — 운현궁)는 쓸 낮이 없으므로 뺀다.
    const isBudgetDay = b => b.kind === 'explore' && !b.free
    const actIndex = ACTS.findIndex(a => beatsOf(a).some(isBudgetDay))
    const act = ACTS[actIndex]
    const exploreBeat = beatsOf(act).find(isBudgetDay)
    let state = enterAct({ ...createState(), palace: act.palace, control: act.control }, act, actIndex)

    // throne(note) 을 정상적으로 지나 explore 에 들어간다
    while (beatAt(act, state.beatIndex).id !== exploreBeat.id) {
      const beat = beatAt(act, state.beatIndex)
      state = { ...advance({ ...applyBeat(state, beat), beatEntered: true }), beatEntered: false }
    }
    // explore 에 들어간다 — dayUnits 로 낮이 찬다(main.js runBeats 의 첫 줄과 같다)
    state = { ...applyBeat(state, exploreBeat), beatEntered: true }
    expect(state.dayLeft).toBe(exploreBeat.dayUnits)

    // 문서를 주워 낮을 쓴다(main.js pressE 의 spend 와 같은 모양 — 여기서는 그냥 깎는다)
    state = { ...state, dayLeft: state.dayLeft - 2 }
    const savedMidExplore = state   // pressE 뒤의 saveGame() 이 저장했을 값 — beatEntered:true

    // 이어하기 — beatEntered 가 true 이므로 applyBeat 를 건너뛴다
    const skipApply = savedMidExplore.beatEntered === true
    expect(skipApply).toBe(true)
    const resumedBeat = skipApply ? savedMidExplore : { ...applyBeat(savedMidExplore, exploreBeat), beatEntered: true }
    expect(resumedBeat.dayLeft).toBe(exploreBeat.dayUnits - 2)   // 되살아나지 않았다
  })

  it('막 도착해 아직 한 번도 안 들어간 비트를 이어하면, applyBeat 를 반드시 다시 먹인다', () => {
    // 「친정」의 doors-open 은 조작권을 A 로 올린다 — 이어하기가 이걸 건너뛰면
    // 학생은 열려야 할 문 앞에서 계속 막힌다
    const act = ACTS[2]
    const doorsOpen = beatsOf(act).find(b => b.id === 'doors-open')
    // advance() 뒤 저장 직후를 흉내 낸다 — beatEntered:false, beatIndex 는 이미
    // doorsOpen 을 가리킨다(직전 비트가 advance() 한 결과)
    const savedAtBoundary = { ...createState(), palace: act.palace, control: 'B', beatIndex: beatsOf(act).indexOf(doorsOpen), beatEntered: false }

    const skipApply = savedAtBoundary.beatEntered === true
    expect(skipApply).toBe(false)
    const resumedBeat = skipApply ? savedAtBoundary : applyBeat(savedAtBoundary, doorsOpen)
    expect(resumedBeat.control).toBe('A')   // applyBeat 가 실제로 먹었다
  })
})


// ── 3단계 — 거울이 실제와 같은 길을 걷는지 붙든다 (판정 R62) ──────────────
//
// 위의 runAct() 는 main.js 의 runBeats() 를 순수 함수로 재현한 「거울」이다. 거울이
// 낡으면 시험은 초록불인 채로 아무것도 지키지 않는다 — 그런 시험은 없는 것보다 나쁘다.
// 그래서 거울을 두 방향에서 잠근다.
//   ① 걷는 길이 실제와 같은가 — systems/branch.js 의 dryRun() 과 견준다. 그쪽은
//      runBeats() 를 흉내 낸 또 하나의 걷기이고, 조건 비트를 건너뛴다.
//   ② 아는 비트 종류가 실제 막을 다 덮는가 — 종류가 늘었는데 거울이 모르면 운다.
describe('3단계 — 거울이 실제 진행과 같은 비트를 지나간다 (판정 R62)', () => {
  for (const act of ACTS) {
    // 촉박을 해낸 학생과 놓친 학생, 두 길을 다 걸어 본다. 한쪽만 걸으면 다른 쪽
    // 조건 비트(imo-declared · gapsin-flight-caught 따위)는 시험 밖에 남는다.
    const caughtFlags = Object.fromEntries(
      beatsOf(act).filter(b => b.kind === 'rush' && b.caughtFlag).map(b => [b.caughtFlag, true]))

    for (const [name, caught, seedFlags] of [
      ['제때 해낸 학생', false, {}],
      ['놓친 학생', true, caughtFlags],
    ]) {
      it(`${act.id} · ${name} — 거울이 지나간 비트 목록이 dryRun() 과 한 칸도 다르지 않다`, () => {
        const idx = ACTS.indexOf(act)
        const seed = { ...createState(), flags: { ...seedFlags }, palace: act.palace, control: act.control }
        const invoked = []
        runAct(act, enterAct(seed, act, idx), { invoked, caught })
        const { played } = dryRun(act, { ...createState(), flags: { ...seedFlags } }, idx)
        expect(invoked, '거울이 조건 비트를 실제와 다르게 다룬다').toEqual(played)
      })
    }
  }

  // 위 시험이 정말로 조건 비트를 붙들고 있는지 — 두 길이 실제로 다른 비트를 지나간다.
  // 여기가 같아져 버리면 위 시험은 아무것도 안 지키는 채로 초록불이 된다.
  it('두 길이 실제로 다른 비트를 지나간다 — 위 시험이 헛것이 아님을 보인다', () => {
    const act = ACTS.find(a => a.id === 'imo')
    const idx = ACTS.indexOf(act)
    const run = (caught, flags) => {
      const invoked = []
      runAct(act, enterAct({ ...createState(), flags, palace: act.palace, control: act.control }, act, idx),
        { invoked, caught })
      return invoked
    }
    const ok = run(false, {})
    const late = run(true, { 'queen-lost': true })
    expect(ok).not.toEqual(late)
    expect(ok).toContain('imo-letter')          // 밀서는 해낸 학생에게만 온다
    expect(late).toContain('imo-declared')      // 승하 선포는 놓친 학생에게만 온다
    expect(late).not.toContain('imo-letter')
  })
})

describe('3단계 — 거울이 아는 비트 종류가 실제 막을 다 덮는다 (판정 R62)', () => {
  it('거울이 낡으면 여기서 운다 — 비트 종류를 더하는 커밋에서 함께 넓힐 것', () => {
    // 거울이 아는 종류의 목록은 거울 자신이 진다(beat-mirror.js 의 MIRRORED_KINDS).
    // 여기 다시 적으면 거울을 넓히고 목록을 안 고치는 일이 생긴다.
    const MIRRORED = MIRRORED_KINDS
    const used = new Set()
    for (const act of ACTS) {
      for (const b of beatsOf(act)) {
        used.add(b.kind)
        for (const st of b.stops ?? []) used.add(st.beat.kind)
      }
    }
    expect(used.size, '막에서 비트 종류를 하나도 못 모았다').toBeGreaterThan(5)
    for (const k of used) {
      expect(MIRRORED.has(k), `비트 종류 "${k}" 가 resume-safety 거울에 없다 — 같은 커밋에서 더할 것`).toBe(true)
    }
  })
})

// ── 3단계 — 나들이는 이어하기 뒤에 두 번 열리지 않는다 (판정 R62) ──────────
//
// 나들이는 비트가 아니라 「탐색하는 낮」 안에서 일어난다(systems/outing.js) — 위 루프에
// 안 걸린다. 그래서 따로 본다. 다녀온 표시가 지역 Set 에만 있으면 F5 한 번에 잊히고,
// 학생은 같은 나들이에 해를 두 번 낸다. 표시는 state.flags 에 있어야 하고, flags 는
// 세이브에 실려 간다.
describe('3단계 — 나들이는 이어하기 뒤에 두 번 열리지 않는다 (판정 R62)', () => {
  it('다녀온 표시가 세이브에 실려, 이어하면 그 나들이가 사라진다', () => {
    const stops = ACTS.flatMap(a => stopsOfAct(a))
    expect(stops.length, '나들이가 하나도 없다 — 이 시험이 빈 배열을 돌고 있다').toBeGreaterThan(0)

    for (const st of stops) {
      let state = { ...createState(), room: st.room }
      expect(stopAt([st], st.room, state)?.id, st.id).toBe(st.id)

      // 다녀온다 — pressE() 가 하는 것과 같은 순서다. 값은 이제 0 이지만(2026-09-26,
      // core/clock.js) 「치르고 나서 표시를 남긴다」는 순서 자체는 그대로 지킨다.
      expect(costOf(st.placeId), st.id).toBe(0)
      const paid = spend(state)
      expect(paid.ok, st.id).toBe(true)
      state = markStopDone(paid.state, st.id)

      // 「저장하고 탭을 닫았다」 — JSON 을 오갈 수 있어야 세이브에 실린다
      const saved = JSON.parse(JSON.stringify(state))
      expect(isStopDone(saved, st.id), st.id).toBe(true)
      expect(stopAt([st], st.room, saved), st.id).toBeNull()
      // 남은 칸을 세던 줄이 여기 있었다 — 하루의 셈을 없앴다(core/clock.js 2026-09-26).
      expect(saved.dayLeft, st.id).toBeUndefined()
    }
  })

  it('표시가 없으면 두 번 열린다 — 위 시험이 헛것이 아님을 보인다', () => {
    const st = ACTS.flatMap(a => stopsOfAct(a))[0]
    const state = { ...createState(), room: st.room }
    const paidButUnmarked = spend(state, st.placeId).state   // markStopDone 을 빠뜨린 경우
    expect(stopAt([st], st.room, paidButUnmarked)?.id).toBe(st.id)   // 또 열린다
  })
})


// ── 판정 R99 — 저장은 advance() 「뒤」다. 순서를 소스로 붙든다 ────────────
//
// 위 대조군이 「앞에서 저장하면 어전회의가 중복된다」를 계산으로 재현한다. 그런데
// 그것만으로는 누가 main.js 의 저장 줄을 advance() 앞으로 옮기는 것을 막지 못한다 —
// 대조군은 자기 루프를 돌 뿐 main.js 를 안 보기 때문이다. 실제로 이 순서를 거꾸로
// 기억한 지시가 여러 번 내려왔다. 그래서 진짜 진행자의 순서를 여기서 본다.
describe('판정 R99 — runBeats() 는 advance() 뒤에만 저장한다', () => {
  const main = readFileSync(join(process.cwd(), 'src', 'main.js'), 'utf8')

  // 함수 몸통은 한 벌로 자른다(tests/helpers/body-of.js) — 인자 구조분해를
  // 몸통로 착각하지 않고, 「다음 함수 이름까지」로 자르지도 않는다.
  const body = bodyOf(main, 'runBeats')

  it('저장하는 자리가 실제로 있다 — 이 검사가 빈 몸통을 돌지 않는다', () => {
    expect([...body.matchAll(/saveGame\(/g)].length).toBeGreaterThan(0)
  })

  it('저장할 때마다 바로 앞줄이 advance() 다 — 앞으로 옮기면 여기서 운다', () => {
    for (const m of body.matchAll(/saveGame\(/g)) {
      const before = body.slice(Math.max(0, m.index - 400), m.index)
      const adv = before.lastIndexOf('advance(')
      const play = before.lastIndexOf('await playBeat(')
      expect(adv, '저장 앞에 advance() 가 없다').toBeGreaterThan(-1)
      // 비트를 재생한 「직후」(advance 전)에 저장하던 것이 2단계가 고친 결함이다
      expect(adv, '비트를 재생한 직후 · advance() 앞에서 저장한다 — 끝난 비트가 다시 돈다')
        .toBeGreaterThan(play)
    }
  })

  it('왜 뒤여야 하는지가 저장하는 그 자리에 적혀 있다', () => {
    expect(body).toContain('판정 R99')
    expect(body).toMatch(/advance\(\) \*\*뒤\*\*/)
  })
})
