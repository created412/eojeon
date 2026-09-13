import { describe, it, expect } from 'vitest'
import {
  createRush, frontAt, reachedAt, remainingMs, isOverAt, roomProgressAt,
} from '../../src/core/countdown.js'

const TRACK = ['donhwamun', 'injeongjeon', 'huijeongdang', 'daejojeon']

function rush(startedAt = 1000, totalMs = 30000) {
  return createRush({ track: TRACK, totalMs, startedAt })
}

describe('촉박 엔진', () => {
  it('시작 순간 선두는 첫 칸에 있다', () => {
    const r = rush()
    expect(frontAt(r, 1000)).toBe(0)
  })

  it('절반이 지나면 선두도 절반이다', () => {
    const r = rush()
    expect(frontAt(r, 1000 + 15000)).toBeCloseTo(1.5, 5)
  })

  it('끝나면 마지막 칸이다', () => {
    const r = rush()
    expect(frontAt(r, 1000 + 30000)).toBe(3)
  })

  it('시간이 더 지나도 마지막 칸을 넘지 않는다', () => {
    const r = rush()
    expect(frontAt(r, 1000 + 999999)).toBe(3)
  })

  it('시작 전 시각이 들어와도 0 밑으로 안 간다', () => {
    const r = rush()
    expect(frontAt(r, 0)).toBe(0)
  })

  it('선두가 닿은 방만 reached 다', () => {
    const r = rush()
    const t = 1000 + 15000 // front = 1.5
    expect(reachedAt(r, 'donhwamun', t)).toBe(true)
    expect(reachedAt(r, 'injeongjeon', t)).toBe(true)
    expect(reachedAt(r, 'huijeongdang', t)).toBe(false)
    expect(reachedAt(r, 'daejojeon', t)).toBe(false)
  })

  it('트랙에 없는 방은 영영 안 닿는다', () => {
    const r = rush()
    expect(reachedAt(r, 'yeongyeongdang', 1000 + 999999)).toBe(false)
  })

  it('남은 시간을 알려준다', () => {
    const r = rush()
    expect(remainingMs(r, 1000)).toBe(30000)
    expect(remainingMs(r, 1000 + 12000)).toBe(18000)
  })

  it('남은 시간은 음수가 되지 않는다', () => {
    const r = rush()
    expect(remainingMs(r, 1000 + 40000)).toBe(0)
  })

  it('시간이 다 되면 끝난다', () => {
    const r = rush()
    expect(isOverAt(r, 1000 + 29999)).toBe(false)
    expect(isOverAt(r, 1000 + 30000)).toBe(true)
  })

  it('호출 횟수·순서와 무관하게 같은 시각이면 같은 결과다', () => {
    const r = rush()
    const before = frontAt(r, 1000 + 7777)
    // 프레임이 몇 번을 돌든, 어떤 순서로 물어보든 결과가 달라지면 안 된다
    for (let i = 0; i < 500; i++) frontAt(r, 1000 + i * 3)
    reachedAt(r, 'injeongjeon', 1000 + 20000)
    remainingMs(r, 1000 + 1)
    roomProgressAt(r, 1000 + 29000)
    const after = frontAt(r, 1000 + 7777)
    expect(after).toBe(before)
    expect(after).toBeCloseTo(3 * (7777 / 30000), 10)
  })

  it('미니맵 막대는 칸마다 0~1 로 찬다', () => {
    const r = rush()
    const p = roomProgressAt(r, 1000 + 15000) // front = 1.5
    expect(p.map(x => x.id)).toEqual(TRACK)
    expect(p[0].filled).toBe(1)
    expect(p[1].filled).toBe(1)
    expect(p[2].filled).toBeCloseTo(0.5, 5)
    expect(p[3].filled).toBe(0)
  })

  it('총 시간이 0이면 즉시 끝난 것으로 본다', () => {
    const r = createRush({ track: TRACK, totalMs: 0, startedAt: 1000 })
    expect(frontAt(r, 1000)).toBe(3)
    expect(isOverAt(r, 1000)).toBe(true)
  })

  it('칸이 하나뿐이면 선두는 늘 0 이다', () => {
    const r = createRush({ track: ['only'], totalMs: 5000, startedAt: 0 })
    expect(frontAt(r, 2500)).toBe(0)
    expect(frontAt(r, 999999)).toBe(0)
    expect(reachedAt(r, 'only', 0)).toBe(true)
  })
})
