import { describe, it, expect } from 'vitest'
import { dayEndHtml } from '../../src/ui/day-end.js'
import { ACTS } from '../../src/data/acts.js'
import { hubAt, hubOptions, closeHub, completeActivity, dayReport } from '../../src/systems/freedom.js'
import { createState } from '../../src/core/state.js'

describe('하루의 끝 판', () => {
  it('한 일과 하지 않은 일을 둘 다 적는다', () => {
    const html = dayEndHtml({
      title: '고종 3년 · 1866',
      done: ['호조 관리에게 말을 건다'],
      missed: [{ label: '최익현의 상소를 듣는다', reason: '해 칸을 다 씀' }],
    })
    expect(html).toContain('오늘 한 일 1')
    expect(html).toContain('하지 않은 일 1')
    expect(html).toContain('호조 관리에게 말을 건다')
    expect(html).toContain('최익현의 상소를 듣는다')
    expect(html).toContain('해 칸을 다 씀')
  })

  it('벌 주는 말을 쓰지 않는다', () => {
    const html = dayEndHtml({ done: [], missed: [{ label: '무엇', reason: '선택하지 않음' }] })
    for (const word of ['실패', '점수', '오답', '벌']) expect(html).not.toContain(word)
  })

  it('하나도 하지 않은 하루도 판이 선다', () => {
    const html = dayEndHtml({ done: [], missed: [] })
    expect(html).toContain('하나도 하지 않았다')
    expect(html).toContain('남겨 둔 것이 없다')
  })
})

describe('dayReport', () => {
  // 탐색(explore) 비트에 서 있는 상태를 실제 ACTS 에서 찾아 쓴다 — 손으로 꾸민
  // 가짜 비트로는 「거점이 아니면 null」을 지킬 수 없다.
  function atFirstHub() {
    for (let a = 0; a < ACTS.length; a++) {
      const act = ACTS[a]
      for (let b = 0; b < act.beats.length; b++) {
        if (hubAt(act, b)) return { act, state: { ...createState(), actIndex: a, beatIndex: b } }
      }
    }
    return null
  }

  it('거점이 아니면 아무것도 내지 않는다', () => {
    const act = ACTS[0]
    expect(dayReport({ ...createState(), beatIndex: 0 }, act)).toBe(null)
  })

  it('닫히기 전에는 null, 닫힌 뒤에는 한 일과 남긴 일을 낸다', () => {
    const found = atFirstHub()
    expect(found).toBeTruthy()
    const { act } = found
    let state = found.state
    expect(dayReport(state, act)).toBe(null)

    const first = hubOptions(state, act).find(o => !o.disabled)
    if (first) state = completeActivity(state, act, first.id)
    state = closeHub(state, act)

    const report = dayReport(state, act)
    expect(report).toBeTruthy()
    if (first) expect(report.done).toContain(first.label)
    // 남긴 일에는 왜 남았는지가 함께 적힌다.
    for (const m of report.missed) expect(m.reason).toBeTruthy()
  })
})
