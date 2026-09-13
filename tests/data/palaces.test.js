import { describe, it, expect } from 'vitest'
import {
  PALACES, roomAt, pickupNear, burntVariant, isPassable, baseOf, roomLabel,
} from '../../src/data/palaces.js'
import { SOURCES } from '../../src/data/sources.js'

const ids = (def) => def.rooms.map(r => r.id)

describe('경복궁', () => {
  const g = PALACES.gyeongbok

  it('광화문·근정전·사정전·수정전·자경전 다섯 채가 있다', () => {
    expect(ids(g)).toEqual(['gwanghwamun', 'geunjeongjeon', 'sajeongjeon', 'sujeongjeon', 'jagyeongjeon'])
  })

  it('어전회의는 편전인 사정전에서 연다', () => {
    expect(g.councilRoom).toBe('sajeongjeon')
  })

  it('조작권 C 로는 자경전에 못 들어간다', () => {
    expect(g.rooms.find(r => r.id === 'jagyeongjeon').minControl).toBe('B')
  })

  it('모든 방의 minControl 이 A~D 안에 있다', () => {
    for (const def of Object.values(PALACES)) {
      for (const r of def.rooms) expect(['A', 'B', 'C', 'D'], `${def.id}/${r.id}`).toContain(r.minControl)
    }
  })

  it('스폰 지점이 광화문 안쪽 마당이다', () => {
    expect(roomAt(g, g.spawn.x, g.spawn.z)).toBeNull()
    expect(Math.abs(g.spawn.x)).toBeLessThan(g.ground.w / 2)
  })

  it('모든 궁의 pickup 카드가 실재하는 사료다', () => {
    const known = new Set(SOURCES.map(c => c.id))
    for (const def of Object.values(PALACES)) {
      for (const p of def.pickups ?? []) {
        expect(known, `${def.id}/${p.cardId}`).toContain(p.cardId)
        expect(p.placeId, `${def.id}/${p.cardId} 에 placeId 없음`).toBeTruthy()
      }
    }
  })

  // 10m 이던 것을 6m 로 내린다 — **규칙이 지키던 것이 바뀌었기 때문이다.**
  //
  // 옛 10m 는 바닥에 놓인 문서를 pickupNear(반경 5)가 집을 때 「어느 것을 집었는지」가
  // 헷갈리지 않게 하는 값이었다. 지금은 바닥에 놓인 문서가 하나도 없다 — 문서에는
  // 그것을 들고 있는 사람이 있고, 그 사람은 npcNear 가 **가장 가까운 한 사람**을
  // 골라 준다(이름과 거리가 화면에 뜬다). 그래서 필요한 것은 「누구에게 말을 거는지
  // 분명할 만큼」이고, 그 값은 6m 면 넉넉하다.
  //
  // 10m 를 고집하면 사람을 방 안에 세울 수 없다 — 방 하나가 13~19m 이라 두 사람을
  // 10m 떼어 놓으면 둘 중 하나는 반드시 벽에 붙는다. 선생님이 찍어 보낸 「벽 사이에
  // 낀 사람들」이 정확히 그 결과였다. 값을 시험에 맞춘 것이 아니라, 시험이 지키던
  // 것이 사라져서 값을 다시 정한 것이다.
  it('같은 궁 안에서 지점끼리 6m 넘게 떨어져 있다 — 누구에게 말을 거는지 헷갈리지 않게', () => {
    for (const def of Object.values(PALACES)) {
      const ps = def.pickups ?? []
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const d = Math.hypot(ps[i].x - ps[j].x, ps[i].z - ps[j].z)
        expect(d, `${def.id}: ${ps[i].cardId} ↔ ${ps[j].cardId}`).toBeGreaterThan(6)
      }
    }
  })

  it('pickupNear 가 가까운 카드를 찾아 준다', () => {
    const p = g.pickups[0]
    expect(pickupNear(g, p.x, p.z)?.cardId).toBe(p.cardId)
    expect(pickupNear(g, p.x + 40, p.z + 40)).toBeNull()
  })
})

// 2단계 최종 리뷰, 가독성 항목 1 — HUD 가 「창덕궁 · 규장각(왕실 도서관)」처럼
// 읽어야 교사가 부르는 방 이름을 학생이 화면에서 따라갈 수 있다.
describe('roomLabel — HUD 가 읽는 방 이름', () => {
  it('방 밖(roomId 없음)이면 아무것도 없다', () => {
    expect(roomLabel(PALACES.changdeok, null)).toBeNull()
  })

  it('gloss 가 있는 방은 이름 뒤에 괄호로 붙는다', () => {
    expect(roomLabel(PALACES.changdeok, 'gyujanggak')).toBe('규장각(왕실 도서관)')
  })

  it('gloss 가 없는 방은 이름만 준다', () => {
    expect(roomLabel(PALACES.changdeok, 'gwanmulheon')).toBe('관물헌')
  })

  it('모르는 방 id 는 아무것도 없다', () => {
    expect(roomLabel(PALACES.changdeok, 'no-such-room')).toBeNull()
  })
})

