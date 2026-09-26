import { describe, it, expect } from 'vitest'
import { exitBlock } from '../../src/systems/freedom.js'
import { PALACES, baseOf, isPassable } from '../../src/data/palaces.js'
import { isRoomOpen } from '../../src/core/control.js'
import { createState } from '../../src/core/state.js'
import { SOURCES, sourceById } from '../../src/data/sources.js'
import { ACTS } from '../../src/data/acts.js'
import { beatsOf, enterAct, applyBeat, grantedIdsOf } from '../../src/systems/scenario.js'
import { npcsAt, npcCardIds, NPCS } from '../../src/data/npcs.js'
import { stopsOfAct } from '../../src/systems/outing.js'

// 2026-09-26 — 이 파일의 첫째 기둥이 무너졌다.
//
// 오래도록 이 게임의 규칙은 「부족은 참이다 — 그날 다 들을 수는 없다」였다. 그런데
// 선생님이 화면을 찍어 보내셨다: 해 칸이 떨어져 **1876년 최익현의 상소를 못 들은 채**
// 3막이 끝나 있었다. 「해 칸 없애버리고 나머지 미션 수행하지 못하면 못넘어가게 해야해.」
//
// 그래서 규칙이 뒤집혔다. 이제 지켜야 할 것은 이렇다:
//   ① **넘침이 참이다** — 그날 만날 수 있는 사람을 다 만나야 그 하루가 끝난다.
//      값이 없으므로 못 만나는 사람도 없다(core/clock.js).
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
        state: { ...s, beatIndex: beatsOf(act).indexOf(b) },
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

describe('넘침이 참이다 — 그날 만날 사람은 다 만난다', () => {
  it('탐색하는 낮이 실제로 있다 — 이 검사가 헛돌지 않는다', () => {
    expect(DAYS.length).toBeGreaterThan(3)
  })

  it('만날 사람이 남아 있으면 그 하루를 나갈 수 없다', () => {
    // 예전에는 나가는 방에서 E 를 누르면 언제든 하루가 끝났다 — 궁에 들어서자마자
    // 나가는 방으로 걸어가 그날의 역사를 통째로 건너뛸 수 있었다(선생님 2026-09-26).
    let checked = 0
    for (const d of DAYS) {
      const block = exitBlock(d.state, d.act)
      if (d.people.length + d.stops === 0) continue   // 들을 사람이 없는 낮은 그대로 나간다
      expect(block, `${d.key} — 아무것도 안 하고 나갈 수 있다`).toBeTruthy()
      expect(block.count, d.key).toBeGreaterThan(0)
      checked++
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('남은 일에 「해 칸을 다 씀」이 다시 끼어들지 않는다', () => {
    for (const d of DAYS) {
      const block = exitBlock(d.state, d.act)
      for (const label of block?.labels ?? []) {
        expect(label, d.key).not.toContain('해 칸')
      }
    }
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

  it('하루의 예산이라는 것이 없다', () => {
    expect(createState().dayLeft).toBeUndefined()
  })
})
