import { describe, it, expect } from 'vitest'
import {
  arrivalDay, arrivedAt, pendingAt, latestAt, lagDaysAt, lagLabelAt,
  arrivalOrder, happenedOrder, shouldOfferOrdering, isInHappenedOrder,
  arrivalMatchesHappened, pendingOlderThanArrived, happenedLabel, travelLabel,
  orderingVerdict, firstOutOfOrderPair, earliestHappened, orderingHintLevel, orderingHint,
} from '../../src/systems/dispatch.js'
import { ACTS } from '../../src/data/acts.js'
import { beatsOf } from '../../src/systems/scenario.js'

const list = [
  { id: 'a', place: 'ganghwa',    placeName: '강화도', sentDay: 0, lagDays: 2, headline: '함대가 물길을 거슬러 올랐다' },
  { id: 'b', place: 'ganghwa',    placeName: '강화도', sentDay: 2, lagDays: 2, headline: '갑곶에 내렸다' },
  { id: 'c', place: 'pyeongyang', placeName: '평양',   sentDay: 0, lagDays: 6, headline: '평양의 일' },
]

describe('E 장계 지연', () => {
  it('도착일은 보낸 날 더하기 걸린 날이다', () => {
    expect(arrivalDay(list[0])).toBe(2)
    expect(arrivalDay(list[2])).toBe(6)
  })

  it('첫날에는 아무 장계도 안 왔다', () => {
    expect(arrivedAt(list, 0)).toEqual([])
    expect(pendingAt(list, 0)).toHaveLength(3)
  })

  it('이틀째에 첫 장계가 온다', () => {
    expect(arrivedAt(list, 2).map(d => d.id)).toEqual(['a'])
  })

  it('평양 소식은 강화도보다 늦게 온다', () => {
    expect(arrivedAt(list, 4).map(d => d.id)).toEqual(['a', 'b'])
    expect(arrivedAt(list, 6).map(d => d.id)).toEqual(['a', 'b', 'c'])
  })

  it('가장 늦게 보낸 도착분을 고른다', () => {
    expect(latestAt(list, 4).id).toBe('b')
    expect(latestAt(list, 2).id).toBe('a')
    expect(latestAt(list, 0)).toBeNull()
  })

  it('며칠 전 정보인지 센다', () => {
    expect(lagDaysAt(list, 4)).toBe(2)   // 2일에 보낸 것을 4일에 본다
    expect(lagDaysAt(list, 5)).toBe(3)
    expect(lagDaysAt(list, 0)).toBeNull()
  })

  it('화면 문구를 만든다 — 공문서 말투("N일 전 장계 기준") 대신 어디서 왔는지를 말한다', () => {
    expect(lagLabelAt(list, 4)).toBe('이 소식은 2일 전에 강화도에서 보낸 것이다')
    expect(lagLabelAt(list, 0)).toBe('아직 장계가 오지 않았다')
  })

  it('보낸 그날 도착한 장계면 0일 전이라고 말하지 않는다', () => {
    const now = [{ id: 'z', place: 'hanyang', placeName: '한양', sentDay: 3, lagDays: 0, headline: '' }]
    expect(lagLabelAt(now, 3)).toBe('오늘 한양에서 보낸 소식이다')
  })

  it('빈 목록도 안전하다', () => {
    expect(arrivedAt([], 5)).toEqual([])
    expect(lagLabelAt([], 5)).toBe('아직 장계가 오지 않았다')
  })
})

