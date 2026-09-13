import { describe, it, expect } from 'vitest'
import { createRush } from '../../src/core/countdown.js'
import { rushDurationMs, fireSourcesAt } from '../../src/systems/fire-rush.js'

const def = {
  id: 'gyeongbok',
  rooms: [
    { id: 'gwanghwamun',   x: 0,  z: 64 },
    { id: 'geunjeongjeon', x: 0,  z: 22 },
    { id: 'sajeongjeon',   x: 0,  z: -12 },
    { id: 'jagyeongjeon',  x: 34, z: -38 },
  ],
}

const TRACK = ['jagyeongjeon', 'sajeongjeon', 'geunjeongjeon', 'gwanghwamun']
const rush = createRush({ track: TRACK, totalMs: 90000, startedAt: 0 })

describe('촉박 시간 완화', () => {
  it('키보드는 그대로다', () => {
    expect(rushDurationMs(90000, false)).toBe(90000)
  })

  it('터치는 1.3배를 준다', () => {
    expect(rushDurationMs(90000, true)).toBe(117000)
  })

  it('언제나 정수 밀리초다', () => {
    expect(Number.isInteger(rushDurationMs(30001, true))).toBe(true)
  })
})

describe('불이 붙는 자리', () => {
  it('시작 순간에는 자경전 하나만 탄다', () => {
    const s = fireSourcesAt(def, rush, 0)
    expect(s).toHaveLength(1)
    expect(s[0]).toEqual({ x: 34, z: -38, strength: 1 })
  })

  it('절반이 지나면 자경전·사정전이 다 타고 근정전이 반쯤 탄다', () => {
    const s = fireSourcesAt(def, rush, 45000)
    expect(s).toHaveLength(3)
    expect(s.map(x => x.x)).toEqual([34, 0, 0])
    expect(s[0].strength).toBe(1)
    expect(s[1].strength).toBe(1)
    expect(s[2].strength).toBeCloseTo(0.5, 5)
  })

  it('끝나면 네 곳이 다 탄다', () => {
    expect(fireSourcesAt(def, rush, 90000)).toHaveLength(4)
  })

  it('트랙에 있어도 맵에 없는 방은 건너뛴다', () => {
    const r = createRush({ track: ['jagyeongjeon', '없는방'], totalMs: 1000, startedAt: 0 })
    expect(fireSourcesAt(def, r, 1000).map(s => s.x)).toEqual([34])
  })

  it('세기는 언제나 0 초과 1 이하다', () => {
    for (const t of [0, 1, 15000, 45000, 89999, 90000, 200000]) {
      for (const s of fireSourcesAt(def, rush, t)) {
        expect(s.strength, `t=${t}`).toBeGreaterThan(0)
        expect(s.strength, `t=${t}`).toBeLessThanOrEqual(1)
      }
    }
  })

  it('프레임과 무관하게 시각만 따른다', () => {
    expect(fireSourcesAt(def, rush, 33333)).toEqual(fireSourcesAt(def, rush, 33333))
  })
})
