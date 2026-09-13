import { describe, it, expect } from 'vitest'
import { ageAt, stageForAge, heightForAge, kingLookAt, ADULT_AGE, BIRTH_YEAR } from '../../src/systems/king-age.js'
import { ACTS } from '../../src/data/acts.js'
import { beatsOf, yearAtBeat } from '../../src/systems/scenario.js'

describe('임금의 나이', () => {
  it('1863년에 열두 살이다 — 1막 첫 화면이 그렇게 적혀 있다', () => {
    expect(ageAt(1863)).toBe(12)
    const first = beatsOf(ACTS[0])[0]
    expect(JSON.stringify(first.lines)).toContain('열두 살')
  })

  it('세는나이다 — 태어난 해가 한 살이다', () => {
    expect(ageAt(BIRTH_YEAR)).toBe(1)
  })

  it('막마다 나이가 실제 연표와 맞는다', () => {
    const byAct = ACTS.map(a => [a.year, ageAt(a.year)])
    expect(byAct).toEqual([[1863, 12], [1866, 15], [1873, 22], [1882, 31], [1884, 33]])
  })
})

describe('임금의 몸', () => {
  it('열여섯에 어른 몸으로 갈아입는다', () => {
    expect(stageForAge(ADULT_AGE - 1)).toBe('child')
    expect(stageForAge(ADULT_AGE)).toBe('adult')
  })

  it('나이가 들수록 키가 자란다 — 줄어드는 구간이 없다', () => {
    let prev = 0
    for (let age = 10; age <= 40; age++) {
      const h = heightForAge(age)
      expect(h, `${age}세`).toBeGreaterThanOrEqual(prev)
      prev = h
    }
  })

  it('두 끝은 예전 값 그대로다 — 궁궐과의 비례를 건드리지 않는다', () => {
    expect(heightForAge(12)).toBeCloseTo(2.35, 5)
    expect(heightForAge(40)).toBeCloseTo(2.89, 5)
    expect(heightForAge(8)).toBeCloseTo(2.35, 5)     // 표 밖은 양 끝으로 붙든다
  })

  it('1863년과 1884년의 임금이 실제로 다른 몸이다 — 스물한 해가 화면에 보인다', () => {
    const young = kingLookAt(1863)
    const old = kingLookAt(1884)
    expect(young.stage).toBe('child')
    expect(old.stage).toBe('adult')
    expect(old.height - young.height).toBeGreaterThan(0.4)
  })

  it('한 막 안에서도 자란다 — 2막은 열다섯에 시작해 스물에 끝난다', () => {
    expect(kingLookAt(1866).age).toBe(15)
    expect(kingLookAt(1871).age).toBe(20)
    expect(kingLookAt(1871).height).toBeGreaterThan(kingLookAt(1866).height)
  })

  it('해를 모르면 아무것도 정하지 않는다 — 부르는 쪽이 그대로 두게', () => {
    expect(kingLookAt(null)).toBe(null)
    expect(kingLookAt(undefined)).toBe(null)
  })
})

describe('비트마다의 해 — 임금의 나이가 여기 달려 있다', () => {
  it('막의 첫 비트는 막의 해다', () => {
    for (const act of ACTS) expect(yearAtBeat(act, 0), act.id).toBe(act.year)
  })

  it('해를 정한 비트를 지나면 그 해로 갈아 낀다 — 2막의 1868년 이어', () => {
    const act = ACTS[1]
    const beats = beatsOf(act)
    const i = beats.findIndex(b => b.year === 1868)
    expect(i).toBeGreaterThan(0)
    expect(yearAtBeat(act, i - 1)).toBe(1866)
    expect(yearAtBeat(act, i)).toBe(1868)
    expect(yearAtBeat(act, beats.length - 1)).toBeGreaterThanOrEqual(1868)
  })

  it('막을 지나며 해가 뒤로 가지 않는다', () => {
    for (const act of ACTS) {
      let prev = -Infinity
      for (let i = 0; i < beatsOf(act).length; i++) {
        const y = yearAtBeat(act, i)
        expect(y, `${act.id}[${i}]`).toBeGreaterThanOrEqual(prev)
        prev = y
      }
    }
  })

  it('게임 전체에서 임금은 자라기만 한다 — 어려지는 자리가 없다', () => {
    let prev = 0
    for (const act of ACTS) {
      for (let i = 0; i < beatsOf(act).length; i++) {
        const look = kingLookAt(yearAtBeat(act, i))
        expect(look, `${act.id}[${i}] 의 해를 모른다`).toBeTruthy()
        expect(look.height, `${act.id}[${i}]`).toBeGreaterThanOrEqual(prev)
        prev = look.height
      }
    }
  })
})
