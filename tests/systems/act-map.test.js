import { describe, it, expect } from 'vitest'
import { ACTS } from '../../src/data/acts.js'
import { actMap, actMapView, tidyTitle, GROUP_OF_KIND, GROUP_LABEL } from '../../src/systems/act-map.js'

// 2026-09-27 선생님: 「이렇게 글로만 있으니까 1막이 어떤 구성이고 어떻게 진행해야
// 하는지 안 보여.」 — 그 답으로 만든 지도가 **막의 비트에서 자란다**는 것이 이 파일이
// 지키는 것이다. 손으로 적은 안내는 반드시 어긋나므로(지금의 ACT_GUIDE 세 줄이 그렇다),
// 여기서 재는 것은 문구가 아니라 **셈**이다: 몇 걸음이 되는가, 그 걸음들이 막에서
// 실제로 일어나는 일을 빠짐없이 덮는가, 학생이 손을 쓰는 자리가 지도에 남아 있는가.

const GROUPS = ['read', 'walk', 'listen', 'hands']

describe('다섯 막이 모두 읽히는 띠 안에 든다', () => {
  for (const [i, act] of ACTS.entries()) {
    // 4~7 → 4~8 (2026-10-06). 3막이 여덟이다 — 아버지가 물러난 뒤의 막이라 학생이 손으로 정하는
    // 자리가 넷(서계의 선택 · 훈령 · 조약문 뜯어 읽기 · 어전회의)이고, 손으로 하는 걸음은 합치지
    // 않는다. 화면은 넉 줄 두 단으로 여덟까지 한 판에 들어온다(ui/act-map.js --actmap-cols).
    it(`${i + 1}막 ${act.id} — 4~8 걸음`, () => {
      const steps = actMap(act)
      expect(steps.length, `${act.id} 가 ${steps.length} 걸음이다`).toBeGreaterThanOrEqual(4)
      expect(steps.length, `${act.id} 가 ${steps.length} 걸음이다`).toBeLessThanOrEqual(8)
    })
  }
})

describe('걸음 하나하나가 말이 된다', () => {
  it('모든 걸음에 이름과 무리가 있다', () => {
    for (const act of ACTS) {
      for (const step of actMap(act)) {
        expect(step.title?.length, `${act.id}/${step.id} 에 이름이 없다`).toBeGreaterThan(1)
        expect(GROUPS, `${act.id}/${step.id} 의 무리가 ${step.group} 이다`).toContain(step.group)
        expect(step.id, `${act.id} 에 이름표 없는 걸음이 있다`).toBeTruthy()
        // 이름은 「무엇을 하는가」다 — 동사로 끝난다. 명사만 적힌 걸음은 안내가 아니라 목차다.
        expect(step.title, `${act.id}/${step.id}: ${step.title}`).toMatch(/다$/)
      }
    }
  })

  it('모든 걸음에 한 줄 설명이 있다', () => {
    for (const act of ACTS) {
      for (const step of actMap(act)) {
        expect(step.note?.length, `${act.id}/${step.id} 에 설명이 없다`).toBeGreaterThan(4)
      }
    }
  })

  it('무리마다 이름표가 있다 — 화면이 글리프 옆에 이것을 적는다', () => {
    for (const group of GROUPS) expect(GROUP_LABEL[group]).toBeTruthy()
  })

  // 지도가 막을 덮지 못하면 학생은 없는 길을 보고 들어간다.
  it('막의 모든 비트가 어느 걸음엔가 꼭 한 번 들어 있다', () => {
    for (const act of ACTS) {
      const mapped = actMap(act).flatMap(s => s.beats)
      expect(mapped, act.id).toEqual(act.beats.map(b => b.id))
    }
  })
})

describe('손으로 하는 자리는 지도에서 혼자 선다', () => {
  const handsKinds = Object.keys(GROUP_OF_KIND).filter(k => GROUP_OF_KIND[k] === 'hands')

  it('어전회의·셈·훈령·붓·국상·피신은 다른 것과 섞이지 않는다', () => {
    for (const act of ACTS) {
      const steps = actMap(act)
      for (const beat of act.beats) {
        if (!handsKinds.includes(beat.kind)) continue
        const step = steps.find(s => s.beats.includes(beat.id))
        expect(step, `${act.id}/${beat.id} 가 지도에서 사라졌다`).toBeTruthy()
        expect(step.group, `${act.id}/${beat.id}`).toBe('hands')
        expect(step.beats, `${act.id}/${beat.id} 가 다른 비트와 한 걸음에 묶였다`).toEqual([beat.id])
      }
    }
  })

  it('막마다 손으로 하는 걸음이 하나 이상 있다', () => {
    for (const act of ACTS) {
      const hands = actMap(act).filter(s => s.group === 'hands')
      expect(hands.length, `${act.id} 에 학생이 직접 하는 걸음이 없다`).toBeGreaterThan(0)
    }
  })
})

