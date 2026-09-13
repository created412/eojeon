import { describe, it, expect } from 'vitest'
import { bodyOf, blockAt } from '../helpers/body-of.js'
import { hasCaseLabel, caseHandler } from '../helpers/case-labels.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  DEFAULTS, NOT_BROKEN, TRY_TAP, KEYCAPS, SAID_FIRST, SAID_AGAIN,
  holdKeys, holdLines, saidLine, shouldOffer,
} from '../../src/ui/hold-screen.js'
import { touchButtonAction, canPause } from '../../src/main.js'
import { actById } from '../../src/data/acts.js'
import { beatsOf } from '../../src/systems/scenario.js'

// 이 파일이 검사하는 데이터는 5막 배열 안의 그 비트 하나다. main.js 가 이것을
// 가리키는 상수를 들고 있던 시절이 있었지만(임시 통로가 쓰던 것), Task 15 가
// 통로와 함께 지웠다. 여기서 객체를 베껴 적지 않고 언제나 acts.js 에서 id 로
// 꺼낸다 — 두 벌이 되면 반드시 갈리고, 그때 시험은 초록불인 채로 화면만 낡는다.
const HOLD_BEAT = beatsOf(actById('gapsin')).find(b => b.id === 'gapsin-hold')

// 조작권 D 장면 — 눌러도 임금이 한 걸음도 못 움직인다(설계서 §7 5막 비트 2·3).
//
// 이 화면은 이 게임에서 가장 위험한 화면이다. 「안 움직인다」를 학생이
// 「내 태블릿이 고장났다」로 읽으면 수업이 그 자리에서 멈춘다. 그래서 이 파일이
// 붙드는 것은 둘이다.
//   ① 화면이 「고장이 아니다」라고 **말한다** — 학생이 짐작하게 두지 않는다.
//   ② **아무도 갇히지 않는다** — 한 번도 안 눌러도 시간이 지나면 나갈 단추가 나온다.
//      예전에 조작권이 떨어지면 방에 영구히 갇히는 결함이 있었다(4막 대원군 재집권).
//      같은 구멍을 다시 파지 않는다.
//
// vitest 환경이 node 라 DOM 이 없다. 그래서 판단은 전부 순수 함수로 빼고
// (shouldOffer·holdLines·saidLine·holdKeys) 여기서 직접 검사한다. 배선은
// tests/ui/pause.test.js·tests/systems/audio-wiring.test.js 와 같은 방식으로
// 문자열을 본다 — 다만 함수 몸통은 **중괄호를 세어** 자른다.

const stripComments = (src) =>
  src.split(/\r?\n/).map(l => l.replace(/\/\/.*/, '')).join('\n')

const readSrc = (...parts) =>
  stripComments(readFileSync(join(process.cwd(), 'src', ...parts), 'utf8'))

const main = readSrc('main.js')
const holdSrc = readSrc('ui', 'hold-screen.js')


// `needle` 로 시작하는 if 문의 몸통.
function ifBodyAt(source, needle) {
  const i = source.indexOf(needle)
  if (i < 0) throw new Error(`${needle} 를 못 찾았다`)
  return blockAt(source, source.indexOf('{', i + needle.length))
}

