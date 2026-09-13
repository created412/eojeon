import { describe, it, expect } from 'vitest'
import { createState } from '../../src/core/state.js'
import { pickUp, markRead, plunder, survive, isLost, isRead } from '../../src/systems/codex.js'
import {
  LOSS_LABEL, recordLoss, lossReason, lossLabel, lostWithReason, everRead,
} from '../../src/systems/loss-log.js'

function hold(state, ids) {
  return ids.reduce((s, id) => markRead(pickUp(s, id), id), state)
}

describe('소실 사유 기록', () => {
  it('사유가 없으면 그냥 잃음이다', () => {
    expect(lossReason(createState(), 'x')).toBeNull()
    expect(lossLabel(createState(), 'x')).toBe('잃음')
  })

  it('약탈로 기록하면 프랑스라고 말한다', () => {
    const s = recordLoss(createState(), ['oegyujanggak'], 'plunder')
    expect(lossReason(s, 'oegyujanggak')).toBe('plunder')
    expect(lossLabel(s, 'oegyujanggak')).toBe(LOSS_LABEL.plunder)
    expect(lossLabel(s, 'oegyujanggak')).toContain('프랑스')
  })

  it('화재로 기록하면 불탐이라고 말한다', () => {
    const s = recordLoss(createState(), ['a', 'b'], 'fire')
    expect(lossLabel(s, 'a')).toBe('불탐')
    expect(lostWithReason(s, 'fire').sort()).toEqual(['a', 'b'])
  })

  it('두 사유가 섞여도 구분된다', () => {
    let s = recordLoss(createState(), ['p'], 'plunder')
    s = recordLoss(s, ['f'], 'fire')
    expect(lostWithReason(s, 'plunder')).toEqual(['p'])
    expect(lostWithReason(s, 'fire')).toEqual(['f'])
  })

  it('원본 상태를 건드리지 않는다', () => {
    const s0 = createState()
    recordLoss(s0, ['x'], 'fire')
    expect(s0.lostBy).toBeUndefined()
  })

  it('lostBy 가 없는 옛 세이브에서도 터지지 않는다', () => {
    const old = createState()
    delete old.lostBy
    expect(() => lossLabel(old, 'x')).not.toThrow()
    expect(lostWithReason(old, 'fire')).toEqual([])
  })
})

describe('약탈이 사초함에 미치는 결과', () => {
  it('읽었던 카드도 열람에서 빠져 선택지가 다시 잠긴다', () => {
    let s = hold(createState(), ['oegyujanggak', 'yangheonsu', 'bellonet'])
    expect(isRead(s, 'oegyujanggak')).toBe(true)
    s = plunder(s, ['oegyujanggak'])
    s = recordLoss(s, ['oegyujanggak'], 'plunder')
    expect(isRead(s, 'oegyujanggak')).toBe(false)
    expect(isLost(s, 'oegyujanggak')).toBe(true)
    expect(isRead(s, 'bellonet')).toBe(true)
    expect(lossLabel(s, 'oegyujanggak')).toContain('프랑스')
  })

  it('양헌수 장계는 약탈에 휩쓸리지 않는다 — 강화도 서고에 있던 물건이 아니다 (R17)', () => {
    let s = hold(createState(), ['oegyujanggak', 'yangheonsu'])
    s = plunder(s, ['oegyujanggak'])
    s = recordLoss(s, ['oegyujanggak'], 'plunder')
    expect(isLost(s, 'yangheonsu')).toBe(false)
    expect(isRead(s, 'yangheonsu')).toBe(true)
    expect(lossReason(s, 'yangheonsu')).toBeNull()
  })

  it('약탈당한 카드는 다시 주울 수 없다', () => {
    let s = plunder(hold(createState(), ['oegyujanggak']), ['oegyujanggak'])
    s = pickUp(s, 'oegyujanggak')
    expect(s.sources.held).toEqual([])
  })

  it('불로 잃은 것과 약탈로 잃은 것이 사초함에서 다르게 보인다', () => {
    let s = hold(createState(), ['a', 'b', 'c', 'd'])
    s = plunder(s, ['a'])
    s = recordLoss(s, ['a'], 'plunder')
    const doomed = s.sources.held.filter(id => !['b'].includes(id))
    s = survive(s, ['b'])
    s = recordLoss(s, doomed, 'fire')
    expect(lossLabel(s, 'a')).toBe(LOSS_LABEL.plunder)
    expect(lossLabel(s, 'c')).toBe(LOSS_LABEL.fire)
    expect(s.sources.held).toEqual(['b'])
  })
})

// 2단계 Important 1 — 잃은 문서도 잃기 전에는 읽었다. sources.read 만 보면 그 사실이
// 지워진다(codex.js 의 lose() 가 잃을 때 read 에서도 지운다, 잠금). 학생의 기록은
// 언제나 everRead() 를 써야 한다.
describe('everRead — 잃은 문서도 "읽었던 것"에서 빠지지 않는다', () => {
  it('아무것도 잃지 않았으면 read 와 같다', () => {
    const s = hold(createState(), ['a', 'b'])
    expect(everRead(s).sort()).toEqual(['a', 'b'])
  })

  it('불에 잃은 문서도 읽은 것으로 남는다 — sources.read 는 이미 지워졌다', () => {
    let s = hold(createState(), ['a', 'b', 'c'])
    s = recordLoss(survive(s, ['a']), ['b', 'c'], 'fire')
    expect(s.sources.read).toEqual(['a'])              // codex.js 가 지운 뒤의 값
    expect(everRead(s).sort()).toEqual(['a', 'b', 'c']) // 그래도 셋 다 읽었다
  })

  it('약탈로 잃은 문서도 읽은 것으로 남는다', () => {
    let s = hold(createState(), ['oegyujanggak', 'yangheonsu'])
    s = recordLoss(plunder(s, ['oegyujanggak']), ['oegyujanggak'], 'plunder')
    expect(everRead(s).sort()).toEqual(['oegyujanggak', 'yangheonsu'])
  })

  it('같은 카드를 두 번 세지 않는다', () => {
    const s = hold(createState(), ['a'])
    expect(everRead(s)).toEqual(['a'])
  })
})
