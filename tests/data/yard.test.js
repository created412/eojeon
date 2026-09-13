import { describe, it, expect } from 'vitest'
import { PALACES, isPassable } from '../../src/data/palaces.js'
import { ROOM_SHRINK } from '../../src/render/palace.js'

// 마당의 것들(나무·회랑·품계석)은 장식이지만, 잘못 놓이면 장식이 아니라 결함이다:
// 집 안에 나무가 서고, 사료 지점 위에 나무가 서고, 걷는 길을 회랑이 막는다.
// 걸음 판정(systems/movement.js)은 방만 보므로 이런 것을 절대 막아 주지 않는다.

const CLEAR = 2.5      // 처마 밖으로 이만큼은 떨어져야 집에 박힌 것으로 안 보인다
const PICKUP_CLEAR = 4 // 문서 지점 위에 나무가 서면 표지가 가려진다

function footprint(room) {
  return { hx: (room.w * ROOM_SHRINK) / 2, hz: (room.d * ROOM_SHRINK) / 2 }
}

const yards = Object.values(PALACES).filter(p => p.yard)

describe('마당 — 두 궁을 서로 다르게 보이게 하는 것', () => {
  it('창덕궁에는 나무가 있고, 경복궁에는 회랑과 품계석이 있다', () => {
    expect((PALACES.changdeok.yard?.trees ?? []).length).toBeGreaterThan(5)
    expect(PALACES.changdeok.yard?.colonnade).toBeUndefined()
    expect(PALACES.gyeongbok.yard?.colonnade).toBeTruthy()
    expect(PALACES.gyeongbok.yard?.rankStones).toBeTruthy()
    expect(PALACES.gyeongbok.yard?.trees).toBeUndefined()
  })

  for (const def of yards) {
    const trees = def.yard.trees ?? []

    it(`${def.id} — 나무가 담 안에 있다`, () => {
      for (const [x, z] of trees) {
        expect(Math.abs(x), `(${x},${z})`).toBeLessThan(def.ground.w / 2 - 1)
        expect(Math.abs(z), `(${x},${z})`).toBeLessThan(def.ground.d / 2 - 1)
      }
    })

    it(`${def.id} — 나무가 집 안에 서 있지 않다`, () => {
      for (const [x, z] of trees) {
        for (const r of def.rooms) {
          const { hx, hz } = footprint(r)
          const inside = Math.abs(x - r.x) < hx + CLEAR && Math.abs(z - r.z) < hz + CLEAR
          expect(inside, `${r.id} 안에 나무 (${x},${z})`).toBe(false)
        }
      }
    })

    it(`${def.id} — 나무가 사료 지점을 덮지 않는다`, () => {
      for (const [x, z] of trees) {
        for (const p of def.pickups ?? []) {
          const d = Math.hypot(x - p.x, z - p.z)
          expect(d, `${p.cardId} 위에 나무 (${x},${z})`).toBeGreaterThan(PICKUP_CLEAR)
        }
      }
    })

    it(`${def.id} — 나무끼리 겹치지 않는다`, () => {
      for (let i = 0; i < trees.length; i++) {
        for (let j = i + 1; j < trees.length; j++) {
          const d = Math.hypot(trees[i][0] - trees[j][0], trees[i][1] - trees[j][1])
          expect(d, `${trees[i]} 와 ${trees[j]}`).toBeGreaterThan(5)
        }
      }
    })
  }

  it('회랑은 걷는 길을 비워 둔다 — 가운데 축이 뚫려 있다', () => {
    const c = PALACES.gyeongbok.yard.colonnade
    // 회랑은 양옆에만 선다. 가운데(축에서 halfW 안쪽)는 걸어 지나갈 수 있어야 한다.
    expect(c.halfW).toBeGreaterThan(8)
    const spawn = PALACES.gyeongbok.spawn
    expect(Math.abs(spawn.x)).toBeLessThan(c.halfW - 4)
  })

  it('회랑과 품계석이 가리키는 방이 실재하고 지날 수 있다', () => {
    for (const key of ['colonnade', 'rankStones']) {
      const spec = PALACES.gyeongbok.yard[key]
      const room = PALACES.gyeongbok.rooms.find(r => r.id === spec.room)
      expect(room, `${key} 의 ${spec.room}`).toBeTruthy()
      expect(isPassable(room)).toBe(true)
    }
  })

  it('품계석 두 줄 사이로 임금이 지나갈 수 있다 — 축 위에 돌이 없다', () => {
    const rs = PALACES.gyeongbok.yard.rankStones
    expect(rs.halfW).toBeGreaterThan(2)
    expect(rs.pairs).toBeGreaterThan(2)
  })

  it('회랑과 품계석이 두 집 사이의 마당에만 선다 — 근정전도 광화문도 파고들지 않는다', () => {
    const rooms = PALACES.gyeongbok.rooms
    const front = (id) => {
      const r = rooms.find(x => x.id === id)
      return { near: r.z + footprint(r).hz, far: r.z - footprint(r).hz }
    }
    const geun = front('geunjeongjeon')
    const gwang = front('gwanghwamun')
    for (const key of ['colonnade', 'rankStones']) {
      const spec = PALACES.gyeongbok.yard[key]
      expect(spec.z0, `${key} 가 근정전을 파고든다`).toBeGreaterThan(geun.near)
      expect(spec.z1, `${key} 가 광화문을 파고든다`).toBeLessThan(gwang.far)
      expect(spec.z1).toBeGreaterThan(spec.z0)
    }
  })
})
