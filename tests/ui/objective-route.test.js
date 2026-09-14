import { it, expect } from 'vitest'
import { objectiveRoute } from '../../src/systems/route.js'
import { PALACES, roomAt } from '../../src/data/palaces.js'
import { createState } from '../../src/core/state.js'
import { step, axisToward } from '../../src/systems/movement.js'
import { ACTS } from '../../src/data/acts.js'

// 태블릿: 여정 판을 누르면 나가는 방까지 실제로 걸어 들어갈 수 있어야 한다 — 모든 낮의 나가는 방을 걸어 본다.
it('모든 걷는 낮에서, 스폰 자리부터 여정의 방까지 경로를 따라 걸어 들어간다', () => {
  for (const act of ACTS) {
    let palace = act.palace
    for (const b of act.beats) {
      if (b.palace) palace = b.palace
      if (b.kind !== 'explore' || !b.exit?.room) continue
      const def = PALACES[palace]
      const pos = { x: def.spawn.x, y: 0, z: def.spawn.z }
      const route = objectiveRoute(def, b.exit.room, pos, 'A')
      let target = route.shift(), s = { ...createState(), palace, control: 'A' }
      for (let i = 0; i < 20000 && target; i++) {
        const a = axisToward(pos.x, pos.z, target)
        if (a.x === 0 && a.z === 0) { target = route.shift(); continue }
        s = step({ player: { position: pos } }, { axis: () => a, running: () => false }, s, 16)
      }
      expect(roomAt(def, pos.x, pos.z)?.id, `${act.id}/${b.id} → ${b.exit.room}`).toBe(b.exit.room)
    }
  }
})

it('이미 그 방 안이면 걸을 곳이 없다', () => {
  expect(objectiveRoute(PALACES.changdeok, 'injeongjeon', { x: 0, z: 12 })).toEqual([])
})
