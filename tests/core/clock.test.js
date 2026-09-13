import { describe, it, expect } from 'vitest'
import { createState } from '../../src/core/state.js'
import { DAY_UNITS, AUDIENCE_COST, costOf, costOfPlaces, spend, isDusk, newDay } from '../../src/core/clock.js'
import { ACTS } from '../../src/data/acts.js'
import { beatsOf } from '../../src/systems/scenario.js'

// 하루의 값은 이제 **아룀의 수**다 — 시간이 아니라 사람이다.
// 왜 바뀌었는지는 src/core/clock.js 머리말에 선생님의 말과 함께 적어 두었다.

describe('하루 — 몇 사람의 아룀을 들을 수 있는가', () => {
  it('한 번 듣는 것이 하나다 — 자리마다 다르지 않다', () => {
    expect(AUDIENCE_COST).toBe(1)
    expect(costOf('gyujanggak')).toBe(1)
    expect(costOf('outside')).toBe(1)
    expect(costOf('아무데나')).toBe(1)
  })

  // 신헌은 넉 장을 한 번에 건넨다. 예전에는 자리마다 값을 매겨 그 대화 하나가
  // 여러 칸을 먹었다(판정 R102 가 겨우 막아 두었다). 이제는 그런 셈 자체가 없다.
  it('한 번의 대화로 넉 장을 받아도 값은 하나다', () => {
    expect(costOfPlaces(['sajeongjeon', 'sajeongjeon', 'sujeongjeon'])).toBe(1)
    expect(costOfPlaces([])).toBe(1)
  })

  it('한 번 들으면 하나 줄어든다', () => {
    const r = spend({ ...createState(), dayLeft: 3 })
    expect(r.ok).toBe(true)
    expect(r.state.dayLeft).toBe(2)
  })

  it('원본 상태를 건드리지 않는다', () => {
    const s = { ...createState(), dayLeft: 3 }
    spend(s)
    expect(s.dayLeft).toBe(3)
  })

  it('다 들었으면 거절하고 상태를 그대로 둔다', () => {
    const s = { ...createState(), dayLeft: 0 }
    const r = spend(s)
    expect(r.ok).toBe(false)
    expect(r.state.dayLeft).toBe(0)
  })

  it('마지막 하나를 들으면 그날이 끝난다', () => {
    const r = spend({ ...createState(), dayLeft: 1 })
    expect(r.ok).toBe(true)
    expect(isDusk(r.state)).toBe(true)
  })

  it('남아 있으면 그날이 끝나지 않았다', () => {
    expect(isDusk({ ...createState(), dayLeft: 1 })).toBe(false)
  })

  it('새 날은 준 만큼으로 시작한다', () => {
    expect(newDay({ ...createState(), dayLeft: 0 }, 2).dayLeft).toBe(2)
    expect(newDay({ ...createState(), dayLeft: 0 }).dayLeft).toBe(DAY_UNITS)
  })
})

describe('낮마다의 예산은 데이터가 정한다', () => {
  const days = ACTS.flatMap((a, i) => beatsOf(a).filter(b => b.kind === 'explore').map(b => ({ act: a, beat: b })))

  it('탐색하는 낮은 모두 스스로 예산을 밝힌다', () => {
    expect(days.length).toBeGreaterThan(0)
    for (const { act, beat } of days) {
      expect(beat.dayUnits, `${act.id}/${beat.id}`).toBeGreaterThan(0)
    }
  })

  // 여섯 칸짜리 하루는 더 없다 — 그 수는 「걸어 다니는 시간」의 단위였다.
  // 사람을 세는 단위에서 여섯은 어전 하나에 여섯이 줄 서는 그림이라 이 게임에 없다.
  it('예산은 셋을 넘지 않는다 — 어전에서 하루에 여섯을 부르지 않는다', () => {
    for (const { act, beat } of days) {
      expect(beat.dayUnits, `${act.id}/${beat.id} 가 ${beat.dayUnits}`).toBeLessThanOrEqual(3)
    }
  })
})
