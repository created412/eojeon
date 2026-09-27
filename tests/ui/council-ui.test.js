import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  gateChoices, councilEvidenceHtml, councilChoicesHtml, councilForecastHtml,
  councilRevealHtml, councilSlotHtml, statusLine, LABELS,
} from '../../src/ui/council-ui.js'
import {
  councilEvidenceView, councilRecord, claimsOf, FORECAST_NOTE, EMPTY_HAND_LINE,
} from '../../src/systems/council-evidence.js'
import { sourceById } from '../../src/data/sources.js'
import { createState } from '../../src/core/state.js'

// 어전회의 선택지를 잠그는 까닭이 셋이다. 셋 다 systems/council.js 밖에서
// 판정한다 — 그 파일은 잠금이라 한 글자도 고치지 않는다.
//   (1) 사료를 안 읽었다       — evaluateChoices() 가 판정한다(지금까지의 규칙)
//   (2) 아직 모르는 일이 있다  — needsFlag. 설계서 7.6, 「성공하면 선택지가 열린다」
//   (3) 회의가 얼어붙었다      — frozen. 4막 비트 7, 대원군이 나랏일을 다시 맡는 자리
function stateWith({ read = [], flags = {} } = {}) {
  const s = createState()
  return { ...s, sources: { ...s.sources, held: [...read], read: [...read] }, flags }
}

const beat = {
  council: {
    question: '무엇을 할 것인가',
    choices: [
      { id: 'plain', text: '아무 근거 없이 고른다', requires: [] },
      { id: 'needsCard', text: '조약의 조항을 짚는다', requires: ['ganghwa10'] },
      { id: 'needsKnow', text: '청군에게 도움을 청한다', requires: [], needsFlag: 'queen-alive-known', flagLabel: '왕비가 살아 있다는 것을 모른다' },
    ],
  },
}

describe('gateChoices — 잠그는 까닭이 셋이다', () => {
  it('아무것도 안 읽어도 고를 수 있는 것이 있다 — 회의는 그냥 열린다', () => {
    const g = gateChoices(stateWith(), beat)
    expect(g.find(c => c.id === 'plain').unlocked).toBe(true)
  })

  it('안 읽은 사료가 있으면 그 제목으로 잠긴다', () => {
    const c = gateChoices(stateWith(), beat).find(c => c.id === 'needsCard')
    expect(c.unlocked).toBe(false)
    expect(c.why.join(' ')).toContain('읽지 않았습니다')
  })

  it('읽으면 열린다', () => {
    const c = gateChoices(stateWith({ read: ['ganghwa10'] }), beat).find(c => c.id === 'needsCard')
    expect(c.unlocked).toBe(true)
  })

  it('깃발이 안 서면 잠기고, 까닭이 사료가 아니라 「모른다」로 나온다', () => {
    const c = gateChoices(stateWith(), beat).find(c => c.id === 'needsKnow')
    expect(c.unlocked).toBe(false)
    expect(c.why).toContain('왕비가 살아 있다는 것을 모른다')
  })

  it('깃발이 서면 열린다 — 성공한 학생은 그 선택지가 있는 줄 안다', () => {
    const c = gateChoices(stateWith({ flags: { 'queen-alive-known': true } }), beat).find(c => c.id === 'needsKnow')
    expect(c.unlocked).toBe(true)
  })

  it('얼어붙으면 전부 잠기고 까닭이 하나로 바뀐다', () => {
    const frozen = { ...beat, frozen: true, frozenReason: '대원군이 다시 나랏일을 맡았다' }
    const g = gateChoices(stateWith({ read: ['ganghwa10'], flags: { 'queen-alive-known': true } }), frozen)
    expect(g.every(c => c.unlocked === false)).toBe(true)
    for (const c of g) expect(c.why).toContain('대원군이 다시 나랏일을 맡았다')
  })

  it('얼어붙어도 깃발이 갈린 것은 그대로 보인다 — 아는 것과 못 하는 것은 다르다', () => {
    const frozen = { ...beat, frozen: true, frozenReason: '대원군이 다시 나랏일을 맡았다' }
    const known = gateChoices(stateWith({ flags: { 'queen-alive-known': true } }), frozen).find(c => c.id === 'needsKnow')
    const unknown = gateChoices(stateWith(), frozen).find(c => c.id === 'needsKnow')
    expect(known.text).toBe('청군에게 도움을 청한다')
    expect(unknown.text).toBe(null)
    expect(unknown.why).toContain('왕비가 살아 있다는 것을 모른다')
  })

  it('flags 가 없어도 터지지 않는다', () => {
    expect(() => gateChoices({ ...createState(), flags: undefined }, beat)).not.toThrow()
  })
})

