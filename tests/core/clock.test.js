import { describe, it, expect } from 'vitest'
import { createState } from '../../src/core/state.js'
import { DAY_UNITS, AUDIENCE_COST, costOf, costOfPlaces, spend, isDusk, newDay } from '../../src/core/clock.js'
import { ACTS } from '../../src/data/acts.js'
import { beatsOf } from '../../src/systems/scenario.js'

// 하루의 셈은 **없어졌다**(2026-09-26). 왜인지는 src/core/clock.js 머리말에 선생님의
// 말과 함께 적어 두었다 — 해 칸이 떨어져 1876년 최익현의 상소를 못 본 채로 3막이
// 끝나 버렸기 때문이다. 장치가 목적을 이기면 장치를 버린다.
//
// 그래서 이 파일이 지키는 것은 이제 「제대로 세는가」가 아니라 **「세지 않는가」**다.
// 어딘가에서 값을 다시 매기기 시작하면 여기서 걸린다.

describe('하루의 셈 — 없다', () => {
  it('값이 0 이다 — 자리마다 다르지도, 사람마다 다르지도 않다', () => {
    expect(AUDIENCE_COST).toBe(0)
    expect(costOf('gyujanggak')).toBe(0)
    expect(costOf('outside')).toBe(0)
    expect(costOfPlaces(['sajeongjeon', 'sujeongjeon'])).toBe(0)
    expect(costOfPlaces([])).toBe(0)
  })

  it('언제나 치를 수 있다 — 거절하는 자리가 없다', () => {
    const s = createState()
    for (let i = 0; i < 20; i++) expect(spend(s).ok).toBe(true)
  })

  it('상태를 건드리지 않는다 — 치러도 달라지는 것이 없다', () => {
    const s = createState()
    const r = spend(s)
    expect(r.state).toEqual(s)
  })

  it('해는 지지 않는다 — 하루를 끝내는 것은 남은 일이지 남은 칸이 아니다', () => {
    expect(isDusk(createState())).toBe(false)
    expect(isDusk({ dayLeft: 0 })).toBe(false)     // 옛 저장이 들고 오는 값도 무시한다
  })

  it('새 날이라는 것도 없다', () => {
    const s = createState()
    expect(newDay(s)).toEqual(s)
    expect(DAY_UNITS).toBe(0)
  })

  it('새 판에는 남은 칸이라는 칸 자체가 없다', () => {
    expect(createState().dayLeft).toBeUndefined()
  })
})

describe('낮의 데이터에도 예산이 남아 있지 않다', () => {
  it('어느 비트도 dayUnits 를 적지 않는다 — 적어 두면 아무도 안 읽는 거짓말이 된다', () => {
    for (const act of ACTS) {
      for (const beat of beatsOf(act)) {
        expect(beat.dayUnits, `${act.id}/${beat.id}`).toBeUndefined()
      }
    }
  })
})
