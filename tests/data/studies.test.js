import { describe, it, expect } from 'vitest'
import { STUDIES, DILEMMAS, studyById, dilemmaById } from '../../src/data/studies.js'
import { ACTS } from '../../src/data/acts.js'
import { SOURCES } from '../../src/data/sources.js'
import { INQUIRIES } from '../../src/data/inquiries.js'
import { beatsOf } from '../../src/systems/scenario.js'
import {
  sectionsOf, blanksOf, initialStudy, stepAt, stepCount, flip, answer, chipsOf, activeBlank, focusBlank,
  studyHint, studyRecord, STUDY_HINT_AFTER, STUDY_LINES,
} from '../../src/systems/doc-study.js'
import { studyHtml } from '../../src/ui/doc-study.js'
import { dilemmaHtml } from '../../src/ui/dilemma.js'
import { describeDecision, buildRecordText, dilemmaReason } from '../../src/main.js'
import { createState } from '../../src/core/state.js'

// ── 뜯어 읽는 문서와 고민해서 정하는 자리 (2026-10-06) ─────────────────────
//
// 선생님:
//   「강화도 조약 조약문 해석하는 게 이 게임의 백미야. 좀 더 재미있게 다시 해석 게임을 만들 수
//    없겠어? 지금은 그냥 어디가 문제고 해석을 써 봐 이렇잖아.」
//   「속방 이건 그냥 넘기기에 너무 아까운 교육 자료야.」
//   「개혁 정강 14개조를 가지고 고종이 고민하고 선택하게 하는 걸 넣는 게 좋을 거 같아. 물론
//    결과는 실제 역사적 사실을 따르지만.」
//   「대원군이 떠난 이후에는 스스로 선택하고 고민하는 고종의 모습이 보이도록.」

const allBeats = ACTS.flatMap(a => beatsOf(a).map(b => ({ act: a.id, ...b })))
const strings = node => {
  if (typeof node === 'string') return [node]
  if (Array.isArray(node)) return node.flatMap(strings)
  if (node && typeof node === 'object') return Object.values(node).flatMap(strings)
  return []
}

// 한 판을 맞는 답으로 끝까지 걷는다.
function walk(study) {
  let state = initialStudy()
  let guard = 0
  while (!state.done && guard++ < 50) {
    const step = stepAt(study, state)
    if (step.kind === 'flip') state = flip(study, state)
    if (step.kind === 'fill') {
      const id = activeBlank(study, state)
      const word = blanksOf(study).find(b => b.id === id).answer
      state = answer(study, state, { word }).state
    } else {
      state = answer(study, state, step.answer).state
    }
  }
  return state
}