// Task 10 리뷰 지적 (1) — 얼어붙은 회의에서 「『X』을 읽지 않았습니다」가
// frozenReason 과 나란히 남아 있었다. 4막 실데이터(grain, requires:['joil-trade'])가
// 들어오는 순간 학생 화면이 「내가 안 읽어서 막혔다」와 「정치 때문에 막혔다」를
// 동시에 말한다 — 이 화면의 요점은 얼어붙음이 학생 잘못이 아니라는 것이다.
// Task 10 이 넣은 여덟 시험은 이 문구를 지워도 전부 통과했다. 여기서 붙든다.
describe('얼어붙은 회의는 학생 잘못을 말하지 않는다', () => {
  const frozen = { ...beat, frozen: true, frozenReason: '대원군이 다시 나랏일을 맡았다' }

  it('얼지 않은 회의는 무엇을 안 읽었는지 이름으로 말한다 — 이건 그대로다', () => {
    const g = gateChoices(stateWith(), beat)
    expect(g.find(c => c.id === 'needsCard').why.join(' ')).toContain('읽지 않았습니다')
  })

  it('얼어붙은 회의에서는 그 미열람 안내가 사라진다', () => {
    const g = gateChoices(stateWith(), frozen)
    for (const c of g) {
      expect(c.why.join(' '), c.id).not.toContain('읽지 않았습니다')
    }
  })

  it('얼어붙은 회의의 잠금 까닭은 조정 쪽 사정 하나다', () => {
    const g = gateChoices(stateWith(), frozen)
    expect(g.find(c => c.id === 'needsCard').why).toEqual(['대원군이 다시 나랏일을 맡았다'])
    expect(g.find(c => c.id === 'plain').why).toEqual(['대원군이 다시 나랏일을 맡았다'])
  })

  // 「모르는 일」은 남는다 — 학생 잘못이 아니라 「왕이 무엇을 아는가」이고,
  // 얼어붙은 회의에서도 그 갈림이 살아 있는 것이 설계서 7.6 의 요점이다.
  it('그러나 「왕비가 살아 있다는 것을 모른다」는 얼어붙어도 그대로 뜬다', () => {
    const g = gateChoices(stateWith(), frozen)
    const know = g.find(c => c.id === 'needsKnow')
    expect(know.text).toBe(null)                       // ??? 로 뜬다
    expect(know.why).toContain('왕비가 살아 있다는 것을 모른다')
  })

  it('알고 있으면 얼어붙은 회의에서도 그 선택지의 이름이 보인다 — 보이는데 못 누른다', () => {
    const g = gateChoices(stateWith({ flags: { 'queen-alive-known': true } }), frozen)
    const know = g.find(c => c.id === 'needsKnow')
    expect(know.text).toBe('청군에게 도움을 청한다')
    expect(know.unlocked).toBe(false)
    expect(know.why).toEqual(['대원군이 다시 나랏일을 맡았다'])
  })
})