// ── 이 장치의 핵심은 「학생이 결정할 때 이미 강화도에서는 다른 일이 벌어지고 있다」는
// 것이다(설계서 5장 E, 2막 비트 2·3). 숫자 자체(lagDays)는 실측이 아니라 이 장면의
// 속도감을 위해 디자이너가 매기는 값이지만, 순서 하나는 스펙이 못 박는다 —
// 강화도 소식이 평양(제너럴 셔먼호) 소식보다 항상 먼저 온다. 그리고 학생이 회의에서
// 고르는 그 순간에도, 아직 도착하지 않은 소식이 반드시 남아 있어야 한다 — 그래야
// "다 알고 골랐다"가 아니라 "그때는 몰랐다"가 된다.
const GANGHWA_1866 = [
  { id: 'fleet-up',    place: 'ganghwa',    placeName: '강화도', sentDay: 0, lagDays: 1,
    headline: '프랑스 함대가 강화 물길을 거슬러 올랐다', origin: '『고종실록』 · 병인양요' },
  { id: 'gapgot',      place: 'ganghwa',    placeName: '강화도', sentDay: 1, lagDays: 1,
    headline: '갑곶에 프랑스군이 내렸다', origin: '『고종실록』 · 병인양요' },
  { id: 'sherman',     place: 'pyeongyang', placeName: '평양',   sentDay: 0, lagDays: 5,
    headline: '평양에서 이양선과 충돌이 있었다', origin: '『고종실록』 · 제너럴셔먼호 사건' },
]
const COUNCIL_DAY = 2   // 「맞설 것인가 물러설 것인가」를 묻는 비트가 놓이는 날 (장계 도착 전에)

describe('강화도 장계 — 결정은 언제나 다음 장계보다 먼저 온다', () => {
  it('강화도 소식이 평양 소식보다 먼저 도착한다', () => {
    expect(arrivalDay(GANGHWA_1866[0])).toBeLessThan(arrivalDay(GANGHWA_1866[2]))
    expect(arrivalDay(GANGHWA_1866[1])).toBeLessThan(arrivalDay(GANGHWA_1866[2]))
  })

  it('회의 날에는 아직 평양 소식이 없다 — 학생은 그것을 모른 채 고른다', () => {
    const pending = pendingAt(GANGHWA_1866, COUNCIL_DAY)
    expect(pending.map(d => d.id)).toContain('sherman')
  })

  it('회의 날 기준으로 임금이 보는 것은 갑곶 소식뿐, 그나마도 어제 것이다', () => {
    expect(latestAt(GANGHWA_1866, COUNCIL_DAY).id).toBe('gapgot')
    expect(lagLabelAt(GANGHWA_1866, COUNCIL_DAY)).toBe('이 소식은 1일 전에 강화도에서 보낸 것이다')
  })
})

// ── 놓아 보기 — 닿은 순서와 일어난 순서 ─────────────────────────────────
// 2026-09-25 선생님: 「장계 도착 순서 맞추기(2·3막).」 학생이 늘어놓아 보는 동작이
// 붙었지만, 이 장치가 가르치는 것은 예전과 한 글자도 다르지 않다 — 소식은 거리만큼
// 늦게 온다. 그래서 이 검사가 붙드는 것은 「맞혔나」가 아니라 둘이다.
//   ① 물음이 성립하는 자리에서만 물어본다(닿은 것이 둘 이상, 보낸 날이 서로 다를 때).
//   ② 어느 갈래에서도 학생을 채점하지 않는다.
describe('놓아 보기를 내줄 자리인가', () => {
  it('닿은 장계가 하나뿐이면 「순서」라는 물음이 성립하지 않는다', () => {
    expect(shouldOfferOrdering(list, 2)).toBe(false)   // a 한 통만 닿았다
    expect(shouldOfferOrdering(list, 0)).toBe(false)   // 아무것도 안 닿았다
    expect(shouldOfferOrdering([], 9)).toBe(false)
  })

  it('보낸 날이 서로 다른 장계가 둘 이상 닿았으면 물어본다', () => {
    expect(shouldOfferOrdering(list, 4)).toBe(true)    // a(0일 보냄) + b(2일 보냄)
  })

  it('같은 날 보낸 장계만 닿았으면 물어보지 않는다 — 앞뒤가 애초에 없다', () => {
    const sameDay = [
      { id: 'p', placeName: '평양', sentDay: 1, lagDays: 1, headline: '' },
      { id: 'q', placeName: '동래', sentDay: 1, lagDays: 3, headline: '' },
    ]
    expect(shouldOfferOrdering(sameDay, 2)).toBe(false)
    expect(shouldOfferOrdering(sameDay, 4)).toBe(false)
  })
})

