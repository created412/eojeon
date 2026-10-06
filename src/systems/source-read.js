// 사료에 밑줄을 긋는다 — 문서를 처음 손에 쥘 때 한 번(data/source-games.js SOURCE_READS).
//
// 셈만 한다. DOM 을 모른다. 화면은 ui/dialog.js 의 showCard 가 그린다.
import { SOURCE_READS } from '../data/source-games.js'

// 줄을 바꿀 자리 표시. 구절의 끝에만 온다.
export const BREAK = '¶'

export function readFor(id) {
  return SOURCE_READS[id] ?? null
}

/** 구절을 화면용으로 편다 — 글과, 뒤에 붙는 줄바꿈 수. */
export function partsOf(spec) {
  return (spec?.parts ?? []).map((raw, i) => {
    let text = String(raw), breaks = 0
    while (text.endsWith(BREAK)) { text = text.slice(0, -BREAK.length); breaks++ }
    return { i, text, breaks }
  })
}

export function initialRead() {
  return { hit: null, misses: 0, probe: null, probeMisses: 0 }
}

// ── 따져 읽기 ─────────────────────────────────────────────────────────────
//
// 선생님(2026-10-06): 「각 사료에 밑줄 긋기는 좋아 보여. 근데 … 밑줄 긋기만 하면 사료 읽기가 재미가
// 없어. 사료를 분석하고 검토하고 비판하는 여러 아이디어를 넣어 봐야 해. 물론 사료 밑줄 긋기가
// 메인이긴 해.」
//
// 그래서 밑줄을 그은 **뒤에** 물음이 하나 더 온다. 사료마다 따지는 것이 다르다 — 누가 썼는가,
// 누구의 눈인가, 일어난 일인가 하겠다는 말인가, 무엇을 말하지 않는가, 어디까지 믿을 것인가,
// 다른 글과 어디가 다른가. 역사가가 사료 앞에서 던지는 물음들이다. 이름표(PROBE_TYPES)를
// 화면에 함께 띄워, 학생이 그 물음에 이름이 있다는 것을 알게 한다.
export const PROBE_TYPES = {
  who: '누가 썼는가',
  side: '누구의 눈인가',
  claim: '일어난 일인가, 하겠다는 말인가',
  word: '낱말을 뜯는다',
  silent: '이 글이 말하지 않는 것',
  trust: '어디까지 믿을 것인가',
  link: '다른 글과 견준다',
  stake: '무엇을 걸고 썼는가',
  after: '이 글이 불러온 것',
  judge: '본 것인가, 내린 평가인가',
  when: '언제 쓴 글인가',
}

export const probeOf = spec => spec?.probe ?? null
export const underlined = state => state?.hit != null
export const probed = (spec, state) => !probeOf(spec) || state?.probe != null

/**
 * 따져 읽기의 보기 하나를 고른다(밑줄을 그은 뒤에만).
 * 돌려주는 것: { state, ok, say } — 맞지 않아도 깎지 않고, 왜 아닌지를 그 보기에 맞춰 말한다.
 */
export function answerProbe(spec, state, optionId) {
  const probe = probeOf(spec)
  if (!probe || !underlined(state) || state.probe != null) return { state, ok: false, say: '' }
  const option = probe.options.find(o => o.id === optionId)
  if (!option) return { state, ok: false, say: '' }
  if (option.id === probe.answer) return { state: { ...state, probe: option.id }, ok: true, say: probe.ok ?? '' }
  return { state: { ...state, probeMisses: state.probeMisses + 1 }, ok: false, say: option.say ?? READ_LINES.probeMiss }
}

// 두 번 헛짚으면 그 보기가 스스로 빛난다.
export function probeHint(spec, state) {
  const probe = probeOf(spec)
  if (!probe || state.probe != null || state.probeMisses < READ_HINT_AFTER) return null
  return probe.answer
}

/**
 * 구절 하나에 밑줄을 그어 본다.
 * 돌려주는 것: { state, ok }. 맞지 않아도 깎지 않는다.
 */
export function underline(spec, state, i) {
  if (!spec || state.hit != null) return { state, ok: false }
  if (i === spec.pick) return { state: { ...state, hit: i }, ok: true }
  return { state: { ...state, misses: state.misses + 1 }, ok: false }
}

// 밑줄을 그었는가(따져 읽기는 보지 않는다 — 그것까지 끝났는지는 readComplete).
export const readDone = state => state?.hit != null
// 이 문서를 덮어도 되는가 — 밑줄을 긋고, 따져 읽기가 있으면 그것까지 답했다.
export const readComplete = (spec, state) => underlined(state) && probed(spec, state)

// 두 번 헛짚으면 그 구절이 스스로 빛난다 — 갇히는 학생이 없게.
export const READ_HINT_AFTER = 2
export function readHint(spec, state) {
  if (!spec || readDone(state) || state.misses < READ_HINT_AFTER) return null
  return spec.pick
}

export const READ_LINES = {
  miss: '그 구절은 이 물음의 답이 아니다. 기록을 다시 읽어 보라.',
  hint: '빛나는 구절을 다시 읽어 보라.',
  blocked: '기록에 밑줄을 그어야 문서를 덮을 수 있다.',
  probeBlocked: '아래의 물음까지 답해야 문서를 덮을 수 있다.',
  probeMiss: '기록과 해석을 다시 읽어 보라.',
}

// 사초함에 남길 기록.
export function readRecord(spec, state) {
  const part = partsOf(spec)[state.hit]
  const probe = probeOf(spec)
  const answered = probe?.options.find(o => o.id === state.probe)
  return {
    kind: 'read', selected: part ? [part.text.trim()] : [], text: '', misses: state.misses,
    // compared — 이 문서를 다 읽었는가(사초함에서 다시 열 때 잠그지 않는다).
    compared: readComplete(spec, state),
    ...(probe && answered ? { probe: { type: PROBE_TYPES[probe.type] ?? '', ask: probe.ask, answer: answered.text } } : {}),
  }
}
