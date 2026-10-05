import { describe, it, expect } from 'vitest'
import {
  formationAt, formationAll, pointOnPath, arcAt, pathLength, pathAt, processionPath, escortOffsets,
  FORMATION_GAP, END_STANDOFF,
} from '../../src/systems/audience.js'
import { PALACES } from '../../src/data/palaces.js'
import { collides } from '../../src/data/hall-geometry.js'
import { ACTS } from '../../src/data/acts.js'

// 선생님(2026-10-06): 「어린 고종이 가마 타러 갈 때 4~5명이 함께 갈 때 이동이 좀 이상해.」
//
// 대열 자리를 지도의 남북으로 놓고 있었고(걷는 방향이 아니라), 기둥에 걸리면 빈자리를
// 찾아 튕겼다. 이제 사람마다 임금과 같은 길 위의 한 점을 걷는다.

const STRAIGHT = [{ x: 0, z: 0 }, { x: 0, z: 20 }]          // 남쪽(+z)으로 곧은 길
const BENT = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }]  // 동쪽으로 갔다가 남쪽으로 꺾는 길

describe('길 위의 한 점', () => {
  it('가는 만큼의 자리와 걷는 방향을 낸다', () => {
    const p = pointOnPath(BENT, 4)
    expect(p.x).toBeCloseTo(4, 6); expect(p.z).toBeCloseTo(0, 6)
    expect(p.hx).toBeCloseTo(1, 6); expect(p.hz).toBeCloseTo(0, 6)
    const q = pointOnPath(BENT, 15)
    expect(q.x).toBeCloseTo(10, 6); expect(q.z).toBeCloseTo(5, 6)
    expect(q.hz).toBeCloseTo(1, 6)
  })

  it('길 밖으로 나가지 않는다', () => {
    expect(pointOnPath(STRAIGHT, -5).z).toBe(0)
    expect(pointOnPath(STRAIGHT, 99).z).toBe(20)
    expect(pointOnPath([], 3)).toBeNull()
  })

  it('임금의 걸음과 같은 완급을 쓴다 — 대열이 임금과 따로 놀지 않는다', () => {
    for (const u of [0, 0.2, 0.5, 0.8, 1]) {
      const king = pathAt(BENT, u)
      const same = pointOnPath(BENT, arcAt(BENT, u))
      expect(same.x).toBeCloseTo(king.x, 6)
      expect(same.z).toBeCloseTo(king.z, 6)
    }
  })
})

describe('대열이 걷는 방향을 따른다 — 지도의 남북이 아니라', () => {
  it('곧은 길에서는 앞선 사람이 임금 앞에 있다', () => {
    const king = pathAt(STRAIGHT, 0.5)
    const lead = formationAt(STRAIGHT, 0.5, { dz: 3, dx: 0 })
    expect(lead.z).toBeGreaterThan(king.z)
    expect(lead.x).toBeCloseTo(king.x, 6)
  })

  it('길이 꺾이면 「앞」도 따라 꺾인다 — 예전 판이 부러진 자리', () => {
    // 동쪽으로 걷는 구간. 예전에는 dz 를 지도의 z 에 더해, 앞선 사람이 남쪽 옆구리에
    // 붙어 옆걸음을 쳤다. 이제는 동쪽(걷는 쪽) 앞에 있어야 한다.
    const u = 0.15
    const king = pathAt(BENT, u)
    const lead = formationAt(BENT, u, { dz: 3, dx: 0 })
    expect(lead.x).toBeGreaterThan(king.x + 2)       // 걷는 쪽으로 앞서 있다
    expect(Math.abs(lead.z - king.z)).toBeLessThan(0.01)
  })

  it('옆으로 비켜 선 폭도 걷는 방향을 따라 돈다', () => {
    const south = formationAt(STRAIGHT, 0.5, { dz: 0, dx: 2 })      // +z 로 걸을 때 오른쪽은 +x
    expect(south.x - pathAt(STRAIGHT, 0.5).x).toBeCloseTo(2, 6)
    const east = formationAt(BENT, 0.15, { dz: 0, dx: 2 })           // +x 로 걸을 때 오른쪽은 -z
    expect(east.z - pathAt(BENT, 0.15).z).toBeCloseTo(-2, 6)
  })

  it('걷는 동안에는 걷는 쪽을 본다', () => {
    const p = formationAt(BENT, 0.15, { dz: 2, dx: 0 })
    expect(p.walking).toBe(true)
    expect(p.yaw).toBeCloseTo(Math.atan2(1, 0), 6)     // 동쪽
  })
})

