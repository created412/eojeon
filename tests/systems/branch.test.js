import { describe, it, expect } from 'vitest'
import {
  historyOf, sameHistory, knowledgeDiff, dryRun, unsafeConditionalBeats,
} from '../../src/systems/branch.js'
import { createState } from '../../src/core/state.js'

// 실패 분기의 모양만 그대로 베낀 가짜 막. 진짜 4막은 Task 11 이 만들고,
// tests/data/branch.test.js 가 이 도구로 그 진짜 데이터를 검사한다.
const act = {
  id: 'fake',
  title: '가짜',
  palace: 'changdeok',
  control: 'A',
  beats: [
    { id: 'rush',    kind: 'rush', caughtFlag: 'queen-lost' },
    { id: 'letter',  kind: 'note', unlessFlag: 'queen-lost', flag: 'queen-alive-known' },
    { id: 'funeral', kind: 'note', whenFlag: 'queen-lost' },
    { id: 'truth',   kind: 'note', historical: true },
    { id: 'seized',  kind: 'note', historical: true, control: 'D', grantCard: 'sokbang' },
  ],
}

function afterRush(caught) {
  const s = createState()
  return caught ? { ...s, flags: { ...s.flags, 'queen-lost': true } } : s
}

describe('historyOf — 역사에 해당하는 것만 뽑는다', () => {
  it('깃발과 결정과 비트 번호는 역사가 아니다', () => {
    const a = { ...createState(), flags: { x: true }, decisions: [{ choiceId: 'p' }], beatIndex: 3, room: 'injeongjeon' }
    const b = { ...createState(), flags: {}, decisions: [], beatIndex: 7, room: null }
    expect(sameHistory(a, b)).toBe(true)
  })

  it('궁·조작권·이어 기록·사초함·쌀 지수는 역사다', () => {
    const s = createState()
    expect(sameHistory(s, { ...s, palace: 'gyeongbok' })).toBe(false)
    expect(sameHistory(s, { ...s, control: 'D' })).toBe(false)
    expect(sameHistory(s, { ...s, moves: [{ year: 1884 }] })).toBe(false)
    expect(sameHistory(s, { ...s, riceIndex: 999 })).toBe(false)
    expect(sameHistory(s, { ...s, sources: { held: ['x'], read: [], lost: [] } })).toBe(false)
  })

  it('knowledgeDiff 는 값이 다른 깃발 이름만 준다', () => {
    const a = { flags: { p: true, q: true } }
    const b = { flags: { q: true } }
    expect(knowledgeDiff(a, b)).toEqual(['p'])
    expect(knowledgeDiff(a, a)).toEqual([])
  })
})

describe('dryRun — 두 경로를 걸어가 비교한다', () => {
  const ok = dryRun(act, afterRush(false), 0)
  const late = dryRun(act, afterRush(true), 0)

  it('재생되는 비트가 갈린다 — 성공은 밀서를, 실패는 국상을 본다', () => {
    expect(ok.played).toEqual(['rush', 'letter', 'truth', 'seized'])
    expect(late.played).toEqual(['rush', 'funeral', 'truth', 'seized'])
  })

  it('그러나 「실제로 일어난 일」 비트는 두 경로가 똑같다', () => {
    expect(ok.historical).toEqual(late.historical)
    expect(ok.historical).toEqual(['truth', 'seized'])
  })

  it('끝난 자리의 역사가 같다 — 실패해도 역사는 바뀌지 않는다', () => {
    expect(sameHistory(ok.state, late.state)).toBe(true)
    expect(ok.state.control).toBe('D')
    expect(late.state.control).toBe('D')
  })

  it('두 경로가 끝내 같은 사초함을 가진다 — 비트가 쥐여 준 카드까지 같다', () => {
    expect(ok.state.sources.read).toEqual(['sokbang'])
    expect(late.state.sources.read).toEqual(['sokbang'])
  })

  it('갈린 것은 아는 것뿐이다', () => {
    expect(knowledgeDiff(ok.state, late.state).sort()).toEqual(['queen-alive-known', 'queen-lost'])
  })

  it('막의 모든 비트를 지나 끝난다 — 건너뛴 비트도 번호는 넘어간다', () => {
    expect(ok.state.beatIndex).toBe(act.beats.length)
    expect(late.state.beatIndex).toBe(act.beats.length)
  })
})