// ── 글상자가 사라진 자리 ───────────────────────────────────────────────────
//
// 2026-09-27 선생님: 「선택 후 이유 쓰기는 다 바꿔야 할 것 같아.」 그 글상자에 학생이
// 쓴 것이 화면 사진에 남아 있었다 — 「DDDD」. 여기서 붙드는 것은 여섯이다.
//   ① 사초함에 없는 글은 놓을 칸조차 없다
//   ② 빈손인 학생도 끝까지 간다(문이 잠기지 않는다)
//   ③ 예보 판에 실제 역사가 한 글자도 비치지 않는다
//   ④ 실제와 예보가 나란히 서고, 어느 쪽에도 표시가 없다
//   ⑤ claims·forecasts 가 없는 비트는 예전 꼴로 물러선다
//   ⑥ 글상자가 없고, 누를 것은 모두 <button> 이고, 닫히는 문은 하나다
//
// 시험 환경이 node 라 DOM 이 없다 — 판은 순수 함수가 문자열로 내놓고(ui/codex-quiz.js
// 와 같은 꼴), 배선은 원문을 문자열로 훑는다. 실제로 서는 모습은 사람이 눈으로 본다
// (.council-shot.mjs 로 1440×900 · 390×844 촬영).
const SRC = readFileSync(join(process.cwd(), 'src', 'ui', 'council-ui.js'), 'utf8')
const noComments = SRC.split(/\r?\n/).map(l => l.replace(/\/\/.*/, '')).join('\n')

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
        gloss: '화친 — 싸움을 그만두고 사이좋게 지내기로 하는 것.',
        wants: ['bellonet'],
        notes: { bellonet: '저들이 보낸 글에 그대로 적혀 있다.' } },
      { id: 'wait', who: '승정원 승지', portrait: 'senior',
        text: '「강화도의 형세가 아직 다 올라오지 않았습니다.」', wants: ['yangheonsu'] },
    ],
    forecasts: [
      { id: 'shut', text: '문은 더 굳게 닫힌다', echo: '다섯 해 뒤 척화비가 전국 200여 곳에 섰다.' },
      { id: 'again', text: '곧 다시 배가 온다', echo: '다섯 해 뒤 미국 함대가 같은 물길로 들어왔다(신미양요, 1871).' },
    ],
  },
  actual: { line: '조선은 물러서지 않았다. 양헌수가 정족산성에서 프랑스군을 물리쳤다.', origin: '『고종실록』 고종 3년(1866)' },
}

// claims·forecasts 가 아직 없는 비트 — 나머지 세 회의를 채우는 동안의 모습이다.
const bare = {
  id: 'bare',
  council: { question: '무엇을 할 것인가', choices: [{ id: 'a', text: '고른다', requires: [] }] },
  actual: { line: '실제로는 이러했다.', origin: '출처' },
}

// 사초함에 들어 있고(held) 읽었다(read) — 근거 대기는 든 것을 보고, 선택지 해금은
// 읽은 것을 본다(systems/codex.js isRead). 두 칸을 함께 채워 실제 학생 상태에 맞춘다.
const handOf = (held) => ({ sources: { held: [...held], read: [...held] }, flags: {} })
const rich = handOf(['bellonet', 'yangheonsu', 'junggeon'])
const poor = handOf(['junggeon'])
const empty = handOf([])

describe('① 근거 대기 판 — 손에 있는 글만 놓을 수 있다', () => {
  const view = councilEvidenceView(byeongin, rich)
  const html = councilEvidenceHtml(byeongin, view)

  it('신하들의 말과 이름과 얼굴이 선다', () => {
    for (const c of claimsOf(byeongin)) {
      expect(html).toContain(c.who)
      expect(html).toContain(c.text.replace(/&/g, '&amp;'))
    }
    expect(html).toContain('흥선대원군')
    expect(html).toContain('data:image/webp;base64')          // 얼굴이 붙는다
    expect(html).toContain('화친 — 싸움을 그만두고')            // 첫 등장 낱말 한 줄 풀이
  })

  it('든 글만 칸으로 선다 — 안 든 글은 놓을 칸조차 없다', () => {
    const only = councilEvidenceHtml(byeongin, councilEvidenceView(byeongin, poor))
    expect(only).toContain(sourceById('junggeon').title)
    expect(only).not.toContain(sourceById('bellonet').title)
    expect(only).not.toContain(sourceById('yangheonsu').title)
  })

  it('놓기 전에는 말 밑이 비어 있다', () => {
    expect(html).toContain(LABELS.slotEmpty)
    expect(html).toContain('data-filled="false"')
  })

  it('실제 역사가 이 판에 한 글자도 비치지 않는다', () => {
    expect(html).not.toContain('양헌수가 정족산성에서')
    expect(html).not.toContain(LABELS.actualHead)
  })

  it('누를 것은 모두 <button> 이다 — 손가락과 키보드가 같은 자리를 지난다', () => {
    for (const m of html.match(/<[a-z]+[^>]*data-(?:id|place|go)=/g) ?? []) {
      expect(m.startsWith('<button'), m).toBe(true)
    }
  })
})

