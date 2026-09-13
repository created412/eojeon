import { describe, it, expect } from 'vitest'
import { createState } from '../../src/core/state.js'
import {
  RICE_BY_ACT, riceIndexForAct, riceRatio, riceLabel, advancePrices, RICE_NOTE,
  riceSeriesUpTo,
} from '../../src/systems/prices.js'

describe('G 물가', () => {
  it('1막은 기준값 100 이다', () => {
    expect(riceIndexForAct(1)).toBe(100)
    expect(createState().riceIndex).toBe(100)
  })

  it('막이 넘어갈 때마다 오르기만 한다', () => {
    for (let a = 2; a <= 5; a++) {
      expect(riceIndexForAct(a), `${a}막`).toBeGreaterThan(riceIndexForAct(a - 1))
    }
  })

  it('다섯 막이 모두 정의되어 있다', () => {
    expect(Object.keys(RICE_BY_ACT).map(Number).sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('모르는 막 번호는 기준값으로 돌아간다', () => {
    expect(riceIndexForAct(99)).toBe(100)
  })

  it('배수를 계산한다', () => {
    expect(riceRatio(100)).toBe(1)
    expect(riceRatio(150)).toBe(1.5)
  })

  it('1막에서는 즉위 무렵과 같다고만 말한다', () => {
    expect(riceLabel(100)).toBe('쌀 한 섬  ····  즉위 무렵과 같다')
  })

  it('오르면 배수로 말한다', () => {
    expect(riceLabel(134)).toBe('쌀 한 섬  ····  즉위 무렵의 1.3배')
  })

  it('절대 수치를 절대 화면에 내지 않는다', () => {
    for (const a of [1, 2, 3, 4, 5]) {
      const label = riceLabel(riceIndexForAct(a))
      expect(label, `${a}막`).not.toContain('냥')
      expect(label, `${a}막`).not.toContain(String(riceIndexForAct(a)))
    }
  })

  it('막을 넘기면 상태의 지수가 갱신된다', () => {
    const s = advancePrices(createState(), 3)
    expect(s.riceIndex).toBe(riceIndexForAct(3))
  })

  it('같은 막을 다시 넘겨도 같은 객체를 돌려준다', () => {
    const s = createState()
    expect(advancePrices(s, 1)).toBe(s)
  })

  it('원본 상태를 건드리지 않는다', () => {
    const s = createState()
    advancePrices(s, 4)
    expect(s.riceIndex).toBe(100)
  })

  it('재구성 고지 문구가 있다', () => {
    expect(RICE_NOTE).toContain('기록')
  })
})

describe('G 회수 — 열여섯 해치 추이', () => {
  it('그 막까지의 걸음을 순서대로 준다', () => {
    expect(riceSeriesUpTo(4).map(r => r.act)).toEqual([1, 2, 3, 4])
    expect(riceSeriesUpTo(1).map(r => r.act)).toEqual([1])
  })

  it('절대 수치를 아예 돌려주지 않는다 — 판정 R19. 화면이 찍고 싶어도 값이 없다', () => {
    for (const row of riceSeriesUpTo(5)) {
      expect(Object.keys(row).sort()).toEqual(['act', 'bar', 'label', 'ratio'])
      expect(row.index).toBeUndefined()
    }
  })

  it('배수는 즉위 무렵을 1 로 두고 계속 오른다', () => {
    const rows = riceSeriesUpTo(5)
    expect(rows[0].ratio).toBe(1)
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].ratio, `${rows[i].act}막`).toBeGreaterThan(rows[i - 1].ratio)
    }
  })

  it('막대는 0 초과 1 이하이고 마지막이 가장 길다', () => {
    const rows = riceSeriesUpTo(4)
    for (const r of rows) {
      expect(r.bar).toBeGreaterThan(0)
      expect(r.bar).toBeLessThanOrEqual(1)
    }
    expect(rows[rows.length - 1].bar).toBe(1)
  })

  it('걸음마다 언제인지 적혀 있다', () => {
    for (const r of riceSeriesUpTo(5)) expect(r.label, `${r.act}막`).toBeTruthy()
    expect(riceSeriesUpTo(4)[3].label).toContain('1882')
  })

  it('모르는 막을 물으면 빈 배열이지 터지지 않는다', () => {
    expect(riceSeriesUpTo(0)).toEqual([])
    expect(riceSeriesUpTo(undefined)).toEqual([])
  })
})
