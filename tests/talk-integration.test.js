import { describe, it, expect } from 'vitest'
import { pressE, pickUpPacket } from '../src/main.js'
import { PALACES, baseOf } from '../src/data/palaces.js'
import { NPCS, npcCardIds, npcHandledCardIds, npcsAt } from '../src/data/npcs.js'
import { ACTS } from '../src/data/acts.js'
import { beatsOf } from '../src/systems/scenario.js'
import { createState } from '../src/core/state.js'
import { AUDIENCE_COST } from '../src/core/clock.js'
import { survive } from '../src/systems/codex.js'

// 이 파일은 tests/pickup-integration.test.js 를 대신한다. 그 파일은 「바닥에서 줍는다」를
// 지키고 있었는데, 이제 바닥에 놓인 문서가 하나도 없다 — 문서에는 그것을 들고 있는
// 사람이 있고, 임금은 그 사람에게 말을 건다(core/clock.js 머리말의 선생님 말).
//
// pressE() 는 main.js 의 onPressE() 가 실제로 거치는 그 판정이다. 여기서 재구현하지
// 않고 그대로 불러 구동한다.

const act = ACTS[1]                                    // 「양요」 — 창덕궁에 탐색하는 낮이 있다
const day = beatsOf(act).find(b => b.kind === 'explore')
const palaceDef = PALACES[act.palace]
const npcHandled = npcHandledCardIds()
// 그 낮에 실제로 서 있는 사람 하나 — 좌표가 곧 그 문서의 자리다
const person = npcsAt(baseOf, act.palace, 1).find(n => npcCardIds(n).length === 1)

function baseState(overrides = {}) {
  return { ...createState(), palace: act.palace, control: act.control, dayLeft: 2, room: null, ...overrides }
}

function press({ playerX, playerZ, taken = new Set(), state, room, dialogOpen = false, stops = [], npc = null }) {
  return pressE({
    dialogOpen, exit: day.exit, stops, room: room ?? state.room,
    palaceDef, playerX, playerZ, taken, state, npc,
  })
}

describe('바닥에서는 아무것도 주워지지 않는다', () => {
  it('그 낮에 문서를 들고 선 사람이 실제로 있다 — 이 시험이 헛돌지 않는다', () => {
    expect(person, '창덕궁 1866년에 문서를 든 사람이 없다').toBeTruthy()
  })

  // 예전에는 이 좌표에서 E 를 누르면 곧장 문서가 들렸다. 지금은 그 자리에 사람이
  // 서 있고, 그 사람을 만나지 않고 좌표만 밟는 것으로는 아무 일도 일어나지 않는다.
  it('문서의 자리를 밟기만 해서는 아무 일도 없다 — 사람을 만나야 한다', () => {
    for (const p of palaceDef.pickups) {
      const state = baseState()
      const action = press({ playerX: p.x, playerZ: p.z, state })
      expect(action.type, p.cardId + ' 를 바닥에서 주웠다').toBe('none')
      expect(state.dayLeft, '값도 치르지 않는다').toBe(2)
    }
  })

  it('그 궁의 모든 문서에 임자가 있다 — 그래서 위 검사가 참일 수 있다', () => {
    for (const p of palaceDef.pickups) {
      expect(npcHandled.has(p.cardId), p.cardId).toBe(true)
    }
  })
})

describe('사람에게 말을 걸면 그 문서가 온다', () => {
  it('가까이 선 사람이 넘어오면 「말을 건다」가 된다', () => {
    const state = baseState()
    const action = press({ playerX: person.x, playerZ: person.z, state, npc: person })
    expect(action.type).toBe('talk')
    expect(action.npc.id).toBe(person.id)
  })

  it('한 번 들으면 하나가 준다 — 문서가 몇 장이든', () => {
    const state = { ...createState(), palace: act.palace, dayLeft: 2 }
    const r = pickUpPacket({ palaceDef, cardIds: npcCardIds(person), taken: new Set(), state })
    expect(r.ok).toBe(true)
    expect(r.state.dayLeft).toBe(2 - AUDIENCE_COST)
    for (const id of npcCardIds(person)) {
      expect(r.state.sources.held).toContain(id)
      expect(r.state.sources.read).toContain(id)
    }
  })

  it('그날 들을 것을 다 들었으면 더 못 듣는다', () => {
    const state = { ...createState(), palace: act.palace, dayLeft: 0 }
    const r = pickUpPacket({ palaceDef, cardIds: npcCardIds(person), taken: new Set(), state })
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('no-time')
  })

  it('이미 받은 문서는 두 번 받지 않는다 — 값도 두 번 내지 않는다', () => {
    const state = { ...createState(), palace: act.palace, dayLeft: 2 }
    const taken = new Set(npcCardIds(person))
    const r = pickUpPacket({ palaceDef, cardIds: npcCardIds(person), taken, state })
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('none-pending')
    expect(state.dayLeft).toBe(2)
  })

  // 버그 A — 이어하기 직후의 taken 은 held 로만 다시 채워진다. 불에 잃은 카드는
  // held 에 없으므로 taken 에도 없다. taken 만 보고 판정하면 그 문서를 다시 받고
  // 값까지 치른다. 상태(isLost)를 보고 막아야 한다.
  it('불에 잃은 문서는 taken 이 비어 있어도 다시 오지 않는다', () => {
    let state = { ...createState(), palace: act.palace, dayLeft: 2 }
    const ids = npcCardIds(person)
    const first = pickUpPacket({ palaceDef, cardIds: ids, taken: new Set(), state })
    expect(first.ok).toBe(true)
    state = survive(first.state, [])                    // 아무것도 고르지 않아 다 잃는다
    expect(state.sources.lost).toEqual(expect.arrayContaining(ids))

    const afterResume = new Set(state.sources.held)     // 이어하기가 채우는 그대로
    const dayBefore = state.dayLeft
    const again = pickUpPacket({ palaceDef, cardIds: ids, taken: afterResume, state })
    expect(again.ok).toBe(false)
    expect(again.reason).toBe('none-pending')
    expect(state.dayLeft).toBe(dayBefore)
  })
})

