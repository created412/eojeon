import { describe, it, expect } from 'vitest'
import { actById } from '../../src/data/acts.js'
import { dryRun, sameHistory, knowledgeDiff, unsafeConditionalBeats } from '../../src/systems/branch.js'
import { createState } from '../../src/core/state.js'

// 4막을 두 번 걸어간다. 한 번은 대조전에 닿은 학생으로, 한 번은 늦은 학생으로.
// C2 의 caughtFlag 는 실제 플레이에서 playRush() 가 붙이므로 여기서는 그 자리에 심는다.
const imo = actById('imo')
const onTime = dryRun(imo, createState(), 3)
const tooLate = dryRun(imo, { ...createState(), flags: { 'queen-lost': true } }, 3)

describe('7.6 — 실패해도 역사는 바뀌지 않는다', () => {
  it('두 경로가 서로 다른 것을 본다', () => {
    expect(onTime.played).not.toEqual(tooLate.played)
    expect(onTime.played).toContain('imo-escape')
    expect(onTime.played).toContain('imo-letter')
    expect(onTime.played).toContain('imo-known')
    expect(tooLate.played).toContain('imo-declared')
    expect(tooLate.played).not.toContain('imo-escape')
    expect(tooLate.played).not.toContain('imo-letter')
  })

  it('그러나 「실제로 일어난 일」 비트는 두 경로가 한 글자도 다르지 않다', () => {
    expect(onTime.historical).toEqual(tooLate.historical)
    expect(onTime.historical.length).toBeGreaterThan(0)
    expect(onTime.historical).toContain('imo-gukjang')   // 국상은 두 경로 모두 지나간다
    expect(onTime.historical).toContain('imo-fact')      // 왕비는 어느 쪽이든 살아 있었다
  })

  it('끝난 자리의 역사가 같다 — 궁·조작권·이어 기록·사초함·쌀 지수가 전부 같다', () => {
    expect(sameHistory(onTime.state, tooLate.state)).toBe(true)
  })

  it('두 경로가 같은 카드를 쥐고 막을 나온다', () => {
    expect(onTime.state.sources.read.sort()).toEqual(tooLate.state.sources.read.sort())
    expect(onTime.state.sources.read).toContain('jemulpo4')
    expect(onTime.state.sources.read).toContain('sokbang')
  })

  it('두 경로 모두 조작권 D 로 끝난다 — 늦지 않았어도 아버지는 돌아온다', () => {
    expect(onTime.state.control).toBe('D')
    expect(tooLate.state.control).toBe('D')
  })

  it('갈린 것은 오직 깃발이다 — 그리고 그 깃발은 「왕이 무엇을 아는가」다', () => {
    const diff = knowledgeDiff(onTime.state, tooLate.state).sort()
    expect(diff).toEqual(['queen-alive-known', 'queen-lost'])
  })

  it('조건이 붙은 비트가 궁·조작권·낮을 건드리지 않는다 — 정적으로 걷는 도구들이 거짓을 말하지 않게', () => {
    expect(unsafeConditionalBeats(imo)).toEqual([])
  })

  it('두 경로의 비트 수가 같다 — 건너뛴 자리도 번호는 넘어간다', () => {
    expect(onTime.state.beatIndex).toBe(tooLate.state.beatIndex)
  })
})

describe('모든 막이 같은 규칙을 지킨다', () => {
  it('어느 막에도 궁·조작권·낮을 건드리는 조건 비트가 없다', async () => {
    const { ACTS } = await import('../../src/data/acts.js')
    for (const act of ACTS) expect(unsafeConditionalBeats(act), act.id).toEqual([])
  })
})

