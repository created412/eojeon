import { describe, it, expect } from 'vitest'
import { createState } from '../../src/core/state.js'
import { pickUp, markRead, isRead, isLost, plunder, survive } from '../../src/systems/codex.js'

const held = (s) => s.sources.held
const read = (s) => s.sources.read
const lost = (s) => s.sources.lost

describe('사초함', () => {
  it('사료를 주우면 보유에 들어간다', () => {
    const s = pickUp(createState(), 'cheokhwabi')
    expect(held(s)).toEqual(['cheokhwabi'])
  })

  it('같은 사료를 두 번 주워도 하나다', () => {
    let s = pickUp(createState(), 'cheokhwabi')
    s = pickUp(s, 'cheokhwabi')
    expect(held(s)).toEqual(['cheokhwabi'])
  })

  it('원본 상태를 건드리지 않는다', () => {
    const s = createState()
    pickUp(s, 'cheokhwabi')
    expect(held(s)).toEqual([])
  })

  it('보유한 사료만 읽을 수 있다', () => {
    const s = markRead(createState(), 'cheokhwabi')
    expect(isRead(s, 'cheokhwabi')).toBe(false)
  })

  it('주운 사료를 읽으면 열람으로 들어간다', () => {
    let s = pickUp(createState(), 'cheokhwabi')
    s = markRead(s, 'cheokhwabi')
    expect(isRead(s, 'cheokhwabi')).toBe(true)
  })

  it('약탈당하면 보유·열람에서 빠지고 소실로 간다', () => {
    let s = pickUp(createState(), 'oegyujanggak')
    s = markRead(s, 'oegyujanggak')
    s = plunder(s, ['oegyujanggak'])
    expect(held(s)).toEqual([])
    expect(read(s)).toEqual([])
    expect(lost(s)).toEqual(['oegyujanggak'])
    expect(isLost(s, 'oegyujanggak')).toBe(true)
    expect(isRead(s, 'oegyujanggak')).toBe(false)
  })

  it('소실된 사료는 다시 주울 수 없다', () => {
    let s = plunder(pickUp(createState(), 'oegyujanggak'), ['oegyujanggak'])
    s = pickUp(s, 'oegyujanggak')
    expect(held(s)).toEqual([])
    expect(lost(s)).toEqual(['oegyujanggak'])
  })

  it('화재에서 고른 3장만 남는다', () => {
    let s = createState()
    for (const id of ['a', 'b', 'c', 'd', 'e']) s = markRead(pickUp(s, id), id)
    s = survive(s, ['a', 'c', 'e'])
    expect(held(s).sort()).toEqual(['a', 'c', 'e'])
    expect(read(s).sort()).toEqual(['a', 'c', 'e'])
    expect(lost(s).sort()).toEqual(['b', 'd'])
  })

  it('4장 이상 고르면 앞 3장만 살아남는다', () => {
    let s = createState()
    for (const id of ['a', 'b', 'c', 'd']) s = pickUp(s, id)
    s = survive(s, ['a', 'b', 'c', 'd'])
    expect(held(s).sort()).toEqual(['a', 'b', 'c'])
    expect(lost(s)).toEqual(['d'])
  })

  it('보유하지 않은 것을 고르면 무시한다', () => {
    let s = pickUp(createState(), 'a')
    s = survive(s, ['a', '없는카드'])
    expect(held(s)).toEqual(['a'])
    expect(lost(s)).toEqual([])
  })

  // D2 화재 — 아무것도 고르지 않으면 가진 것을 전부 잃는다. 이 경로는 크래시하지
  // 않아야 하고, held·read 는 비고 lost 가 전부를 받아야 한다.
  it('아무것도 고르지 않으면(빈 배열) 가진 것을 전부 잃는다', () => {
    let s = createState()
    for (const id of ['a', 'b', 'c']) s = markRead(pickUp(s, id), id)
    s = survive(s, [])
    expect(held(s)).toEqual([])
    expect(read(s)).toEqual([])
    expect(lost(s).sort()).toEqual(['a', 'b', 'c'])
  })

  it('가진 것이 없을 때 빈 배열로 골라도 크래시하지 않는다', () => {
    const s = survive(createState(), [])
    expect(held(s)).toEqual([])
    expect(lost(s)).toEqual([])
  })
})
