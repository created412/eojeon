import { describe, it, expect } from 'vitest'
import { objectiveLine, towardParticle } from '../../src/systems/freedom.js'
import { PALACES } from '../../src/data/palaces.js'

// 선생님(2026-09-29) 지적 #16: 「남은 일 3곳」이라고만 떠 있으면 무엇을 해야 하는지
// 모른다. **누구에게 가서 무엇을 하는지**가 보여야 한다.

const DEF = {
  rooms: [
    { id: 'sajeongjeon', name: '사정전' },
    { id: 'gyujanggak', name: '규장각' },
    { id: 'buyongji', name: '부용지' },
    { id: 'gwanmulheon', name: '관물헌' },
  ],
}

const opt = (over = {}) => ({ id: 'npc:x', label: '최익현에게 말을 건다', room: 'sajeongjeon', ...over })

describe('으로/로 — 방 이름에 붙는 토씨', () => {
  it('받침이 있으면 「으로」다', () => {
    expect(towardParticle('사정전')).toBe('으로')
    expect(towardParticle('규장각')).toBe('으로')
    expect(towardParticle('관물헌')).toBe('으로')
  })

  it('받침이 없으면 「로」다', () => {
    expect(towardParticle('부용지')).toBe('로')
    expect(towardParticle('노안당아')).toBe('로')
  })

  it('받침이 ㄹ 이면 「로」다 — 「으로」를 붙이면 말이 안 된다', () => {
    expect(towardParticle('경복궁')).toBe('으로')
    expect(towardParticle('교울')).toBe('로')
  })

  it('한글이 아니거나 비어 있으면 「으로」로 둔다 — 터지지 않는다', () => {
    expect(towardParticle('')).toBe('으로')
    expect(towardParticle(null)).toBe('으로')
    expect(towardParticle('Hall')).toBe('으로')
  })
})

describe('지금 할 일 한 줄', () => {
  it('어디로 가서 무엇을 하는지 한 줄에 담는다', () => {
    const line = objectiveLine([opt()], DEF)
    expect(line).toContain('사정전')
    expect(line).toContain('최익현')
    expect(line).toContain('말을 건다')
  })

  it('남은 일이 여럿이면 몇 곳 남았는지도 함께 적는다', () => {
    const line = objectiveLine([opt(), opt({ id: 'npc:y', room: 'gyujanggak' }), opt({ id: 'npc:z' })], DEF)
    expect(line).toMatch(/3/)
  })

  it('한 곳만 남았으면 셈을 붙이지 않는다 — 「남은 일 1곳」은 군더더기다', () => {
    const line = objectiveLine([opt()], DEF)
    expect(line).not.toMatch(/1\s*곳/)
  })

  it('가까운 곳을 짚어 주면 그곳을 말한다', () => {
    const near = opt({ id: 'npc:y', label: '『만국공법』을 살펴본다', room: 'gyujanggak' })
    const line = objectiveLine([opt(), near], DEF, near)
    expect(line).toContain('규장각')
    expect(line).toContain('만국공법')
  })

  it('다 했으면 null 이다 — 화면이 「나가는 곳으로」를 스스로 고르게 한다', () => {
    expect(objectiveLine([], DEF)).toBeNull()
    expect(objectiveLine([opt({ done: true })], DEF)).toBeNull()
  })

  it('막힌 일·끈 일은 남은 일로 세지 않는다', () => {
    expect(objectiveLine([opt({ blocked: true })], DEF)).toBeNull()
    expect(objectiveLine([opt({ disabled: true })], DEF)).toBeNull()
  })

  it('방을 모르는 일이면 방 이름 없이도 무엇을 할지는 말한다', () => {
    const line = objectiveLine([opt({ room: 'nowhere' })], DEF)
    expect(line).toContain('말을 건다')
    expect(line).not.toContain('undefined')
  })

  it('실제 궁 데이터로도 방 이름이 나온다', () => {
    const line = objectiveLine([opt({ room: 'sajeongjeon' })], PALACES.gyeongbok)
    expect(line).toContain('사정전')
  })
})