describe('조건부 plunder — 어느 문서가 살아남았는지도 역사다', () => {
  // 리뷰어가 구성한 반례를 그대로 옮긴다: 붙잡힌 쪽에서만 속방이 사초함에서 사라진다.
  // 이건 「무엇을 아는가」가 아니라 sources.lost 다 — historyOf() 가 역사라고 부르는 자리다.
  const actWithLoot = {
    ...act,
    beats: [...act.beats, { id: 'loot', kind: 'plunder', whenFlag: 'queen-lost', cardIds: ['sokbang'] }],
  }

  it('잡힌 쪽만 속방을 잃는다 — sameHistory 는 false 여야 한다', () => {
    const ok = dryRun(actWithLoot, afterRush(false), 0)
    const late = dryRun(actWithLoot, afterRush(true), 0)
    expect(ok.state.sources.lost).toEqual([])
    expect(late.state.sources.lost).toEqual(['sokbang'])
    expect(sameHistory(ok.state, late.state)).toBe(false)
  })

  // [리뷰 I4] 이제 두 가지 근거로 걸린다 — 종류(plunder)로도, 카드를 지목한다는 것
  // (cardIds)으로도. 예전에는 kind 하나뿐이어서, plunder 가 아니면서 카드만 지목하는
  // 비트는 조용히 통과했다. 정확한 배열 대신 「이 근거로 걸렸는가」를 묻는다.
  it('unsafeConditionalBeats 가 조건부 plunder 를 잡는다', () => {
    const bad = unsafeConditionalBeats(actWithLoot)
    expect(bad).toContainEqual({ id: 'loot', field: 'kind' })
    expect(bad).toContainEqual({ id: 'loot', field: 'cardIds' })
    expect(bad.every(b => b.id === 'loot')).toBe(true)
  })

})

describe('국상(edict) 비트 — 두 경로 모두 지나가야 한다 (설계서 7.6 · Task 9)', () => {
  // imo-gukjang 의 모양만 그대로 베낀 가짜 비트: 조건이 전혀 없고 historical:true다.
  // 실제 비트는 main.js 의 GUKJANG_BEAT 다 — 진짜 데이터는 Task 11이 4막에 넣는다.
  const actWithEdict = {
    ...act,
    beats: [...act.beats, { id: 'gukjang', kind: 'edict', historical: true }],
  }
  const ok = dryRun(actWithEdict, afterRush(false), 0)
  const late = dryRun(actWithEdict, afterRush(true), 0)

  it('성공 경로도 실패 경로도 국상 비트를 재생한다 — 실패가 막지 못하고, 성공도 막지 못한다', () => {
    expect(ok.played).toContain('gukjang')
    expect(late.played).toContain('gukjang')
  })

  it('국상은 역사(historical)로 셈해진다 — 두 경로가 똑같이', () => {
    expect(ok.historical).toContain('gukjang')
    expect(late.historical).toContain('gukjang')
  })

  it('끝난 자리의 역사가 같다 — 알고 내렸든 모르고 내렸든 하교 자체는 같다', () => {
    expect(sameHistory(ok.state, late.state)).toBe(true)
  })

  it('unsafeConditionalBeats 는 historical 비트에 조건이 걸리면 잡는다 — 국상이 한쪽 경로만 일어나는 데이터를 막는다', () => {
    const bad = { ...act, beats: [{ id: 'gukjang', kind: 'edict', historical: true, whenFlag: 'queen-lost' }] }
    expect(unsafeConditionalBeats(bad)).toEqual([{ id: 'gukjang', field: 'historical' }])
  })
})

describe('탈출(escape) 비트 — 조건이 붙어도 안전 필드는 건드리지 않는다 (Task 8)', () => {
  // imo-escape 의 모양만 그대로 베낀 가짜 비트. 학생이 고른 변장·맡길 사람은
  // flags['escape.disguise'] 등으로 남지, 비트 자체의 flag 필드가 아니다 —
  // 그래서 historyOf() 가 보는 값(궁·조작권·낮·사초함)은 애초에 건드리지 않는다.
  const actWithEscape = { ...act, beats: [{ id: 'escape', kind: 'escape', unlessFlag: 'queen-lost' }] }

  it('조건부 escape 는 unsafeConditionalBeats 에 잡히지 않는다', () => {
    expect(unsafeConditionalBeats(actWithEscape)).toEqual([])
  })

  it('붙잡힌 쪽은 이 비트를 아예 지나지 않는다 — 대조전에 서 보지도 못한다', () => {
    const late = dryRun(actWithEscape, afterRush(true), 0)
    expect(late.played).not.toContain('escape')
  })

  it('제때 닿은 쪽은 지나가지만, 역사(궁·조작권·사초함)는 건드리지 않는다', () => {
    const ok = dryRun(actWithEscape, afterRush(false), 0)
    const untouched = dryRun({ ...actWithEscape, beats: [] }, afterRush(false), 0)
    expect(ok.played).toContain('escape')
    expect(sameHistory(ok.state, untouched.state)).toBe(true)
  })
})

describe('조건 비트가 궁·조작권·낮을 건드리면 잡아낸다', () => {
  it('깨끗한 막은 빈 배열', () => {
    expect(unsafeConditionalBeats(act)).toEqual([])
  })

  it('조건이 붙은 비트가 궁을 바꾸면 잡는다', () => {
    const bad = { ...act, beats: [{ id: 'x', kind: 'note', whenFlag: 'p', palace: 'gyeongbok' }] }
    expect(unsafeConditionalBeats(bad)).toEqual([{ id: 'x', field: 'palace' }])
  })

  it('조작권과 낮도 마찬가지다', () => {
    const bad = {
      ...act,
      beats: [
        { id: 'c', kind: 'note', unlessFlag: 'p', control: 'D' },
        { id: 'd', kind: 'explore', whenFlag: 'p', dayUnits: 6 },
      ],
    }
    expect(unsafeConditionalBeats(bad).map(b => b.field).sort()).toEqual(['control'])
  })
})
