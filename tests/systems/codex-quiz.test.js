import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CODEX_QUIZZES, quizFor, MIN_PICK,
  relevantOf, missingOf, canAnswer, matchedOf,
  originLine, absentLines, excerptsOf, heldCardsOf, quizView, resultOf,
} from '../../src/systems/codex-quiz.js'
import { SOURCES, sourceById } from '../../src/data/sources.js'
import { ACTS } from '../../src/data/acts.js'
import { NPCS } from '../../src/data/npcs.js'

// 막 끝 사초함 질문이 붙드는 것은 둘이다.
//
// ① **거짓 요구를 하지 않는다.** wants 에 적힌 문서가 그 막에서 실제로 손에 들어오지
//    않으면, 이 화면은 아무도 답할 수 없는 질문을 내고 모든 학생에게 「없던 문서」
//    목록을 보여 준다. 손으로 적은 목록이라 언제든 조용히 그렇게 될 수 있다 —
//    신하가 서는 막이 바뀌거나, 카드 하나가 다음 막으로 밀리면 그날이다.
//    그래서 이 파일은 acts.js·npcs.js 를 **직접 훑어** 그 막에서 받을 수 있는 문서의
//    집합을 만들고, wants 를 거기에 대어 본다. sources.js 의 act 값을 믿지 않는다:
//    그 값도 손으로 적은 것이라 같은 방식으로 틀릴 수 있다.
//
// ② **문을 잠그지 않는다.** 하나도 안 모은 학생에게도 화면이 서고 해설이 나온다.
//    그리고 그 화면의 어느 문장도 맞고 틀림의 말을 쓰지 않는다.

// ── 그 막에서 정말 받을 수 있는 문서 ──────────────────────────────────────
// 문서가 손에 들어오는 길은 셋이다.
//   · 비트가 직접 준다            — grantCard: 'joil-trade'
//   · 알현의 손님이 뭉치로 준다     — visitors[].grantCards: ['ganghwa1', …]
//   · 궁에 서 있는 신하가 건넨다    — npcs.js 의 cardId / cardIds + actsVisible
// 앞의 둘은 막 객체 어디에 묻혀 있을지 모른다(나들이 비트는 stops[].beat 안에 있다).
// 그래서 막 객체를 통째로 재귀로 훑는다 — 자리를 외우지 않는 것이 이 훑기의 요점이다.
//
// ⚠ beat.cardIds 는 세지 **않는다**. 그것은 주는 자리가 아니라 약탈 장면이 「무엇을
//   잃는가」를 적어 둔 목록이다(acts.js oegyujanggak-plunder · main.js:1465).
function grantedInActObject(node, out = new Set()) {
  if (!node || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    for (const item of node) grantedInActObject(item, out)
    return out
  }
  if (typeof node.grantCard === 'string') out.add(node.grantCard)
  if (Array.isArray(node.grantCards)) for (const id of node.grantCards) out.add(id)
  for (const [key, value] of Object.entries(node)) {
    if (key === 'grantCard' || key === 'grantCards' || key === 'cardIds') continue
    grantedInActObject(value, out)
  }
  return out
}

// actsVisible 은 0부터 세는 막의 자리(index)다 — 1막이 0 이다(npcs.js 전체가 그렇다).
function reachableByAct() {
  const byAct = new Map(ACTS.map((_, i) => [i + 1, new Set()]))
  ACTS.forEach((act, i) => {
    for (const id of grantedInActObject(act)) byAct.get(i + 1).add(id)
  })
  for (const npc of NPCS) {
    const ids = npc.cardIds ?? (npc.cardId ? [npc.cardId] : [])
    if (!ids.length) continue
    for (const index of npc.actsVisible ?? []) {
      if (byAct.has(index + 1)) for (const id of ids) byAct.get(index + 1).add(id)
    }
  }
  return byAct
}

// 학생이 읽는 말 전부 — 질문·낱말풀이·해설·「어디에 있었는가」. 벌 주는 말이 숨을
// 곳을 남기지 않으려면 한 자리에 모아 놓고 봐야 한다.
function studentFacingStrings() {
  const out = []
  for (const quiz of Object.values(CODEX_QUIZZES)) {
    out.push(quiz.question, quiz.gloss ?? '', quiz.explain)
    out.push(...Object.values(quiz.origin ?? {}))
  }
  return out.filter(Boolean)
}

