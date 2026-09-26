import { describe, it, expect } from 'vitest'
import { NPCS, npcsAt, npcNear, npcHandledCardIds, npcCardIds, portraitKeyOf } from '../../src/data/npcs.js'
import { PALACES, baseOf } from '../../src/data/palaces.js'
import { SOURCES } from '../../src/data/sources.js'
import { ACTS } from '../../src/data/acts.js'
import { beatsOf } from '../../src/systems/scenario.js'
import { castOf } from '../../src/systems/audience.js'

const CARD_IDS = new Set(SOURCES.map(c => c.id))
const BASE_PALACE_IDS = new Set(Object.entries(PALACES).filter(([id]) => baseOf(id) === id).map(([id]) => id))

// 신하는 palaces.js 의 pickups 좌표와 겹치는 자리에 세운다 — 그래야 E 로
// 「말을 건다」와 문서 줍기가 실제로 같은 지점에서 일어난다(design intent, npcs.js 상단 주석).
describe('신하 데이터 정합성', () => {
  it('id 가 서로 겹치지 않는다', () => {
    const ids = NPCS.map(n => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('모든 신하가 실재하는(기본형) 궁을 가리킨다', () => {
    for (const n of NPCS) expect(BASE_PALACE_IDS, n.id).toContain(n.palace)
  })

  it('cardId·cardIds 가 있으면 실재하는 사료를 가리킨다', () => {
    for (const n of NPCS) {
      for (const id of npcCardIds(n)) expect(CARD_IDS, `${n.id} → ${id}`).toContain(id)
    }
  })

  it('문서를 한 장(cardId)만 건네는 신하는 그 궁의 실제 pickup 좌표에 정확히 서 있다', () => {
    for (const n of NPCS.filter(n => n.cardId)) {
      const def = PALACES[n.palace]
      const p = (def.pickups ?? []).find(pp => pp.cardId === n.cardId)
      expect(p, `${n.id} → ${n.cardId}`).toBeTruthy()
      expect(n.x).toBe(p.x)
      expect(n.z).toBe(p.z)
    }
  })

  // 신헌처럼 뭉치(cardIds, 복수)를 건네는 신하는 넉 장이 저마다 다른 좌표에 놓여
  // 있던 것이라 신하 자신이 그 중 한 좌표에 설 수 없다 — 대신 그 궁의 pickups
  // 안에 넉 장 모두 실재하는지만 확인한다(main.js applyPickupPacket() 이 좌표가
  // 아니라 cardId 로 직접 찾는다).
  it('문서 뭉치(cardIds)를 건네는 신하의 카드는 모두 그 궁의 pickups 안에 실재한다', () => {
    for (const n of NPCS.filter(n => n.cardIds)) {
      const def = PALACES[n.palace]
      for (const id of n.cardIds) {
        const p = (def.pickups ?? []).find(pp => pp.cardId === id)
        expect(p, `${n.id} → ${id}`).toBeTruthy()
      }
    }
  })

  // [리뷰 I1] 예전에는 actsVisible 이 「선택」이었고, 없으면 그 궁에서 영원히 서 있었다.
  // 하한(cardsReadyByAct)만 있고 상한이 없었던 것이다 — 「카드의 막보다 먼저 서 있지
  // 마라」는 있는데 「지나서도 서 있지 마라」가 없었다. 그래서 1882년 창덕궁(4막)에
  // 1866년의 신하 넷이 그대로 서서 「정족산성에서 온 장계입니다」를 말했다. 3막까지는
  // 안 드러났다 — 창덕궁을 스무 해 만에 다시 쓰는 4막이 처음 드러낸 자리다.
  // 이제 상한은 선택이 아니라 필수다. 안 적으면 아무 막에도 안 선다(npcsAt).
  // actsVisible 이 비어 있어도 되는 사람이 생겼다 — **알현에만 나오는 사람**이다.
  // 호조 관리와 파발이 그렇다: 궁 어딘가에 서서 임금이 오기를 기다리지 않고,
  // 비트가 부를 때 어전으로 걸어 들어온다(systems/audience.js castOf).
  // 다만 「아무 데도 안 서고 아무 알현에도 안 나오는 사람」은 게임에 없는 사람이다 —
  // 그건 여전히 운다.
  // castOf 는 무대에 세울 사람만 센다 — 목소리로만 나오는 사람(from:'voice')도 알현에 나온 것이다.
  const AUDIENCE_BEATS = ACTS.flatMap(a => beatsOf(a)).filter(b => b.kind === 'audience')
  const AUDIENCE_CAST = new Set([
    ...AUDIENCE_BEATS.flatMap(castOf),
    ...AUDIENCE_BEATS.flatMap(b => (b.visitors ?? []).map(v => v.npc)),
  ])

  it('모든 신하가 어디에 나오는지 스스로 밝힌다 — 서는 막이든, 부르는 알현이든', () => {
    for (const n of NPCS) {
      expect(Array.isArray(n.actsVisible), `${n.id} 에 actsVisible 이 없다`).toBe(true)
      expect(n.actsVisible.length > 0 || AUDIENCE_CAST.has(n.id),
        `${n.id} 는 아무 막에도 안 서고 아무 알현에도 안 나온다`).toBe(true)
    }
  })

  it('actsVisible 은 실재하는 막 번호만 담는다', () => {
    for (const n of NPCS) {
      for (const i of n.actsVisible) {
        expect(i).toBeGreaterThanOrEqual(0)
        expect(i).toBeLessThan(ACTS.length)
      }
    }
  })

  // 「지나서도 서 있지 마라」— 서 있는 막을 한 사람씩 손으로 검토해 여기 못 박는다.
  // 규칙으로 뽑아내지 않는 이유: 카드의 act 는 「가장 이른 막」이지 「그 말이 참인
  // 마지막 해」가 아니다. 호조 관리가 그 어긋남을 보여 준다 — 당백전 카드는 1막(1863)
  // 것이지만 당백전이 실제로 찍힌 것은 1866년, 곧 2막이다. 규칙 하나로 짜면 그
  // 한 사람 때문에 예외 조항이 생기고, 예외 조항은 다음 사람도 조용히 통과시킨다.
  it('신하가 서 있는 막이 검토된 그대로다 — 시대착오 대사가 되살아나면 운다', () => {
    expect(Object.fromEntries(NPCS.map(n => [n.id, n.actsVisible]))).toEqual({
      heungseon: [0, 1],    // 대원군 — 1873년에 물러난다
      hojo: [],             // 1막 알현에 나와 원납전·당백전을 건넨다 — 어디에도 서지 않는다
      pabal: [],            // 2막 알현에 뛰어 들어와 정족산성 장계를 건넨다 — 어디에도 서지 않는다
      gaehwa: [2],          // 개항 논의 — 3막 창덕궁 국면(1874~75)
      seungji: [1],         // 벨로네의 글 — 1866
      geomseo: [1],         // 규장각 검서관 — 외규장각 목록(1866)
      seongong: [1],        // 선공감 서리 — 경복궁 중건 기록(1868 완공)
      susinsa: [3],         // 수신사 수행원 — 『조선책략』(1880)
      yeongnam: [3],        // 영남 유생 — 만인소(1881)
      hongjaehak: [3],      // 홍재학 — 그해에 죽은 사람이다. 상소는 본인이 올린다
      gaehwapa: [4],        // 개화파 관원 — 정강 14개조(1884)
      gungyo: [1],          // 셔먼호 — 1866
      sujeong: [1],         // 신미양요 — 1871
      yeokgwan: [],         // 서계 — 1873 알현에서 건넨다(2026-09-13)
      choeikhyeon: [],      // 3막의 두 알현에만 나온다 — 1873 계유상소, 1876 도끼 상소
      sugun: [2],           // 운요호 — 1875
      sinheon: [],          // 강화도 조약 — 1876 훈령 뒤 알현에서 건넨다(2026-09-13)
      jaemyeon: [0],        // 운현궁 — 1863년 즉위 전의 형
      haein: [0],           // 운현궁 청지기
      mother: [0],          // 운현궁 안채 — 목소리로만
      kimjwageun: [],       // 운현궁에 모시러 온 영의정 — 알현·행렬에만
      minchisang: [],       // 함께 온 도승지 — 알현·행렬에만
      jodaebi: [],          // 대왕대비 — 발 뒤의 목소리(1·2막 알현)
      wangbi: [],           // 왕비 민씨 — 목소리로만(2막)
      kimokgyun: [],        // 김옥균 — 5막 정변 전 알현
    })
  })

  // 이 태스크가 실제로 고친 것 — npcsAt 이 상한을 보는가.
  // 4막(1882)의 창덕궁에는 그해의 사람만 선다 — 1866년의 넷은 없다.
  // 예전에는 「아무도 없다」였는데, 바닥에 놓여 있던 4막 문서 셋에 임자를 붙이면서
  // 그해의 사람 셋이 생겼다(수신사 수행원·영남 유생·홍재학).
  it('1882년 창덕궁(4막)에 1866년의 신하가 서 있지 않다', () => {
    const there = npcsAt(baseOf, 'changdeok', 3).map(n => n.id).sort()
    expect(there).toEqual(['hongjaehak', 'susinsa', 'yeongnam'])
    for (const old of ['seungji', 'gungyo', 'pabal', 'geomseo', 'heungseon']) {
      expect(there, `${old} 가 1882년에 서 있다`).not.toContain(old)
    }
  })

  it('1874년 창덕궁(3막)에도 그 넷이 없다 — 그때도 이미 여덟 해 지난 말이었다', () => {
    expect(npcsAt(baseOf, 'changdeok', 2)).toEqual([])
  })

  // 막 하나가 여러 해다 — 1873년 경복궁에 1875년의 사람이 서지 않는다(2026-09-13).
  it('해를 넘기 전에는 서지 않는다 — 운요호·개항론은 1875년부터', () => {
    expect(npcsAt(baseOf, 'gyeongbok', 2, 1873).map(n => n.id)).toEqual([])
    expect(npcsAt(baseOf, 'gyeongbok', 2, 1875).map(n => n.id).sort()).toEqual(['gaehwa', 'sugun'])
  })

  it('경복궁도 막을 지나면 비운다 — 4막에는 아무도 없다', () => {
    expect(npcsAt(baseOf, 'gyeongbok', 3)).toEqual([])
  })

  it('신하마다 최소 한 줄의 대사가 있다', () => {
    for (const n of NPCS) expect((n.lines ?? []).length, n.id).toBeGreaterThan(0)
  })

  it('npcHandledCardIds 는 신하들이 건네는(cardId·cardIds) 카드 전체의 집합이다', () => {
    const all = NPCS.flatMap(npcCardIds)
    expect(npcHandledCardIds().size).toBe(new Set(all).size)
    expect(npcHandledCardIds()).toEqual(new Set(all))
  })

  // 이 시험은 예전에 버그를 스스로 문서화하고 있었다 — 「actsVisible 없는 신하는
  // 어느 막에서나 보인다」가 바로 그 시대착오의 원인이었다(리뷰 I1). 그 자리에
  // 반대의 규약을 둔다 — 호조 관리는 1·2막에만 서고 그 뒤에는 없다.
  // 호조 관리는 이제 1막의 알현에서만 나온다 — 그리고 거기서는 npcsAt 이 아니라
  // 비트가 부른 사람 목록(systems/audience.js castOf)이 그를 세운다. 2막 창덕궁을
  // 걸을 때 이미 손에 든 문서를 다시 내미는 죽은 자리를 남기지 않으려고 뺐다.
  it('npcsAt — 알현에만 나오는 사람은 어느 막에도 서 있지 않다', () => {
    for (const id of ['hojo', 'pabal']) {
      for (let i = 0; i < ACTS.length; i++) {
        expect(npcsAt(baseOf, 'changdeok', i).some(n => n.id === id), `${id}/${i}막`).toBe(false)
      }
      expect(AUDIENCE_CAST.has(id), `${id} 가 어느 알현에도 안 나온다`).toBe(true)
    }
  })

  it('npcsAt — 흥선대원군은 1·2막의 창덕궁에만, 3막에는 없다', () => {
    expect(npcsAt(baseOf, 'changdeok', 0).some(n => n.id === 'heungseon')).toBe(true)
    expect(npcsAt(baseOf, 'changdeok', 1).some(n => n.id === 'heungseon')).toBe(true)
    expect(npcsAt(baseOf, 'changdeok', 2).some(n => n.id === 'heungseon')).toBe(false)
  })

  it('npcsAt — 화재 변형(gyeongbok_burnt 등)도 baseOf 로 같은 궁의 신하를 돌려준다', () => {
    const a = npcsAt(baseOf, 'gyeongbok', 2).map(n => n.id).sort()
    const b = npcsAt(baseOf, 'gyeongbok_burnt', 2).map(n => n.id).sort()
    expect(b).toEqual(a)
  })

  it('npcNear — 반경 안의 가장 가까운 신하를 찾는다', () => {
    // 2막의 창덕궁에는 실제로 여럿이 서 있다 — 호조 관리는 이제 어디에도 안 서므로
    // 그 사람으로 재던 옛 시험은 목록에 없는 사람을 찾고 있었다.
    const list = npcsAt(baseOf, 'changdeok', 1)
    expect(list.length).toBeGreaterThan(1)
    const target = list[0]
    const found = npcNear(list, target.x + 1, target.z, 6)
    expect(found?.npc.id).toBe(target.id)
    expect(npcNear(list, target.x + 999, target.z, 6)).toBeNull()
  })
})

it('목소리로만 나오는 인물은 얼굴이 없다 — 3D 몸도 초상도 남자 관복뿐이라 지어 붙이지 않는다', () => {
  expect(portraitKeyOf({ voice: true, rank: 'mid' })).toBe(null)
})