describe('뜯어 읽는 문서 — 데이터', () => {
  it('세 판이 있다 — 조약문 · 두 글자 · 정강', () => {
    expect(Object.keys(STUDIES)).toEqual(['treaty1876', 'sokbang1882', 'reform1884'])
  })

  for (const study of Object.values(STUDIES)) {
    describe(study.id, () => {
      it('걸음마다 물음이 있고, 답은 보기 안에 있다', () => {
        for (const [i, step] of study.steps.entries()) {
          expect(step.ask, `${study.id}[${i}]`).toBeTruthy()
          if (step.kind === 'fill') continue
          expect(step.options.length, `${study.id}[${i}]`).toBeGreaterThanOrEqual(2)
          expect(step.options.map(o => o.id), `${study.id}[${i}]`).toContain(step.answer)
        }
      })

      it('답이 아닌 보기마다 왜 아닌지 한 줄이 있다 — 「다시」로 돌려보내지 않는다', () => {
        for (const [i, step] of study.steps.entries()) {
          for (const o of step.options ?? []) {
            if (o.id === step.answer) continue
            expect(o.say, `${study.id}[${i}] 「${o.text}」`).toBeTruthy()
          }
        }
      })

      it('걸음이 가리키는 대목이 문서에 있다', () => {
        const ids = sectionsOf(study).map(s => s.id)
        for (const step of study.steps) if (step.section) expect(ids).toContain(step.section)
      })

      it('걸음마다 주석이 남는다 — 끝나면 주석으로 덮인 문서가 된다', () => {
        for (const [i, step] of study.steps.entries()) expect(step.note, `${study.id}[${i}]`).toBeTruthy()
        const done = walk(study)
        expect(done.done).toBe(true)
        expect(done.notes).toHaveLength(stepCount(study))
      })

      it('딸린 사료 카드가 실제로 있다', () => {
        const known = new Set(SOURCES.map(s => s.id))
        for (const id of study.cards) expect(known.has(id), id).toBe(true)
      })

      it('출처를 적는다 — 교과서의 쪽수', () => {
        expect(study.origin).toContain('『고등 한국사1』')
        expect(study.origin).toMatch(/\d+쪽/)
      })
    })
  }

  it('바꿔 읽은 문장은 문서의 글과 다르다 — 두 나라의 자리가 실제로 바뀌어 있다', () => {
    const treaty = STUDIES.treaty1876
    const flips = treaty.steps.filter(s => s.kind === 'flip')
    expect(flips).toHaveLength(2)
    for (const step of flips) {
      const original = treaty.sections.find(s => s.id === step.section).text
      expect(step.mirror).not.toBe(original)
      const swap = original.replaceAll('조선국', '\u0000').replaceAll('일본국', '조선국').replaceAll('\u0000', '일본국')
      expect(step.mirror).toBe(swap)
      // 바꿔 읽은 문장이 조약에 「있다」가 답이 되는 일은 없다.
      expect(step.answer).toBe('no')
    }
  })

  it('조약문 판은 「불평등」이라는 낱말을 물음에서 먼저 말해 주지 않는다 — 끝 글에서 교과서가 말한다', () => {
    const treaty = STUDIES.treaty1876
    const asked = strings(treaty.steps.map(s => [s.ask, s.options]))
    expect(asked.join(' ')).not.toContain('불평등')
    expect(treaty.after.join(' ')).toContain('최초의 근대적 조약이자 불평등 조약')
  })

  it('「두 글자」 판의 빈칸은 자주 · 속방이고, 헷갈릴 낱말 둘이 섞여 나온다', () => {
    const s = STUDIES.sokbang1882
    expect(blanksOf(s).map(b => b.answer)).toEqual(['자주', '속방'])
    const fill = s.steps.find(st => st.kind === 'fill')
    const words = chipsOf(s, fill).map(c => c.word)
    expect([...words].sort()).toEqual(['동맹', '속방', '우방', '자주'])
    // 문서 차례 그대로 늘어놓지 않는다.
    expect(words.slice(0, 2)).not.toEqual(['자주', '속방'])
  })

  it('「두 글자」 판의 마지막 물음은 두 이름 모두 남이 붙였다는 데 닿는다', () => {
    const last = STUDIES.sokbang1882.steps.at(-1)
    expect(last.answer).toBe('neither')
    expect(last.ok).toContain('남이 붙인 이름')
  })

  it('정강 판은 아버지를 데려오는 조항과 임금의 힘을 줄이는 조항을 함께 읽힌다', () => {
    const r = STUDIES.reform1884
    expect(r.sections.map(s => s.label)).toEqual(['제1조', '제2조', '제13조'])
    expect(r.sections[0].text).toContain('흥선 대원군')
    expect(r.steps.at(-1).ok).toContain('국왕의 전제권 제한')
  })
})

describe('뜯어 읽는 문서 — 셈', () => {
  const treaty = STUDIES.treaty1876

  it('바꿔 읽기 전에는 답할 수 없다 — 읽어 보지 않고 찍지 않게', () => {
    const s0 = initialStudy()
    const r = answer(treaty, s0, 'no')
    expect(r.ok).toBe(false)
    expect(r.say).toBe(STUDY_LINES.flipFirst)
    expect(r.state.step).toBe(0)
    expect(r.state.misses).toBe(0)
    const flipped = flip(treaty, s0)
    expect(answer(treaty, flipped, 'no').ok).toBe(true)
  })

  it('답이 아닌 보기는 걸음을 넘기지 않고, 그 보기에 맞춘 한 줄을 돌려준다', () => {
    const s = flip(treaty, initialStudy())
    const r = answer(treaty, s, 'yes')
    expect(r.ok).toBe(false)
    expect(r.say).toContain('조선이 일본의 바다를 잰다는 조항은 없다')
    expect(r.state.step).toBe(0)
    expect(r.state.notes).toHaveLength(0)
  })

  it(`${STUDY_HINT_AFTER}번 헛짚으면 그 보기가 빛난다 — 갇히는 학생이 없다`, () => {
    let s = flip(treaty, initialStudy())
    expect(studyHint(treaty, s)).toBeNull()
    for (let i = 0; i < STUDY_HINT_AFTER; i++) s = answer(treaty, s, 'yes').state
    expect(studyHint(treaty, s)).toBe('no')
    // 다음 걸음으로 가면 다시 꺼진다.
    s = answer(treaty, s, 'no').state
    expect(s.step).toBe(1)
    expect(studyHint(treaty, s)).toBeNull()
  })

  it('맞게 답하면 그 대목에 주석이 붙는다', () => {
    const s = answer(treaty, flip(treaty, initialStudy()), 'no').state
    expect(s.notes).toEqual([{ section: 'g7', text: treaty.steps[0].note }])
  })

  it('빈칸 채우기 — 칸을 골라 낱말을 놓고, 다 차야 걸음이 넘어간다', () => {
    const sok = STUDIES.sokbang1882
    let s = initialStudy()
    s = answer(sok, s, 'belong').state
    s = answer(sok, s, 'nation').state
    expect(stepAt(sok, s).kind).toBe('fill')
    const [a, b] = blanksOf(sok).map(x => x.id)
    expect(activeBlank(sok, s)).toBe(a)
    // 첫 칸(자주)에 「속방」은 붙지 않는다.
    const miss = answer(sok, s, { word: '속방' })
    expect(miss.ok).toBe(false)
    expect(miss.state.filled).toEqual({})
    // 둘째 칸을 먼저 골라 채울 수 있다.
    s = focusBlank(sok, miss.state, b)
    const r1 = answer(sok, s, { word: '속방' })
    expect(r1.ok).toBe(true)
    expect(r1.state.step).toBe(2)
    expect(activeBlank(sok, r1.state)).toBe(a)
    const r2 = answer(sok, r1.state, { word: '자주' })
    expect(r2.ok).toBe(true)
    expect(r2.state.step).toBe(3)
    expect(r2.state.notes.at(-1).text).toBe('1876 「자주」 ↔ 1882 「속방」')
  })

  it('끝나면 학생이 단 주석이 기록으로 남는다', () => {
    const done = walk(treaty)
    const record = studyRecord(treaty, done)
    expect(record.kind).toBe('study')
    expect(record.compared).toBe(true)
    expect(record.selected).toEqual(treaty.steps.map(s => s.note))
  })
})

