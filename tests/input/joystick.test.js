import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { stickVector, STICK_RADIUS, STICK_DEAD } from '../../src/input/joystick.js'
import { mergeAxis } from '../../src/input/input.js'

// 선생님(2026-10-11): 「모바일버전에서는 왼쪽에 작게 움직일수 있는 조이스틱 같은 형태가 있었으면 좋겠어. 구현해봐
// 최대한 게임 화면에 방해되지 않는 크기로.」
// 조이스틱은 방향 하나를 내고, input.axis() 가 자판과 같은 길로 흘린다 — 두 번째 이동 경로가 없다.

describe('조이스틱 벡터(stickVector)', () => {
  it('가운데·죽은 구역 안은 0 이다', () => {
    expect(stickVector(0, 0)).toEqual({ x: 0, z: 0, mag: 0 })
    const d = STICK_RADIUS * STICK_DEAD * 0.9
    expect(stickVector(d, 0).mag).toBe(0)
    expect(stickVector(0, -d).mag).toBe(0)
  })
  it('반지름 밖은 길이 1 로 자르고, 방향은 그대로다 — 위로 밀면 W(−z)', () => {
    const v = stickVector(0, -STICK_RADIUS * 3)
    expect(v.mag).toBe(1)
    expect(v.x).toBeCloseTo(0); expect(v.z).toBeCloseTo(-1)
    const r = stickVector(STICK_RADIUS * 2, 0)
    expect(r.x).toBeCloseTo(1); expect(r.z).toBeCloseTo(0)
  })
  it('죽은 구역 가장자리에서 0 부터 매끄럽게 커진다', () => {
    const edge = stickVector(STICK_RADIUS * (STICK_DEAD + 0.001), 0)
    expect(edge.mag).toBeGreaterThan(0); expect(edge.mag).toBeLessThan(0.01)
    const mid = stickVector(STICK_RADIUS * 0.6, 0)
    expect(mid.mag).toBeGreaterThan(0.4); expect(mid.mag).toBeLessThan(0.6)
  })
})

describe('mergeAxis — 자판과 같은 길', () => {
  it('자판이 없을 때 조이스틱 방향이 축이 된다', () => {
    expect(mergeAxis({ x: 0, z: 0 }, { x: 0, z: -0.5 })).toEqual({ x: 0, z: -0.5 })
    expect(mergeAxis({ x: 0, z: 0 }, { x: 0, z: 0 })).toEqual({ x: 0, z: 0 })
    expect(mergeAxis({ x: 0, z: 0 }, null)).toEqual({ x: 0, z: 0 })
  })
  it('자판을 누르면 자판이 이긴다', () => {
    expect(mergeAxis({ x: 0, z: -1 }, { x: 1, z: 0 })).toEqual({ x: 0, z: -1 })
  })
})

describe('main.js 의 연결', () => {
  const main = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8')
  it('손가락 기기에서만 세우고, 방향을 input.setStick 으로 넘기며, 걷는 국면에만 보인다', () => {
    expect(main).toMatch(/isCoarse\(\) \? createJoystick\(root, \{ onChange: v => input\.setStick\(v\) \}\) : null/)
    expect(main).toMatch(/joystick\?\.setVisible\(\(flow\.phase === 'day' \|\| flow\.phase === 'rush'\) && !pause\.isOpen\(\)\)/)
    expect(main).toMatch(/joystick\?\.dispose\(\)/)
  })
  it('조이스틱은 작다 — 바탕 84px, 「?」·소리 단추 윗줄', () => {
    const src = readFileSync(new URL('../../src/input/joystick.js', import.meta.url), 'utf8')
    expect(src).toMatch(/\.game-stick\{position:fixed;left:14px;bottom:64px;z-index:23;width:84px;height:84px/)
    expect(src).toMatch(/\.eojeon:has\(\.speak\) \.game-stick/)
  })
})
