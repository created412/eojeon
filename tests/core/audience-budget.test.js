import { describe, it, expect } from 'vitest'
import { DAY_UNITS } from '../../src/core/clock.js'
import { PALACES, baseOf, isPassable } from '../../src/data/palaces.js'
import { isRoomOpen } from '../../src/core/control.js'
import { createState } from '../../src/core/state.js'
import { SOURCES, sourceById } from '../../src/data/sources.js'
import { ACTS } from '../../src/data/acts.js'
import { beatsOf, enterAct, applyBeat, grantedIdsOf } from '../../src/systems/scenario.js'
import { npcsAt, npcCardIds, NPCS } from '../../src/data/npcs.js'
import { stopsOfAct } from '../../src/systems/outing.js'

// 이 파일은 tests/core/place-cost.test.js 와 tests/core/day-budget.test.js 를 대신한다.
// 그 두 파일은 「방마다 값이 있고 임금이 걸어가며 해를 쓴다」는 옛 모델을 지키고 있었다.
// 선생님이 그 모델을 끝냈다 — 이제 값은 자리가 아니라 **사람**이다(core/clock.js).
//
// 지켜야 할 것은 그대로다:
//   ① 부족은 참이다 — 그날 만날 수 있는 사람이 들을 수 있는 수보다 많다.
//   ② 어느 사료든 제 막 안에서 실제로 손에 들어올 길이 하나는 있다.
//   ③ 바닥에 임자 없이 놓인 문서가 없다 — 문서에는 그것을 들고 있는 사람이 있다.

// 그 낮에 임금이 만날 수 있는 사람. 방이 열려 있어야 하고(조작권), 그 사람이 든
// 문서가 아직 오지 않은 막의 것이면 안 된다.
function hearableAt(state, actIndex) {
  const def = PALACES[state.palace]
  const open = new Set(def.rooms.filter(r => isRoomOpen(state.control, r) && isPassable(r)).map(r => r.id))
  const roomOfPoint = (x, z) => def.rooms.find(r => Math.abs(x - r.x) <= r.w / 2 && Math.abs(z - r.z) <= r.d / 2)
  return npcsAt(baseOf, state.palace, actIndex).filter(n => {
    const ids = npcCardIds(n)
    if (ids.length === 0) return false
    if (!ids.every(id => (sourceById(id)?.act ?? 99) <= actIndex + 1)) return false
    // 그 사람이 선 방이 닫혀 있으면 못 만난다(불탄 궁의 봉인된 방이 그렇다)
    const room = roomOfPoint(n.x, n.z)
    if (!room) return true
    return open.has(room.id)
  })
}

function exploreDays() {
  const out = []
  for (const [i, act] of ACTS.entries()) {
    let s = enterAct(createState(), act, i)
    for (const b of beatsOf(act)) {
      s = applyBeat(s, b)
      if (b.kind !== 'explore' || b.free) continue   // free — 문서 없는 낮(운현궁)은 고를 것이 없는 게 내용이다
      out.push({
        key: `${act.id}/${b.id}`, act, actIndex: i, beat: b,
        budget: s.dayLeft,
        people: hearableAt(s, i),
        stops: (b.stops ?? []).length,
      })
    }
  }
  return out
}

const DAYS = exploreDays()

describe('바닥에 임자 없는 문서가 없다', () => {
  it('모든 사료 지점에 그것을 들고 있는 사람이 서 있다', () => {
    const handled = new Set(NPCS.flatMap(npcCardIds))
    for (const [id, def] of Object.entries(PALACES)) {
      if (baseOf(id) !== id) continue          // 화재 변형은 같은 지점을 물려받는다
      for (const p of def.pickups ?? []) {
        expect(handled.has(p.cardId),
          `${id}/${p.placeId} 의 ${p.cardId} 를 아무도 들고 있지 않다 — 바닥에서 줍게 된다`).toBe(true)
      }
    }
  })

  it('문서를 건네는 사람은 그 문서의 자리에 정확히 서 있다', () => {
    for (const n of NPCS) {
      const ids = npcCardIds(n)
      if (ids.length !== 1) continue           // 뭉치를 건네는 신하는 따로 본다
      const def = PALACES[n.palace]
      const spot = (def.pickups ?? []).find(p => p.cardId === ids[0])
      expect(spot, `${n.id} 가 건네는 ${ids[0]} 의 자리가 ${n.palace} 에 없다`).toBeTruthy()
      expect([spot.x, spot.z], `${n.id}`).toEqual([n.x, n.z])
    }
  })
})

describe('부족은 참이다 — 그날 다 들을 수는 없다', () => {
  it('탐색하는 낮이 실제로 있다 — 이 검사가 헛돌지 않는다', () => {
    expect(DAYS.length).toBeGreaterThan(3)
  })

  // 들을 사람이 아예 없는 낮(불탄 궁을 빠져나가는 걸음 따위)은 고를 것이 없는 것이
  // 그 장면의 내용이다 — 그런 날은 이름을 적어 둔다.
  const NO_CHOICE_DAYS = {
    'chinjeong/walk-out': 0,        // 불탄 경복궁을 걸어 나가는 두 칸 — 들을 사람이 없다
    'gapsin/gapsin-day': 1,         // 경우궁 — 좁은 집에 개화파 관원 하나
  }

  it('만날 수 있는 사람이 들을 수 있는 수보다 많다', () => {
    for (const d of DAYS) {
      const offered = d.people.length + d.stops
      if (d.key in NO_CHOICE_DAYS) {
        expect(offered, `${d.key} — 고를 것이 없는 자리다. 값이 달라졌으면 다시 보라`)
          .toBe(NO_CHOICE_DAYS[d.key])
        continue
      }
      expect(offered, `${d.key} · 예산 ${d.budget} · 만날 사람 ${offered} [${d.people.map(p => p.id).join(',')}]`)
        .toBeGreaterThan(d.budget)
    }
  })

  it('고를 것이 없는 날은 손에 꼽을 만큼만 있다 — 목록이 조용히 자라지 않게', () => {
    expect(Object.keys(NO_CHOICE_DAYS).length).toBeLessThanOrEqual(3)
    const keys = DAYS.map(d => d.key)
    for (const k of Object.keys(NO_CHOICE_DAYS)) expect(keys, k).toContain(k)
  })

  it('그래도 한 사람은 들을 수 있다 — 예산이 0 인 낮은 없다', () => {
    for (const d of DAYS) expect(d.budget, d.key).toBeGreaterThanOrEqual(1)
  })
})

