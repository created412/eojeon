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

// 2026-09-19 선생님 화면(사정전) — 「책상 없이 물건이 공중에 떠 있다」.
// ① 가림 판정이 재질째 합친 나무 메시를 지우면 상 다리·등롱 기둥이 한꺼번에 사라져
//    종이·책·등갓만 떠 보였다 → 세간은 가림 판정에서 뺀다.
// ② 벽이 지워진 방에서 족자·휘장이 허공에 걸려 있었다 → 벽걸이는 따로 묶어 벽과 함께 보였다 사라진다.
it('세간은 가림 판정에 걸리지 않고, 벽걸이는 따로 묶인다', () => {
  for (const kind of FURNISH_KINDS) {
    const g = buildInterior(THREE, null, kind, ROOM)
    g.traverse(o => { if (o.isMesh) expect(o.userData.noOcclude, kind).toBe(true) })
  }
  const withScrolls = buildInterior(THREE, null, 'shrine', ROOM)
  const mounted = withScrolls.getObjectByName('wallMounted')
  expect(mounted).toBeTruthy()
  // 벽걸이가 바닥 세간 쪽에 섞여 있지 않다 — 바닥 쪽 가장 높은 곳은 3m 를 넘지 않는다(휘장은 3m 높이)
  const floorOnly = withScrolls.children.filter(c => c !== mounted)
  const box = new THREE.Box3()
  floorOnly.forEach(c => box.expandByObject(c))
  expect(box.max.y).toBeLessThan(2.9)
})

it('벽걸이가 있는 방의 집은 그 벽과 벽걸이를 서로 안다(scene.js 가 함께 보였다 감춘다)', async () => {
  const { buildPalace } = await import('../../src/render/palace.js')
  const tex = { wood: null, dancheong: null, roof: null, ground: null, paper: null, maru: null }
  let linked = 0
  try {
    const root = buildPalace(THREE, tex, PALACES.changdeok)
    for (const hall of root.children) {
      if (hall.userData?.wallItems) {
        expect(hall.userData.walls).toBeTruthy()
        linked++
      }
    }
  } catch (e) {
    // 궁 전체를 짓는 데는 캔버스(현판 글씨)가 필요하다 — 노드에 없으면 이 시험은 건너뛴다
    if (!/document|canvas/i.test(String(e))) throw e
    return
  }
  expect(linked).toBeGreaterThan(3)
})
