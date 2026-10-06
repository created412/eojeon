import { describe, it, expect } from 'vitest'
import { dayEndHtml, stillDayHtml, tileArt } from '../../src/ui/day-end.js'
import { ACTS } from '../../src/data/acts.js'
import { hubAt, hubOptions, closeHub, completeActivity, dayReport } from '../../src/systems/freedom.js'
import { createState } from '../../src/core/state.js'

describe('하루의 끝 판', () => {
  it('한 일과 하지 않은 일을 둘 다 적는다', () => {
    const html = dayEndHtml({
      title: '고종 3년 · 1866',
      done: [{ id: 'npc:heungseon', label: '호조 관리에게 말을 건다' }],
      missed: [{ label: '최익현의 상소를 듣는다', reason: '해 칸을 다 씀' }],
    })
    expect(html).toContain('오늘 한 일 1')
    expect(html).toContain('하지 않은 일 1')
    expect(html).toContain('호조 관리에게 말을 건다')
    expect(html).toContain('최익현의 상소를 듣는다')
    expect(html).toContain('해 칸을 다 씀')
  })

  it('벌 주는 말을 쓰지 않는다', () => {
    const html = dayEndHtml({ done: [], missed: [{ label: '무엇', reason: '선택하지 않음' }] })
    for (const word of ['실패', '점수', '오답', '벌']) expect(html).not.toContain(word)
  })

  it('하나도 하지 않은 하루도 판이 선다', () => {
    const html = dayEndHtml({ done: [], missed: [] })
    expect(html).toContain('하나도 하지 않았다')
    expect(html).toContain('남겨 둔 것이 없다')
  })
})

describe('dayReport', () => {
  // 탐색(explore) 비트에 서 있는 상태를 실제 ACTS 에서 찾아 쓴다 — 손으로 꾸민
  // 가짜 비트로는 「거점이 아니면 null」을 지킬 수 없다.
  function atFirstHub() {
    for (let a = 0; a < ACTS.length; a++) {
      const act = ACTS[a]
      for (let b = 0; b < act.beats.length; b++) {
        if (hubAt(act, b)) return { act, state: { ...createState(), actIndex: a, beatIndex: b } }
      }
    }
    return null
  }

  it('거점이 아니면 아무것도 내지 않는다', () => {
    const act = ACTS[0]
    expect(dayReport({ ...createState(), beatIndex: 0 }, act)).toBe(null)
  })

  it('닫히기 전에는 null, 닫힌 뒤에는 한 일과 남긴 일을 낸다', () => {
    const found = atFirstHub()
    expect(found).toBeTruthy()
    const { act } = found
    let state = found.state
    expect(dayReport(state, act)).toBe(null)

    const first = hubOptions(state, act).find(o => !o.disabled)
    if (first) state = completeActivity(state, act, first.id)
    state = closeHub(state, act)

    const report = dayReport(state, act)
    expect(report).toBeTruthy()
    // 한 일에는 **무엇이었는지**(id)가 함께 실린다 — 그래야 화면이 그림을 고른다
    // (선생님 지적 #17 「한 일을 그림으로」). 예전에는 글자만 넘겼다.
    if (first) {
      expect(report.done.map(d => d.label)).toContain(first.label)
      expect(report.done.map(d => d.id)).toContain(first.id)
    }
    // 남긴 일에는 왜 남았는지가 함께 적힌다.
    for (const m of report.missed) expect(m.reason).toBeTruthy()
  })
})


// ── 한 일을 그림으로 ───────────────────────────────────────────────────────
// 선생님 지적 #17. 새 그림을 받아 오지 않고 **이미 게임 안에 있는 것**으로만 짓는다.
describe('오늘 한 일이 얼굴과 문서로 남는다', () => {
  it('사람에게 말을 건 일은 그 얼굴이 뜬다', () => {
    const art = tileArt('npc:heungseon')
    expect(art.kind).toBe('face')
    expect(art.src).toMatch(/^data:image\//)
  })

  it('문서를 살펴본 일은 그 문서의 사진이 뜬다', () => {
    const art = tileArt('card:unyo')
    expect(['photo', 'mark']).toContain(art.kind)
    if (art.kind === 'photo') expect(art.src).toMatch(/^data:image\//)
  })

  it('그림이 없는 일은 표식으로 둔다 — 지어내지 않는다', () => {
    expect(tileArt('stop:jongno-1882').kind).toBe('mark')
    expect(tileArt('beat:axe-sangso').kind).toBe('mark')
    expect(tileArt(undefined).kind).toBe('mark')
    expect(tileArt('npc:없는사람').kind).toBe('mark')
  })

  // 선생님(2026-10-06): 「여흥부대부인 민씨가 얼굴이 안뜨네.」 어머니의 그림은 PORTRAITS 밖(대화판의 자리)에 있다.
  it('어머니에게 말을 건 일에도 얼굴이 뜬다 — 배경을 오려 내는 테두리째', () => {
    const art = tileArt('npc:mother')
    expect(art.kind).toBe('face')
    expect(art.src).toMatch(/^data:image\//)
    expect(art.clip).toMatch(/^polygon\(/)
    expect(dayEndHtml({ done: [{ id: 'npc:mother', label: '여흥부대부인 민씨에게 말을 건다' }], undone: [] })).toContain('clip-path:polygon(')
  })

  it('판이 실제로 그림 칸을 그린다', () => {
    const html = dayEndHtml({ done: [{ id: 'npc:heungseon', label: '흥선대원군에게 말을 건다' }], missed: [] })
    expect(html).toContain('class="tiles"')
    expect(html).toContain('<figure class="tile">')
    expect(html).toContain('흥선대원군에게 말을 건다')
  })

  it('하지 않은 일에는 그림을 붙이지 않는다', () => {
    // 못 한 것이 한 것과 같은 무게로 보이면 이 판은 벌 주는 판이 된다.
    const html = dayEndHtml({ done: [], missed: [{ label: '무엇', reason: '당시 들어갈 수 없었음' }] })
    expect(html).not.toContain('<figure class="tile">')
  })

  it('예전처럼 글자만 넘겨도 판이 선다', () => {
    const html = dayEndHtml({ done: ['옛 모양'], missed: [] })
    expect(html).toContain('옛 모양')
  })
})

// ── 해가 아직 지지 않는다 ──────────────────────────────────────────────────
describe('남은 일이 있으면 해가 지지 않는다', () => {
  it('하루를 닫는 판과 같은 모양으로 가로막는다', () => {
    const html = stillDayHtml({ left: [{ label: '사정전으로 가 최익현의 상소를 듣는다' }] })
    expect(html).toContain('해 가  지 지  않 는 다')
    expect(html).toContain('남은 일 1')
    expect(html).toContain('최익현의 상소')
  })

  it('무엇을 해야 하루가 끝나는지 말한다', () => {
    expect(stillDayHtml({ left: [] })).toContain('남은 일을 다 해야 하루가 끝난다')
  })

  it('여기서도 벌 주는 말을 쓰지 않는다', () => {
    const html = stillDayHtml({ left: [{ label: '무엇' }] })
    for (const word of ['실패', '점수', '오답', '벌', '틀렸']) expect(html).not.toContain(word)
  })
})