describe('어느 사료든 제 막 안에서 손에 들어온다', () => {
  // 통로 셋: 그 막의 낮에 만나는 사람 · 비트가 그냥 쥐여 주는 것(알현·친필·나들이) · 궁 밖 나들이
  function channelsOfAct(act, i) {
    const out = new Map()
    let s = enterAct(createState(), act, i)
    for (const b of beatsOf(act)) {
      s = applyBeat(s, b)
      for (const id of grantedIdsOf(b)) out.set(id, `지급(${b.id})`)
      for (const st of b.stops ?? []) {
        for (const id of grantedIdsOf(st.beat)) out.set(id, `나들이(${st.id})`)
      }
      if (b.kind !== 'explore') continue
      for (const n of hearableAt(s, i)) {
        for (const id of npcCardIds(n)) out.set(id, `신하(${n.id})`)
      }
    }
    return out
  }

  const ALL = new Map()
  for (const [i, act] of ACTS.entries()) {
    for (const [id, via] of channelsOfAct(act, i)) {
      if (!ALL.has(id)) ALL.set(id, { via, act: i + 1 })
    }
  }

  it('SOURCES 의 모든 카드에 통로가 하나라도 있다', () => {
    for (const c of SOURCES) {
      expect(ALL.has(c.id), `${c.id}(${c.title}) — 게임 어디에도 이 문서를 건네는 자리가 없다`).toBe(true)
    }
  })

  it('통로가 제 카드의 막보다 이르게 열리지 않는다', () => {
    for (const [id, { via, act }] of ALL) {
      expect(sourceById(id).act, `${id} 가 ${via} 에서 이미 손에 들어온다`).toBeLessThanOrEqual(act)
    }
  })

  // 신헌의 넉 장 — 한 번의 대화로 받는다. 예전에는 카드마다 값을 매겨 여덟 칸을
  // 불렀고, 하루 여섯 칸으로는 어떤 학생도 받을 수 없었다(판정 R102).
  // 2026-09-13 역사 순서 정리 — 조약문은 낮에 고르는 문서가 아니라, 훈령 뒤 신헌의 알현에서
  // 모두가 받는다. 서계는 그보다 먼저(1873) 역관의 알현에서 받는다.
  it('서계를 먼저, 조약문 세 장은 훈령 뒤 신헌의 알현에서 한꺼번에 받는다', () => {
    const beats = beatsOf(ACTS[2])
    const at = id => beats.findIndex(b => b.id === id)
    const grants = id => beats[at(id)].visitors.flatMap(v => v.grantCards ?? [])
    expect(grants('seogye-audience')).toEqual(['seogye'])
    expect(grants('sinheon-returns').sort()).toEqual(['ganghwa1', 'ganghwa10', 'ganghwa7'])
    expect(at('seogye-audience')).toBeLessThan(at('unyo-dispatch'))
    expect(at('orders-sinheon')).toBeLessThan(at('sinheon-returns'))
    expect(at('sinheon-returns')).toBeLessThan(at('council-treaty'))
    expect(at('council-treaty')).toBeLessThan(at('joil-trade-note'))
  })
})

describe('나들이', () => {
  it('나들이 지점이 그 비트의 나가는 방과 겹치지 않는다 — E 가 서로를 덮는다', () => {
    for (const act of ACTS) {
      for (const b of beatsOf(act)) {
        if (b.kind !== 'explore' || !b.exit) continue
        for (const st of b.stops ?? []) {
          expect(st.room, `${act.id}/${b.id} 의 나들이 ${st.id}`).not.toBe(b.exit.room)
        }
      }
    }
  })

  it('모든 나들이가 어느 낮에 붙어 있는지 밝힌다', () => {
    for (const act of ACTS) {
      for (const st of stopsOfAct(act)) {
        expect(st.id, `${act.id}`).toBeTruthy()
        expect(st.room, `${act.id}/${st.id}`).toBeTruthy()
      }
    }
  })
})

describe('방 id', () => {
  it('궁끼리 방 id 가 겹치지 않는다', () => {
    const seen = new Map()
    for (const [id, def] of Object.entries(PALACES)) {
      if (baseOf(id) !== id) continue
      for (const r of def.rooms) {
        expect(seen.has(r.id), `${r.id} 가 ${seen.get(r.id)} 와 ${def.id} 에 둘 다 있다`).toBe(false)
        seen.set(r.id, def.id)
      }
    }
  })

  it('하루의 기본값은 DAY_UNITS 다', () => {
    expect(DAY_UNITS).toBeGreaterThan(0)
    expect(createState().dayLeft).toBe(DAY_UNITS)
  })
})
