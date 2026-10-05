import { it, expect } from 'vitest'
import { ACTS } from '../../src/data/acts.js'
import { PALACES } from '../../src/data/palaces.js'
import { roomOf, kingSpot, escortOffsets, escortSpot, PERSONAL_SPACE, processionPath, formationAll } from '../../src/systems/audience.js'
import { collides } from '../../src/data/hall-geometry.js'
import { followStep, FOLLOW_MAX_SPEED } from '../../src/systems/gait.js'

// 선생님(2026-09-15): 행렬 중 인물들이 막 흔들린다 — 한 프레임에 곁 사람 자리가 2m 넘게 튀던 것을 붙든다.
//
// 2026-10-06 — 이 시험은 예전 셈(직선으로 걷는 임금 + escortSpot)을 흉내 내고 있었다. 실제
// 행렬은 9월 말부터 **꺾인 길 위의 대열**(processionPath · formationAll)로 걷는다. 시험이 낡은
// 셈을 재고 있으면 초록불이어도 아무것도 지키지 않는다 — 실제 셈으로 다시 잰다.
it('행렬마다 곁을 걷는 사람의 자리가 이어져 움직이고 벽에 겹치지 않는다', () => {
  const FRAME = 1000 / 60, MAX = FOLLOW_MAX_SPEED * FRAME / 1000
  let palace, checked = 0
  for (const act of ACTS) {
    palace = act.palace
    for (const b of act.beats) {
      if (b.palace) palace = b.palace
      if (b.kind !== 'procession') continue
      const def = PALACES[palace]
      const from = kingSpot(roomOf(def, b.room)), to = roomOf(def, b.to)
      const path = processionPath(def, from, { x: to.x, z: to.z }, to.id, 'A')
      const offsets = escortOffsets(b)
      const FRAMES = 900          // 15초짜리 행렬
      // 대열에 든 뒤부터 잰다 — 처음에는 선 자리에서 걸어와 든다.
      const shown = new Map(formationAll(path, 0, offsets, def).map(f => [f.npc, { x: f.x, z: f.z }]))
      for (let f = 1; f <= FRAMES; f++) {
        for (const spot of formationAll(path, f / FRAMES, offsets, def)) {
          const at = shown.get(spot.npc)
          const next = followStep(at, spot, FRAME)
          expect(Math.hypot(next.x - at.x, next.z - at.z), b.id + '/' + spot.npc + ' f' + f).toBeLessThanOrEqual(MAX + 1e-9)
          expect(Math.hypot(spot.x - next.x, spot.z - next.z), b.id + '/' + spot.npc + ' f' + f + ' 대열에서 너무 뒤처짐').toBeLessThan(4)   // 좁은 데서 자리가 옆으로 바뀌는 순간의 거리까지 넣은 수다
          expect(collides(def, spot, 0.5), b.id + '/' + spot.npc + ' f' + f + ' 벽 안').toBeFalsy()
          shown.set(spot.npc, { x: next.x, z: next.z })
        }
      }
      checked++
    }
  }
  expect(checked).toBeGreaterThanOrEqual(3)     // 1막 가마 · 2막 경복궁 · 5막 끌려 나가는 길
})

// 2026-09-22 선생님 영상(운현궁 대문) — 「이동 중 사람이 겹쳐지는 문제」.
// 문간처럼 좁은 데서 옆자리가 없으면 예전 코드가 임금 자리를 그대로 돌려줘 몸이 겹쳤다.
it('좁은 문을 지날 때도 곁을 걷는 사람이 임금·서로와 겹치지 않는다', () => {
  const def = PALACES.unhyeon
  const gate = def.rooms.find(r => r.id === 'daemun')
  const beat = ACTS[0].beats.find(b => b.kind === 'procession')
  const offsets = escortOffsets(beat)
  expect(offsets.length).toBeGreaterThan(0)
  // 대문 한가운데를 지나는 동안 매 순간 검사한다
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const king = { x: gate.x, z: gate.z + 6 - t * 12 }
    const taken = [king]
    for (const e of offsets) {
      const at = escortSpot(def, king, e, 0.8, taken)
      for (const o of taken) {
        const d = Math.hypot(at.x - o.x, at.z - o.z)
        expect(d, `t=${t.toFixed(2)} ${e.npc}`).toBeGreaterThanOrEqual(PERSONAL_SPACE - 1e-6)
      }
      taken.push(at)
    }
  }
})