describe('먼저 닿으면 기다리고, 뒤따르면 늦게 나선다 — 흩어지지 않는다', () => {
  it('앞선 사람은 임금보다 먼저 문 앞에 닿아 서서 기다린다', () => {
    const p = formationAt(STRAIGHT, 0.9, { dz: 6, dx: 2 })
    expect(p.z).toBeCloseTo(20 - END_STANDOFF, 6)     // 끝점(임금 자리)이 아니라 그 앞
    expect(p.walking).toBe(false)
    expect(p.yaw).toBeNull()          // 서서 기다릴 때는 임금을 본다
  })

  it('문 앞에서 기다리는 사람이 임금이 지나갈 길을 비워 둔다', () => {
    // 폭을 0 으로 적어도 기다릴 때는 옆으로 비켜 선다 — 길 위는 임금이 지나갈 자리다.
    const p = formationAt(STRAIGHT, 1, { dz: 4, dx: 0 })
    expect(Math.abs(p.x)).toBeGreaterThanOrEqual(FORMATION_GAP - 1e-9)
    const king = pathAt(STRAIGHT, 1)
    expect(Math.hypot(p.x - king.x, p.z - king.z)).toBeGreaterThanOrEqual(FORMATION_GAP - 1e-9)
  })

  it('뒤따르는 사람은 처음에는 제자리에 서 있다', () => {
    const p = formationAt(STRAIGHT, 0.02, { dz: -3, dx: 0 })
    expect(p.z).toBe(0)
    expect(p.walking).toBe(false)
  })

  it('뒤따르는 사람은 끝에서 임금 뒤에 선다', () => {
    const p = formationAt(STRAIGHT, 1, { dz: -3, dx: 0 })
    expect(p.z).toBeCloseTo(17, 6)
  })

  it('다 왔으면 아무도 걷지 않는다', () => {
    for (const off of [{ dz: 4, dx: 2 }, { dz: -2, dx: -2 }, { dz: 0, dx: 3 }]) {
      expect(formationAt(BENT, 1, off).walking).toBe(false)
    }
  })

  it('자리가 튀지 않는다 — 한 걸음 사이에 저만치로 옮겨 가는 사람이 없다', () => {
    // 예전 판은 기둥에 걸리는 순간 빈자리를 찾아 몇 m 를 튕겼다.
    for (const off of [{ dz: 4.2, dx: -2.6 }, { dz: 3.2, dx: 2.6 }, { dz: 1.2, dx: -3.2 }, { dz: -2.4, dx: 0 }]) {
      let prev = formationAt(BENT, 0, off)
      for (let i = 1; i <= 400; i++) {
        const p = formationAt(BENT, i / 400, off)
        expect(Math.hypot(p.x - prev.x, p.z - prev.z), `u=${i / 400} 에서 튀었다`).toBeLessThan(0.5)
        prev = p
      }
    }
  })
})

describe('1막 가마 행렬 — 실제 궁, 실제 대열', () => {
  const def = PALACES.unhyeon
  const beat = ACTS[0].beats.find(b => b.kind === 'procession')
  const sarang = def.rooms.find(r => r.id === 'sarang')
  const gate = def.rooms.find(r => r.id === beat.to)
  const start = { x: sarang.x, z: sarang.z + 2 }
  const path = processionPath(def, start, { x: gate.x, z: gate.z }, gate.id)
  const escort = escortOffsets(beat)

  it('곁을 걷는 사람이 셋이다', () => { expect(escort).toHaveLength(3) })

  it('아무도 기둥이나 벽 안에 서지 않는다', () => {
    for (let i = 0; i <= 300; i++) {
      for (const p of formationAll(path, i / 300, escort, def)) {
        expect(collides(def, p, 0.5), `${p.npc} u=${(i / 300).toFixed(3)}`).toBeFalsy()
      }
    }
  })

  it('아무도 임금과 겹치지 않는다', () => {
    for (let i = 0; i <= 300; i++) {
      const king = pathAt(path, i / 300)
      for (const p of formationAll(path, i / 300, escort, def)) {
        expect(Math.hypot(p.x - king.x, p.z - king.z), `${p.npc} u=${(i / 300).toFixed(3)}`).toBeGreaterThan(0.9)
      }
    }
  })

  it('곁을 걷는 사람끼리도 겹치지 않는다', () => {
    for (let i = 0; i <= 300; i++) {
      const spots = formationAll(path, i / 300, escort, def)
      for (let a = 0; a < spots.length; a++) for (let b = a + 1; b < spots.length; b++) {
        expect(Math.hypot(spots[a].x - spots[b].x, spots[a].z - spots[b].z),
          `${escort[a].npc}·${escort[b].npc} u=${(i / 300).toFixed(3)}`).toBeGreaterThan(0.9)
      }
    }
  })

  it('다 왔을 때 모두 대문 가까이에 모여 있다 — 마당 구석에 남은 사람이 없다', () => {
    const end = pathAt(path, 1)
    for (const p of formationAll(path, 1, escort, def)) {
      expect(Math.hypot(p.x - end.x, p.z - end.z), `${p.npc} 가 멀리 남았다`).toBeLessThan(6)
    }
    expect(pathLength(path)).toBeGreaterThan(10)
  })
})