// [리뷰 I4] unsafeConditionalBeats() 가 grantCard·cardIds 를 안 보고 있었다.
// 방금 닫은 hasWayForward 구멍과 같은 모양이다 — 정적 판정이 데이터의 한 갈래만 보아
// 영원히 초록불이다. 오늘 위반하는 데이터는 없지만, 다음에 누가 조건부 지급을 쓰면
// 두 경로의 사초함이 갈리고도 아무것도 울지 않는다. 가짜 비트로 거부를 확인한다.
describe('조건부 비트가 사초함을 갈라놓지 못한다 (리뷰 I4)', () => {
  const conditionalGrant = {
    id: 'poisoned-act',
    palace: 'changdeok',
    control: 'A',
    beats: [
      { id: 'ok', kind: 'note', title: '무조건' },
      // 성공한 학생만 이 카드를 받는다 → 두 경로의 sources.read 가 갈린다
      { id: 'bad-grant', kind: 'note', unlessFlag: 'queen-lost', grantCard: 'sokbang' },
      // 실패한 학생만 이 카드를 잃는다 → 두 경로의 sources.held 가 갈린다
      { id: 'bad-take', kind: 'note', whenFlag: 'queen-lost', cardIds: ['jemulpo4'] },
    ],
  }

  it('조건이 붙은 비트가 카드를 쥐여 주면 거부된다', () => {
    const bad = unsafeConditionalBeats(conditionalGrant)
    expect(bad).toContainEqual({ id: 'bad-grant', field: 'grantCard' })
  })

  it('조건이 붙은 비트가 카드를 지목해도 거부된다', () => {
    const bad = unsafeConditionalBeats(conditionalGrant)
    expect(bad).toContainEqual({ id: 'bad-take', field: 'cardIds' })
  })

  it('조건 없는 비트는 카드를 줘도 통과한다 — 4막의 제물포·속방이 그것이다', () => {
    expect(unsafeConditionalBeats({
      beats: [{ id: 'fine', kind: 'note', grantCard: 'sokbang' }],
    })).toEqual([])
  })

  it('실제 4막은 이 판정을 통과한다 — 조건부 지급이 하나도 없다', () => {
    expect(unsafeConditionalBeats(imo)).toEqual([])
  })
})

// ── 5막 C3 — 정변 사흘째 밤 ────────────────────────────────────────
// 늦어도 게임 오버 화면은 없다. 달라지는 것은 깃발 하나뿐이고, 홍영식·박영교가
// 남는다는 것도 북묘·영방으로 이어진다는 것도 두 경로가 똑같다.
describe('C3 — 늦어도 홍영식과 박영교는 똑같이 남는다', () => {
  const gapsin = actById('gapsin')
  const flew = dryRun(gapsin, createState(), 4)
  const caught = dryRun(gapsin, { ...createState(), flags: { 'flight-caught': true } }, 4)

  it('「실제로 일어난 일」 비트가 두 경로에서 같다', () => {
    expect(flew.historical).toEqual(caught.historical)
    expect(flew.historical).toContain('gapsin-hong')
  })

  it('끝난 자리의 역사가 같다 — 마지막에 선 곳도 조작권도 같다', () => {
    expect(sameHistory(flew.state, caught.state)).toBe(true)
    expect(flew.state.palace).toBe('ojoyu')
    expect(caught.state.palace).toBe('ojoyu')
    expect(flew.state.control).toBe('D')
  })

  it('갈린 것은 깃발뿐이다', () => {
    expect(knowledgeDiff(flew.state, caught.state)).toEqual(['flight-caught'])
  })

  it('두 경로가 서로 다른 것을 본다 — 그러나 다른 것은 그 한 화면뿐이다', () => {
    expect(flew.played).toContain('gapsin-flight-self')
    expect(caught.played).toContain('gapsin-flight-caught')
    expect(flew.played.filter(id => !caught.played.includes(id))).toEqual(['gapsin-flight-self'])
    expect(caught.played.filter(id => !flew.played.includes(id))).toEqual(['gapsin-flight-caught'])
  })

  it('두 경로 모두 5막의 두 카드를 쥐고 나온다', () => {
    for (const s of [flew.state, caught.state]) {
      expect(s.sources.read).toContain('gapsin-memoir')
    }
  })

  it('조건이 붙은 비트가 궁·조작권·낮을 건드리지 않는다', () => {
    expect(unsafeConditionalBeats(gapsin)).toEqual([])
  })
})
