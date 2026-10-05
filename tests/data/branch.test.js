import { describe, it, expect } from 'vitest'
import { actById } from '../../src/data/acts.js'
import { dryRun, sameHistory, knowledgeDiff, unsafeConditionalBeats } from '../../src/systems/branch.js'
import { createState } from '../../src/core/state.js'

// 4막에는 이제 갈림길이 없다(2026-10-06). 예전에는 대조전에 닿았는가(queen-lost)로 두 길이
// 갈렸다 — 선생님: 「왕비를 그냥 없애버리고.」 그 줄을 걷어 내면서 깃발도 함께 사라졌다.
// 갈림길 규칙 자체는 5막 C3(아래)가 그대로 붙든다.
const imo = actById('imo')

describe('4막 — 갈림길이 없다', () => {
  it('깃발로 갈리는 비트가 하나도 없다', () => {
    expect(imo.beats.filter(b => b.whenFlag || b.unlessFlag || b.flag)).toEqual([])
    expect(imo.beats.filter(b => b.caughtFlag)).toEqual([])
  })

  it('깃발을 미리 심어도 지나가는 비트가 같다', () => {
    const plain = dryRun(imo, createState(), 3)
    const flagged = dryRun(imo, { ...createState(), flags: { 'queen-lost': true } }, 3)
    expect(plain.played).toEqual(flagged.played)
    expect(sameHistory(plain.state, flagged.state)).toBe(true)
  })

  it('조작권 D 로 끝나고, 제물포·속방 두 카드를 쥐고 나온다', () => {
    const run = dryRun(imo, createState(), 3)
    expect(run.state.control).toBe('D')
    expect(run.state.sources.read).toContain('jemulpo4')
    expect(run.state.sources.read).toContain('sokbang')
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
// 예전에는 늦으면 「청군의 손에 이끌려 나왔다」 한 화면이 갈렸다. 2026-10-06 에 촉박이 「늦으면
// 다시」로 바뀌어 갈림길이 사라졌다. 홍영식·박영교가 남는다는 것은 이제 누구에게나 같다.
describe('C3 — 갈림길이 없다. 홍영식과 박영교는 누구에게나 똑같이 남는다', () => {
  const gapsin = actById('gapsin')
  const run = dryRun(gapsin, createState(), 4)

  it('깃발로 갈리는 비트가 없다', () => {
    expect(gapsin.beats.filter(b => b.whenFlag || b.unlessFlag || b.caughtFlag)).toEqual([])
  })

  it('깃발을 미리 심어도 지나가는 장면이 같다', () => {
    const flagged = dryRun(gapsin, { ...createState(), flags: { 'flight-caught': true } }, 4)
    expect(flagged.played).toEqual(run.played)
    expect(sameHistory(run.state, flagged.state)).toBe(true)
  })

  it('홍영식·박영교의 장면을 지나고, 청군의 영방에서 조작권 없이 끝난다', () => {
    expect(run.historical).toContain('gapsin-hong')
    expect(run.state.palace).toBe('ojoyu')
    expect(run.state.control).toBe('D')
    expect(run.state.sources.read).toContain('gapsin-memoir')
  })

  it('조건이 붙은 비트가 궁·조작권·낮을 건드리지 않는다', () => {
    expect(unsafeConditionalBeats(gapsin)).toEqual([])
  })
})
