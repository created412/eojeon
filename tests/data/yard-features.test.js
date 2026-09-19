import { describe, it, expect } from 'vitest'
import { PALACES } from '../../src/data/palaces.js'
import { ROOM_SHRINK } from '../../src/data/hall-geometry.js'

// 중심점만 재면 큰 연못의 모서리가 방 안에 들어가도 통과한다 — 바깥 둘레까지 잰다.
function footprints(y) {
  const boxes = []
  if (y.bridge) {
    const b = y.bridge
    boxes.push({ name: '개울과 둑', x: b.x, z: b.z, w: b.streamW, d: b.streamD + .3 })
    boxes.push({ name: '다리와 난간', x: b.x, z: b.z, w: b.w, d: b.d })
  }
  for (const r of y.royalRoad ?? []) boxes.push({ name: '삼도', ...r })
  if (y.pond) {
    boxes.push({ name: '연못과 석축', ...y.pond })
    boxes.push({ name: '정자 처마', ...y.pond.pavilion })
  }
  for (const g of y.gateGuards ?? []) boxes.push({ name: '수문장', ...g })
  for (const s of y.smokeSources ?? []) boxes.push({ name: '굴뚝과 연기 범위', ...s })
  if (y.birds) boxes.push({ name: '새 이동 범위', ...y.birds })
  return boxes
}

it('두 궁의 다리와 삼도, 창덕궁 후원, 세 정문의 수문장이 빠지지 않는다', () => {
  for (const id of ['changdeok', 'gyeongbok']) {
    expect(PALACES[id].yard.bridge, id).toBeTruthy()
    expect(PALACES[id].yard.royalRoad?.length, id).toBeGreaterThan(0)
  }
  expect(PALACES.changdeok.yard.pond).toBeTruthy()
  for (const id of ['changdeok', 'gyeongbok', 'unhyeon']) {
    expect(PALACES[id].yard.gateGuards, id).toHaveLength(2)
    expect(PALACES[id].yard.birds, id).toBeTruthy()
  }
  for (const id of ['gyeongbok', 'unhyeon']) expect(PALACES[id].yard.smokeSources, id).toHaveLength(1)
})

for (const def of Object.values(PALACES)) describe(`${def.id} 새 마당 요소 자리`, () => {
  it('전체 둘레가 땅 안에 있고 방 바닥 및 스폰 여유를 침범하지 않는다', () => {
    for (const b of footprints(def.yard ?? {})) {
      expect(b.w, b.name).toBeGreaterThan(0)
      expect(b.d, b.name).toBeGreaterThan(0)
      expect(Math.abs(b.x) + b.w / 2, b.name).toBeLessThan(def.ground.w / 2)
      expect(Math.abs(b.z) + b.d / 2, b.name).toBeLessThan(def.ground.d / 2)
      for (const r of def.rooms) {
        const overlaps = Math.abs(b.x - r.x) < (b.w + r.w * ROOM_SHRINK) / 2 &&
          Math.abs(b.z - r.z) < (b.d + r.d * ROOM_SHRINK) / 2
        expect(overlaps, `${b.name} / ${r.id}`).toBe(false)
      }
      const dx = Math.max(Math.abs(b.x - def.spawn.x) - b.w / 2, 0)
      const dz = Math.max(Math.abs(b.z - def.spawn.z) - b.d / 2, 0)
      expect(Math.hypot(dx, dz), b.name).toBeGreaterThanOrEqual(1.5 - 1e-6)
    }
  })
})

it('다리는 축을 가로지르는 물길을 덮고 수문장은 문 옆을 지킨다', () => {
  for (const id of ['changdeok', 'gyeongbok', 'unhyeon']) {
    const def = PALACES[id], gate = def.rooms.find(r => r.gate)
    for (const g of def.yard.gateGuards ?? []) {
      expect(Math.abs(g.x - gate.x) - g.w / 2).toBeGreaterThan(gate.w * ROOM_SHRINK / 2)
      expect(g.z).toBe(gate.z)
    }
    const b = def.yard.bridge
    if (!b) continue
    expect(b.x).toBe(0)
    expect(b.w).toBeGreaterThan(3)
    expect(b.d).toBeGreaterThan(b.streamD)
    expect(b.z + b.d / 2).toBeLessThan(gate.z - gate.d * ROOM_SHRINK / 2)
  }
})