describe('두 순서를 셈한다', () => {
  // 나중에 보낸 것이 먼저 닿는 판 — 이 장치가 가르치려는 바로 그 어긋남이다.
  const crossed = [
    { id: 'far',  placeName: '평양', sentDay: 0, lagDays: 6, headline: '먼 곳의 일' },
    { id: 'near', placeName: '강화', sentDay: 3, lagDays: 1, headline: '가까운 곳의 일' },
  ]

  it('닿은 순서는 도착일 순이다', () => {
    expect(arrivalOrder(crossed, 6).map(d => d.id)).toEqual(['near', 'far'])
    expect(arrivalOrder(list, 6).map(d => d.id)).toEqual(['a', 'b', 'c'])
  })

  it('일어난 순서는 보낸 날 순이다', () => {
    expect(happenedOrder(crossed, 6).map(d => d.id)).toEqual(['far', 'near'])
  })

  it('도착일이 같으면 비트에 적힌 순서를 따른다 — 없는 앞뒤를 지어내지 않는다', () => {
    const tie = [
      { id: 'x', placeName: '강화', sentDay: 2, lagDays: 2, headline: '' },
      { id: 'y', placeName: '평양', sentDay: 1, lagDays: 3, headline: '' },
    ]
    expect(arrivalOrder(tie, 4).map(d => d.id)).toEqual(['x', 'y'])
    expect(happenedOrder(tie, 4).map(d => d.id)).toEqual(['y', 'x'])
  })

  it('나중에 닿은 것이 먼저 일어난 일일 수 있다 — 그것이 이 장면의 전부다', () => {
    expect(arrivalMatchesHappened(crossed, 6)).toBe(false)
    // 여섯째 날의 list 도 그렇다 — 평양 장계(c)는 첫 장계(a)와 같은 날 떠났는데
    // 맨 나중에 닿는다. 그 판에서는 닿은 순서가 일어난 순서가 아니다.
    expect(arrivalMatchesHappened(list, 6)).toBe(false)
    // 넷째 날에는 아직 평양 장계가 없어, 닿은 순서가 그대로 일어난 순서다
    expect(arrivalMatchesHappened(list, 4)).toBe(true)
  })

  it('놓인 차례는 보낸 날의 차례로 견준다 — 같은 날이면 어느 쪽이 앞이어도 순서대로다', () => {
    const sameDay = [
      { id: 'p', placeName: '평양', sentDay: 1, lagDays: 1, headline: '' },
      { id: 'q', placeName: '동래', sentDay: 1, lagDays: 3, headline: '' },
      { id: 'r', placeName: '강화', sentDay: 4, lagDays: 1, headline: '' },
    ]
    expect(isInHappenedOrder(sameDay, ['p', 'q', 'r'])).toBe(true)
    expect(isInHappenedOrder(sameDay, ['q', 'p', 'r'])).toBe(true)
    expect(isInHappenedOrder(sameDay, ['r', 'p', 'q'])).toBe(false)
  })

  it('없는 장계를 놓았다고 하면 순서대로가 아니다', () => {
    expect(isInHappenedOrder(crossed, ['far', '없는것'])).toBe(false)
  })

  it('아직 오지 않은 장계 가운데 이미 닿은 것보다 먼저 보낸 것을 센다', () => {
    // 1866년 셋째 날 — 평양 장계는 강화 첫 장계와 같은 날 떠났는데 아직 없다
    expect(pendingOlderThanArrived(GANGHWA_1866, 2)).toBe(1)
    expect(pendingOlderThanArrived(GANGHWA_1866, 5)).toBe(0)
    expect(pendingOlderThanArrived(GANGHWA_1866, 0)).toBe(0)   // 닿은 것이 없으면 견줄 것도 없다
  })

  it('날수는 언제나 정수 며칠이다 — 시각이 끼어들지 않는다', () => {
    expect(happenedLabel(crossed[0], 6)).toBe('6일 전에 보낸 것이다')
    expect(happenedLabel({ sentDay: 6, lagDays: 0 }, 6)).toBe('오늘 보낸 것이다')
    expect(travelLabel(crossed[1])).toBe('닿는 데 1일이 걸렸다')
    expect(travelLabel({ lagDays: 0 })).toBe('보낸 날 그날 닿았다')
  })
})

