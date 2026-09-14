import { describe, it, expect } from 'vitest'
import { ACTS } from '../../src/data/acts.js'
import { PALACES } from '../../src/data/palaces.js'
import { NPCS, npcById } from '../../src/data/npcs.js'
import { SOURCES } from '../../src/data/sources.js'
import { beatsOf, grantedIdsOf } from '../../src/systems/scenario.js'
import {
  roomOf, kingSpot, besideSpot, visitorSpot, doorSpot, throneZ,
  besideIds, visitorsOf, castOf, rebukeOf, departIds, escortIds, escortOffsets,
} from '../../src/systems/audience.js'
import { PROPS } from '../../src/render/props.js'
import { THRONE_DEPTH, THRONE_WIDTH, ROOM_SHRINK } from '../../src/render/palace.js'

// 막을 걸어가며 알현 비트와 그때의 궁을 짝지어 모은다 — 궁은 앞선 비트가 바꿀 수 있다.
function audiences() {
  const out = []
  for (const [i, act] of ACTS.entries()) {
    let palace = act.palace
    for (const b of beatsOf(act)) {
      if (b.palace) palace = b.palace
      if (b.kind === 'audience') out.push({ act, actIndex: i, beat: b, palace })
    }
  }
  return out
}

const CLEAR = 0.8   // 사람 어깨너비 — tests/data/throne.test.js 와 같은 여유

