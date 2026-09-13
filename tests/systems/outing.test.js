import { describe, it, expect } from 'vitest'
import {
  stopFlag, isStopDone, markStopPaid, markStopDone, pendingStopId,
  stopAt, stopHint, stopsOfAct, stopById,
} from '../../src/systems/outing.js'
import { createState } from '../../src/core/state.js'
import { ACTS } from '../../src/data/acts.js'
import { beatsOf } from '../../src/systems/scenario.js'

const stops = [
  { id: 'jongno-1882', room: 'donhwamun', placeId: 'outside', label: 'E — 돈화문을 나서 종로에 간다', beat: { id: 'b', kind: 'outing' } },
]

describe('나들이 표시', () => {
  it('깃발 이름이 stop. 으로 시작한다 — 조건 비트의 깃발과 섞이지 않는다', () => {
    expect(stopFlag('jongno-1882')).toBe('stop.jongno-1882')
  })

  it('처음에는 안 다녀온 것이다', () => {
    expect(isStopDone(createState(), 'jongno-1882')).toBe(false)
  })

  it('flags 가 없어도 터지지 않는다', () => {
    expect(isStopDone({}, 'jongno-1882')).toBe(false)
  })

  it('표시하면 다녀온 것이 되고, 원래 상태는 그대로다', () => {
    const s0 = createState()
    const s1 = markStopDone(s0, 'jongno-1882')
    expect(isStopDone(s1, 'jongno-1882')).toBe(true)
    expect(isStopDone(s0, 'jongno-1882')).toBe(false)
    expect(s1).not.toBe(s0)
  })

  it('다른 깃발을 지우지 않는다', () => {
    const s = markStopDone({ flags: { 'queen-lost': true } }, 'jongno-1882')
    expect(s.flags['queen-lost']).toBe(true)
  })
})

describe('나들이 찾기', () => {
  const s = createState()

  it('그 방에 있으면 찾아 준다', () => {
    expect(stopAt(stops, 'donhwamun', s)?.id).toBe('jongno-1882')
  })

  it('다른 방에서는 없다', () => {
    expect(stopAt(stops, 'injeongjeon', s)).toBeNull()
    expect(stopAt(stops, null, s)).toBeNull()
  })

  it('이미 다녀왔으면 없다 — 두 번 나가지 않는다', () => {
    expect(stopAt(stops, 'donhwamun', markStopDone(s, 'jongno-1882'))).toBeNull()
  })

  it('나들이가 아예 없어도 터지지 않는다', () => {
    expect(stopAt(undefined, 'donhwamun', s)).toBeNull()
    expect(stopAt([], 'donhwamun', s)).toBeNull()
  })
})

describe('힌트와 데이터 검사', () => {
  it('힌트에 값이 함께 나온다 — 나가기 전에 얼마인지 안다', () => {
    expect(stopHint(stops[0], 3)).toBe('E — 돈화문을 나서 종로에 간다  ·  해 3칸')
  })

  it('막에서 나들이를 모아 준다', () => {
    const act = { beats: [{ kind: 'explore', stops }, { kind: 'note' }, { kind: 'explore' }] }
    expect(stopsOfAct(act).map(s => s.id)).toEqual(['jongno-1882'])
    expect(stopsOfAct({ beats: [] })).toEqual([])
    expect(stopsOfAct(null)).toEqual([])
  })
})


// ── 값을 치른 순간과 화면을 다 본 순간을 가른다 ──────────────────────────
//
// 예전에는 둘이 한 표시였다. pressE() 가 해 3칸을 치르면서 곧장 「다녀왔다」를 찍고
// 그 상태가 저장되었으므로, 학생이 종로·무위영 화면을 **보는 동안** F5 를 누르면
// 값은 나갔는데 화면도 카드(겨와 모래)도 영영 안 왔다. stopAt() 이 그 나들이를 다시
// 안 내주기 때문에 되찾을 길도 없었다.
//
// 그래서 표시를 둘로 가른다 — 「값을 치렀다」(두 번 내지 않는다)와 「아직 화면을
// 못 봤다」(이어하기가 그 화면을 다시 열어 준다)다. 둘 다 flags 에 있어 세이브에 실린다.
describe('나들이 — 값을 치른 순간과 화면을 다 본 순간을 가른다', () => {
  it('값을 치르면 다녀온 표시와 「아직 못 봤다」가 함께 남는다', () => {
    const s = markStopPaid(createState(), 'jongno-1882')
    expect(isStopDone(s, 'jongno-1882'), '값을 두 번 내지 않는다').toBe(true)
    expect(pendingStopId(s), '화면은 아직 못 봤다').toBe('jongno-1882')
  })

  it('화면을 다 보면 「아직 못 봤다」만 지워진다', () => {
    const paid = markStopPaid(createState(), 'jongno-1882')
    const done = markStopDone(paid, 'jongno-1882')
    expect(pendingStopId(done)).toBe(null)
    expect(isStopDone(done, 'jongno-1882')).toBe(true)
    expect(pendingStopId(paid), '앞선 상태는 그대로다').toBe('jongno-1882')
  })

  it('밀린 나들이가 없으면 null 이다 — flags 가 없어도 터지지 않는다', () => {
    expect(pendingStopId(createState())).toBe(null)
    expect(pendingStopId({})).toBe(null)
    expect(pendingStopId(null)).toBe(null)
  })

  it('다른 나들이를 끝내도 밀린 표시가 남의 것을 지우지 않는다', () => {
    const s = markStopDone(markStopPaid(createState(), 'jongno-1882'), '다른-나들이')
    expect(pendingStopId(s)).toBe('jongno-1882')
  })

  it('밀린 나들이를 그 막의 데이터에서 찾아낸다', () => {
    const act = ACTS.find(a => stopsOfAct(a).length > 0)
    expect(act, '나들이를 둔 막이 하나도 없다').toBeTruthy()
    const id = stopsOfAct(act)[0].id
    expect(stopById(act, id)?.id).toBe(id)
    expect(stopById(act, '없는-나들이')).toBe(null)
    expect(stopById(null, id)).toBe(null)
  })
})