describe('놓아 본 뒤 — 채점하지 않는다', () => {
  const crossed = [
    { id: 'far',  placeName: '평양', sentDay: 0, lagDays: 6, headline: '먼 곳의 일', origin: 'ㅇ' },
    { id: 'near', placeName: '강화', sentDay: 3, lagDays: 1, headline: '가까운 곳의 일', origin: 'ㅇ' },
  ]
  // 네 갈래 — 짚었나(둘) × 닿은 순서가 그대로였나(둘).
  const verdicts = [
    orderingVerdict(crossed, 6, ['far', 'near']),   // 짚었다 · 순서가 갈린 판
    orderingVerdict(crossed, 6, ['near', 'far']),   // 못 짚었다 · 순서가 갈린 판
    orderingVerdict(list, 4, ['a', 'b']),           // 짚었다 · 순서가 같았던 판
    orderingVerdict(list, 4, ['b', 'a']),           // 못 짚었다 · 순서가 같았던 판
  ]

  it('네 갈래 어디에도 「오답」이나 점수가 없다', () => {
    for (const v of verdicts) {
      const text = [v.headline, ...v.lines].join(' ')
      expect(text).not.toMatch(/오답|틀렸|점수|정답|X|✗/)
    }
  })

  it('짚었으면 짚었다고 말해 준다', () => {
    expect(verdicts[0].placedRight).toBe(true)
    expect(verdicts[0].headline).toContain('놓은 대로였다')
    expect(verdicts[1].placedRight).toBe(false)
  })

  it('못 짚었을 때 설명하는 것은 학생이 아니라 거리다', () => {
    expect(verdicts[1].headline).toContain('알 수 없는')
    expect(verdicts[1].lines.join(' ')).toContain('거리만큼 늦게')
  })

  it('닿은 순서가 그대로였던 날에는 그 사실도 그대로 말한다 — 없는 어긋남을 지어내지 않는다', () => {
    expect(verdicts[2].arrivalSame).toBe(true)
    expect(verdicts[2].headline).toContain('닿은 순서가 그대로 일어난 순서')
    // 못 짚었어도, 그 순서는 장계 어디에도 적혀 있지 않았다고 말해 준다
    expect(verdicts[3].placedRight).toBe(false)
    expect(verdicts[3].headline).toContain('적혀 있지 않았다')
  })

  it('참된 순서는 보낸 날 순으로 나가고, 장계의 출처는 그대로 실려 간다', () => {
    expect(verdicts[1].truth.map(d => d.id)).toEqual(['far', 'near'])
    expect(verdicts[1].truth.every(d => d.origin)).toBe(true)
  })

  it('아직 오지 않은 장계가 있으면 그 말도 함께 나간다 — 임금은 그것을 모른다', () => {
    const v = orderingVerdict(GANGHWA_1866, 2, ['gapgot', 'fleet-up'])
    expect(v.lines.join(' ')).toContain('아직 오지 않은 장계')
    expect(v.lines.join(' ')).toContain('1통')
  })
})

