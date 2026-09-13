import { describe, it, expect } from 'vitest'
import { startRush } from '../../src/systems/rush-scene.js'
import { rushDurationMs } from '../../src/systems/fire-rush.js'

const track = ['donhwamun', 'injeongjeon', 'daejojeon']

describe('촉박 장면(rush-scene)', () => {
  it('전선이 목표 방에 닿기 전에는 running', () => {
    const s = startRush({ track, totalMs: 1000, goalRoom: 'daejojeon', now: 0 })
    expect(s.tick(100, null)).toBe('running')
  })

  it('플레이어가 목표 방에 있으면 arrived', () => {
    const s = startRush({ track, totalMs: 1000, goalRoom: 'daejojeon', now: 0 })
    expect(s.tick(100, 'daejojeon')).toBe('arrived')
  })

  it('전선이 목표 방에 닿으면 caught', () => {
    const s = startRush({ track, totalMs: 1000, goalRoom: 'daejojeon', now: 0 })
    expect(s.tick(1000, null)).toBe('caught')
  })

  it('시간이 다 되면(전선이 안 닿았어도) caught', () => {
    const s = startRush({ track, totalMs: 1000, goalRoom: 'daejojeon', now: 0 })
    expect(s.tick(5000, null)).toBe('caught')
  })

  it('한 번 결정되면(settled) 이후 어떤 입력에도 뒤집히지 않는다', () => {
    const s = startRush({ track, totalMs: 1000, goalRoom: 'daejojeon', now: 0 })
    expect(s.tick(1000, null)).toBe('caught')
    // settled 이후: 플레이어가 목표 방에 도착해도 arrived 로 뒤집히지 않는다
    expect(s.tick(1050, 'daejojeon')).toBe('caught')
    expect(s.tick(100000, null)).toBe('caught')
  })

  it('잘게 나눠 tick 하든 한 번에 크게 건너뛰든 결과가 같다', () => {
    const a = startRush({ track, totalMs: 1000, goalRoom: 'daejojeon', now: 0 })
    const b = startRush({ track, totalMs: 1000, goalRoom: 'daejojeon', now: 0 })
    let last
    for (let t = 0; t <= 1000; t += 20) last = a.tick(t, null)
    const jump = b.tick(1000, null)
    expect(last).toBe(jump)
    expect(last).toBe('caught')
  })

  it('잘게 나눠 tick 하든 한 번에 건너뛰든 arrived 결과도 같다', () => {
    const a = startRush({ track, totalMs: 1000, goalRoom: 'daejojeon', now: 0 })
    const b = startRush({ track, totalMs: 1000, goalRoom: 'daejojeon', now: 0 })
    let last
    for (let t = 0; t <= 200; t += 20) last = a.tick(t, t === 200 ? 'daejojeon' : null)
    const jump = b.tick(200, 'daejojeon')
    expect(last).toBe(jump)
    expect(last).toBe('arrived')
  })
})

// 1882년 임오군란 — 난군이 돈화문에서 대조전까지 밀려온다. 미니맵의 붉은 전선이 이 순서다.
const IMO_TRACK = ['donhwamun', 'injeongjeon', 'huijeongdang', 'daejojeon']

describe('C2 임오군란 — 난도가 프레임이 아니라 시각에만 달려 있다', () => {
  const opts = { track: IMO_TRACK, totalMs: 22000, goalRoom: 'daejojeon' }

  it('60fps 로 촘촘히 돌리든 두 번만 돌리든 판정이 같다', () => {
    const fast = startRush({ ...opts, now: 0 })
    const slow = startRush({ ...opts, now: 0 })
    let a
    // 22050까지 돈다 — 1000/60 을 22000번 누적하면 부동소수점 오차로 마지막 프레임이
    // 22000 을 살짝 못 채우고 멈춘다(측정: 21983.33ms). 실제 프레임 루프라면 다음
    // 프레임에서 넘어갈 뿐 문제가 아니지만, 이 시험은 「그 시각에 caught 인가」를
    // 보는 것이므로 경계를 한 프레임만큼 더 돈다.
    for (let t = 0; t <= 22050; t += 1000 / 60) a = fast.tick(t, null)
    const b = slow.tick(22000, null)
    expect(a).toBe('caught')
    expect(b).toBe('caught')
  })

  it('스무 걸음 안에 닿으면 붙잡히지 않는다 — 달려간 학생이 손해 보지 않는다', () => {
    const s = startRush({ ...opts, now: 0 })
    expect(s.tick(6000, 'huijeongdang')).toBe('running')
    expect(s.tick(9000, 'daejojeon')).toBe('arrived')
    expect(s.tick(22000, null)).toBe('arrived')
  })

  it('전선이 대조전에 닿기 전에는 붙잡히지 않는다', () => {
    const s = startRush({ ...opts, now: 0 })
    expect(s.tick(21999, null)).toBe('running')
  })

  it('터치는 1.3배를 받는다 — 손가락이 키보드보다 느리다', () => {
    expect(rushDurationMs(22000, true)).toBe(28600)
    expect(rushDurationMs(22000, false)).toBe(22000)
  })
})
