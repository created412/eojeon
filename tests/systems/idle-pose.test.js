import { describe, it, expect } from 'vitest'
import { idlePose, idleSeed, shiftCurve, occasional, IDLE, NO_SEED } from '../../src/systems/idle-pose.js'

// 선생님(2026-09-26): 「전부 움직이고 있어야해.」
//
// 여기서 붙드는 것은 「움직이는가」와 「움직임이 과하지 않은가」 둘이다. 과함도
// 결함이다 — 궁의 신하가 어깨를 들썩이며 숨쉬면 그것은 살아 있는 궁이 아니라
// 체육 시간이다. 그리고 **사람마다 박자가 달라야 한다**: 스물이 한 박자로 숨쉬면
// 사람이 아니라 합창단이 된다.

describe('서 있는 사람의 숨', () => {
  it('가만히 서 있어도 값이 계속 달라진다 — 어느 1.2초를 떼어 보아도', () => {
    const seed = idleSeed('kim')
    for (let base = 0; base < 30000; base += 1100) {
      const a = idlePose(base, seed, {})
      const b = idlePose(base + 1200, seed, {})
      // 숨 하나만으로도 1.2초 안에 반드시 달라진다(0.24Hz 는 4.2초 주기다).
      const moved = Math.abs(a.spine - b.spine) + Math.abs(a.armL - b.armL)
      expect(moved, `${base}ms`).toBeGreaterThan(1e-4)
    }
  })

  it('폭이 사람의 것이다 — 허리 1도, 팔 3도, 고개 12도를 넘지 않는다', () => {
    const seed = idleSeed('someone')
    let maxSpine = 0, maxArm = 0, maxHead = 0, maxScale = 0, maxLean = 0
    for (let t = 0; t < 120000; t += 37) {
      const p = idlePose(t, seed, {})
      maxSpine = Math.max(maxSpine, Math.abs(p.spine))
      maxArm = Math.max(maxArm, Math.abs(p.armL), Math.abs(p.armR))
      maxHead = Math.max(maxHead, Math.abs(p.headYaw))
      maxLean = Math.max(maxLean, Math.abs(p.lean))
      maxScale = Math.max(maxScale, Math.abs(p.scaleY - 1))
    }
    expect(maxSpine).toBeLessThan(0.018)      // 약 1도
    expect(maxArm).toBeLessThan(0.05)         // 약 3도
    expect(maxHead).toBeLessThan(0.21)        // 약 12도
    expect(maxLean).toBeLessThan(0.03)
    expect(maxScale).toBeLessThan(0.01)       // 가슴이 1% 넘게 부풀면 풍선이다
    // 그러면서도 0 은 아니어야 한다 — 「안 움직인다」와 구별되어야 한다.
    expect(maxSpine).toBeGreaterThan(0.005)
    expect(maxArm).toBeGreaterThan(0.02)
    expect(maxHead).toBeGreaterThan(0.1)
  })

  it('두 사람이 같은 박자로 숨쉬지 않는다', () => {
    const names = ['gate:changdeok:0', 'gate:changdeok:1', 'king', 'staff-nae', 'jo', 'park']
    const seeds = names.map(idleSeed)
    let same = 0, pairs = 0
    for (let i = 0; i < seeds.length; i++) {
      for (let j = i + 1; j < seeds.length; j++) {
        pairs++
        // 여러 시각에서 견주어, 우연히 한 순간 스치는 것을 「같다」로 보지 않는다.
        let apart = 0
        for (let t = 0; t < 20000; t += 250) {
          const a = idlePose(t, seeds[i], {})
          const b = idlePose(t, seeds[j], {})
          apart += Math.abs(a.spine - b.spine) + Math.abs(a.legL - b.legL)
        }
        if (apart < 1e-6) same++
      }
    }
    expect(pairs).toBeGreaterThan(10)
    expect(same, '박자가 겹치는 짝이 있다').toBe(0)
  })

  it('같은 이름이면 언제 물어도 같은 박자다 — 새로 고쳐도 같은 궁이다', () => {
    const a = idleSeed('jo')
    const b = idleSeed('jo')
    expect(a).toEqual(b)
    expect(idlePose(7777, a, {})).toEqual(idlePose(7777, b, {}))
  })

  it('이름이 없어도 숨은 쉰다 — 다만 모두 같은 박자다', () => {
    const p = idlePose(3000, null, {})
    expect(p).toEqual(idlePose(3000, NO_SEED, {}))
    expect(Math.abs(p.spine)).toBeGreaterThan(0)
  })

  it('그릇을 주면 거기에 쓴다 — 프레임마다 객체를 새로 만들지 않는다', () => {
    const out = {}
    const seed = idleSeed('kim')
    expect(idlePose(0, seed, out)).toBe(out)
    const before = Object.keys(out).length
    idlePose(500, seed, out)
    expect(Object.keys(out).length).toBe(before)
  })

  it('무게는 한 발에 오래 기대 있다가 옮겨 간다 — 쉼 없이 오가지 않는다', () => {
    // 곡선이 양끝(±1)에 얼마나 오래 머무는지. 삼각파라면 끝에 머무는 시간이 거의
    // 없다. smoothstep 으로 누른 까닭이 이것이다.
    let dwell = 0, steps = 0
    for (let u = 0; u < 1; u += 0.001) { steps++; if (Math.abs(shiftCurve(u)) > 0.8) dwell++ }
    expect(dwell / steps).toBeGreaterThan(0.3)
    expect(shiftCurve(0)).toBeCloseTo(-1, 6)
    expect(shiftCurve(0.5)).toBeCloseTo(1, 6)
    expect(shiftCurve(1)).toBeCloseTo(-1, 6)
  })

  it('고개는 늘 돌아가 있지 않고, 한 바퀴에 한 번 돌아본다', () => {
    let still = 0, steps = 0, peak = 0
    for (let u = 0; u < 1; u += 0.001) {
      steps++
      const v = occasional(u)
      if (v < 1e-6) still++
      peak = Math.max(peak, v)
    }
    expect(still / steps).toBeGreaterThan(0.5)   // 절반 넘게는 가만히 있는다
    expect(peak).toBeCloseTo(1, 3)
    // 움직이기 시작하는 순간과 끝나는 순간의 기울기가 0 이라 고개가 안 튄다.
    expect(occasional(0.55)).toBeCloseTo(0, 6)
    expect(occasional(0.95)).toBeCloseTo(0, 6)
    expect(occasional(0.5501)).toBeLessThan(1e-4)
  })

  it('숨은 사람의 숨이다 — 0.2~0.28Hz(분당 12~17회)', () => {
    expect(IDLE.breathHz).toBeGreaterThanOrEqual(0.2)
    expect(IDLE.breathHz).toBeLessThanOrEqual(0.28)
    // 무게 옮김과 고개는 숨보다 훨씬 느려야 한다 — 그것이 「점잖음」이다.
    expect(IDLE.shiftHz).toBeLessThan(IDLE.breathHz / 3)
    expect(IDLE.lookHz).toBeLessThan(IDLE.breathHz / 3)
  })

  it('자리는 내놓지 않는다 — 자세뿐이다(알현·행렬과 싸우지 않는 근거)', () => {
    const p = idlePose(1234, idleSeed('kim'), {})
    for (const key of ['x', 'z', 'y', 'position']) expect(p[key]).toBeUndefined()
  })
})