// ── 제대로 놓기 전에는 넘어가지 않는다 ─────────────────────────────────────
// 2026-09-26 선생님: 「장계의 순서를 정하는거도 틀린지도 모르겠어. 제대로 놓기
// 전까지는 안넘어가야해.」 이 묶음이 붙드는 것은 셋이다.
//   ① 어긋난 줄은 통과하지 못하고, 순서대로인 줄은 통과한다(같은 날은 어느 쪽이든).
//   ② 갈수록 더 말해 준다 — 그러나 답은 세 번째에야 나온다.
//   ③ 붙잡되 벌하지 않는다 — 말 어디에도 「오답·점수·실패·몇 번째」가 없다.
describe('어긋난 채로는 넘어가지 않는다', () => {
  const crossed = [
    { id: 'far',  placeName: '평양', sentDay: 0, lagDays: 6, headline: '먼 곳의 일' },
    { id: 'near', placeName: '강화', sentDay: 3, lagDays: 1, headline: '가까운 곳의 일' },
  ]

  it('넘어갈지 말지를 정하는 것은 isInHappenedOrder 하나다 — 화면이 따로 셈하지 않는다', () => {
    expect(isInHappenedOrder(crossed, ['far', 'near'])).toBe(true)
    expect(isInHappenedOrder(crossed, ['near', 'far'])).toBe(false)
  })

  it('같은 날 떠난 둘은 어느 쪽이 위여도 넘어간다 — 없는 앞뒤를 요구하지 않는다', () => {
    const sameDay = [
      { id: 'p', placeName: '평양', sentDay: 1, lagDays: 1, headline: '' },
      { id: 'q', placeName: '동래', sentDay: 1, lagDays: 3, headline: '' },
      { id: 'r', placeName: '강화', sentDay: 4, lagDays: 1, headline: '' },
    ]
    expect(isInHappenedOrder(sameDay, ['p', 'q', 'r'])).toBe(true)
    expect(isInHappenedOrder(sameDay, ['q', 'p', 'r'])).toBe(true)
    expect(isInHappenedOrder(sameDay, ['p', 'r', 'q'])).toBe(false)
  })

  it('어긋난 첫 이웃 한 쌍을 짚는다 — 넘어가지 못하게 한 바로 그 자리다', () => {
    expect(firstOutOfOrderPair(crossed, ['near', 'far']).map(d => d.id)).toEqual(['near', 'far'])
    expect(firstOutOfOrderPair(crossed, ['far', 'near'])).toBeNull()
    const three = [
      { id: 'a', placeName: '가', sentDay: 0, lagDays: 1, headline: '' },
      { id: 'b', placeName: '나', sentDay: 2, lagDays: 1, headline: '' },
      { id: 'c', placeName: '다', sentDay: 4, lagDays: 1, headline: '' },
    ]
    // 앞은 맞고 뒤가 뒤집힌 줄 — 걸리는 자리는 뒤의 한 쌍이다
    expect(firstOutOfOrderPair(three, ['a', 'c', 'b']).map(d => d.id)).toEqual(['c', 'b'])
    expect(firstOutOfOrderPair(three, ['a', 'b', 'c'])).toBeNull()
  })

  it('가장 먼저 일어난 장계를 고른다 — 같은 날이 둘이면 둘 다 내놓는다', () => {
    expect(earliestHappened(crossed, 6).map(d => d.id)).toEqual(['far'])
    expect(earliestHappened(list, 6).map(d => d.id).sort()).toEqual(['a', 'c'])
    expect(earliestHappened([], 3)).toEqual([])
  })

  it('말의 단은 1·2·3 뿐이고 그 위로 오르지 않는다 — 오래 걸린다고 더 모질어지지 않는다', () => {
    expect(orderingHintLevel(1)).toBe(1)
    expect(orderingHintLevel(2)).toBe(2)
    expect(orderingHintLevel(3)).toBe(3)
    expect(orderingHintLevel(9)).toBe(3)
    expect(orderingHintLevel(0)).toBe(1)
  })

  it('첫 단은 답이 아니라 「다시 읽어 보라」다', () => {
    const h = orderingHint(crossed, 6, ['near', 'far'], 1)
    expect(h.level).toBe(1)
    expect(h.text).toContain('아직 아니다')
    expect(h.text).toContain('다시 읽어')
    // 어느 쪽이 먼저인지는 아직 말하지 않는다
    expect(h.text).not.toContain('평양')
    expect(h.text).not.toContain('강화')
  })

  it('둘째 단은 걸린 한 쌍만 짚고, 어느 쪽이 먼저인지는 말하지 않는다', () => {
    const h = orderingHint(crossed, 6, ['near', 'far'], 2)
    expect(h.level).toBe(2)
    expect(h.text).toContain('평양')
    expect(h.text).toContain('강화')
    expect(h.text).toContain('나란히')
    // 「평양이 먼저다」를 여기서 흘리지 않는다 — 답은 셋째 단의 몫이다
    expect(h.text).not.toContain('맨 위')
    expect(h.text).not.toContain('가장 먼저 일어난 일은')
  })

  it('셋째 단에서야 가장 먼저 일어난 장계를 이름으로 짚어 준다 — 나머지는 아직 학생 몫이다', () => {
    const h = orderingHint(crossed, 6, ['near', 'far'], 3)
    expect(h.level).toBe(3)
    expect(h.text).toContain('「평양」')
    expect(h.text).toContain('맨 위')
    expect(h.text).toContain('나머지는 마저 놓아')
    // 네 번째 다섯 번째에도 같은 말을 한다 — 더 밀어붙이지 않는다
    expect(orderingHint(crossed, 6, ['near', 'far'], 7).text).toBe(h.text)
  })

  it('가장 먼저 일어난 것이 둘이면 둘을 다 대고, 어느 쪽이 위여도 좋다고 말해 준다', () => {
    const h = orderingHint(list, 6, ['b', 'a', 'c'], 3)
    expect(h.text).toContain('「강화도」')
    expect(h.text).toContain('「평양」')
    expect(h.text).toContain('어느 쪽이 위여도 좋다')
  })

  it('같은 지명이 둘이면 표제로 가리킨다 — 「강화도 장계와 강화도 장계」라고 하지 않는다', () => {
    const twin = [
      { id: 's', placeName: '강화도', sentDay: 0, lagDays: 1, headline: '물길을 재고 있다' },
      { id: 't', placeName: '강화도', sentDay: 2, lagDays: 1, headline: '갑곶에 내렸다' },
    ]
    const h = orderingHint(twin, 3, ['t', 's'], 2)
    expect(h.text).toContain('물길을 재고 있다')
    expect(h.text).toContain('갑곶에 내렸다')
  })

  it('세 단 어디에도 학생을 벌하는 말이 없다 — 오답도, 점수도, 몇 번째도 없다', () => {
    for (const tries of [1, 2, 3, 4, 12]) {
      const { text } = orderingHint(crossed, 6, ['near', 'far'], tries)
      expect(text, `${tries}번째`).not.toMatch(/오답|틀렸|틀린|점수|정답|실패|잘못|다시 한 번 더|번째|회|X|✗/)
      expect(text.length, `${tries}번째`).toBeGreaterThan(10)
    }
  })

  it('빈 판에서도 말이 끊기지 않는다 — 화면이 빈 줄을 내보내지 않게', () => {
    for (const tries of [1, 2, 3]) {
      expect(orderingHint([], 3, [], tries).text).toContain('아직 아니다')
    }
  })
})