describe('shouldOffer — 나갈 단추를 언제 내주는가', () => {
  const v = (presses, elapsedMs) => shouldOffer({ presses, elapsedMs })

  // 이 게임 전체에서 가장 중요한 한 줄이다. 조작권 D 는 「무엇을 눌러도 안 움직인다」이므로
  // 나갈 길이 학생의 조작에 달려 있으면 그 순간 막다른 길이 된다.
  it('한 번도 안 눌러도 maxMs 가 지나면 나갈 단추가 나온다 — 아무도 갇히지 않는다', () => {
    expect(v(0, DEFAULTS.maxMs)).toBe(true)
    expect(v(0, DEFAULTS.maxMs + 5000)).toBe(true)
  })

  it('maxMs 전에는 안 누른 채로 기다리기만 해서는 나오지 않는다', () => {
    expect(v(0, DEFAULTS.maxMs - 1)).toBe(false)
    expect(v(0, DEFAULTS.minMs + 10)).toBe(false)
  })

  it('충분히 누르고 minMs 가 지나면 maxMs 를 기다리지 않고 나온다', () => {
    expect(v(DEFAULTS.needPresses, DEFAULTS.minMs)).toBe(true)
    expect(v(DEFAULTS.needPresses + 3, DEFAULTS.minMs + 1)).toBe(true)
  })

  it('많이 눌러도 minMs 전에는 나오지 않는다 — 연타로 장면을 건너뛰지 못한다', () => {
    expect(v(99, DEFAULTS.minMs - 1)).toBe(false)
    expect(v(99, 0)).toBe(false)
  })

  it('minMs 가 지나도 덜 눌렀으면 아직이다', () => {
    expect(v(DEFAULTS.needPresses - 1, DEFAULTS.minMs + 100)).toBe(false)
  })

  it('minMs·maxMs 를 비트가 따로 정할 수 있다', () => {
    expect(shouldOffer({ presses: 0, elapsedMs: 900, maxMs: 800 })).toBe(true)
    expect(shouldOffer({ presses: 2, elapsedMs: 900, needPresses: 2, minMs: 500, maxMs: 9999 })).toBe(true)
  })

  it('기본값이 촉박이 아니다 — 최소 몇 초는 머물고, 12초 안에는 반드시 열린다', () => {
    expect(DEFAULTS.minMs).toBeGreaterThanOrEqual(2000)
    expect(DEFAULTS.maxMs).toBeLessThanOrEqual(12000)
    expect(DEFAULTS.maxMs).toBeGreaterThan(DEFAULTS.minMs)
  })
})

describe('화면이 말하는 것 — 「고장이 아니다」', () => {
  const view = { lines: ['김옥균이 들었다.', '움직여 보라.'] }

  it('고장이 아니라는 말이 늘 화면에 있다 — 기기 종류와 무관하게', () => {
    for (const coarse of [true, false]) {
      expect(holdLines(view, { coarse })).toContain(NOT_BROKEN)
    }
  })

  it('그 말이 「고장」이라는 낱말을 실제로 쓴다 — 학생이 쓰는 말이 그것이다', () => {
    expect(NOT_BROKEN).toContain('고장')
  })

  it('비트가 적은 지문이 앞에 그대로 온다', () => {
    expect(holdLines(view, { coarse: false }).slice(0, 2)).toEqual(view.lines)
  })

  // 조작 안내(controls-hint)가 태블릿에는 「화면을 손가락으로 짚으면 그리로 걷는다」고
  // 약속했다. 태블릿에 W·A·S·D 자판을 그려 주면 그 학생은 누를 것을 못 찾는다.
  it('태블릿에는 자판 대신 짚어 보라고 한다', () => {
    expect(holdKeys(true)).toEqual([])
    expect(holdLines(view, { coarse: true })).toContain(TRY_TAP)
  })

  it('자판이 있는 기기에는 자판을 그린다', () => {
    expect(holdKeys(false)).toEqual([...KEYCAPS])
    expect(holdLines(view, { coarse: false })).not.toContain(TRY_TAP)
  })

  it('첫 누름과 그다음 누름의 말이 다르다 — 화면이 셈하고 있다는 것이 보인다', () => {
    expect(saidLine(1)).toBe(SAID_FIRST)
    expect(saidLine(2)).toBe(SAID_AGAIN)
    expect(saidLine(7)).toBe(SAID_AGAIN)
    expect(SAID_FIRST).not.toBe(SAID_AGAIN)
  })

  it('open() 이 그 문장들을 직접 짓지 않고 holdLines() 를 부른다', () => {
    expect(bodyOf(holdSrc, 'createHold')).toContain('holdLines(')
  })

  it('화면 글은 innerHTML 이 아니라 textContent 로만 들어간다', () => {
    expect(holdSrc).not.toContain('innerHTML')
  })

  it('기기 판정을 새로 만들지 않고 controls-hint 의 isCoarse() 를 쓴다', () => {
    expect(holdSrc).toContain("from './controls-hint.js'")
    expect(holdSrc).not.toContain('matchMedia')
  })
})

