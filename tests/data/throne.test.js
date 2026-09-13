import { describe, it, expect } from 'vitest'
import { PALACES } from '../../src/data/palaces.js'
import { NPCS } from '../../src/data/npcs.js'
import { THRONE_FROM_BACK, THRONE_DEPTH, THRONE_WIDTH } from '../../src/render/palace.js'

// 어전회의가 열리는 방에는 어좌와 일월오봉도가 선다(render/palace.js buildThrone).
// 그 자리에 신하가 서면 **임금의 자리를 신하가 밟고 있는 그림**이 된다.
// 실제로 났다: 경복궁 사정전에서 신헌(z=-18)이 어좌(z=-18.2) 위에 올라서 있었다.
// 좌표가 우연히 안 겹치는 것에 기대지 않고, 겹치면 우는 검사를 둔다.
//
// buildPalace 는 방을 0.72 배로 줄여 지은다 — 그 셈을 여기서도 그대로 쓴다.
const SHRINK = 0.72

// 딱 붙어 있지 않기만 하면 되는 게 아니다 — 0.25 만 떨어져 있으면 화면에서는
// 여전히 어좌를 밟고 선 것으로 보인다(경복궁 사정전에서 실제로 그랬다).
// 사람 어깨너비만큼(0.8) 여유를 두고 잰다.
const CLEAR = 0.8

function throneBox(room) {
  const d = room.d * SHRINK
  const zc = room.z - d / 2 + THRONE_FROM_BACK
  return {
    x0: room.x - THRONE_WIDTH / 2 - CLEAR, x1: room.x + THRONE_WIDTH / 2 + CLEAR,
    z0: zc - THRONE_DEPTH / 2 - CLEAR, z1: zc + THRONE_DEPTH / 2 + CLEAR,
  }
}

describe('어좌 위에는 아무도 서지 않는다', () => {
  const withCouncil = Object.values(PALACES).filter(p => p.councilRoom)

  it('궁마다 어전회의 방이 실제로 방 목록에 있다', () => {
    expect(withCouncil.length).toBeGreaterThan(0)
    for (const p of withCouncil) {
      expect(p.rooms.some(r => r.id === p.councilRoom), `${p.id} 의 ${p.councilRoom}`).toBe(true)
    }
  })

  it('어느 궁에서도 신하가 어좌 자리에 서 있지 않다', () => {
    for (const p of withCouncil) {
      const room = p.rooms.find(r => r.id === p.councilRoom)
      const b = throneBox(room)
      for (const n of NPCS.filter(n => n.palace === p.id)) {
        const on = n.x >= b.x0 && n.x <= b.x1 && n.z >= b.z0 && n.z <= b.z1
        expect(on, `${p.id} 의 ${n.name}(${n.x},${n.z})가 어좌 자리` +
          `(x ${b.x0.toFixed(1)}~${b.x1.toFixed(1)}, z ${b.z0.toFixed(1)}~${b.z1.toFixed(1)})에 서 있다`).toBe(false)
      }
    }
  })

  it('사료를 줍는 지점도 어좌 위에 있지 않다 — 어좌에 올라가 줍게 된다', () => {
    for (const p of withCouncil) {
      const room = p.rooms.find(r => r.id === p.councilRoom)
      const b = throneBox(room)
      for (const pk of p.pickups ?? []) {
        const on = pk.x >= b.x0 && pk.x <= b.x1 && pk.z >= b.z0 && pk.z <= b.z1
        expect(on, `${p.id} 의 ${pk.cardId}(${pk.x},${pk.z})가 어좌 자리에 있다`).toBe(false)
      }
    }
  })
})