describe('② 빈손인 학생도 끝까지 간다', () => {
  const view = councilEvidenceView(byeongin, empty)
  const html = councilEvidenceHtml(byeongin, view)

  it('사초함이 비면 그 사실을 다정하게 말하고, 말들은 그대로 읽힌다', () => {
    expect(html).toContain(EMPTY_HAND_LINE)
    expect(html).not.toContain('council-grid')
    expect(html).toContain('흥선대원군')
  })

  it('넘어가는 단추가 그대로 있다 — 문을 잠그지 않는다', () => {
    expect(html).toContain('data-go="choices"')
    expect(html).toContain(LABELS.goneWithout)
  })

  it('안 모은 글을 두고 「왜」를 묻지 않는다', () => {
    expect(EMPTY_HAND_LINE).not.toContain('왜')
    expect(html).not.toContain('왜 ')
  })

  it('놓은 글이 없으면 기록 문장도 나무라지 않는다', () => {
    const r = councilRecord(byeongin, { choiceId: 'fight', attached: {}, forecastId: 'shut' })
    expect(r.sentence).toContain('사초함에서 근거를 꺼내지 않고')
    expect(r.sentence).not.toContain('못')
  })
})

describe('놓인 글은 그 말 옆에서 제 말을 한다', () => {
  it('제목과 본문과 한 줄이 함께 선다', () => {
    const claim = claimsOf(byeongin)[0]
    const html = councilSlotHtml(byeongin, claim, 'bellonet', sourceById('bellonet'))
    expect(html).toContain(sourceById('bellonet').title)
    expect(html).toContain('조선 왕국 최후의 날')
    expect(html).toContain('저들이 보낸 글에 그대로 적혀 있다.')
  })

  it('가리키지 않던 글을 놓아도 판정 없는 한 줄이 붙는다', () => {
    const claim = claimsOf(byeongin)[1]
    const html = councilSlotHtml(byeongin, claim, 'junggeon', sourceById('junggeon'))
    expect(html).toContain('읽는 사람이 정한다')
  })

  it('안내 한 줄은 셈하지 않는다', () => {
    expect(statusLine(byeongin, { picked: null, placed: 0 })).toBe(LABELS.statusIdle)
    expect(statusLine(byeongin, { picked: '양헌수의 정족산성 장계' })).toContain('들었다')
    expect(statusLine(byeongin, { placed: 2 })).not.toMatch(/\d/)
  })
})

describe('③ 예보 판 — 실제가 아직 안 뜬 자리다', () => {
  const html = councilForecastHtml(byeongin, byeongin.council.forecasts, '물러서지 않는다. 군사를 보내 지킨다')

  it('예보 넷(둘)이 서고, 고른 것이 위에 남는다', () => {
    expect(html).toContain('문은 더 굳게 닫힌다')
    expect(html).toContain('곧 다시 배가 온다')
    expect(html).toContain('물러서지 않는다. 군사를 보내 지킨다')
  })

  it('실제 역사와 그 뒤의 일이 한 글자도 비치지 않는다 — 여기서 새면 예보가 아니다', () => {
    expect(html).not.toContain('양헌수가 정족산성에서')
    expect(html).not.toContain('척화비')
    expect(html).not.toContain('신미양요')
    expect(html).not.toContain(LABELS.actualHead)
  })

  it('예보도 <button> 으로만 고른다', () => {
    for (const m of html.match(/<[a-z]+[^>]*data-forecast=/g) ?? []) {
      expect(m.startsWith('<button'), m).toBe(true)
    }
  })
})