describe('사초함 질문 데이터 — 다섯 막이 각각 하나씩', () => {
  it('막마다 질문이 하나 있고, 막 번호가 겹치지 않는다', () => {
    const acts = Object.values(CODEX_QUIZZES).map(q => q.act)
    expect(acts.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
  })

  it('막 id 로도, 막 번호로도 같은 질문을 찾는다', () => {
    expect(quizFor('yangyo')).toBe(CODEX_QUIZZES.yangyo)
    expect(quizFor(2)).toBe(CODEX_QUIZZES.yangyo)
    expect(quizFor('없는막')).toBe(null)
    expect(quizFor(9)).toBe(null)
    expect(quizFor(null)).toBe(null)
  })

  it('질문·해설·낱말풀이가 다 차 있다', () => {
    for (const [id, quiz] of Object.entries(CODEX_QUIZZES)) {
      expect(quiz.question.length, `${id} 의 질문`).toBeGreaterThan(10)
      expect(quiz.explain.length, `${id} 의 해설`).toBeGreaterThan(60)
      expect(quiz.gloss.length, `${id} 의 낱말풀이`).toBeGreaterThan(4)
      expect(quiz.wants.length, `${id} 의 wants`).toBeGreaterThanOrEqual(MIN_PICK)
    }
  })

  it('wants 의 id 는 모두 SOURCES 에 있는 문서다', () => {
    const known = new Set(SOURCES.map(c => c.id))
    for (const [id, quiz] of Object.entries(CODEX_QUIZZES)) {
      for (const want of quiz.wants) {
        expect(known.has(want), `${id} 가 없는 문서 ${want} 를 요구한다`).toBe(true)
      }
    }
  })

  it('wants 의 문서는 그 막에서 **실제로** 손에 들어온다', () => {
    const reachable = reachableByAct()
    for (const [id, quiz] of Object.entries(CODEX_QUIZZES)) {
      for (const want of quiz.wants) {
        expect(
          reachable.get(quiz.act)?.has(want),
          `${id}(${quiz.act}막)가 ${want} 를 요구하지만, ${quiz.act}막에서는 그 문서를 받을 길이 없다 `
          + `— acts.js 의 grantCard/grantCards 도, npcs.js 의 cardId 도 그 막에 없다`,
        ).toBe(true)
      }
    }
  })

  it('wants 의 문서는 카드가 스스로 적은 막과도 어긋나지 않는다', () => {
    for (const [id, quiz] of Object.entries(CODEX_QUIZZES)) {
      for (const want of quiz.wants) {
        expect(sourceById(want).act, `${id} 의 ${want} 가 다른 막의 카드다`).toBe(quiz.act)
      }
    }
  })

  it('wants 의 문서마다 「어디에 있었는가」가 적혀 있다', () => {
    for (const [id, quiz] of Object.entries(CODEX_QUIZZES)) {
      for (const want of quiz.wants) {
        const line = originLine(quiz, want)
        expect(line.length, `${id} 의 ${want} 에 자리를 적지 않았다`).toBeGreaterThan(10)
        // 「없었다」가 아니라 「있었다」로 끝난다 — 사실 하나를 놓고 판정을 붙이지 않는다.
        expect(line, `${id} 의 ${want} 자리 문장이 꾸짖는 말이다`).not.toMatch(/왜 |안 주웠|놓쳤/)
      }
    }
  })
})

describe('맞고 틀림의 말을 쓰지 않는다', () => {
  // 선생님(2026-09-26): 「벌이 아니라 「모아 둔 것이 힘이 된다」를 몸으로 아는 자리다.」
  // 점수와 정답의 말이 한 번이라도 뜨면 학생은 이 화면을 시험으로 읽고, 그러면
  // 안 모은 아이에게 이 자리는 그냥 벌이 된다.
  const FORBIDDEN = ['정답', '오답', '틀렸', '틀린', '맞혔', '점수', '채점', '실패', '합격', '득점', '평가']

  it('질문·해설·낱말풀이·자리 문장에 그 말이 없다', () => {
    for (const text of studentFacingStrings()) {
      for (const word of FORBIDDEN) {
        expect(text.includes(word), `「${word}」가 들어 있다: ${text.slice(0, 40)}…`).toBe(false)
      }
    }
  })

  it('판정 모듈이 「몇 개 맞았다」를 셈해 내보내지 않는다', () => {
    const quiz = CODEX_QUIZZES.yangyo
    const out = resultOf(quiz, { picked: ['bellonet', 'junggeon'], text: '내 한 줄' })
    // 내보내는 것은 목록이다 — 개수도, 비율도, 등급도 아니다.
    expect(Object.keys(out).sort()).toEqual(['matched', 'missed', 'picked', 'text'])
    for (const value of Object.values(out)) expect(typeof value).not.toBe('number')
  })
})

describe('고른 것을 가리는 일', () => {
  const quiz = CODEX_QUIZZES.yangyo   // wants: bellonet · sherman

  it('든 문서 가운데 질문에 닿는 것만 골라낸다', () => {
    expect(relevantOf(quiz, ['junggeon', 'bellonet', 'cheokhwabi'])).toEqual(['bellonet'])
    expect(relevantOf(quiz, ['sherman', 'bellonet'])).toEqual(['bellonet', 'sherman'])
    expect(relevantOf(quiz, [])).toEqual([])
    expect(relevantOf(null, ['bellonet'])).toEqual([])
  })

  it('한 장이면 답이 선다 — 두 장을 요구하지 않는다', () => {
    expect(canAnswer(quiz, ['bellonet'])).toBe(true)
    expect(canAnswer(quiz, ['sherman'])).toBe(true)
    expect(canAnswer(quiz, ['junggeon', 'cheokhwabi', 'yangheonsu'])).toBe(false)
    expect(canAnswer(quiz, [])).toBe(false)
  })

  it('닿지 않는 문서를 함께 골라도 그것을 틀린 것으로 셈하지 않는다', () => {
    const matched = matchedOf(quiz, ['junggeon', 'bellonet', 'oegyujanggak'])
    expect(matched).toEqual(['bellonet'])   // 함께 고른 두 장은 그저 함께 고른 문서다
  })

  it('고른 차례를 지킨다 — 학생이 놓은 순서가 그 학생의 논증 순서다', () => {
    expect(matchedOf(quiz, ['sherman', 'bellonet'])).toEqual(['sherman', 'bellonet'])
    expect(excerptsOf(['sherman', 'bellonet']).map(q => q.id)).toEqual(['sherman', 'bellonet'])
  })

  it('인용에는 카드의 원문과 출처가 그대로 실린다', () => {
    const [q] = excerptsOf(['bellonet'])
    expect(q.excerpt).toBe(sourceById('bellonet').excerpt)
    expect(q.origin).toBe(sourceById('bellonet').origin)
  })

  it('없는 id 를 골라도 무너지지 않는다', () => {
    expect(excerptsOf(['없는문서'])).toEqual([])
    expect(matchedOf(quiz, ['없는문서'])).toEqual([])
  })

  it('학생이 쓴 한 줄은 자르기만 하고 손대지 않는다', () => {
    const long = '가'.repeat(500)
    const out = resultOf(quiz, { picked: [], text: long })
    expect(out.text.length).toBe(300)
    expect(resultOf(quiz, {}).text).toBe('')
  })
})

describe('하나도 안 모은 학생 — 문을 잠그지 않는다', () => {
  const empty = { sources: { held: [], lost: [], read: [] } }

  it('사초함이 비어도 화면에 넘길 것이 만들어진다', () => {
    const view = quizView('chinjeong', empty)
    expect(view).not.toBe(null)
    expect(view.held).toEqual([])
    expect(view.canAnswer).toBe(false)
  })

  it('해설은 그래도 나온다 — 아무도 역사 없이 남지 않는다', () => {
    const view = quizView('chinjeong', empty)
    expect(view.explain).toBe(CODEX_QUIZZES.chinjeong.explain)
    expect(view.explain.length).toBeGreaterThan(60)
  })

  it('없던 문서를 이름과 자리로 적는다 — 셈으로 적지 않는다', () => {
    const lines = absentLines(CODEX_QUIZZES.yangyo, [])
    expect(lines.map(l => l.id)).toEqual(['bellonet', 'sherman'])
    expect(lines[0].title).toBe(sourceById('bellonet').title)
    expect(lines[0].where).toContain('2막')
    expect(lines[0].where).toContain('창덕궁')
  })

  it('든 문서가 있어도 질문에 닿지 않으면 같은 길을 간다', () => {
    const view = quizView(2, { sources: { held: ['junggeon', 'cheokhwabi'] } })
    expect(view.canAnswer).toBe(false)
    expect(view.held.map(c => c.id)).toEqual(['junggeon', 'cheokhwabi'])
    expect(view.absent.map(a => a.id)).toEqual(['bellonet', 'sherman'])
  })

  it('한 장이라도 들었으면 없던 나머지만 조용히 적는다', () => {
    const view = quizView(2, { sources: { held: ['bellonet'] } })
    expect(view.canAnswer).toBe(true)
    expect(view.absent.map(a => a.id)).toEqual(['sherman'])
  })

  it('막에 질문이 없으면 null 이다 — 부르는 쪽이 한 줄로 건너뛴다', () => {
    expect(quizView('없는막', empty)).toBe(null)
  })
})

describe('사초함에서 읽어 오는 것', () => {
  it('모은 차례 그대로 내놓는다 — 닿는 문서를 앞으로 끌어내지 않는다', () => {
    const state = { sources: { held: ['junggeon', 'bellonet', 'cheokhwabi'] } }
    expect(heldCardsOf(state).map(c => c.id)).toEqual(['junggeon', 'bellonet', 'cheokhwabi'])
  })

  it('잃은 문서는 held 에 없으므로 이 화면에도 없다', () => {
    // systems/codex.js lose() 가 held 에서 덜어 낸다 — 그때 손에 있던 것으로 답한다.
    const state = { sources: { held: ['bellonet'], lost: ['oegyujanggak'] } }
    expect(heldCardsOf(state).map(c => c.id)).toEqual(['bellonet'])
  })

  it('사초함이 없는 상태에도 무너지지 않는다', () => {
    expect(heldCardsOf({})).toEqual([])
    expect(heldCardsOf(null)).toEqual([])
  })

  it('없는 문서 id 가 사초함에 섞여 있어도 건너뛴다', () => {
    expect(heldCardsOf({ sources: { held: ['bellonet', '없는문서'] } }).map(c => c.id)).toEqual(['bellonet'])
  })
})

describe('해설은 카드가 말하는 것만 말한다', () => {
  // 규칙 ②(data/codex-quiz.js 머리말). 완벽한 검사는 아니다 — 해설이 카드에 없는
  // 사실을 지어내는지를 기계가 다 알 수는 없다. 대신 **문서의 제목이 해설에 등장하는
  // 방식**을 붙든다: 해설에 인용으로 실린 구절은 그 막 카드의 원문에 실제로 있어야 한다.
  const QUOTED = /「([^」]{6,})」/g

  it('해설에 낫표로 인용한 구절은 그 막 문서의 원문에 있다', () => {
    for (const [id, quiz] of Object.entries(CODEX_QUIZZES)) {
      const pool = quiz.wants.map(w => sourceById(w))
        .map(c => `${c.excerpt}\n${c.meaning}\n${c.gloss ?? ''}\n${c.title}`)
        .join('\n')
        .replace(/\s+/g, '')
      let m
      while ((m = QUOTED.exec(quiz.explain)) !== null) {
        const needle = m[1].replace(/\s+/g, '')
        // 「국왕의 전제권 제한」처럼 교과서가 카드 밖에 적어 둔 말은 카드의 meaning 이
        // 그대로 물고 있다 — 그래서 pool 에 meaning 을 함께 넣었다.
        expect(pool.includes(needle), `${id} 의 해설이 카드에 없는 구절 「${m[1]}」을 인용한다`).toBe(true)
      }
    }
  })

  it('해설에 이름을 든 문서는 wants 안에 있다', () => {
    // 『…』로 부른 책 이름이 그 막 wants 의 카드 제목에 실제로 들어 있어야 한다.
    const BOOK = /『([^』]+)』/g
    for (const [id, quiz] of Object.entries(CODEX_QUIZZES)) {
      const titles = quiz.wants.map(w => `${sourceById(w).title} ${sourceById(w).origin} ${sourceById(w).meaning}`).join(' ')
      let m
      while ((m = BOOK.exec(quiz.explain)) !== null) {
        expect(titles.includes(m[1]), `${id} 의 해설이 그 막에 없는 『${m[1]}』을 든다`).toBe(true)
      }
    }
  })
})

describe('무작위를 쓰지 않는다', () => {
  // 교실에서 두 아이의 화면이 달라 보이면 그 자체가 사고다.
  const files = ['src/data/codex-quiz.js', 'src/systems/codex-quiz.js', 'src/ui/codex-quiz.js']

  it('Math.random 도 Date 도 없다', () => {
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), f), 'utf8')
      expect(src, `${f}`).not.toMatch(/Math\.random/)
      expect(src, `${f}`).not.toMatch(/new Date|Date\.now/)
    }
  })

  it('같은 사초함이면 같은 화면이 선다', () => {
    const state = { sources: { held: ['sherman', 'junggeon', 'bellonet'] } }
    expect(JSON.stringify(quizView(2, state))).toBe(JSON.stringify(quizView(2, state)))
  })
})
