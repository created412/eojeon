import { describe, it, expect } from 'vitest'
import {
  easeAxis, restAxis, createStepBlend, followStep, paceFor,
  GAIT_RISE_MS, GAIT_FALL_MS, GAIT_REST, FOLLOW_MAX_SPEED, FOLLOW_SNAP, PACE_MIN, PACE_MAX,
} from '../../src/systems/gait.js'
import { step, WALK } from '../../src/systems/movement.js'
import { createState } from '../../src/core/state.js'
import { PALACES } from '../../src/data/palaces.js'

// 선생님(2026-10-06): 「자연스러운 게임 움직임까지 바꿔.」
//
// 눌렀다 하면 첫 프레임부터 최고 속도였고, 뗐다 하면 그 자리에 박혔다. 걸음은 60Hz 로
// 쌓이는데 화면은 제 박자로 그려 임금이 떨었다. 곁을 걷는 사람은 프레임 수에 묶여
// 기계마다 빠르기가 달랐다. 이 시험은 그 셋을 수로 붙든다.

const FRAME = 1000 / 60
const len = v => Math.hypot(v.x, v.z)

describe('걸음이 붙고 풀린다', () => {
  it('첫 스텝부터 최고 속도가 아니다', () => {
    const first = easeAxis(restAxis(), { x: 0, z: 1 }, FRAME)
    expect(len(first)).toBeGreaterThan(0)
    expect(len(first)).toBeLessThan(0.2)
  })

  it('0.4초 안에 제 속도에 닿는다 — 굼뜨지 않다', () => {
    let a = restAxis()
    for (let t = 0; t < 400; t += FRAME) a = easeAxis(a, { x: 1, z: 0 }, FRAME)
    expect(len(a)).toBeGreaterThan(0.94)
  })

  it('끝내 정확히 그 방향 그 길이가 된다 — 0.9997 로 영영 걷지 않는다', () => {
    let a = restAxis()
    for (let t = 0; t < 1500; t += FRAME) a = easeAxis(a, { x: 0.6, z: -0.8 }, FRAME)
    expect(a).toEqual({ x: 0.6, z: -0.8 })
  })

  it('떼면 한 걸음 더 디디고 선다 — 그 자리에 박히지 않고, 미끄러지지도 않는다', () => {
    let a = { x: 0, z: 1 }
    let glide = 0, ms = 0
    while (len(a) > 0 && ms < 2000) {
      a = easeAxis(a, { x: 0, z: 0 }, FRAME)
      glide += len(a) * WALK * FRAME / 1000
      ms += FRAME
    }
    expect(len(a)).toBe(0)                 // 선다 — 0 에 닿는다
    expect(ms).toBeLessThan(500)           // 오래 끌지 않는다
    expect(glide).toBeGreaterThan(0.3)     // 뚝 서지 않는다
    expect(glide).toBeLessThan(1.4)        // 문지방을 넘도록 미끄러지지 않는다
  })

  it('선 뒤에는 정확히 0 이다 — step() 이 「입력 없음」으로 본다', () => {
    let a = { x: 0.02, z: 0.01 }
    a = easeAxis(a, { x: 0, z: 0 }, FRAME)
    expect(a.x).toBe(0); expect(a.z).toBe(0)
    expect(GAIT_REST).toBeLessThan(0.1)
  })

  it('옆을 누르면 꺾이지 않고 휘어 돈다', () => {
    let a = { x: 0, z: 1 }
    const angles = []
    for (let i = 0; i < 12; i++) {
      a = easeAxis(a, { x: 1, z: 0 }, FRAME)
      angles.push(Math.atan2(a.x, a.z))
    }
    // 각이 한 번에 90도 뛰지 않고 차례로 커진다.
    for (let i = 1; i < angles.length; i++) {
      expect(angles[i]).toBeGreaterThan(angles[i - 1])
      expect(angles[i] - angles[i - 1]).toBeLessThan(0.35)
    }
  })

  it('반대를 누르면 속도가 죽었다가 붙는다', () => {
    let a = { x: 0, z: 1 }
    let slowest = 1
    for (let i = 0; i < 40; i++) {
      a = easeAxis(a, { x: 0, z: -1 }, FRAME)
      slowest = Math.min(slowest, len(a))
    }
    expect(slowest).toBeLessThan(0.15)
    expect(a.z).toBeLessThan(-0.9)
  })

  it('프레임이 느려도 같은 시간에 같은 만큼 붙는다', () => {
    let fast = restAxis(), slow = restAxis()
    for (let t = 0; t < 200; t += 5) fast = easeAxis(fast, { x: 1, z: 0 }, 5)
    for (let t = 0; t < 200; t += 40) slow = easeAxis(slow, { x: 1, z: 0 }, 40)
    expect(Math.abs(len(fast) - len(slow))).toBeLessThan(0.02)
  })

  it('붙는 데 드는 시간이 푸는 시간보다 길다', () => {
    expect(GAIT_RISE_MS).toBeGreaterThan(GAIT_FALL_MS)
  })

  it('실제 걸음 판정(step)에 그대로 먹는다 — 축의 길이만큼 걷는다', () => {
    const def = PALACES.changdeok
    const pos = { x: def.spawn.x, z: def.spawn.z }
    const state = { ...createState(), palace: 'changdeok', control: 'A' }
    const axis = { x: 0, z: -0.5 }
    step({ player: { position: pos } }, { axis: () => axis, running: () => false }, state, 100)
    expect(def.spawn.z - pos.z).toBeCloseTo(WALK * 0.5 * 0.1, 2)
  })
})