describe('④ 실제와 예보가 나란히 선다 — 재지 않는다', () => {
  const view = councilEvidenceView(byeongin, rich)
  const record = councilRecord(byeongin, {
    choiceId: 'fight', attached: { 'no-peace': 'bellonet' }, forecastId: 'shut',
  })
  const html = councilRevealHtml(byeongin, record, view)

  it('실제로는 — 이 뜬다', () => {
    expect(html).toContain(LABELS.actualHead)
    expect(html).toContain('양헌수가 정족산성에서')
    expect(html).toContain('『고종실록』 고종 3년(1866)')
  })

  it('내가 본 앞일과 그 뒤에 일어난 일이 나란히 서고, 그 까닭이 한 줄로 붙는다', () => {
    expect(html).toContain(LABELS.mineHead)
    expect(html).toContain(LABELS.realHead)
    expect(html).toContain('문은 더 굳게 닫힌다')
    expect(html).toContain('척화비가 전국 200여 곳에 섰다')
    expect(html).toContain(FORECAST_NOTE)
  })

  it('어느 쪽에도 표시가 붙지 않는다', () => {
    for (const w of ['정답', '오답', '맞혔', '틀렸', '점수']) expect(html).not.toContain(w)
  })

  it('내가 딛고 선 글이 그 말과 함께 되돌아온다', () => {
    expect(html).toContain(LABELS.standHead)
    expect(html).toContain('흥선대원군')
    expect(html).toContain(sourceById('bellonet').title)
  })

  it('사초함에 없던 글은 어디에 있었는지로만 적힌다', () => {
    const poorHtml = councilRevealHtml(byeongin, councilRecord(byeongin, { choiceId: 'fight' }),
      councilEvidenceView(byeongin, poor))
    expect(poorHtml).toContain(LABELS.absentHead)
    expect(poorHtml).toContain(sourceById('bellonet').title)
    expect(poorHtml).toContain(LABELS.absentFoot)
  })

  it('사관이 적는 문장이 종이 위에 그대로 선다 — 기록으로 가는 그 문장이다', () => {
    expect(html).toContain(record.sentence)
    expect(record.sentence).toContain('『프랑스 외교관 벨로네가 보낸 편지』를 근거로 삼아')
    expect(record.sentence).toContain('「문은 더 굳게 닫힌다」고 보았다')
  })

  it('뒤집는 말과 해석 상자는 예전 그대로다', () => {
    const with2 = councilRevealHtml({
      ...byeongin,
      overturn: '「이 일은 이 아비가 맡겠습니다.」',
      overturnBy: { name: '흥선대원군', portrait: 'regent' },
      actual: { ...byeongin.actual, reading: { label: '역사가들은 이렇게 본다', line: '해석 한 줄', origin: '출처' } },
    }, record, view)
    expect(with2).toContain('이 아비가 맡겠습니다')
    expect(with2).toContain('역사가들은 이렇게 본다')
    expect(with2).toContain('해석 한 줄')
  })
})

describe('⑤ claims·forecasts 가 없으면 예전 꼴로 물러선다', () => {
  it('근거 대기도 예보도 서지 않는다', () => {
    const view = councilEvidenceView(bare, rich)
    expect(view.claims).toEqual([])
    expect(view.forecasts).toEqual([])
  })

  it('고르는 판은 예전 규칙 그대로다 — 잠긴 것은 ???, 셈은 「고를 수 있는 것 n / m」', () => {
    const gated = gateChoices(stateWith(), beat)
    const html = councilChoicesHtml(beat, gated)
    expect(html).toContain('???')
    expect(html).toContain('아무 근거 없이 고른다')
    expect(html).toContain(`${LABELS.choiceCount} 1 / 3`)
    expect(html).toContain('읽지 않았습니다')
  })

  it('얼어붙은 회의의 단추도 그대로 있다', () => {
    const frozen = { ...beat, frozen: true, frozenReason: '대원군이 다시 나랏일을 맡았다', frozenLabel: '아무 말도 하지 못한다' }
    const html = councilChoicesHtml(frozen, gateChoices(stateWith(), frozen))
    expect(html).toContain('data-go="frozen"')
    expect(html).toContain('아무 말도 하지 못한다')
  })

  it('놓아 둔 근거는 고르는 동안 위에 남는다', () => {
    const html = councilChoicesHtml(byeongin, gateChoices(rich, byeongin), ['양헌수의 정족산성 장계'])
    expect(html).toContain(LABELS.standing)
    expect(html).toContain('『양헌수의 정족산성 장계』')
  })

  it('예보가 없는 비트의 실제 판에는 예보 자리가 없다', () => {
    const record = councilRecord(bare, { choiceId: 'a' })
    const html = councilRevealHtml(bare, record, councilEvidenceView(bare, rich))
    expect(html).toContain('실제로는 이러했다')
    expect(html).not.toContain(LABELS.mineHead)
    expect(html).not.toContain(FORECAST_NOTE)
    expect(record.sentence).toBe('당신은 사초함에서 근거를 꺼내지 않고 「고른다」 쪽으로 정했다.')
  })
})