describe('main.js 배선 — 빠져나갈 길이 구조로 보장되는가', () => {
  const frame = bodyOf(main, 'frame')
  // 걷기·탭·해질녘이 도는 국면 관문. 이 안에 갇힌 코드는 국면이 달라지는 순간 안 돈다.
  const phaseGate = ifBodyAt(frame, "if (flow.phase === 'day' || flow.phase === 'rush')")

  it('hold 화면 모듈을 불러 쓴다', () => {
    expect(main).toContain("from './ui/hold-screen.js'")
    expect(main).toContain('createHold(root)')
  })

  it("playBeatScreen 이 kind: 'hold' 를 받는다", () => {
    // 따옴표 한 종류만 보지 않는다(tests/helpers/case-labels.js)
    expect(hasCaseLabel(bodyOf(main, 'playBeatScreen'), 'hold')).toBe(true)
  })

  it('프레임마다 tick 이 돈다', () => {
    expect(frame).toContain('holdSession.tick(')
  })

  // 여기가 이 태스크의 핵심이다. tick() 이 국면 관문 **안에** 있으면, 국면이 어떤
  // 까닭으로든 'day'/'rush' 가 아니게 되는 순간 시계가 멈추고 단추가 영영 안 나온다 —
  // 좌표의 우연이 아니라 구조로 보장하려면 관문 밖에 있어야 한다.
  it('그 tick 이 국면 관문 밖에 있다 — 국면이 무엇이든 시계는 돈다', () => {
    // 먼저 잘라 낸 두 덩어리가 정말 그 덩어리인지 확인한다. 자르기가 어긋나 빈
    // 문자열을 보고 있으면 아래 not.toContain 은 아무것도 단언하지 않는 셈이 된다.
    expect(frame).toContain('requestAnimationFrame(frame)')
    expect(phaseGate).toContain('input.tap()')
    expect(phaseGate).toContain('updateHint()')

    expect(frame).toContain('holdSession')
    expect(phaseGate).not.toContain('holdSession')
  })

  it('시계를 프레임 수가 아니라 시각으로 잰다', () => {
    const body = bodyOf(holdSrc, 'createHold')
    expect(body).toContain('nowMs')
    expect(body).not.toMatch(/frames?\s*\+\+/)
  })

  it('playHold 는 탐색 UI 가 안 도는 rush 국면으로 둔다 — E·Q 가 저절로 죽는다', () => {
    const body = bodyOf(main, 'playHold')
    expect(body).toContain("setPhase('rush')")
    expect(body).toContain('hold.open(')
  })

  it('handleKey 는 day 국면 밖에서 아무것도 하지 않는다 — rush 에서 E·Q 가 죽는다', () => {
    expect(bodyOf(main, 'handleKey')).toContain("if (flow.phase !== 'day') return")
  })

  // 태블릿에는 E·Q·멈춤 세 단추가 우측 하단에 **늘 떠 있다**(touchWrap 을 숨기는
  // 자리가 코드 전체에 없다). 이 장면에서 그 셋이 전부 죽어 있었고, pointerdown 의
  // stopPropagation() 때문에 input.tap() 에도 안 잡혀 「눌렀는데 아무 일도 없다」가
  // 됐다 — 「고장났나」 싶은 학생이 가장 먼저 짚는 자리가 완전 무반응이었다.
  // 판 위를 짚으면 반응하는데 단추를 짚으면 아무 일도 없는, 가장 고장으로 읽히는
  // 조합이다(Task 12 리뷰 Important 2).
  describe('태블릿 단추를 짚으면 무슨 일이 일어나는가', () => {
    it('조작권 D 장면에서는 「눌러 봤다」로 센다 — 무반응이 아니다', () => {
      expect(touchButtonAction({ hold: true, phase: 'rush' })).toBe('press')
    })

    it('평소(탐색)에는 지금까지대로 E·Q 가 제 일을 한다', () => {
      expect(touchButtonAction({ hold: false, phase: 'day' })).toBe('act')
    })

    it('그 밖의 국면에서는 지금까지대로 아무 일도 안 한다', () => {
      for (const phase of ['beat', 'council', 'rush', 'done']) {
        expect(touchButtonAction({ hold: false, phase }), phase).toBe('none')
      }
    })

    it('멈춤 화면이 덮고 있으면 먹지 않는다 — 키보드 쪽과 같은 규칙이다', () => {
      expect(touchButtonAction({ hold: true, phase: 'rush', pauseOpen: true })).toBe('none')
      expect(touchButtonAction({ hold: false, phase: 'day', pauseOpen: true })).toBe('none')
    })

    it('E·Q 단추가 그 판정을 실제로 거친다', () => {
      const body = bodyOf(main, 'attachControls')
      // E·Q 가 같은 판정 한 자리를 거친다 — 두 곳이 어긋날 자리를 안 만든다
      expect(body).toContain('touchButtonAction(')
      expect(body.match(/onTouchBtn\(/g) ?? [], 'E·Q 두 단추가 모두 거쳐야 한다')
        .toHaveLength(2)
      expect(body).toContain('holdSession.press()')
      expect(body).toMatch(/hold:\s*holdSession !== null/)
    })
  })

  // 이 구간에는 소리를 끌 길이 멈춤 단추 하나뿐이다(판정 R91). 교실에서 「지금 당장
  // 소리 꺼라」가 안 되는 구간을 만들지 않는다.
  describe('조작권 D 장면에서도 멈춤은 열린다', () => {
    it('탐색 중에는 언제나 열린다', () => {
      expect(canPause('day', false)).toBe(true)
    })

    it('조작권 D 장면에서 열린다 — 소리를 끌 유일한 길이다', () => {
      expect(canPause('rush', true)).toBe(true)
    })

    it('그 밖에는 지금까지대로 안 열린다 — 촉박 중에 열리면 초시계가 가려진다', () => {
      for (const phase of ['rush', 'beat', 'council', 'done']) {
        expect(canPause(phase, false), phase).toBe(false)
      }
    })

    it('togglePause 가 그 판정을 거친다', () => {
      const body = bodyOf(main, 'togglePause')
      expect(body).toContain('canPause(')
      expect(body).not.toContain("if (flow.phase !== 'day') return")
    })
  })

  it('dispose() 가 hold 화면을 걷어 간다 — 막 전환·종료에 판이 남지 않는다', () => {
    // boot() 가 돌려주는 객체의 dispose 메서드. 몸통은 중괄호로 자른다.
    const body = blockAt(main, main.indexOf('{', main.lastIndexOf('\n    dispose()')))
    expect(body).toContain('holdSession')
    expect(body).toContain('.dispose()')
  })

  it('누른 순간을 프레임 루프가 화면에 알린다', () => {
    expect(frame).toContain('holdSession.press()')
  })

  // 「눌렀는데 안 된다」를 귀로도 알린다. 소리 이름은 audio.js 의 ONE_SHOTS 표에 있는
  // 것만 쓴다 — tests/systems/audio-wiring.test.js 가 이름 오타를 붙든다.
  // 소리를 화면 모듈이 내지 않는 것도 함께 붙든다 — 이름 표는 한 곳에만 있어야 한다.
  it('누를 때마다 거절음이 난다', () => {
    expect(bodyOf(main, 'playHold')).toContain("audio.play('deny')")
    expect(holdSrc).not.toContain('audio')
  })
})

describe('HOLD_BEAT — 5막이 그대로 쓸 데이터', () => {
  it('조작권 D 를 정하고, 일어난 일로 표시된다', () => {
    expect(HOLD_BEAT.kind).toBe('hold')
    expect(HOLD_BEAT.control).toBe('D')
    expect(HOLD_BEAT.historical).toBe(true)
  })

  // historical: true 인 비트에 조건을 달면 systems/branch.js 의 unsafeConditionalBeats()
  // 가 정적으로 거부한다 — 「실패해도 역사는 바뀌지 않는다」를 어기는 데이터이기 때문이다.
  it('조건이 붙어 있지 않다', () => {
    expect(HOLD_BEAT.whenFlag).toBeUndefined()
    expect(HOLD_BEAT.unlessFlag).toBeUndefined()
  })

  // 침전에서 오간 말의 정확한 문장은 확정할 수 없다. 연출을 사실처럼 쓰지 않는다.
  it("재구성 등급('staged')이고 출처를 밝힌다", () => {
    expect(HOLD_BEAT.view.grade).toBe('staged')
    expect(HOLD_BEAT.view.origin).toBeTruthy()
  })

  // 학생이 읽는 것은 grade 값이 아니라 origin 줄에 적힌 우리말이다. 그 둘이 어긋나면
  // 화면은 「사료」라고 말하면서 데이터는 「재구성」인 상태가 된다 — 역사 게임에서
  // 사료 등급 표기가 어긋나는 것은 그냥 넘길 자리가 아니다(전역 제약 5).
  it('화면에 적힌 등급이 실제 등급과 같은 말을 한다', () => {
    const GRADE_WORD = { textbook: '교과서', source: '사료', staged: '재구성' }
    const m = /등급 ([^.·\s]+)/.exec(HOLD_BEAT.view.origin)
    expect(m, 'origin 에 등급 표기가 없다').toBeTruthy()
    expect(m[1], `grade 는 '${HOLD_BEAT.view.grade}' 인데 화면은 다른 말을 한다`)
      .toBe(GRADE_WORD[HOLD_BEAT.view.grade])
  })

  it('학생 화면에 영어 낱말이 나가지 않는다', () => {
    const v = HOLD_BEAT.view
    const texts = [v.title, ...v.lines, v.closing, v.buttonLabel, v.origin]
    for (const t of texts) expect(t, t).not.toMatch(/[A-Za-z]/)
  })
})

// Task 14 — 이 장면은 지금까지 아무도 지나가지 않은 길이었다. 5막이 ACTS 에 없던
// 동안은 임시 통로가 유일한 실행 경로였고, 비트는 main.js 안의 복사본이었다.
// 이제 진짜 자리(ACTS 5막)에 있고 runBeats() 가 제 차례에 지나간다.
describe('조작권 D 장면이 실제 막 진행을 탄다 (Task 14)', () => {
  it('5막 배열에 gapsin-hold 비트가 있다 — 위 검사들이 보는 데이터의 출처다', () => {
    expect(HOLD_BEAT, '5막에 gapsin-hold 비트가 없다 — 위 검사들이 undefined 를 본다').toBeTruthy()
  })

  it('5막을 처음부터 걸어가면 이 비트를 실제로 지나간다', async () => {
    const { actById } = await import('../../src/data/acts.js')
    const { dryRun } = await import('../../src/systems/branch.js')
    const { createState } = await import('../../src/core/state.js')
    const { played } = dryRun(actById('gapsin'), createState(), 4)
    expect(played).toContain('gapsin-hold')
  })

  // 따옴표 한 종류만 훑지 않는다 — 겹따옴표로 바꿔 적어도 검사가 지나가 버리면
  // 그 검사는 없는 것과 같다(같은 버릇이 다른 자리에서 실제로 걸렸다).
  it("비트 종류 'hold' 가 playHold 로 이어져 있다 — 배선이 끊기면 여기서 운다", () => {
    const body = bodyOf(main, 'playBeatScreen')
    expect(caseHandler(body, 'hold'), '배선이 끊겼다').toContain('playHold(beat)')
  })

  // Task 15 — 이 장면을 눈으로 보려고 뚫어 둔 임시 통로를 걷었다. 남은 규율은
  // 하나다: main.js 안에 이 비트의 복사본이 다시 생기지 않는 것. (통로 자체가
  // 되살아나지 않는 것은 tests/build.test.js 가 빌드 산출물에서 지킨다.)
  it('main.js 안에 hold 비트 리터럴이 없다 — 두 벌이 되면 갈린다', () => {
    expect(main).not.toMatch(/kind:\s*['"`]hold['"`]/)
    expect(main).not.toContain('globalThis.__')
  })
})
