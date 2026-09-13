import { describe, it, expect } from 'vitest'
import { createState } from '../../src/core/state.js'
import { DAY_UNITS } from '../../src/core/clock.js'
import {
  beatsOf, beatAt, isActOver, enterAct, applyBeat, advance,
  controlTimeline, palaceTimeline, peakControl, endControl, isBeatActive,
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
    expect(s.dayLeft).toBe(DAY_UNITS)
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

describe('조건 비트 — 깃발이 서면 열리고, 서면 닫힌다', () => {
  const base = { flags: {} }

  it('조건이 없는 비트는 언제나 재생된다', () => {
    expect(isBeatActive(base, { id: 'a', kind: 'note' })).toBe(true)
    expect(isBeatActive({ flags: { x: true } }, { id: 'a', kind: 'note' })).toBe(true)
  })

  it('whenFlag 는 깃발이 섰을 때만 재생된다', () => {
    const b = { id: 'a', kind: 'note', whenFlag: 'lost' }
    expect(isBeatActive(base, b)).toBe(false)
    expect(isBeatActive({ flags: { lost: true } }, b)).toBe(true)
  })

  it('unlessFlag 는 깃발이 서면 건너뛴다', () => {
    const b = { id: 'a', kind: 'note', unlessFlag: 'lost' }
    expect(isBeatActive(base, b)).toBe(true)
    expect(isBeatActive({ flags: { lost: true } }, b)).toBe(false)
  })

  it('깃발 값이 true 가 아니면 선 것으로 보지 않는다', () => {
    const b = { id: 'a', kind: 'note', whenFlag: 'lost' }
    expect(isBeatActive({ flags: { lost: false } }, b)).toBe(false)
    expect(isBeatActive({ flags: { lost: 'yes' } }, b)).toBe(false)
    expect(isBeatActive({ flags: { lost: 1 } }, b)).toBe(false)
  })

  it('flags 가 아예 없어도 터지지 않는다 — 판정 R21 과 같은 방어', () => {
    expect(isBeatActive({}, { id: 'a', kind: 'note', whenFlag: 'lost' })).toBe(false)
    expect(isBeatActive({}, { id: 'a', kind: 'note', unlessFlag: 'lost' })).toBe(true)
  })

  it('둘 다 붙으면 둘 다 만족해야 한다', () => {
    const b = { id: 'a', kind: 'note', whenFlag: 'p', unlessFlag: 'q' }
    expect(isBeatActive({ flags: { p: true } }, b)).toBe(true)
    expect(isBeatActive({ flags: { p: true, q: true } }, b)).toBe(false)
    expect(isBeatActive({ flags: { q: true } }, b)).toBe(false)
  })
})
