import { it, expect } from 'vitest'
import { objectiveRoute } from '../../src/systems/route.js'
import { PALACES, roomAt } from '../../src/data/palaces.js'
import { createState } from '../../src/core/state.js'
import { step, axisToward } from '../../src/systems/movement.js'
import { ACTS } from '../../src/data/acts.js'
import { applyBeat, enterAct } from '../../src/systems/scenario.js'

// 촉박 장면도 태블릿에서 붉은 판을 누르면 목적지로 달아난다(2026-09-15) — 시간 안에 닿는지까지 잰다.
it('모든 촉박 장면에서 시작 방부터 목적지 방까지 길을 따라 달려 제한 시간 안에 닿는다', () => {
  let n = 0
  for (const [ai, act] of ACTS.entries()) {
    let s = enterAct(createState(), act, ai)
    for (const b of act.beats) {
      s = applyBeat(s, b)
      if (b.kind !== 'rush') continue
      const def = PALACES[s.palace]
      const start = def.rooms.find(r => r.id === b.spawnRoom)
      const pos = { x: start.x, y: 0, z: start.z }
      const route = objectiveRoute(def, b.goalRoom, pos, s.control)
      let target = route.shift(), st = { ...s }, ms = 0
      // 실제 판정(session.tick)은 목적지 방에 들어서는 순간 끝난다 — 방 한가운데까지 갈 필요는 없다.
      while (target && ms < b.totalMs && roomAt(def, pos.x, pos.z)?.id !== b.goalRoom) {
        const a = axisToward(pos.x, pos.z, target)
        if (a.x === 0 && a.z === 0) { target = route.shift(); continue }
        st = step({ player: { position: pos } }, { axis: () => a, running: () => true }, st, 16)
        ms += 16
      }
      expect(roomAt(def, pos.x, pos.z)?.id, `${act.id}/${b.id}`).toBe(b.goalRoom)
      expect(ms, `${act.id}/${b.id} 걸린 시간`).toBeLessThan(b.totalMs)
      n++
    }
  }
  expect(n).toBe(2)   // 1873 자경전 촉박을 걷어 냈다(2026-09-26)
})