describe('⑥ 글상자는 없고, 닫히는 문은 하나다', () => {
  it('textarea 가 한 개도 없다 — 선생님이 지우라고 한 그 자리다', () => {
    expect(noComments).not.toContain('textarea')
    expect(noComments).not.toContain('왜 그렇게 정하셨습니까')
    expect(noComments).not.toContain('사관이 받아 적을 말이 아직 없습니다')
  })

  it('쓰지 않으면 못 넘어가는 잠금이 없다 — 넘어가는 단추는 언제나 눌린다', () => {
    expect(noComments).not.toContain('MIN_REASON')
    expect(noComments).not.toContain('go.disabled')
    // 넘어가는 단추(.go)에는 disabled 가 붙지 않는다. 잠기는 것은 「이 말 밑에 놓는다」
    // 하나뿐이고, 그것은 손에 든 글이 없을 때 눌러 봐야 아무 일도 안 나기 때문이다.
    for (const m of councilEvidenceHtml(byeongin, councilEvidenceView(byeongin, empty))
      .match(/<button[^>]*>/g) ?? []) {
      if (m.includes('class="go"')) expect(m, m).not.toContain('disabled')
    }
  })

  it('onDecide 는 한 번만 불린다 — done 으로 잠근다', () => {
    expect(noComments).toContain('if (done) return')
    expect(noComments.match(/onDecide\(/g)).toHaveLength(1)
  })

  it('타이머를 쓰지 않는다 — 기다리게 하는 장치가 없다', () => {
    expect(noComments).not.toContain('setTimeout')
    expect(noComments).not.toContain('setInterval')
    expect(noComments).not.toContain('requestAnimationFrame')
  })

  it('판마다 초점을 옮긴다 — 키보드만으로 끝까지 간다', () => {
    expect(noComments.match(/\.focus\(/g)?.length ?? 0).toBeGreaterThanOrEqual(4)
  })

  it('움직임을 줄인 기기에서는 숨을 걸지 않는다', () => {
    expect(SRC).toContain('prefers-reduced-motion:no-preference')
  })

  it('390px 에서 한 칸으로 내려선다', () => {
    expect(SRC).toContain('@media(max-width:760px)')
    expect(SRC).toContain('grid-template-columns:1fr')
  })

  it('활자는 type-css 의 값을 받아 쓴다', () => {
    expect(SRC).toContain('installTypeVars')
    expect(SRC).toContain('var(--read-body')
  })
})

// 눈으로 보고 고친 자리들 — 1440×900 · 390×844 촬영에서 드러난 것만 붙든다.
describe('화면을 보고 고친 것', () => {
  it('사초함이 비면 놓는 단추를 아예 세우지 않는다 — 못 누르는 단추 넷이 「못 한다」로 읽혔다', () => {
    const html = councilEvidenceHtml(byeongin, councilEvidenceView(byeongin, empty))
    expect(html).not.toContain('council-place')
    expect(html).not.toContain(LABELS.placeNeedPick)
    expect(html).not.toContain(LABELS.statusIdle)          // 고를 것이 없는데 고르라 하지 않는다
    expect(html).toContain('흥선대원군')                    // 말은 그대로 읽는다
  })

  it('손에 글이 있으면 놓는 단추가 선다', () => {
    const html = councilEvidenceHtml(byeongin, councilEvidenceView(byeongin, rich))
    expect(html).toContain('council-place')
    expect(html).toContain(LABELS.statusIdle)
  })

  it('든 글의 이름에 을/를 을 받침대로 고른다', () => {
    expect(statusLine(byeongin, { picked: '양헌수의 정족산성 장계' })).toContain('『양헌수의 정족산성 장계』를 들었다')
    expect(statusLine(byeongin, { picked: '외규장각 도서 목록' })).toContain('『외규장각 도서 목록』을 들었다')
  })

  it('고르는 판·예보 판의 초점은 목록에 둔다 — 첫 단추에 주면 Enter 한 번이 결정이 된다', () => {
    expect(noComments).toContain("querySelector('.list')?.focus")
    expect(noComments).toContain("querySelector('.council-forecasts')?.focus")
    expect(noComments).toContain("querySelector('.council-board')?.focus")
    expect(councilChoicesHtml(byeongin, gateChoices(rich, byeongin))).toContain('tabindex="-1"')
  })
})