describe('고정 스텝과 화면 사이를 잇는다', () => {
  it('두 스텝 사이를 남은 시간만큼 섞어 그린다', () => {
    const b = createStepBlend()
    const pos = { x: 0, z: 0 }
    b.begin(pos)
    const before = { ...pos }
    pos.z = 1
    b.stepped(before, pos)
    b.end(pos, 0.25)
    expect(pos.z).toBeCloseTo(0.25, 9)
    expect(b.actual().z).toBe(1)
  })

  it('다음 프레임에 진짜 자리로 되돌려 놓고 스텝을 돌린다', () => {
    const b = createStepBlend()
    const pos = { x: 0, z: 0 }
    b.begin(pos); const before = { ...pos }; pos.z = 1; b.stepped(before, pos); b.end(pos, 0.5)
    expect(pos.z).toBeCloseTo(0.5, 9)
    b.begin(pos)
    expect(pos.z).toBe(1)
  })

  it('스텝이 없는 프레임에도 앞으로 나아간다 — 0번·2번이 섞여도 끊기지 않는다', () => {
    // 144Hz 화면: 한 프레임 6.94ms. 스텝은 16.67ms 마다 0.15m.
    const b = createStepBlend()
    const pos = { x: 0, z: 0 }
    let acc = 0
    const seen = []
    for (let f = 0; f < 60; f++) {
      b.begin(pos)
      acc += 6.94
      while (acc >= FRAME) {
        const before = { ...pos }
        pos.z += 0.15
        b.stepped(before, pos)
        acc -= FRAME
      }
      b.end(pos, acc / FRAME)
      seen.push(pos.z)
    }
    const deltas = seen.slice(1).map((z, i) => z - seen[i])
    // 뒤로 가는 프레임이 없고, 멈췄다 뛰는 프레임도 없다.
    for (const d of deltas.slice(3)) {
      expect(d).toBeGreaterThan(0.03)
      expect(d).toBeLessThan(0.1)
    }
  })

  it('장면이 임금을 직접 옮기면(알현·궁 이동) 그 자리를 그대로 받는다', () => {
    const b = createStepBlend()
    const pos = { x: 0, z: 0 }
    b.begin(pos); const before = { ...pos }; pos.z = 1; b.stepped(before, pos); b.end(pos, 0.5)
    // 프레임 사이에 누가 옮겼다.
    pos.x = 40; pos.z = -12
    b.begin(pos)
    expect(pos).toEqual({ x: 40, z: -12 })
    b.end(pos, 0.3)
    expect(pos).toEqual({ x: 40, z: -12 })
  })

  it('같은 프레임 안에서 행렬이 옮겨도 덮어쓰지 않는다', () => {
    const b = createStepBlend()
    const pos = { x: 0, z: 0 }
    b.begin(pos); const before = { ...pos }; pos.z = 1; b.stepped(before, pos); b.end(pos, 0.5)
    b.begin(pos)          // 진짜 자리(1)로 돌아왔다
    pos.x = 7; pos.z = 3  // 스텝 없이 행렬이 직접 놓았다
    b.end(pos, 0.4)
    expect(pos).toEqual({ x: 7, z: 3 })
    b.begin(pos)
    expect(pos).toEqual({ x: 7, z: 3 })
  })

  it('걷는 국면이 아니면(alpha 1) 진짜 자리에 선다', () => {
    const b = createStepBlend()
    const pos = { x: 0, z: 0 }
    b.begin(pos); const before = { ...pos }; pos.z = 1; b.stepped(before, pos)
    b.end(pos, 1)
    expect(pos.z).toBe(1)
  })
})

