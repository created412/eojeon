import { it, expect } from 'vitest'
import { ACTS } from '../../src/data/acts.js'
import { PALACES } from '../../src/data/palaces.js'
import { roomOf, kingSpot, walkAt, escortOffsets, escortSpot, PERSONAL_SPACE } from '../../src/systems/audience.js'
import { FOLLOW_STEP } from '../../src/render/scene.js'

// 선생님(2026-09-15): 행렬 중 인물들이 막 흔들린다 — 한 프레임에 곁 사람 자리가 2m 넘게 튀던 것을 붙든다.
it('행렬마다 곁을 걷는 사람의 자리가 이어져 움직이고 벽에 겹치지 않는다', () => {
  let palace
  for (const act of ACTS) {
    palace = act.palace
    for (const b of act.beats) {
      if (b.palace) palace = b.palace
      if (b.kind !== 'procession') continue
      const def = PALACES[palace]
      const from = kingSpot(roomOf(def, b.room)), to = roomOf(def, b.to)
      for (const e of escortOffsets(b)) {
        // 씬(placeNpc smooth)과 같이: 목표 자리로 한 프레임에 FOLLOW_STEP 만큼만 다가간다.
        let shown = escortSpot(def, from, e), rawJumps = 0, prevRaw = shown
        for (let f = 0; f <= 400; f++) {
          const king = walkAt(from, to, f / 400)
          const target = escortSpot(def, king, e)
          if (Math.hypot(target.x - prevRaw.x, target.z - prevRaw.z) > 1.5) rawJumps++
          prevRaw = target
          const dx = target.x - shown.x, dz = target.z - shown.z, d = Math.hypot(dx, dz), k = d > FOLLOW_STEP ? FOLLOW_STEP / d : 1
          const next = { x: shown.x + dx * k, z: shown.z + dz * k }
          expect(Math.hypot(next.x - shown.x, next.z - shown.z), `${b.id}/${e.npc} f${f}`).toBeLessThanOrEqual(FOLLOW_STEP + 1e-9)
          expect(d, `${b.id}/${e.npc} f${f} 대열에서 너무 뒤처짐`).toBeLessThan(3)
          shown = next
        }
        // 목표 자리 자체는 작은 기둥을 지날 때 한두 번 크게 바뀔 수 있다 — 화면에 보이는 걸음(shown)이 잇닿으면 된다.
        expect(rawJumps, `${b.id}/${e.npc}`).toBeLessThanOrEqual(3)
      }
    }
  }
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