describe('알현 비트 — 데이터', () => {
  it('알현 비트가 실제로 있다 — 이 파일 전체가 헛돌지 않는다', () => {
    expect(audiences().length).toBeGreaterThan(0)
  })

  for (const { act, actIndex, beat, palace } of audiences()) {
    const label = `${act.id}/${beat.id}`
    const def = PALACES[palace]
    const room = roomOf(def, beat.room ?? def.councilRoom)

    it(`${label} — 알현할 방이 그 궁에 실재한다`, () => {
      expect(room, `${palace} 에 ${beat.room} 이 없다`).toBeTruthy()
    })

    it(`${label} — 부른 사람이 모두 실재한다`, () => {
      for (const id of castOf(beat)) expect(npcById(id), id).toBeTruthy()
    })

    it(`${label} — 같은 사람을 두 번 세우지 않는다`, () => {
      const cast = castOf(beat)
      expect(new Set(cast).size).toBe(cast.length)
    })

    it(`${label} — 찾아오는 사람마다 할 말이 있다`, () => {
      const vs = visitorsOf(beat)
      expect(vs.length).toBeGreaterThan(0)
      for (const v of vs) {
        const lines = v.lines ?? npcById(v.npc)?.lines ?? []
        expect(lines.length, `${v.npc} 가 아무 말도 안 한다`).toBeGreaterThan(0)
      }
    })

    // 임금이 움직이려 할 때 아무 말도 없으면, 학생이 받는 신호는 「고장났다」다.
    // 곁에 선 사람이 있으면 그 사람의 입으로 나가고, 없으면(1876년의 임금은 혼자다)
    // 이름 없는 한 줄로 나간다 — 어느 쪽이든 말은 있어야 한다.
    it(`${label} — 걸으려 할 때 막는 말이 있다`, () => {
      const r = rebukeOf(beat)
      expect(r, '막는 말(blockLine)이 없다').toBeTruthy()
      expect(r.line.length).toBeGreaterThan(10)
      if (besideIds(beat).length) {
        expect(besideIds(beat), '곁에 선 사람이 있는데 다른 사람이 말린다').toContain(r.npcId)
      } else {
        expect(r.npcId, '곁에 아무도 없으면 말할 사람도 없다').toBe(null)
      }
    })

    // 나가는 사람은 곁에 서 있던 사람이어야 한다 — 없는 사람을 내보낼 수 없다.
    it(`${label} — 자리를 뜨는 사람은 이 장면에 있던 사람이다`, () => {
      for (const id of departIds(beat)) {
        expect(castOf(beat), `${id} 는 이 장면에 없다`).toContain(id)
      }
    })

    // 물건은 아는 것만 놓는다 — 모르는 이름은 조용히 아무것도 안 놓아 장면이 빈다.
    it(`${label} — 내려놓는 물건이 실재한다`, () => {
      for (const v of visitorsOf(beat)) {
        const prop = v.prop
        if (prop) expect(Object.keys(PROPS), `${v.npc} 의 ${prop}`).toContain(prop)
      }
    })

    it(`${label} — 건네는 문서가 실재하고, 이 막 이하의 것이다`, () => {
      for (const id of grantedIdsOf(beat)) {
        const card = SOURCES.find(c => c.id === id)
        expect(card, `${id} 가 사료 목록에 없다`).toBeTruthy()
        expect(card.act, `${id} 는 ${card.act}막 사료인데 ${actIndex + 1}막에서 건넨다`)
          .toBeLessThanOrEqual(actIndex + 1)
      }
    })

    // 같은 카드를 두 통로로 얻지 않는다 — 척화비에 적어 둔 규칙과 같다.
    it(`${label} — 건네는 문서는 어느 궁 바닥에도 놓여 있지 않다`, () => {
      const floor = new Set(
        Object.values(PALACES).flatMap(d => (d.pickups ?? []).map(p => p.cardId)))
      for (const id of grantedIdsOf(beat)) {
        expect(floor.has(id), `${id} 가 알현과 바닥 두 곳에서 들어온다`).toBe(false)
      }
    })

    it(`${label} — 임금도 신하도 방 안에 서고, 아무도 어좌를 밟지 않는다`, () => {
      const halfW = (room.w * ROOM_SHRINK) / 2
      const halfD = (room.d * ROOM_SHRINK) / 2
      const zc = throneZ(room)
      const box = {
        x0: room.x - THRONE_WIDTH / 2 - CLEAR, x1: room.x + THRONE_WIDTH / 2 + CLEAR,
        z0: zc - THRONE_DEPTH / 2 - CLEAR, z1: zc + THRONE_DEPTH / 2 + CLEAR,
      }
      const spots = [
        ['임금', kingSpot(room)],
        ...besideIds(beat).map((id, i) => [id, besideSpot(room, i)]),
        ['아뢰는 자리', visitorSpot(room)],
        ['문간', doorSpot(room)],
      ]
      for (const [who, p] of spots) {
        expect(Math.abs(p.x - room.x), `${who} 가 방 밖(x=${p.x})`).toBeLessThan(halfW)
        expect(Math.abs(p.z - room.z), `${who} 가 방 밖(z=${p.z})`).toBeLessThan(halfD)
        const onThrone = p.x >= box.x0 && p.x <= box.x1 && p.z >= box.z0 && p.z <= box.z1
        expect(onThrone, `${who} 가 어좌 위에 서 있다`).toBe(false)
      }
    })

    it(`${label} — 다음으로 넘어가는 단추의 글이 있다`, () => {
      expect((beat.exit?.label ?? '').length).toBeGreaterThan(0)
    })
  }

  // ── 행렬 ───────────────────────────────────────────────────────────────
  const processions = (() => {
    const out = []
    for (const [i, act] of ACTS.entries()) {
      let palace = act.palace
      for (const b of beatsOf(act)) {
        if (b.palace) palace = b.palace
        if (b.kind === 'procession') out.push({ act, actIndex: i, beat: b, palace })
      }
    }
    return out
  })()

  it('행렬 비트가 실제로 있다 — 궁을 옮기는 일이 글 한 장으로 끝나지 않는다', () => {
    expect(processions.length).toBeGreaterThan(0)
  })

  for (const { act, beat, palace } of processions) {
    const label = `${act.id}/${beat.id}`
    const def = PALACES[palace]

    it(`${label} — 떠나는 방과 닿는 방이 그 궁에 실재한다`, () => {
      expect(roomOf(def, beat.room), `${beat.room}`).toBeTruthy()
      expect(roomOf(def, beat.to), `${beat.to}`).toBeTruthy()
    })

    it(`${label} — 데리고 가는 사람이 모두 실재한다`, () => {
      const ids = escortIds(beat)
      expect(ids.length, '아무도 데려가지 않는다').toBeGreaterThan(0)
      for (const id of ids) expect(npcById(id), id).toBeTruthy()
    })

    it(`${label} — 함께 걷는 사람이 서로 겹치지 않고 담 안에 있다`, () => {
      const to = roomOf(def, beat.to)
      const offs = escortOffsets(beat)
      for (let i = 0; i < offs.length; i++) {
        const a = offs[i]
        expect(Math.abs(to.x + a.dx), `${a.npc} 가 담 밖`).toBeLessThan(def.ground.w / 2)
        expect(Math.abs(to.z + a.dz), `${a.npc} 가 담 밖`).toBeLessThan(def.ground.d / 2)
        for (let j = i + 1; j < offs.length; j++) {
          const b = offs[j]
          const d = Math.hypot(a.dx - b.dx, a.dz - b.dz)
          expect(d, `${a.npc} 와 ${b.npc} 가 겹쳐 걷는다`).toBeGreaterThan(1.6)
        }
      }
    })

    it(`${label} — 조종하려 할 때 나오는 말과, 다음으로 넘어가는 단추가 있다`, () => {
      const r = rebukeOf(beat)
      expect(r, '막는 말이 없다').toBeTruthy()
      expect(escortIds(beat), '없는 사람이 말린다').toContain(r.npcId)
      expect((beat.exit?.label ?? '').length).toBeGreaterThan(0)
    })

    it(`${label} — 걸어가는 동안 읽을 글이 있다`, () => {
      expect((beat.lines ?? []).length).toBeGreaterThan(0)
    })
  }

  it('1868년 이어에는 행렬이 앞선다 — 아버지가 데리고 나간다', () => {
    const beats = beatsOf(ACTS[1])
    const pi = beats.findIndex(b => b.kind === 'procession')
    const mi = beats.findIndex(b => b.id === 'move-1868')
    expect(pi).toBeGreaterThan(-1)
    expect(pi).toBeLessThan(mi)          // 걸어 나간 다음에 이어 화면이다
    expect(escortIds(beats[pi])).toContain('heungseon')
  })

  // 알현이 대신한 그 자리 — 1막에는 이제 걸어 다니는 낮이 없다.
  // 즉위 전 운현궁의 하루(2026-09-13)만 걷는다 — 그때는 아직 임금이 아니다.
  it('왕이 된 뒤 1막에는 탐색 비트가 없다 — 열두 살 임금이 문서를 찾아 걸어 다니지 않는다', () => {
    const explores = beatsOf(ACTS[0]).filter(b => b.kind === 'explore')
    expect(explores.map(b => b.id)).toEqual(['unhyeon-day'])
    expect(explores.every(b => beatsOf(ACTS[0]).indexOf(b) < beatsOf(ACTS[0]).findIndex(x => x.id === 'throne'))).toBe(true)
    expect(beatsOf(ACTS[0]).some(b => b.kind === 'audience')).toBe(true)
  })

  it('1막의 알현에서 흥선대원군이 임금 곁에 선다 — 섭정이 곁에 있다', () => {
    const a = beatsOf(ACTS[0]).find(b => b.id === 'audience')
    expect(besideIds(a)).toContain('heungseon')
    expect(NPCS.find(n => n.id === 'heungseon')?.name).toBe('흥선대원군')
  })
})
