import { describe, it, expect } from 'vitest'
import { createState } from '../../src/core/state.js'
import { pickUp, markRead } from '../../src/systems/codex.js'
import { SOURCES, sourceById, sourcesOfAct } from '../../src/data/sources.js'
import { evaluateChoices } from '../../src/systems/council.js'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  claimsOf, forecastsOf, hasEvidenceStage, hasForecastStage, forecastById,
  attachableCards, bearingIdsOf, absentBearing, bears, noteFor,
  attachmentRows, attachedTitles, eulReul, recordSentence, councilRecord,
  councilEvidenceView, FORECAST_NOTE, NEUTRAL_ATTACH_NOTE, EMPTY_HAND_LINE,
} from '../../src/systems/council-evidence.js'

const council = {
  question: '경복궁을 다시 짓는 비용을 어디서 걷는가',
  choices: [
    { id: 'levy', text: '원납전을 걷는다', requires: [] },
    { id: 'coin', text: '당백전을 발행한다', requires: ['dangbaekjeon'] },
    { id: 'refuse', text: '중건을 미룬다', requires: ['dangbaekjeon', 'wonnapjeon'] },
  ],
}

function read(state, ids) {
  return ids.reduce((s, id) => markRead(pickUp(s, id), id), state)
}

describe('사료 데이터', () => {
  it('모든 카드가 id·출처·등급을 가진다', () => {
    for (const c of SOURCES) {
      expect(c.id, `${c.title} 에 id 없음`).toBeTruthy()
      expect(c.origin, `${c.title} 에 출처 없음`).toBeTruthy()
      expect(['textbook', 'source', 'staged']).toContain(c.grade)
    }
  })

  it('id 가 겹치지 않는다', () => {
    const ids = SOURCES.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('id 로 찾을 수 있다', () => {
    expect(sourceById('dangbaekjeon')?.act).toBe(1)
  })

  it('막으로 추릴 수 있다', () => {
    expect(sourcesOfAct(1).every(c => c.act === 1)).toBe(true)
    expect(sourcesOfAct(1).length).toBeGreaterThan(0)
  })
})

describe('어전회의 해금', () => {
  it('요구 사료가 없는 선택지는 항상 열려 있다', () => {
    const r = evaluateChoices(createState(), council)
    expect(r[0]).toEqual({ id: 'levy', text: '원납전을 걷는다', unlocked: true, missing: [] })
  })

  it('안 읽으면 잠기고, 무엇이 없는지 제목으로 알려준다', () => {
    const r = evaluateChoices(createState(), council)
    expect(r[1].unlocked).toBe(false)
    expect(r[1].missing).toEqual([sourceById('dangbaekjeon').title])
  })

  it('읽으면 열린다', () => {
    const s = read(createState(), ['dangbaekjeon'])
    const r = evaluateChoices(s, council)
    expect(r[1].unlocked).toBe(true)
    expect(r[1].missing).toEqual([])
  })

  it('두 장이 필요한 선택지는 한 장만으로는 안 열린다', () => {
    const s = read(createState(), ['dangbaekjeon'])
    const r = evaluateChoices(s, council)
    expect(r[2].unlocked).toBe(false)
    expect(r[2].missing).toEqual([sourceById('wonnapjeon').title])
  })

  it('줍기만 하고 안 읽으면 잠겨 있다', () => {
    const s = pickUp(createState(), 'dangbaekjeon')
    expect(evaluateChoices(s, council)[1].unlocked).toBe(false)
  })

  it('선택지 순서를 그대로 지킨다', () => {
    expect(evaluateChoices(createState(), council).map(c => c.id))
      .toEqual(['levy', 'coin', 'refuse'])
  })
})

// ── 근거 대기 · 예보 (systems/council-evidence.js) ─────────────────────────
//
// 2026-09-27 선생님: 「선택 후 이유 쓰기는 다 바꿔야 할 것 같아.」 글상자가 사라진
// 자리에 두 가지가 들어왔고, 그 둘의 판정이 council-evidence.js 다. 여기서 붙드는 것은
// 넷이다 — ① 손에 없는 글은 놓을 수 없다 ② 못 모은 학생도 끝까지 간다
// ③ 기록 문장은 한 곳에서만 지어진다 ④ 점수·정답의 말이 한 군데도 없다.

// 2막 병인양요 회의에 들어갈 데이터의 예 — ui/council-ui.js 머리말에 적어 둔 것과 같다.
// 문서 id 는 그 막에서 실제로 손에 들어오는 넷이다(승지·검서관·군교·파발).
const byeongin = {
  id: 'council-byeongin',
  council: {
    question: '프랑스 함대가 강화도에 있다. 맞설 것인가, 물러설 것인가',
    choices: [
      { id: 'fight', text: '물러서지 않는다. 군사를 보내 지킨다', requires: [] },
      { id: 'letter', text: '저들이 보낸 글을 근거로 그 뜻을 따진다', requires: ['bellonet'] },
    ],
    claims: [
      { id: 'no-peace', who: '흥선대원군', portrait: 'regent',
        text: '「저들과 화친할 일은 없다. 저들은 처음부터 무력을 예고하였다.」',
        wants: ['bellonet'],
        notes: { bellonet: '저들이 보낸 글에 그대로 적혀 있다 — 「조선을 정복하기 위해 진군할 것이다.」' } },
      { id: 'wait', who: '승정원 승지', portrait: 'senior',
        text: '「강화도의 형세가 아직 다 올라오지 않았습니다. 손에 있는 것은 장계 한 장뿐입니다.」',
        wants: ['yangheonsu'] },
      { id: 'again', who: '훈련도감 군교', portrait: 'messenger',
        text: '「이 배들이 처음이 아닙니다. 올해 평양에서도 같은 일이 있었습니다.」',
        wants: ['sherman'] },
    ],
    forecasts: [
      { id: 'shut', text: '문은 더 굳게 닫힌다', echo: '다섯 해 뒤 척화비가 전국 200여 곳에 섰다.' },
      { id: 'again', text: '곧 다시 배가 온다', echo: '다섯 해 뒤 미국 함대가 같은 물길로 들어왔다(신미양요, 1871).' },
    ],
  },
  actual: { line: '조선은 물러서지 않았다.', origin: '『고종실록』 고종 3년(1866)' },
}

// 옛 비트 — claims·forecasts 가 아직 없다. 선생님이 나머지 세 회의를 채우시는 동안의 모습이다.
const bare = { id: 'bare', council: { question: '무엇을 할 것인가', choices: [{ id: 'a', text: '고른다', requires: [] }] },
  actual: { line: '실제로는 이러했다.', origin: '출처' } }

const handOf = (held) => ({ sources: { held: [...held] } })

describe('비트에서 읽어 내기 — 없으면 예전 꼴로 물러선다', () => {
  it('claims·forecasts 가 없는 비트는 빈 배열이다', () => {
    expect(claimsOf(bare)).toEqual([])
    expect(forecastsOf(bare)).toEqual([])
    expect(hasEvidenceStage(bare)).toBe(false)
    expect(hasForecastStage(bare)).toBe(false)
  })

  it('있으면 그대로 읽고, id 를 안 적어도 차례로 지어 준다 — 무작위가 아니다', () => {
    const claims = claimsOf({ council: { claims: [{ who: '갑', text: '가' }, { who: '을', text: '나' }] } })
    expect(claims.map(c => c.id)).toEqual(['claim1', 'claim2'])
    expect(claimsOf(byeongin).map(c => c.id)).toEqual(['no-peace', 'wait', 'again'])
    expect(hasEvidenceStage(byeongin)).toBe(true)
    expect(forecastById(byeongin, 'shut').echo).toContain('척화비')
  })

  it('빈 말(text 없음)은 화면에 세우지 않는다', () => {
    expect(claimsOf({ council: { claims: [{ who: '갑', text: '   ' }, null] } })).toEqual([])
  })

  it('말들이 가리키는 문서가 실제로 있는 사료다 — 데이터가 조용히 거짓이 되지 않게', () => {
    for (const id of bearingIdsOf(byeongin)) {
      expect(sourceById(id), `${id} 가 sources.js 에 없다`).toBeTruthy()
    }
  })
})

describe('놓을 수 있는 것은 손에 있는 것뿐이다', () => {
  it('사초함에 든 글만 놓을 수 있다', () => {
    const cards = attachableCards(handOf(['bellonet', 'yangheonsu']))
    expect(cards.map(c => c.id)).toEqual(['bellonet', 'yangheonsu'])
  })

  it('빈손이면 놓을 것이 없다 — 그래도 판정이 터지지 않는다', () => {
    expect(attachableCards(handOf([]))).toEqual([])
    expect(attachableCards(undefined)).toEqual([])
    expect(councilEvidenceView(byeongin, handOf([])).canAttach).toBe(false)
    expect(EMPTY_HAND_LINE).toContain('그래도 회의는 열린다')
  })

  it('모은 차례를 지킨다 — 가리키는 것을 앞으로 끌어내지 않는다', () => {
    const cards = attachableCards(handOf(['junggeon', 'bellonet']))
    expect(cards.map(c => c.id)).toEqual(['junggeon', 'bellonet'])
  })

  it('없던 글은 「…에 있었다」로만 적는다 — 셈하지 않는다', () => {
    const absent = absentBearing(byeongin, ['bellonet'])
    expect(absent.map(a => a.id)).toEqual(['yangheonsu', 'sherman'])
    for (const a of absent) {
      expect(a.title).toBeTruthy()
      expect(a.where).toBeTruthy()
      expect(a.where).not.toContain('왜')
    }
  })
})

describe('놓은 것을 적는다', () => {
  const attached = { wait: 'yangheonsu', 'no-peace': 'bellonet' }

  it('말의 차례대로 선다 — 놓은 차례가 아니라 회의에서 말한 차례다', () => {
    expect(attachmentRows(byeongin, attached).map(r => r.claimId)).toEqual(['no-peace', 'wait'])
  })

  it('데이터에 적어 둔 줄이 있으면 그것을, 없으면 판정 없는 줄을 붙인다', () => {
    const rows = attachmentRows(byeongin, attached)
    expect(rows[0].note).toContain('정복하기 위해')
    expect(rows[1].note).toBe(NEUTRAL_ATTACH_NOTE)
    expect(NEUTRAL_ATTACH_NOTE).toContain('읽는 사람이 정한다')
  })

  it('가리키지 않던 글을 놓아도 판정하지 않는다 — 놓인 대로 선다', () => {
    const rows = attachmentRows(byeongin, { wait: 'junggeon' })
    expect(rows).toHaveLength(1)
    expect(rows[0].title).toBe(sourceById('junggeon').title)
    expect(rows[0].note).toBe(NEUTRAL_ATTACH_NOTE)
    expect(bears(claimsOf(byeongin)[1], 'junggeon')).toBe(false)
    expect(noteFor(claimsOf(byeongin)[1], 'junggeon')).toBe(NEUTRAL_ATTACH_NOTE)
  })

  it('같은 글을 두 말 밑에 놓아도 이름은 한 번만 적힌다', () => {
    expect(attachedTitles(byeongin, { wait: 'bellonet', again: 'bellonet' }))
      .toEqual([sourceById('bellonet').title])
  })
})

describe('기록 문장 — 한 곳에서만 지어진다', () => {
  it('받침을 보아 을/를 을 고른다', () => {
    expect(eulReul('양헌수의 정족산성 장계')).toBe('를')
    expect(eulReul('외규장각 도서 목록')).toBe('을')
    expect(eulReul('원납전(願納錢)')).toBe('을')
    expect(eulReul('')).toBe('을')
  })

  it('근거와 고른 것과 예보가 한 문장으로 선다', () => {
    const s = recordSentence({
      choiceText: '물러서지 않는다. 군사를 보내 지킨다',
      titles: ['양헌수의 정족산성 장계'],
      forecastText: '곧 다시 배가 온다',
    })
    expect(s).toBe('당신은 『양헌수의 정족산성 장계』를 근거로 삼아 '
      + '「물러서지 않는다. 군사를 보내 지킨다」 쪽으로 정했고, 「곧 다시 배가 온다」고 보았다.')
  })

  it('근거를 못 놓은 학생의 문장도 선다 — 나무라지 않는다', () => {
    const s = recordSentence({ choiceText: '대답을 미룬다', titles: [], forecastText: '조정이 갈라진다' })
    expect(s).toContain('사초함에서 근거를 꺼내지 않고')
    expect(s).toContain('「조정이 갈라진다」고 보았다')
  })

  it('예보가 없는 비트(예전 꼴)에서는 예보 대목이 없다', () => {
    const s = recordSentence({ choiceText: '고른다', titles: ['당백전(當百錢)'] })
    expect(s).toBe('당신은 『당백전(當百錢)』을 근거로 삼아 「고른다」 쪽으로 정했다.')
    expect(s).not.toContain('보았다')
  })

  it('얼어붙은 회의는 「아무것도 고르지 못했다」로 적힌다', () => {
    const s = recordSentence({ choiceText: '아무것도 고르지 못했다', chose: false, titles: [] })
    expect(s).toBe('당신은 사초함에서 근거를 꺼내지 않고 아무것도 고르지 못했다.')
  })

  it('councilRecord 의 문장이 recordSentence 와 한 글자도 다르지 않다 — 화면과 기록이 갈라질 자리가 없다', () => {
    const r = councilRecord(byeongin, { choiceId: 'fight', attached: { wait: 'yangheonsu' }, forecastId: 'again' })
    expect(r.sentence).toBe(recordSentence({
      choiceText: '물러서지 않는다. 군사를 보내 지킨다',
      titles: [sourceById('yangheonsu').title],
      forecastText: '곧 다시 배가 온다',
    }))
    expect(r.forecast.echo).toContain('1871')
    expect(r.note).toBe(FORECAST_NOTE)
  })

  it('얼어붙은 회의의 기록도 지어진다 — choiceId 가 frozen 이면 고른 것이 없다', () => {
    const frozen = { ...byeongin, frozenChoiceLabel: '아무 말도 하지 못했다' }
    const r = councilRecord(frozen, { choiceId: 'frozen', attached: {} })
    expect(r.chose).toBe(false)
    expect(r.choiceText).toBe('아무 말도 하지 못했다')
    expect(r.sentence).toContain('아무것도 고르지 못했다')
  })

  it('예보를 재지 않는다 — 나란히 놓는 까닭을 한 줄로 말한다', () => {
    expect(FORECAST_NOTE).toContain('잘못한 것이 아니다')
  })
})

describe('점수와 정답의 말이 한 군데도 없다', () => {
  const files = ['src/systems/council-evidence.js', 'src/ui/council-ui.js']
  const BANNED = ['정답', '오답', '맞혔', '틀렸', '맞췄', '점수', '채점', '득점']

  // 주석은 걷어 내고 본다 — 이 파일들의 주석은 「점수로 읽힌다」처럼 **그 말을 쓰지
  // 말라고 적어 둔 경고**다. 화면에 나가는 것은 문자열이므로 거기만 본다.
  const bodyOf = (f) => readFileSync(join(process.cwd(), f), 'utf8')
    .split(/\r?\n/).map(l => l.replace(/\/\/.*/, '')).join('\n')

  for (const f of files) {
    it(`${f} — 학생이 읽는 글에 채점의 말이 없다`, () => {
      const src = bodyOf(f)
      for (const word of BANNED) expect(src, `${word} 가 있다`).not.toContain(word)
    })
  }

  it('셀 값을 내보내지 않는다 — 숫자가 나가면 화면이 언젠가 그것을 점으로 그린다', () => {
    const r = councilRecord(byeongin, { choiceId: 'fight', attached: { wait: 'yangheonsu' }, forecastId: 'shut' })
    for (const key of Object.keys(r)) expect(typeof r[key], key).not.toBe('number')
  })
})
