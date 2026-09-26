import { describe, it, expect } from 'vitest'
import { ACTS } from '../../src/data/acts.js'
import { fatherStanding, fatherLine, FATHER_TURNS, FATHER_LINES } from '../../src/systems/father.js'

// 개편안 C — 아버지의 자리가 이 게임의 스무 해를 한 칸으로 줄인 것이다
// (docs/story-revision-plan.md, 선생님 2026-09-26).
describe('아버지의 자리', () => {
  const at = (a, b) => fatherStanding(ACTS, a, b)

  it('1막·2막 내내 곁에 서 계신다', () => {
    expect(at(0, 0)).toBe('beside')
    expect(at(0, ACTS[0].beats.length)).toBe('beside')
    expect(at(1, ACTS[1].beats.length)).toBe('beside')
  })

  it('3막 「문이 열린다」를 지나면 물러나신다', () => {
    const i = ACTS[2].beats.findIndex(b => b.id === 'doors-open')
    expect(i).toBeGreaterThan(-1)
    expect(at(2, i)).toBe('beside')        // 아직 그 화면을 안 봤다
    expect(at(2, i + 1)).toBe('gone')      // 보고 나면 바뀐다
  })

  it('4막에 돌아왔다가 제물포에서 끌려가신다', () => {
    const beats = ACTS[3].beats.map(b => b.id)
    const back = beats.indexOf('imo-father-returns')
    const taken = beats.indexOf('imo-jemulpo')
    expect(back).toBeGreaterThan(-1)
    expect(taken).toBeGreaterThan(back)
    expect(at(3, 0)).toBe('gone')
    expect(at(3, back + 1)).toBe('back')
    expect(at(3, taken + 1)).toBe('taken')
  })

  it('5막에는 아버지가 궁에 없다', () => {
    expect(at(4, 0)).toBe('taken')
    expect(FATHER_LINES[at(4, 0)]).toContain('청으로')
  })

  it('바뀌는 자리가 모두 실제로 있는 비트를 가리킨다 — 죽은 등록을 남기지 않는다', () => {
    for (const turn of FATHER_TURNS) {
      const act = ACTS.find(a => a.id === turn.act)
      expect(act, turn.act).toBeTruthy()
      expect(act.beats.some(b => b.id === turn.beat), `${turn.act}/${turn.beat}`).toBe(true)
      expect(FATHER_LINES[turn.standing], turn.standing).toBeTruthy()
    }
  })

  it('화면에 나가는 줄은 언제나 한 줄이다', () => {
    for (let a = 0; a < ACTS.length; a++) {
      for (let b = 0; b <= ACTS[a].beats.length; b++) {
        expect(fatherLine(ACTS, a, b), `${a}/${b}`).toMatch(/^아버지 — /)
      }
    }
  })
})

// 개편안 D — 막마다 진짜 손잡이 하나
describe('막의 손잡이', () => {
  it('막마다 하나씩 있고, 그 비트가 실제로 그 막에 있다', () => {
    for (const act of ACTS) {
      expect(act.handle, act.id).toBeTruthy()
      expect(act.beats.some(b => b.id === act.handle.beat), `${act.id}/${act.handle.beat}`).toBe(true)
      expect(act.handle.line.length, act.id).toBeGreaterThan(10)
    }
  })

  it('손잡이는 학생이 실제로 손을 쓰는 화면이다 — 글 화면이 아니다', () => {
    const HANDS_ON = new Set(['funding', 'brush', 'orders', 'escape'])
    for (const act of ACTS) {
      const beat = act.beats.find(b => b.id === act.handle.beat)
      expect(HANDS_ON.has(beat.kind), `${act.id} 의 손잡이가 ${beat.kind} 다`).toBe(true)
    }
  })
})