describe('이 막에서 쥔 것 하나가 지도에 표시된다', () => {
  it('다섯 막 모두, act.handle.beat 가 든 걸음에 표가 붙는다', () => {
    for (const act of ACTS) {
      const steps = actMap(act)
      const marked = steps.filter(s => s.handle)
      expect(marked.length, `${act.id} 에 표시된 걸음이 ${marked.length} 개다`).toBe(1)
      expect(marked[0].beats, `${act.id} 의 표가 엉뚱한 걸음에 붙었다`).toContain(act.handle.beat)
    }
  })
})

describe('잇달은 글은 한 걸음으로 접힌다', () => {
  it('나란히 선 note 두 개는 언제나 같은 걸음 안에 있다', () => {
    for (const act of ACTS) {
      const steps = actMap(act)
      const stepOf = id => steps.findIndex(s => s.beats.includes(id))
      for (let i = 1; i < act.beats.length; i++) {
        const prev = act.beats[i - 1]
        const here = act.beats[i]
        if (prev.kind !== 'note' || here.kind !== 'note') continue
        expect(stepOf(prev.id), `${act.id}: ${prev.id} 와 ${here.id}`).toBe(stepOf(here.id))
      }
    }
  })

  it('같은 무리의 걸음이 두 번 연달아 서지 않는다 — 「글을 읽는다」가 두 칸이 되는 일', () => {
    for (const act of ACTS) {
      const steps = actMap(act)
      for (let i = 1; i < steps.length; i++) {
        if (steps[i].group === 'hands') continue
        expect(steps[i].group, `${act.id} 의 ${i}·${i + 1}번째 걸음`).not.toBe(steps[i - 1].group)
      }
    }
  })
})

describe('막마다의 손질(act.map)', () => {
  const hand = [
    { id: 'a', kind: 'note', group: 'read', title: '글을 읽는다', note: '한 장' },
    { id: 'b', kind: 'council', group: 'hands', title: '정한다', note: '고른다', handle: true },
  ]

  it('배열로 적으면 그대로 나온다 — 비트를 다시 세지 않는다', () => {
    const act = { id: 'x', title: '시험', beats: [{ id: 'z', kind: 'note' }], map: hand }
    expect(actMap(act)).toEqual(hand)
  })

  it('{ todo, steps } 로 적으면 걸음은 steps 에서, 할 일 한 줄은 todo 에서 온다', () => {
    const act = { id: 'x', title: '시험', beats: [], map: { todo: '이 막에서 할 일', steps: hand } }
    expect(actMap(act)).toEqual(hand)
    expect(actMapView(act, 2).todo).toBe('이 막에서 할 일')
  })

  it('kind 만 적고 group 을 비우면 kind 에서 받아 채운다', () => {
    const act = { id: 'x', beats: [], map: [{ kind: 'brush', title: '쓴다' }] }
    const [step] = actMap(act)
    expect(step.group).toBe('hands')
    expect(step.id).toBe('map-1')
  })
})

describe('화면이 받는 그릇', () => {
  it('막 이름·날짜·쥔 것·시작 단추 글씨가 한 벌로 온다', () => {
    const view = actMapView(ACTS[1], 1, { intro: ['한 줄', '두 줄', '세 줄'] })
    expect(view.title).toContain('2막')
    expect(view.title).toContain('양요')
    expect(view.when).toBe(ACTS[1].dateLabel)
    expect(view.handleLine).toBe(ACTS[1].handle.line)
    expect(view.startLabel).toContain('2막')
    expect(view.steps).toHaveLength(actMap(ACTS[1]).length)
    // 두 줄로 줄이는 일은 화면이 한다 — 그릇은 받은 것을 그대로 넘긴다.
    expect(view.intro).toHaveLength(3)
  })

  it('막이 없어도 터지지 않는다 — 지도가 빈 채로 온다', () => {
    expect(actMap(null)).toEqual([])
    expect(actMapView(null, 0).steps).toEqual([])
  })
})

describe('자간을 벌려 적은 제목을 지도의 한 줄로 되돌린다', () => {
  it('낱자로 벌어진 것만 붙인다', () => {
    expect(tidyTitle('강 화 도')).toBe('강화도')
    expect(tidyTitle('경 복 궁 을  다 시  짓 는 다')).toBe('경복궁을 다시 짓는다')
    expect(tidyTitle('2 막 「양 요」 끝')).toBe('2막「양요」끝')
  })

  it('원래부터 낱말인 제목은 손대지 않는다', () => {
    expect(tidyTitle('1863 겨울, 운현궁')).toBe('1863 겨울, 운현궁')
    expect(tidyTitle('')).toBe('')
    expect(tidyTitle(null)).toBe('')
  })
})
