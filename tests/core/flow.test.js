import { describe, it, expect } from 'vitest'
import {
  PHASES, actAt, nextActIndex, isLastAct, palaceChanged, createFlow,
} from '../../src/core/flow.js'
import { createState } from '../../src/core/state.js'

const acts = [
  { id: 'a1', title: '첫 막', palace: 'p1', control: 'C' },
  { id: 'a2', title: '둘째 막', palace: 'p2', control: 'B' },
]
const palaces = {
  p1: { id: 'p1', name: '첫 궁' },
  p2: { id: 'p2', name: '둘째 궁' },
}

function rig() {
  const log = []
  const flow = createFlow({
    acts,
    state: { palace: 'p1', control: 'C' },
    palaces,
    resources: {
      setPalace: (def) => log.push(`setPalace:${def.id}`),
      perPalace: {
        map: (def) => ({ id: def.id, dispose: () => log.push(`dispose:map:${def.id}`) }),
      },
      lifetime: [
        { dispose: () => log.push('dispose:input') },
        { dispose: () => log.push('dispose:keydown') },
      ],
    },
  })
  return { flow, log }
}

describe('막 넘기기', () => {
  it('막이 셋이 되어도 인덱스로 더듬지 않는다', () => {
    expect(actAt(acts, 0).id).toBe('a1')
    expect(actAt(acts, 9)).toBeNull()
    expect(nextActIndex(acts, 0)).toBe(1)
    expect(nextActIndex(acts, 1)).toBeNull()
    expect(isLastAct(acts, 1)).toBe(true)
  })

  it('마지막 막에서 nextAct 는 false 를 돌려주고 자리를 지킨다', () => {
    const { flow } = rig()
    expect(flow.nextAct()).toBe(true)
    expect(flow.act().id).toBe('a2')
    expect(flow.nextAct()).toBe(false)
    expect(flow.actIndex).toBe(1)
    expect(flow.isLast()).toBe(true)
  })
})

describe('국면', () => {
  it('모르는 국면은 조용히 넘어가지 않고 던진다', () => {
    const { flow } = rig()
    expect(flow.phase).toBe('boot')
    expect(flow.setPhase('day')).toBe('day')
    expect(() => flow.setPhase('낮')).toThrow()
    expect(PHASES).toContain('rush')
  })
})

describe('궁 전환 — 여기서 새면 막마다 샌다', () => {
  it('같은 궁을 두 번 부르면 아무것도 다시 만들지 않는다', () => {
    const { flow, log } = rig()
    expect(flow.syncPalace('p1')).toBe(true)
    expect(flow.syncPalace('p1')).toBe(false)
    expect(log).toEqual(['setPalace:p1'])
    expect(flow.get('map').id).toBe('p1')
  })

  it('궁이 바뀌면 먼저 부수고 그다음에 세운다', () => {
    const { flow, log } = rig()
    flow.syncPalace('p1')
    log.length = 0
    expect(flow.syncPalace('p2')).toBe(true)
    expect(log).toEqual(['dispose:map:p1', 'setPalace:p2'])
    expect(flow.get('map').id).toBe('p2')
    expect(flow.palace()).toBe('p2')
  })

  it('모르는 궁은 던지고, 매여 있던 것을 부수지 않는다', () => {
    const { flow, log } = rig()
    flow.syncPalace('p1')
    log.length = 0
    expect(() => flow.syncPalace('없는궁')).toThrow()
    expect(log).toEqual([])
    expect(flow.get('map').id).toBe('p1')
  })

  it('palaceChanged 는 화재 변형도 다른 궁으로 본다', () => {
    expect(palaceChanged('gyeongbok', 'gyeongbok_burnt')).toBe(true)
    expect(palaceChanged('gyeongbok', 'gyeongbok')).toBe(false)
  })
})

describe('dispose — 한 번도 안 불리던 것을 부른다', () => {
  it('궁 자원과 수명 자원을 모두 부순다', () => {
    const { flow, log } = rig()
    flow.syncPalace('p1')
    log.length = 0
    flow.dispose()
    expect(log).toEqual(['dispose:map:p1', 'dispose:input', 'dispose:keydown'])
    expect(flow.get('map')).toBeNull()
    expect(flow.phase).toBe('done')
  })

  it('dispose 를 두 번 불러도 궁 자원을 두 번 부수지 않는다', () => {
    const { flow, log } = rig()
    flow.syncPalace('p1')
    flow.dispose()
    log.length = 0
    flow.dispose()
    expect(log.filter(l => l.startsWith('dispose:map'))).toEqual([])
  })
})

describe('버그 C — 막 번호는 상태에 있고, 클로저에 따로 있지 않다', () => {
  const acts = [
    { id: 'a0', title: '0', palace: 'changdeok', control: 'C', beats: [] },
    { id: 'a1', title: '1', palace: 'changdeok', control: 'C', beats: [] },
    { id: 'a2', title: '2', palace: 'changdeok', control: 'C', beats: [] },
  ]

  it('상태를 갈아 끼우면 막도 따라온다 — 손으로 밀어 주지 않아도 된다', () => {
    const flow = createFlow({ acts, state: createState() })
    expect(flow.actIndex).toBe(0)
    flow.state = { ...createState(), actIndex: 2 }
    expect(flow.actIndex).toBe(2)
    expect(flow.act().id).toBe('a2')
    expect(flow.isLast()).toBe(true)
  })

  it('nextAct 가 상태를 옮긴다 — 두 값이 어긋날 자리가 없다', () => {
    const flow = createFlow({ acts, state: createState() })
    expect(flow.nextAct()).toBe(true)
    expect(flow.actIndex).toBe(1)
    expect(flow.state.actIndex).toBe(1)
    expect(flow.nextAct()).toBe(true)
    expect(flow.nextAct()).toBe(false)
    expect(flow.actIndex).toBe(2)
    expect(flow.state.actIndex).toBe(2)
  })

  it('restoreSession 이 이어하기 지식을 한 곳에 모은다', () => {
    const flow = createFlow({ acts, state: createState() })
    const saved = {
      ...createState(),
      actIndex: 2,
      sources: { held: ['ganghwa1'], read: ['ganghwa1'], lost: ['junggeon'] },
    }
    flow.restoreSession(saved)

    expect(flow.state).toBe(saved)
    expect(flow.actIndex).toBe(2)
    expect(flow.act().id).toBe('a2')
    // 손에 든 것과 잃은 것 모두 「다시 못 줍는다」에 속한다 — 버그 A 의 자리
    expect(flow.taken.has('ganghwa1')).toBe(true)
    expect(flow.taken.has('junggeon')).toBe(true)
  })

  it('restoreSession 은 앞 세션이 채워 둔 taken 을 끌고 오지 않는다', () => {
    const flow = createFlow({ acts, state: createState() })
    flow.taken.add('cheokhwabi')
    flow.restoreSession({ ...createState(), actIndex: 0 })
    expect(flow.taken.has('cheokhwabi')).toBe(false)
    expect(flow.taken.size).toBe(0)
  })

  it('상태가 없어도 터지지 않는다 — 기존 호출자를 깨지 않는다', () => {
    const flow = createFlow({ acts })
    expect(flow.actIndex).toBe(0)
    expect(flow.act().id).toBe('a0')
    expect(flow.nextAct()).toBe(true)
    expect(flow.actIndex).toBe(1)
  })
})
