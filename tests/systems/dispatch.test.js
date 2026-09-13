import { describe, it, expect } from 'vitest'
import {
  arrivalDay, arrivedAt, pendingAt, latestAt, lagDaysAt, lagLabelAt,
} from '../../src/systems/dispatch.js'

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
