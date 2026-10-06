import { describe, it, expect } from 'vitest'
import { boardAt, kingVisibleAt, carryLiftAt, carryPathFor, cameraAnchorAt, BOARD_SPANS, CARRY_BEYOND, CAMERA_TRAIL, CAMERA_BLEND } from '../../src/systems/boarding.js'
import { PALACES } from '../../src/data/palaces.js'
import { pathAt, roomOf } from '../../src/systems/audience.js'

// 선생님(2026-09-29) 지적 #18: 「가마 탑승 이벤트」가 없다 — 「E — 가마에 오른다」를
// 눌러도 아무 일이 안 일어났다.

describe('가마에 오른다 — 세 마디', () => {
  it('마디 길이를 합치면 하나다 — 어느 마디도 잘려 나가지 않는다', () => {
    const sum = BOARD_SPANS.reduce((s, x) => s + x.part, 0)
    expect(sum).toBeCloseTo(1, 10)
  })

  it('처음은 걷고, 가운데는 들어서고, 끝은 실려 간다', () => {
    expect(boardAt(0).phase).toBe('walk')
    expect(boardAt(0.45).phase).toBe('enter')
    expect(boardAt(0.99).phase).toBe('carry')
  })

  it('끝에서는 마지막 마디의 1 로 멈춘다 — 넘겨도 터지지 않는다', () => {
    expect(boardAt(1)).toEqual({ phase: 'carry', k: 1 })
    expect(boardAt(2)).toEqual({ phase: 'carry', k: 1 })
    expect(boardAt(-1)).toEqual({ phase: 'walk', k: 0 })
    expect(boardAt(undefined).phase).toBe('walk')
  })

  it('마디 안의 k 는 0 에서 1 까지 고르게 흐른다', () => {
    const walk = BOARD_SPANS[0].part
    expect(boardAt(0).k).toBeCloseTo(0, 6)
    expect(boardAt(walk / 2).k).toBeCloseTo(0.5, 6)
    expect(boardAt(walk * 0.999).k).toBeGreaterThan(0.99)
  })
})

describe('가마에 오른다 — 그림이 거짓말하지 않는다', () => {
  it('걷는 동안에는 임금이 보인다', () => {
    expect(kingVisibleAt(0)).toBe(true)
    expect(kingVisibleAt(0.2)).toBe(true)
  })

  it('가마가 떠난 뒤에는 임금이 화면에 남아 있지 않다', () => {
    // 가마는 안이 보이지 않는 물건이다. 탄 사람이 밖에 서 있으면 그림이 거짓이 된다.
    expect(kingVisibleAt(0.8)).toBe(false)
    expect(kingVisibleAt(1)).toBe(false)
  })

  it('한 번 사라지면 다시 나타나지 않는다 — 깜빡이지 않는다', () => {
    let goneAt = null
    for (let i = 0; i <= 200; i++) {
      const u = i / 200
      const visible = kingVisibleAt(u)
      if (!visible && goneAt === null) goneAt = u
      if (goneAt !== null) expect(visible, `u=${u.toFixed(3)} 에서 임금이 되살아났다`).toBe(false)
    }
    expect(goneAt).not.toBeNull()
  })
})

describe('가마에 오른다 — 메고 간다', () => {
  it('메기 전에는 땅에 있다', () => {
    expect(carryLiftAt(0)).toBe(0)
    expect(carryLiftAt(0.4)).toBe(0)
  })

  it('메는 동안 들린다', () => {
    expect(carryLiftAt(0.8)).toBeGreaterThan(0.2)
    expect(carryLiftAt(1)).toBeGreaterThan(0.2)
  })

  it('들리는 높이가 사람 키를 넘지 않는다 — 날아가지 않는다', () => {
    for (let i = 0; i <= 200; i++) expect(carryLiftAt(i / 200)).toBeLessThan(0.6)
  })

  it('대문 밖으로 실제로 나간다 — 문간에서 멈추지 않는다', () => {
    expect(CARRY_BEYOND).toBeGreaterThan(4)
  })
})

// 선생님(2026-10-06, 녹화): 「가마가 기둥을 뚫고 간다든지, 모시고 가는 와중에 갑자기 순간적으로 이동한다든지」
describe('가마는 문간 한가운데로 나가고, 카메라는 튀지 않는다', () => {
  const def = PALACES.unhyeon
  const spec = def.yard.props.find(p => p.id === 'gama')
  const gate = roomOf(def, 'daemun')

  it('운현궁의 가마는 대문 가운데(x=0)를 지나 밖으로 나간다 — 기둥 위를 지나지 않는다', () => {
    const path = carryPathFor(spec, gate)
    expect(path[0]).toEqual({ x: spec.x, z: spec.z })
    // 문간을 지나는 동안(z 가 대문 깊이 안에 드는 동안) x 는 가운데다
    for (let i = 0; i <= 100; i++) {
      const p = pathAt(path, i / 100)
      if (Math.abs(p.z - gate.z) <= gate.d / 2) expect(Math.abs(p.x - gate.x), `u=${i / 100}`).toBeLessThan(0.05)
    }
    const last = path[path.length - 1]
    expect(last.x).toBe(gate.x)
    expect(Math.abs(last.z - gate.z)).toBeCloseTo(CARRY_BEYOND, 5)
    // 처음에는 옆으로 옮겨 서는 짧은 토막이 있다 — 문간 앞에서 가운데로
    expect(path[1].x).toBe(gate.x)
    expect(path[1].z).toBeLessThan(gate.z)
  })

  it('대문이 없으면 선 자리에서 곧장 나간다', () => {
    const path = carryPathFor({ x: 3, z: 10 }, null)
    expect(path).toHaveLength(2)
    expect(path[1].z - path[0].z).toBeCloseTo(CARRY_BEYOND, 5)
  })

  it('메기 시작하는 순간 카메라는 가마 옆 자리에 있고, 한 토막 뒤에는 가마 뒤에 있다', () => {
    const beside = { x: 1.9, z: 16.2 }, gama = { x: 3.4, z: 16.6 }, dir = { x: 0, z: 1 }
    expect(cameraAnchorAt(beside, gama, dir, 0)).toEqual(beside)
    const after = cameraAnchorAt(beside, gama, dir, CAMERA_BLEND)
    expect(after.x).toBeCloseTo(gama.x, 5)
    expect(after.z).toBeCloseTo(gama.z - CAMERA_TRAIL, 5)
    expect(cameraAnchorAt(beside, gama, dir, 1)).toEqual(after)
  })

  it('그 사이 어느 프레임에서도 한 걸음 넘게 뛰지 않는다', () => {
    const beside = { x: 1.9, z: 16.2 }, dir = { x: 0, z: 1 }
    const path = carryPathFor(spec, gate)
    let prev = null
    for (let i = 0; i <= 400; i++) {
      const k = i / 400
      const a = cameraAnchorAt(beside, pathAt(path, k), dir, k)
      if (prev) expect(Math.hypot(a.x - prev.x, a.z - prev.z), `k=${k}`).toBeLessThan(0.25)
      prev = a
    }
  })
})