describe('화재 상태 변형', () => {
  const base = PALACES.gyeongbok

  it('탄 방에는 burnt 표시가 붙고 나머지는 안 붙는다', () => {
    const v = burntVariant(base, { id: 'v', name: '경복궁', burnt: ['jagyeongjeon'], sealed: [] })
    expect(v.rooms.find(r => r.id === 'jagyeongjeon').burnt).toBe(true)
    expect(v.rooms.find(r => r.id === 'sajeongjeon').burnt).toBe(false)
  })

  it('봉쇄한 방은 통행 불가가 된다', () => {
    const v = burntVariant(base, { id: 'v', name: '경복궁', burnt: ['jagyeongjeon'], sealed: ['jagyeongjeon'] })
    expect(isPassable(v.rooms.find(r => r.id === 'jagyeongjeon'))).toBe(false)
    expect(isPassable(v.rooms.find(r => r.id === 'gwanghwamun'))).toBe(true)
  })

  it('조작권 등급은 손대지 않는다', () => {
    const v = burntVariant(base, { id: 'v', name: '경복궁', burnt: ['jagyeongjeon'], sealed: ['jagyeongjeon'] })
    for (const r of v.rooms) expect(['A', 'B', 'C', 'D']).toContain(r.minControl)
  })

  it('탄 방에 있던 사료는 더 이상 주울 수 없다', () => {
    const v = burntVariant(base, { id: 'v', name: '경복궁', burnt: ['sajeongjeon'], sealed: ['sajeongjeon'] })
    expect((v.pickups ?? []).some(p => p.placeId === 'sajeongjeon')).toBe(false)
  })

  it('원본 정의를 건드리지 않는다', () => {
    burntVariant(base, { id: 'v', name: '경복궁', burnt: ['jagyeongjeon'], sealed: ['jagyeongjeon'] })
    expect(base.rooms.find(r => r.id === 'jagyeongjeon').burnt).toBeUndefined()
    expect(base.id).toBe('gyeongbok')
  })

  it('1873 변형은 자경전만 타고, 1876 변형은 네 채가 탄다', () => {
    const a = PALACES.gyeongbok_jagyeong
    const b = PALACES.gyeongbok_burnt
    expect(a.rooms.filter(r => r.burnt).map(r => r.id)).toEqual(['jagyeongjeon'])
    expect(b.rooms.filter(r => r.burnt).map(r => r.id))
      .toEqual(['geunjeongjeon', 'sajeongjeon', 'sujeongjeon', 'jagyeongjeon'])
  })

  it('불탄 뒤에도 광화문으로는 걸어 나갈 수 있다', () => {
    const b = PALACES.gyeongbok_burnt
    expect(isPassable(b.rooms.find(r => r.id === 'gwanghwamun'))).toBe(true)
    expect(isPassable(b.rooms.find(r => r.id === 'geunjeongjeon'))).toBe(true)
  })

  it('변형은 모두 경복궁이라는 이름과 같은 밑바탕을 가진다', () => {
    for (const id of ['gyeongbok', 'gyeongbok_jagyeong', 'gyeongbok_burnt']) {
      expect(baseOf(id)).toBe('gyeongbok')
      expect(PALACES[id].name).toContain('경복궁')
      expect(PALACES[id].ground).toEqual(PALACES.gyeongbok.ground)
    }
    expect(baseOf('changdeok')).toBe('changdeok')
  })
})