// 실제 비트를 그대로 먹여 본다 — 검사용 목록만 잘 돌고 게임 안에서는 안 돌면
// 초록불이 아무것도 지키지 않는다. 2·3막의 장계 비트 셋을 acts.js 에서 꺼내 쓴다.
describe('게임 안의 장계 비트 셋 — 실제 데이터로 돌려본다', () => {
  const beats = ACTS.flatMap(a => beatsOf(a)).filter(b => b.kind === 'dispatch')

  it('장계 비트가 셋 있다', () => {
    expect(beats.map(b => b.id)).toEqual(['byeongin-dispatch', 'sinmi-dispatch', 'unyo-dispatch'])
  })

  it('세 비트 모두 놓아 보기가 성립한다 — 닿은 것이 둘 이상이고 보낸 날이 다르다', () => {
    for (const b of beats) {
      expect(arrivedAt(b.dispatches, b.day).length, b.id).toBeGreaterThanOrEqual(2)
      expect(shouldOfferOrdering(b.dispatches, b.day), b.id).toBe(true)
    }
  })

  it('놓아 보기를 지나도 장계의 뜻·출처·지연 일수는 하나도 달라지지 않는다', () => {
    for (const b of beats) {
      const v = orderingVerdict(b.dispatches, b.day, arrivalOrder(b.dispatches, b.day).map(d => d.id))
      for (const d of v.truth) {
        const original = b.dispatches.find(x => x.id === d.id)
        expect(d).toBe(original)                    // 베껴 만든 카드가 아니라 그 장계 그대로다
        expect(travelLabel(d)).toContain(`${original.lagDays}일`)
      }
    }
  })
})
