import { describe, it, expect } from 'vitest'
import { PALACES } from '../../src/data/palaces.js'
import { BODY_RADIUS, collides, safePosition } from '../../src/data/hall-geometry.js'
import { step } from '../../src/systems/movement.js'
import { objectiveRoute } from '../../src/systems/route.js'
import { standAside, STAND_ASIDE } from '../../src/systems/palace-walkers.js'

function walk(def, from, axis, dt = 1000) {
  const ctx = { player: { position: { ...from } } }
  step(ctx, { axis: () => axis, running: () => true },
    { palace: def.id, control: 'A', room: null }, dt)
  return ctx.player.position
}

describe('궁궐 물가의 실제 이동 경계', () => {
  const def = PALACES.changdeok
  it.each([
    [{ x: 18, z: -37 }, { x: 1, z: 0 }, 'x', 20, -1],
    [{ x: 34, z: -37 }, { x: -1, z: 0 }, 'x', 32, 1],
    [{ x: 29, z: -44 }, { x: 0, z: 1 }, 'z', -42, -1],
    [{ x: 29, z: -30 }, { x: 0, z: -1 }, 'z', -32, 1],
  ])('연못 네 방향에서 달려도 물가에서 멈춘다 (%j)', (from, axis, coordinate, edge, side) => {
    const p = walk(def, from, axis)
    expect((p[coordinate] - edge) * side).toBeGreaterThanOrEqual(BODY_RADIUS)
    expect(collides(def, p)).toBeNull()
  })

  it('물 위의 옛 위치는 뭍으로 복구하고 정자 마루에는 걸어 들어간다', () => {
    const p = { x: 26, z: -37 }
    expect(collides(def, p)).toBeTruthy()
    expect(collides(def, safePosition(def, p))).toBeNull()
    const pavilion = walk(def, { x: 26, z: -30 }, { x: 0, z: -1 }, 140)
    expect(pavilion.z).toBeLessThan(-32)
    expect(collides(def, pavilion)).toBeNull()
  })

  it('물가의 궁인도 임금에게 비켜설 때 물로 들어가지 않는다', () => {
    const at = { x: 26, z: -42.65, yaw: 0 }, king = { x: 26, z: -43 }
    const shown = standAside(at, king, STAND_ASIDE, def)
    expect(Math.hypot(shown.x - king.x, shown.z - king.z)).toBeCloseTo(STAND_ASIDE)
    expect(collides(def, shown, .6)).toBeNull()
  })

  for (const palace of Object.values(PALACES).filter(p => p.yard?.bridge)) {
    const b = palace.yard.bridge
    it(`${palace.id}: 좁은 물길도 큰 프레임에 뛰어넘지 못한다`, () => {
      for (const side of [-1, 1]) {
        expect(collides(palace, { x: b.x + side * (b.w / 2 + 5), z: b.z })?.id).toBe('water:stream')
      }
      const p = walk(palace, { x: b.x + b.w / 2 + 5, z: b.z - b.streamD / 2 - 1.5 }, { x: 0, z: 1 })
      expect(p.z).toBeLessThanOrEqual(b.z - b.streamD / 2 - BODY_RADIUS)
      expect(collides(palace, p)).toBeNull()
    })
    it(`${palace.id}: 다리 중앙으로 양방향 통행하고 옆 물길로는 내려가지 않는다`, () => {
      for (const side of [-1, 1]) {
        const p = walk(palace, { x: b.x, z: b.z + side * (b.streamD / 2 + .8) }, { x: 0, z: -side }, 250)
        expect((p.z - b.z) * side).toBeLessThan(-b.streamD / 2)
      }
      const p = walk(palace, { x: b.x, z: b.z }, { x: 1, z: 0 })
      expect(p.x).toBeLessThanOrEqual(b.x + b.w / 2 - BODY_RADIUS)
    })
  }

  it('모든 시작 자리와 마당 소품은 물 밖에 있고 후원 뒷문까지 뭍으로 갈 수 있다', () => {
    for (const palace of Object.values(PALACES)) {
      expect(collides(palace, palace.spawn), palace.id).toBeNull()
      for (const p of palace.yard?.props ?? []) {
        expect(collides(palace, p)?.id?.startsWith('water:'), `${palace.id}/${p.id}`).not.toBe(true)
      }
    }
    const route = objectiveRoute(def, null, def.spawn, 'A', { x: 30, z: -45 })
    expect(route.length).toBeGreaterThan(1)
    let from = def.spawn
    for (const to of route) {
      const n = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / .1)
      for (let i = 0; i <= n; i++) {
        const p = { x: from.x + (to.x - from.x) * i / n, z: from.z + (to.z - from.z) * i / n }
        expect(collides(def, p)?.id?.startsWith('water:')).not.toBe(true)
      }
      from = to
    }
  })
})
