import { it, expect } from 'vitest'
import { objectiveRoute } from '../../src/systems/route.js'
import { PALACES, roomAt } from '../../src/data/palaces.js'
import { createState } from '../../src/core/state.js'
import { step, axisToward } from '../../src/systems/movement.js'
import { reachedPoint } from '../../src/systems/rush-scene.js'
import { ACTS } from '../../src/data/acts.js'
import { applyBeat, enterAct } from '../../src/systems/scenario.js'

// 길을 아는 학생이 달리면 제한 시간 안에 닿는가 — 닿을 수 없는 판을 「다시」로 되풀이시키지 않는다.
// (붉은 판을 누르면 달아나 주던 것은 2026-10-06 에 걷어 냈다. 이 시험은 길의 길이만 잰다.)
it('모든 촉박 장면에서 시작 방부터 목적지까지 달려 제한 시간 안에 닿는다 — 시간이 넉넉히 남는다', () => {
  let n = 0
  for (const [ai, act] of ACTS.entries()) {
    let s = enterAct(createState(), act, ai)
    for (const b of act.beats) {
      s = applyBeat(s, b)
      if (b.kind !== 'rush') continue
      const def = PALACES[s.palace]
      const start = def.rooms.find(r => r.id === b.spawnRoom)
      const pos = { x: start.x, y: 0, z: start.z }
      // 목적지가 방이면 그 방으로, 담의 한 자리(후원 뒷문)면 그 점으로 길을 낸다.
      const route = objectiveRoute(def, b.goalRoom ?? null, pos, s.control, b.goalPoint ?? undefined)
      const arrived = () => b.goalPoint ? reachedPoint(b.goalPoint, pos) : roomAt(def, pos.x, pos.z)?.id === b.goalRoom
      let target = route.shift(), st = { ...s }, ms = 0
      while (target && ms < b.totalMs && !arrived()) {
        const a = axisToward(pos.x, pos.z, target)
        if (a.x === 0 && a.z === 0) { target = route.shift(); continue }
        st = step({ player: { position: pos } }, { axis: () => a, running: () => true }, st, 16)
        ms += 16
      }
      expect(arrived(), `${act.id}/${b.id} 에 닿지 못했다 (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})`).toBe(true)
      // 길을 알면 절반도 안 걸린다 — 남는 시간이 찾는 데 쓰인다.
      expect(ms, `${act.id}/${b.id} 걸린 시간`).toBeLessThan(b.totalMs * 0.6)
      n++
    }
  }
  expect(n).toBe(2)   // 1882 난군의 밤 · 1884 정변 사흘째 밤
})