describe('곁을 걷는 사람이 시간으로 따라붙는다', () => {
  const walkFor = (ms, dt, to = { x: 10, z: 0 }) => {
    let at = { x: 0, z: 0 }
    for (let t = 0; t < ms; t += dt) at = followStep(at, to, dt)
    return at
  }

  it('주사율이 달라도 같은 시간에 같은 데까지 간다', () => {
    const hz144 = walkFor(400, 1000 / 144)
    const hz60 = walkFor(400, 1000 / 60)
    const hz30 = walkFor(400, 1000 / 30)
    expect(Math.abs(hz144.x - hz60.x)).toBeLessThan(0.35)
    expect(Math.abs(hz30.x - hz60.x)).toBeLessThan(0.6)
  })

  it('사람이 낼 수 있는 빠르기를 넘지 않는다 — 멀어도 날아오지 않는다', () => {
    const one = followStep({ x: 0, z: 0 }, { x: 500, z: 0 }, FRAME)
    expect(one.moved).toBeLessThanOrEqual(FOLLOW_MAX_SPEED * FRAME / 1000 + 1e-9)
  })

  it('가까워지면 느려지고, 다 오면 그 자리에 선다', () => {
    const far = followStep({ x: 0, z: 0 }, { x: 1.2, z: 0 }, FRAME).moved
    const near = followStep({ x: 0, z: 0 }, { x: 0.2, z: 0 }, FRAME).moved
    expect(near).toBeLessThan(far)
    const there = followStep({ x: 0, z: 0 }, { x: FOLLOW_SNAP / 2, z: 0 }, FRAME)
    expect(there.x).toBe(FOLLOW_SNAP / 2)
  })

  it('임금의 걸음을 따라잡는다 — 뒤처져 멀어지지 않는다', () => {
    // 목표가 초당 9m 로 달아날 때, 따르는 사람과의 거리가 늘지 않고 머문다.
    let at = { x: 0, z: 0 }, to = { x: 1, z: 0 }
    let gap = 0
    for (let t = 0; t < 3000; t += FRAME) {
      to = { x: to.x + WALK * FRAME / 1000, z: 0 }
      at = followStep(at, to, FRAME)
      gap = to.x - at.x
    }
    expect(gap).toBeLessThan(1.6)
  })

  it('오래 자리를 비웠다 돌아와도 한 번에 날아가지 않는다', () => {
    const jump = followStep({ x: 0, z: 0 }, { x: 50, z: 0 }, 5000)
    expect(jump.moved).toBeLessThan(2)
  })
})

describe('걸음의 박자가 빠르기를 따른다', () => {
  it('평소 걸음에서 1 이다', () => { expect(paceFor(WALK, WALK)).toBe(1) })
  it('막 떼는 걸음은 느리게 구른다 — 다만 슬로모션은 아니다', () => {
    expect(paceFor(WALK * 0.3, WALK)).toBe(PACE_MIN)
    expect(paceFor(WALK * 0.7, WALK)).toBeCloseTo(0.7, 9)
  })
  it('아무리 빨라도 발이 붕붕 돌지 않는다', () => { expect(paceFor(WALK * 5, WALK)).toBe(PACE_MAX) })
  it('이상한 값에도 숫자를 낸다', () => {
    expect(paceFor(NaN, WALK)).toBe(PACE_MIN)
    expect(paceFor(3, 0)).toBe(PACE_MIN)
  })
})