describe('고민해서 정하는 자리 — 데이터', () => {
  it('세 자리가 있다 — 서계 · 임오 · 정강', () => {
    expect(Object.keys(DILEMMAS)).toEqual(['seogye', 'imo', 'reform'])
  })

  for (const d of Object.values(DILEMMAS)) {
    it(`${d.id} — 보기마다 얻는 것과 내어주는 것이 함께 있다`, () => {
      expect(d.options.length).toBeGreaterThanOrEqual(3)
      for (const o of d.options) {
        expect(o.gain, `${d.id}/${o.id}`).toBeTruthy()
        expect(o.cost, `${d.id}/${o.id}`).toBeTruthy()
      }
      expect(new Set(d.options.map(o => o.id)).size).toBe(d.options.length)
    })

    it(`${d.id} — 맞는 보기를 정해 두지 않고, 뒤에는 교과서의 문장이 온다`, () => {
      expect(d.answer).toBeUndefined()
      for (const o of d.options) expect(o.correct).toBeUndefined()
      expect(d.actual.length).toBeGreaterThan(20)
      expect(d.origin).toContain('『고등 한국사1』')
    })
  }

  it('무엇을 고르든 역사는 그대로 간다 — 「실제로는」이 교과서의 사실을 말한다', () => {
    expect(DILEMMAS.seogye.actual).toContain('서계를 받지 않았다')
    expect(DILEMMAS.seogye.actual).toContain('운요호')
    expect(DILEMMAS.imo.actual).toContain('흥선 대원군에게 수습을 맡겼다')
    expect(DILEMMAS.reform.actual).toContain('사흘 만에 무너졌다')
  })
})

describe('학생이 읽는 글에 깎는 말이 없다', () => {
  const said = [...strings(STUDIES), ...strings(DILEMMAS), ...Object.values(STUDY_LINES)]
  it.each(['정답', '오답', '실패', '틀렸', '틀린', '점수', '감점'])('「%s」을 쓰지 않는다', word => {
    for (const s of said) expect(s.includes(word), s).toBe(false)
  })
  it('돈의 크기를 적지 않는다', () => {
    for (const s of said) expect(/[0-9]+ *냥/.test(s), s).toBe(false)
  })
})

