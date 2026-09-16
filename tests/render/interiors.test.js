import { it, expect } from 'vitest'
import * as THREE from 'three'
import { PALACES } from '../../src/data/palaces.js'
import { buildInterior, FURNISH_KINDS, FLOOR_TOP } from '../../src/render/interiors.js'

// 2026-09-16 선생님 요청 — 「각 건물의 내부 디자인에 활용할 것들을 고려해서 만들어 넣어봐.
// 규장각에 책이 있어야하는 것처럼.」 방은 빈 상자가 아니어야 한다.
const ROOM = { w: 16, d: 12 }

it('쓰임이 있는 방은 모두 세간을 가진다(문·행각 같은 통로만 비운다)', () => {
  const bare = []
  for (const def of Object.values(PALACES)) {
    for (const r of def.rooms) {
      if (r.gate === true) continue
      if (!r.furnish) bare.push(`${def.id}/${r.id}`)
    }
  }
  expect(bare).toEqual([])
})

it('규장각은 서가, 수정전은 기록 궤, 침전은 잠자리다', () => {
  const room = (p, id) => PALACES[p].rooms.find(r => r.id === id)
  expect(room('changdeok', 'gyujanggak').furnish).toBe('library')
  expect(room('gyeongbok', 'sujeongjeon').furnish).toBe('archive')
  expect(room('changdeok', 'huijeongdang').furnish).toBe('bedchamber')
  expect(room('gyeongbok', 'jagyeongjeon').furnish).toBe('dowager')
  expect(room('changdeok', 'seonwonjeon').furnish).toBe('shrine')
  // 정전에도 어좌가 선다 — 어전회의 방(사정전)만이 아니라
  expect(room('gyeongbok', 'geunjeongjeon').throne).toBe(true)
})

it('쓰는 furnish 값은 모두 실제로 지을 수 있는 것이다', () => {
  const used = new Set(Object.values(PALACES).flatMap(d => d.rooms.map(r => r.furnish).filter(Boolean)))
  for (const kind of used) expect(FURNISH_KINDS).toContain(kind)
})

it('종류마다 물건이 실제로 서고, 마루 위에 놓이고, 방 안에 들어간다', () => {
  for (const kind of FURNISH_KINDS) {
    const g = buildInterior(THREE, null, kind, ROOM)
    const meshes = []
    g.traverse(o => { if (o.geometry) meshes.push(o) })
    expect(meshes.length, kind).toBeGreaterThan(2)
    const bbox = new THREE.Box3().setFromObject(g)
    expect(bbox.min.y, kind).toBeGreaterThanOrEqual(FLOOR_TOP - 0.01)   // 바닥을 뚫지 않는다
    expect(bbox.max.y, kind).toBeLessThan(4)                            // 지붕을 뚫지 않는다
    expect(bbox.min.x, kind).toBeGreaterThan(-ROOM.w / 2)
    expect(bbox.max.x, kind).toBeLessThan(ROOM.w / 2)
    expect(bbox.min.z, kind).toBeGreaterThan(-ROOM.d / 2)
  }
})

it('모르는 값이면 빈 방을 준다 — 터지지 않는다', () => {
  expect(buildInterior(THREE, null, 'nonesuch', ROOM).children).toHaveLength(0)
})

it('임시로 든 거처(경우궁·계동궁·북묘·영방)에는 어좌가 없다', () => {
  for (const id of ['gyeongu', 'gyedong', 'bukmyo', 'ojoyu']) {
    const def = PALACES[id]
    const council = def.rooms.find(r => r.id === def.councilRoom)
    expect(council.furnish, id).not.toBe('court')
    expect(council.throne, id).toBeUndefined()
  }
})