describe('창덕궁 — 5막의 「11곳」을 실제로 만든다', () => {
  const c = PALACES.changdeok

  it('열한 채다 — 설계서 §7 의 「창덕궁 11곳 대 경우궁 3곳」이 숫자로 성립한다', () => {
    expect(c.rooms).toHaveLength(11)
  })

  it('더한 세 채가 실재하는 창덕궁 전각이다', () => {
    const roomIds = c.rooms.map(r => r.id)
    expect(roomIds).toContain('seongjeonggak')
    expect(roomIds).toContain('nakseonjae')
    expect(roomIds).toContain('seonwonjeon')
  })

  it('조작권 A 로만 열리는 방은 정확히 한 채이고, 그것은 낙선재다', () => {
    const onlyA = c.rooms.filter(r => r.minControl === 'A')
    expect(onlyA.map(r => r.id)).toEqual(['nakseonjae'])
  })

  it('연경당은 B 로 내려왔다 — C3 에서 후원으로 도망칠 수 있어야 한다', () => {
    expect(c.rooms.find(r => r.id === 'yeongyeongdang').minControl).toBe('B')
  })

  it('방 상자끼리 겹치지 않는다', () => {
    for (let i = 0; i < c.rooms.length; i++) {
      for (let j = i + 1; j < c.rooms.length; j++) {
        const a = c.rooms[i]
        const b = c.rooms[j]
        const apart =
          Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.z - b.z) >= (a.d + b.d) / 2
        expect(apart, `${a.id} ↔ ${b.id}`).toBe(true)
      }
    }
  })

  it('모든 방이 지면 안에 들어온다', () => {
    for (const r of c.rooms) {
      expect(Math.abs(r.x) + r.w / 2, r.id).toBeLessThanOrEqual(c.ground.w / 2)
      expect(Math.abs(r.z) + r.d / 2, r.id).toBeLessThanOrEqual(c.ground.d / 2)
    }
  })

  it('4막 사료 세 장이 창덕궁에 놓였고 모두 자기 방 상자 안에 있다', () => {
    const added = ['joseon-chaeryak', 'yeongnam-manin', 'hong-jaehak']  // 관물헌·성정각
    for (const id of added) {
      const p = c.pickups.find(x => x.cardId === id)
      expect(p, id).toBeTruthy()
      const room = c.rooms.find(r => r.id === p.placeId)
      expect(Math.abs(p.x - room.x), `${id} x`).toBeLessThanOrEqual(room.w / 2)
      expect(Math.abs(p.z - room.z), `${id} z`).toBeLessThanOrEqual(room.d / 2)
    }
  })
})

describe('5막의 궁 넷 — 좁음이 설계 의도다', () => {
  it('경우궁은 방이 셋이다 — 창덕궁 열한 채와 맞선다', () => {
    expect(PALACES.gyeongu.rooms).toHaveLength(3)
    expect(PALACES.changdeok.rooms).toHaveLength(11)
  })

  it('경우궁 지면이 창덕궁보다 훨씬 좁다 — 걸어 보면 안다', () => {
    const g = PALACES.gyeongu.ground
    const c = PALACES.changdeok.ground
    expect(g.w * g.d).toBeLessThan((c.w * c.d) / 6)
  })

  it('경우궁의 세 방은 모두 열려 있다 — 좁은 것이지 막힌 것이 아니다', () => {
    for (const r of PALACES.gyeongu.rooms) expect(r.minControl, r.id).toBe('D')
  })

  it('계동궁·북묘·영방은 한 채씩이다', () => {
    expect(PALACES.gyedong.rooms).toHaveLength(1)
    expect(PALACES.bukmyo.rooms).toHaveLength(1)
    expect(PALACES.ojoyu.rooms).toHaveLength(1)
  })

  it('네 궁 모두 이름·지면·스폰을 가지고, 스폰이 지면 안에 있다', () => {
    for (const id of ['gyeongu', 'gyedong', 'bukmyo', 'ojoyu']) {
      const def = PALACES[id]
      expect(def.name, id).toBeTruthy()
      expect(def.ground.w, id).toBeGreaterThan(0)
      expect(Math.abs(def.spawn.x), id).toBeLessThan(def.ground.w / 2)
      expect(Math.abs(def.spawn.z), id).toBeLessThan(def.ground.d / 2)
    }
  })

  it('네 궁은 저마다 다른 곳이다 — 화재 변형처럼 같은 밑바탕을 쓰지 않는다', () => {
    for (const id of ['gyeongu', 'gyedong', 'bukmyo', 'ojoyu']) expect(baseOf(id)).toBe(id)
  })

  it('경우궁에서 주울 수 있는 것은 개혁 정강 한 장뿐이다 — 설계서 §7 의 표 그대로', () => {
    expect((PALACES.gyeongu.pickups ?? []).map(p => p.cardId)).toEqual(['reform14'])
    for (const id of ['gyedong', 'bukmyo', 'ojoyu']) {
      expect(PALACES[id].pickups ?? [], id).toHaveLength(0)
    }
  })

  // 좁다는 것은 걸음만 좁다는 뜻이 아니라 손에 들어오는 것이 적다는 뜻이기도 하다.
  // 그 한 장이 정말 정당 상자 안에 있는지까지 본다 — 방 밖에 놓이면 학생은 영영 못 줍는다.
  it('그 한 장이 정당 상자 안에 놓여 있다', () => {
    const p = PALACES.gyeongu.pickups[0]
    const room = PALACES.gyeongu.rooms.find(r => r.id === p.placeId)
    expect(room, p.placeId).toBeTruthy()
    expect(Math.abs(p.x - room.x)).toBeLessThanOrEqual(room.w / 2)
    expect(Math.abs(p.z - room.z)).toBeLessThanOrEqual(room.d / 2)
  })

  it('북묘는 사당이고 영방은 군영이다 — 이름에 그렇게 적혀 있다', () => {
    expect(PALACES.bukmyo.rooms[0].name).toBe('사당')
    expect(PALACES.ojoyu.name).toContain('영방')
  })
})