describe('막에 실린 자리', () => {
  const studies = allBeats.filter(b => b.kind === 'study')
  const dilemmas = allBeats.filter(b => b.kind === 'dilemma')

  it('문서 판 셋과 선택 셋이 모두 막에 실려 있다', () => {
    expect(studies.map(b => `${b.act}/${b.study}`)).toEqual(['chinjeong/treaty1876', 'imo/sokbang1882', 'gapsin/reform1884'])
    expect(dilemmas.map(b => `${b.act}/${b.dilemma}`)).toEqual(['chinjeong/seogye', 'imo/imo', 'gapsin/reform'])
  })

  it('비트의 제목이 판의 제목과 같다 — 막 안내도에 그 이름이 뜬다', () => {
    for (const b of studies) expect(b.title).toBe(studyById(b.study).title)
    for (const b of dilemmas) expect(b.title).toBe(dilemmaById(b.dilemma).title)
  })

  // 선생님: 「대원군이 떠나기 전에는 주로 게임 위주로, 떠난 이후에는 스스로 선택하고 고민하는.」
  it('고민해서 정하는 자리는 아버지가 물러난 뒤(3막부터)에만 선다', () => {
    const first = [...studies, ...dilemmas].map(b => ACTS.findIndex(a => a.id === b.act))
    expect(Math.min(...first)).toBe(2)
    const chin = beatsOf(ACTS[2]).map(b => b.id)
    expect(chin.indexOf('alone-in-hall')).toBeLessThan(chin.indexOf('seogye-choice'))
  })

  it('서계의 선택 바로 뒤에 운요호가 온다 — 고른 것과 상관없이', () => {
    const chin = beatsOf(ACTS[2]).map(b => b.id)
    expect(chin.indexOf('seogye-choice')).toBe(chin.indexOf('unyo-dispatch') - 1)
  })

  it('조약문 세 장은 뜯어 읽는 판이 준다 — 옛 탐구 표에는 없다', () => {
    const b = studies.find(x => x.study === 'treaty1876')
    expect([...b.grantCards].sort()).toEqual([...STUDIES.treaty1876.cards].sort())
    for (const id of b.grantCards) expect(INQUIRIES[id]).toBeUndefined()
  })

  it('고르는 자리는 재구성이라고 밝힌다', () => {
    for (const b of dilemmas) {
      expect(b.grade).toBe('staged')
      expect(b.origin).toContain('재구성')
    }
  })
})

describe('화면', () => {
  it('문서 판 — 대목 · 걸음 수만큼의 눈금 · 출처가 한 장에 있다', () => {
    const html = studyHtml(STUDIES.treaty1876)
    for (const sec of STUDIES.treaty1876.sections) expect(html).toContain(`data-sec="${sec.id}"`)
    expect((html.match(/<i><\/i>/g) ?? []).length).toBe(STUDIES.treaty1876.steps.length)
    expect(html).toContain('『고등 한국사1』')
    // 바꿔 읽은 문장은 문서의 글이 아니라고 적는다.
    expect(html).toContain('문서에 적힌 글이 아닙니다')
  })

  it('문서 판 — 빈칸의 답이 화면 글에 미리 적혀 있지 않다', () => {
    const html = studyHtml(STUDIES.sokbang1882)
    expect((html.match(/class="blank"/g) ?? []).length).toBe(2)
    expect(html).not.toContain('자주')
    expect(html.replace(STUDIES.sokbang1882.origin, '')).not.toContain('속방')
  })

  it('선택 — 보기마다 얻는 것 · 내어주는 것이 적히고, 「실제로는」은 처음에 숨는다', () => {
    const html = dilemmaHtml(DILEMMAS.reform)
    expect((html.match(/얻는 것/g) ?? []).length).toBe(3)
    expect((html.match(/내어주는 것/g) ?? []).length).toBe(3)
    expect(html).toContain('class="actual" hidden')
    expect(html).toContain('class="go" hidden')
  })
})

describe('기록', () => {
  it('고른 것과 그 값으로 내어준 것이 한 줄로 남는다', () => {
    const d = DILEMMAS.imo
    const line = dilemmaReason(d, d.options[0])
    expect(line).toContain(d.title)
    expect(line).toContain(d.options[0].text)
    expect(line).toContain(d.options[0].cost)
  })

  it('「내 기록 복사」에 선택과 단 주석이 실린다', () => {
    const d = DILEMMAS.seogye
    const treaty = STUDIES.treaty1876
    const state = {
      ...createState(),
      decisions: [{ actIndex: 2, choiceId: `dilemma:${d.id}:fix`, reason: dilemmaReason(d, d.options[1]) }],
      inquiries: { [treaty.id]: studyRecord(treaty, walk(treaty)) },
    }
    expect(describeDecision(ACTS[2], state.decisions[0])).toEqual({ question: d.title, text: d.options[1].text })
    const text = buildRecordText(state, ACTS)
    expect(text).toContain('[3막 「친정」] 서계를 어찌할 것인가')
    expect(text).toContain('선택 — 글자와 도장을 고쳐 오라 하고 돌려보낸다')
    expect(text).toContain(`[문서 뜯어 읽기] ${treaty.paper}`)
    expect(text).toContain('바꿔 읽으면 없는 문장 — 일본만 조선의 바다를 잰다')
    expect(text).not.toContain('나의 해석')
  })
})