describe('나가는 방과 나들이', () => {
  const stops = [{
    id: 'test-outing',
    room: 'seonjeongjeon',
    placeId: 'outside',
    label: 'E — 궁 밖으로 나간다',
    beat: { id: 'outing-beat', kind: 'note', title: '밖' },
  }]

  it('나가는 방에 서면 그 낮이 끝난다', () => {
    const state = baseState({ room: day.exit.room })
    const action = press({ playerX: 9999, playerZ: 9999, state })
    expect(action.type).toBe('exit-explore')
  })

  it('나들이 방에서 E — 한 번 듣는 값을 치른다', () => {
    const state = baseState({ room: 'seonjeongjeon', dayLeft: 2 })
    const action = press({ playerX: 9999, playerZ: 9999, state, stops })
    expect(action.type).toBe('stop')
    expect(action.stopId).toBe('test-outing')
    expect(action.state.dayLeft).toBe(2 - AUDIENCE_COST)
  })

  it('한 번 다녀오면 두 번 나가지 않는다', () => {
    const state = baseState({ room: 'seonjeongjeon', dayLeft: 2 })
    const first = press({ playerX: 9999, playerZ: 9999, state, stops })
    const second = press({ playerX: 9999, playerZ: 9999, state: first.state, stops })
    expect(second.type).not.toBe('stop')
  })

  it('그날 들을 것이 남지 않았으면 못 나간다 — 다녀온 표시도 안 붙는다', () => {
    const state = baseState({ room: 'seonjeongjeon', dayLeft: 0 })
    const action = press({ playerX: 9999, playerZ: 9999, state, stops })
    expect(action.type).toBe('no-time')
    expect(state.flags['stop.test-outing']).toBeUndefined()
  })

  it('나가는 방이 나들이보다 먼저다', () => {
    const clash = [{ ...stops[0], room: day.exit.room }]
    const state = baseState({ room: day.exit.room, dayLeft: 2 })
    const action = press({ playerX: 9999, playerZ: 9999, state, stops: clash })
    expect(action.type).toBe('exit-explore')
  })

  it('대화상자가 열려 있으면 무엇보다 먼저 그것부터 닫는다', () => {
    const state = baseState()
    const action = press({ playerX: person.x, playerZ: person.z, state, dialogOpen: true, npc: person })
    expect(action.type).toBe('close-dialog')
  })
})

describe('신헌의 문서 뭉치 — 한 번의 대화로 넉 장', () => {
  const sinheon = NPCS.find(n => n.id === 'sinheon')
  const cardIds = npcCardIds(sinheon)
  const def = PALACES[sinheon.palace]

  it('신헌은 실제로 여러 장을 들고 있다', () => {
    expect(cardIds.length).toBeGreaterThan(1)
  })

  it('넉 장을 한 번에 받고, 값은 한 번만 치른다', () => {
    const state = { ...createState(), palace: sinheon.palace, dayLeft: 2 }
    const r = pickUpPacket({ palaceDef: def, cardIds, taken: new Set(), state })
    expect(r.ok).toBe(true)
    expect(r.cardIds.sort()).toEqual([...cardIds].sort())
    expect(r.state.dayLeft).toBe(2 - AUDIENCE_COST)
  })

  it('그 궁에 자리가 없는 문서는 여기서 건네지 않는다 — 공짜로 새지 않게', () => {
    const state = { ...createState(), palace: sinheon.palace, dayLeft: 2 }
    const r = pickUpPacket({ palaceDef: def, cardIds: [...cardIds, 'wonnapjeon'], taken: new Set(), state })
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('not-here')
  })
})
