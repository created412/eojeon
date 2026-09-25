import { describe, it, expect } from 'vitest'
import { PALACES } from '../../src/data/palaces.js'
import { collides } from '../../src/data/hall-geometry.js'
import { ARTIFACTS, ARTIFACT_SPOTS, artifactById, artifactLines } from '../../src/data/artifacts.js'
import {
  artifactsIn, artifactNear, markArtifactSeen, hasSeen, artifactCount, artifactRecord,
  YARD_REACH, ROOM_REACH,
} from '../../src/systems/artifacts.js'

describe('물건 데이터', () => {
  it('모든 물건에 이름·해설 줄·고지가 있다', () => {
    for (const a of ARTIFACTS) {
      expect(a.name, a.id).toBeTruthy()
      expect(artifactLines(a, 4).length, a.id).toBeGreaterThan(0)
      // 고지 없는 해설을 두지 않는다 — 이 카드가 사료가 아님을 카드 안에서 밝힌다.
      expect(a.note, a.id).toBeTruthy()
      expect(['yard', 'room']).toContain(a.kind)
    }
  })

  it('id 가 겹치지 않는다', () => {
    const ids = ARTIFACTS.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('방 안 물건의 자리는 실제로 있는 궁·방을 가리키고 방 안에 든다', () => {
    for (const [palaceId, spots] of Object.entries(ARTIFACT_SPOTS)) {
      const def = PALACES[palaceId]
      expect(def, palaceId).toBeTruthy()
      for (const s of spots.filter(spot => spot.room != null)) {
        expect(artifactById(s.id), `${palaceId}/${s.id}`).toBeTruthy()
        const room = def.rooms.find(r => r.id === s.room)
        expect(room, `${palaceId}/${s.room}`).toBeTruthy()
        // 벽을 뚫고 나가 앉으면 학생은 그 앞에 설 수 없다 — 방 안에 있어야 한다.
        expect(Math.abs(s.dx ?? 0), `${palaceId}/${s.id} dx`).toBeLessThan(room.w / 2 - 0.5)
        expect(Math.abs(s.dz ?? 0), `${palaceId}/${s.id} dz`).toBeLessThan(room.d / 2 - 0.5)
      }
    }
  })

  it('마당의 자리(다리·길·품계석)는 담 안이고 벽에 박혀 있지 않다', () => {
    for (const [palaceId, spots] of Object.entries(ARTIFACT_SPOTS)) {
      const def = PALACES[palaceId]
      for (const s of spots.filter(spot => spot.room == null)) {
        expect(artifactById(s.id), `${palaceId}/${s.id}`).toBeTruthy()
        expect(Math.abs(s.x), `${palaceId}/${s.id} x`).toBeLessThan(def.ground.w / 2)
        expect(Math.abs(s.z), `${palaceId}/${s.id} z`).toBeLessThan(def.ground.d / 2)
        // 학생이 그 앞에 설 수 있어야 한다 — 벽·기둥 속이면 다가갈 수 없다.
        expect(Boolean(collides(def, { x: s.x, z: s.z }, 0.6)), `${palaceId}/${s.id}`).toBe(false)
      }
    }
  })

  it('같은 궁에서 두 물건이 한자리에 겹치지 않는다', () => {
    // 겹치면 가까운 쪽만 잡히고 나머지는 영영 안 잡힌다 — 학생은 그것을 알 길이 없다.
    for (const palaceId of Object.keys(ARTIFACT_SPOTS)) {
      const list = artifactsIn(PALACES[palaceId], 1884)
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          if (list[i].id === list[j].id) continue   // 드무·해치는 한 쌍으로 서 있다
          const d = Math.hypot(list[i].x - list[j].x, list[i].z - list[j].z)
          expect(d, `${palaceId}: ${list[i].id} ↔ ${list[j].id}`).toBeGreaterThan(2.5)
        }
      }
    }
  })

  it('막에 따라 붙는 줄은 그 막 전에는 보이지 않는다', () => {
    const bi = artifactById('cheokhwabi')
    const act1 = artifactLines(bi, 0)
    const act4 = artifactLines(bi, 3)
    expect(act4.length).toBeGreaterThan(act1.length)
    expect(act1.join(' ')).not.toContain('당신이 직접 썼다')
    expect(act4.join(' ')).toContain('당신이 직접 썼다')
  })
})

describe('만질 수 있는 물건 찾기', () => {
  const def = PALACES.gyeongbok

  it('마당과 방 안의 물건을 함께 센다', () => {
    const list = artifactsIn(def, 1875)
    expect(list.some(a => a.kind === 'yard')).toBe(true)
    expect(list.some(a => a.kind === 'room')).toBe(true)
  })

  it('아직 세워지지 않은 척화비는 목록에 없다', () => {
    expect(artifactsIn(def, 1866).some(a => a.id === 'cheokhwabi')).toBe(false)
    expect(artifactsIn(def, 1871).some(a => a.id === 'cheokhwabi')).toBe(true)
    // 해를 모르는 자리(null)에서는 가리지 않는다 — 가려서 사라지면 만질 수 없다.
    expect(artifactsIn(def, null).some(a => a.id === 'cheokhwabi')).toBe(true)
  })

  it('물건 앞에 서면 잡히고, 멀면 잡히지 않는다', () => {
    const well = artifactsIn(def).find(a => a.id === 'well')
    expect(artifactNear(def, well.x + 1, well.z)?.id).toBe('well')
    expect(artifactNear(def, well.x + YARD_REACH + 3, well.z)).toBe(null)
  })

  it('방 안 물건은 그 방에 들어와 있어야 잡힌다', () => {
    const spot = artifactsIn(def).find(a => a.kind === 'room')
    expect(artifactNear(def, spot.x, spot.z, { room: spot.room })?.id).toBe(spot.id)
    expect(artifactNear(def, spot.x, spot.z, { room: 'gwanghwamun' })).toBe(null)
    expect(ROOM_REACH).toBeLessThan(YARD_REACH)
  })
})

describe('본 물건 기록', () => {
  it('한 번 본 것은 두 번 세지 않는다', () => {
    let s = { lore: { seen: [] } }
    s = markArtifactSeen(s, 'well')
    s = markArtifactSeen(s, 'well')
    expect(hasSeen(s, 'well')).toBe(true)
    expect(artifactCount(s)).toBe(1)
  })

  it('lore 가 아예 없는 저장에서도 안전하다', () => {
    const s = markArtifactSeen({}, 'deumu')
    expect(artifactCount(s)).toBe(1)
    expect(artifactRecord(s)[0]).toContain('드무')
  })

  it('아무것도 안 봤으면 기록에 줄을 남기지 않는다', () => {
    expect(artifactRecord({ lore: { seen: [] } })).toEqual([])
  })
})
