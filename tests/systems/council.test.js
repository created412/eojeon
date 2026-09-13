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
