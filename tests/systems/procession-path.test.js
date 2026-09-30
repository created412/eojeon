import { describe, it, expect } from 'vitest'
import { pathAt, pathLength, processionPath } from '../../src/systems/audience.js'
import { PALACES } from '../../src/data/palaces.js'
import { collides } from '../../src/data/hall-geometry.js'

// 선생님(2026-09-29) 지적 #18: 「모시고 가는 장면에서 기둥에 부딪히고 순간이동을 한다.」
//
// 원인은 둘이었다. 행렬이 **직선**으로 걸었고(walkAt 이 from→to 를 그대로 잇는다),
// 시작할 때 임금을 제자리에 **꽂아 넣었다**(position.set). 이 시험은 그 둘을 붙든다.

describe('행렬의 길 — 꺾어 걷는다', () => {
  it('지점이 둘이면 직선과 같다 — 예전 걸음을 깨지 않는다', () => {
    const pts = [{ x: 0, z: 0 }, { x: 0, z: 10 }]
    expect(pathAt(pts, 0)).toEqual({ x: 0, z: 0 })
    expect(pathAt(pts, 1)).toEqual({ x: 0, z: 10 })
    // 가운데는 부드럽게 — 등속이 아니라 처음과 끝이 느리다(walkAt 과 같은 결).
    expect(pathAt(pts, 0.5).z).toBeCloseTo(5, 5)
  })

  it('꺾이는 길을 **길이 비율**로 걷는다 — 지점 개수로 나누지 않는다', () => {
    // 첫 구간이 9, 둘째가 1. 지점 개수로 나누면 u=0.5 에서 꺾임에 와 버린다.
    const pts = [{ x: 0, z: 0 }, { x: 0, z: 9 }, { x: 1, z: 9 }]
    expect(pathLength(pts)).toBeCloseTo(10, 5)
    // 절반쯤 왔으면 아직 첫 구간이다.
    const mid = pathAt(pts, 0.5)
    expect(mid.x).toBeCloseTo(0, 5)
    expect(mid.z).toBeGreaterThan(4)
    expect(mid.z).toBeLessThan(6)
  })

  it('끝은 반드시 마지막 지점이다 — 문 앞에서 멈추지 않는다', () => {
    const pts = [{ x: 0, z: 0 }, { x: 4, z: 4 }, { x: -3, z: 9 }]
    const end = pathAt(pts, 1)
    expect(end.x).toBeCloseTo(-3, 5)
    expect(end.z).toBeCloseTo(9, 5)
  })

  it('u 가 범위를 벗어나도 길 밖으로 나가지 않는다', () => {
    const pts = [{ x: 0, z: 0 }, { x: 0, z: 10 }]
    expect(pathAt(pts, -1)).toEqual({ x: 0, z: 0 })
    expect(pathAt(pts, 2)).toEqual({ x: 0, z: 10 })
  })

  it('지점이 하나뿐이면 그 자리에 선다 — 터지지 않는다', () => {
    expect(pathAt([{ x: 2, z: 3 }], 0.5)).toEqual({ x: 2, z: 3 })
    expect(pathAt([], 0.5)).toBeNull()
    expect(pathLength([])).toBe(0)
  })
})

describe('행렬의 길 — 전각을 뚫고 지나가지 않는다', () => {
  // 1막 운현궁: 노안당(사랑) → 대문. 노안당은 x -9, z -8 이고 대문은 x 0, z 19 다.
  const def = PALACES.unhyeon

  it('예전의 직선은 실제로 무언가에 걸렸다 — 그래서 고칠 값이 있었다', () => {
    const from = { x: -9, z: -8 }
    const to = { x: 0, z: 19 }
    let hit = 0
    for (let i = 0; i <= 60; i++) {
      const u = i / 60
      const p = { x: from.x + (to.x - from.x) * u, z: from.z + (to.z - from.z) * u }
      if (collides(def, p, 0.6)) hit++
    }
    expect(hit).toBeGreaterThan(0)
  })

  it('꺾어 만든 길은 한 걸음도 걸리지 않는다', () => {
    const points = processionPath(def, { x: -9, z: -8 }, { x: 0, z: 19 }, 'daemun')
    expect(points.length).toBeGreaterThan(1)
    for (let i = 0; i <= 200; i++) {
      const p = pathAt(points, i / 200)
      // collides() 는 막은 물건을 돌려준다(없으면 null) — 그 물건 이름이 곧 실패 이유다.
      expect(collides(def, p, 0.55), `u=${(i / 200).toFixed(3)} 에서 걸렸다`).toBeFalsy()
    }
  })

  it('길은 임금이 **지금 선 자리**에서 시작한다 — 꽂아 넣지 않는다', () => {
    const standing = { x: 6, z: 10 }          // 마당 한가운데, 사랑채 앞이 아니다
    const points = processionPath(def, standing, { x: 0, z: 19 }, 'daemun')
    expect(points[0].x).toBeCloseTo(standing.x, 5)
    expect(points[0].z).toBeCloseTo(standing.z, 5)
  })

  it('길이 안 나오면 직선 두 점이라도 돌려준다 — 장면이 멈추지 않는다', () => {
    const points = processionPath(def, { x: 0, z: 0 }, { x: 0, z: 0.2 }, 'daemun')
    expect(points.length).toBeGreaterThanOrEqual(2)
    expect(pathAt(points, 1).z).toBeCloseTo(0.2, 5)
  })
})
