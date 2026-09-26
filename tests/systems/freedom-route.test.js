import { it, expect } from 'vitest'
import { ACTS } from '../../src/data/acts.js'
import { PALACES, roomAt } from '../../src/data/palaces.js'
import { enterAct, applyBeat, yearAtBeat } from '../../src/systems/scenario.js'
import { createState } from '../../src/core/state.js'
import { hubOptions, HUB_REPORTS } from '../../src/systems/freedom.js'
import { objectiveRoute } from '../../src/systems/route.js'
import { step, axisToward } from '../../src/systems/movement.js'

it('모든 거점의 열린 선택지까지 실제 조작권으로 스폰에서 걸어간다', () => {
  let checked = 0
  for (const [ai, act] of ACTS.entries()) {
    let state = enterAct(createState(), act, ai)
    for (const [bi, beat] of act.beats.entries()) {
      state = { ...applyBeat(state, beat), beatIndex: bi }
      if (beat.kind !== 'explore') continue
      const def = PALACES[state.palace]
      for (const option of hubOptions(state, act).filter(o => !o.disabled)) {
        const pos = { ...def.spawn, y: 0 }
        const route = objectiveRoute(def, option.room, pos, state.control, option.point)
        expect(route.length, `${act.id}/${beat.id}/${option.id}`).toBeGreaterThan(0)
        let target = route.shift(), walking = { ...state }
        for (let i = 0; i < 20000 && target; i++) {
          const a = axisToward(pos.x, pos.z, target)
          if (a.x === 0 && a.z === 0) { target = route.shift(); continue }
          walking = step({ player: { position: pos } }, { axis: () => a, running: () => false }, walking, 16)
        }
        expect(Math.hypot(pos.x - option.point.x, pos.z - option.point.z), `${act.id}/${beat.id}/${option.id}`).toBeLessThan(6)
        if (option.room) expect(roomAt(def, pos.x, pos.z)?.id, option.id).toBe(option.room)
        checked++
      }
    }
  }
  expect(checked).toBe(24)
})

it('거점으로 옮기는 보고에는 역사 전환 효과가 없고 해·궁 경계를 넘지 않는다', () => {
  for (const report of HUB_REPORTS) {
    const act = ACTS.find(a => a.id === report.act)
    const bi = act.beats.findIndex(b => b.id === report.beat)
    const hi = act.beats.findIndex(b => b.id === report.hub)
    const beat = act.beats[bi]
    expect(['audience', 'note']).toContain(beat.kind)
    for (const key of ['palace', 'control', 'dayUnits', 'year', 'flag', 'whenFlag', 'unlessFlag', 'veil', 'depart']) {
      expect(beat[key], `${report.beat}.${key}`).toBeUndefined()
    }
    if (report.recollectionYear) {
      expect(report.recollectionYear).toBeLessThan(yearAtBeat(act, hi))
      expect(bi).toBeLessThan(hi)
    } else expect(Math.abs(bi - hi)).toBe(1)
  }
  const act = ACTS[2], hub = act.beats.findIndex(b => b.id === 'day-1875')
  expect(yearAtBeat(act, hub)).toBe(1876)
  expect(yearAtBeat(act, hub + 2)).toBe(1876)
  expect(hubOptions({ ...createState(), actIndex: 2, palace: 'gyeongbok', control: 'A', beatIndex: 4 }, act).map(o => o.id))
    .not.toContain('npc:sugun')
})