// ── [잠복] stop.pending 은 하나짜리 칸이다 ───────────────────────────────
//
// markStopPaid() 는 그 칸을 조건 없이 덮어쓴다. 오늘은 나들이가 데이터에 하나뿐
// (imo-day 의 jongno-1882)이라 안전하지만, 그 전제를 붙드는 검사가 하나도 없었다.
// 한 낮에 나들이가 둘이 되는 날, 앞의 것은 값만 치러진 채 화면이 영영 안 온다 —
// 예전에 F5 로 났던 바로 그 사고가 새로고침 없이도 나는 것이다.
//
// 여기서 pending 을 여럿 담게 고치지 않고 전제를 검사로 붙드는 까닭:
//   · pending 은 flags 에 실려 **세이브에 들어가는 상태의 모양**이다. 문자열을
//     배열로 바꾸면 저장·이어하기(resumePendingStop)·화면 순서를 함께 손봐야 하고,
//     그것은 배포 직전에 세이브 모양을 바꾸는 일이다.
//   · 그런데 지금 데이터에는 둘째 나들이가 없다. 없는 기능을 위해 저장 모양을 바꾸면,
//     정작 둘째를 만들 때 필요한 규칙(어느 화면을 먼저 여는가, 값을 어떻게 나누는가)은
//     여전히 안 정해진 채로 남는다.
//   · 검사는 바로 그 순간에 운다 — 둘째 나들이를 데이터에 넣는 사람이 그 자리에서
//     「pending 이 하나짜리 칸이다」를 읽고, 무엇을 함께 고쳐야 하는지 알게 된다.
describe('밀린 나들이 칸은 하나뿐이다 — 그 전제를 데이터가 지킨다', () => {
  it('한 탐색 비트(하루)가 두는 나들이는 많아야 하나다', () => {
    for (const act of ACTS) {
      for (const beat of beatsOf(act)) {
        const n = (beat.stops ?? []).length
        expect(n, `${act.id}/${beat.id} 에 나들이가 ${n} 개다 — stop.pending 은 하나만 담는다 ` +
          '(systems/outing.js PENDING_STOP_FLAG). 여럿을 두려면 그 칸부터 고쳐라')
          .toBeLessThanOrEqual(1)
      }
    }
  })

  it('게임 전체에서 나들이 id 가 유일하다 — 깃발 이름이 겹치면 남의 값을 치른 것이 된다', () => {
    const seen = new Map()
    for (const act of ACTS) {
      for (const stop of stopsOfAct(act)) {
        expect(seen.has(stop.id), `${stop.id} 가 ${seen.get(stop.id)} 와 ${act.id} 에 둘 다 있다`).toBe(false)
        seen.set(stop.id, act.id)
      }
    }
  })

  it('전제가 깨지면 무엇을 잃는지 — 둘째를 치르면 첫째의 화면이 소리 없이 사라진다', () => {
    const paid = markStopPaid(markStopPaid(createState(), '첫째'), '둘째')

    // 값은 둘 다 치러졌다
    expect(isStopDone(paid, '첫째')).toBe(true)
    expect(isStopDone(paid, '둘째')).toBe(true)
    // 그런데 밀린 칸에는 둘째만 남는다 — 첫째는 해만 내고 화면도 카드도 못 받는다
    expect(pendingStopId(paid)).toBe('둘째')
    expect(markStopDone(paid, '둘째'), '첫째를 되찾을 길이 없다')
      .toEqual(expect.objectContaining({ flags: expect.objectContaining({ 'stop.첫째': true }) }))
    expect(pendingStopId(markStopDone(paid, '둘째'))).toBe(null)
  })
})
