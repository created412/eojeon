// 문서를 뜯어 읽는다 — 물음 하나에 답할 때마다 문서에 붉은 주석이 하나씩 붙는 판.
//
// 선생님(2026-10-06):
//   「강화도 조약 조약문 해석하는 게 이 게임의 백미야. 좀 더 재미있게 다시 해석 게임을 만들 수
//    없겠어? 지금은 그냥 어디가 문제고 해석을 써 봐 이렇잖아.」
//   「속방 이건 그냥 넘기기에 너무 아까운 교육 자료야. 재미있게 활용 한번 다시 해 봐.」
//   「개혁 정강 14개조를 가지고 고종이 고민하고 선택하게 하는 걸 넣는 게 좋을 거 같아.」
//
// 예전의 사료 탐구는 「구절을 고르고 → 해석을 여덟 자 넘게 쓰고 → 해설과 견준다」였다.
// 쓰는 칸은 아무 글이나 받았고, 해설은 읽지 않아도 넘어갔다. 이 판은 **쓰지 않는다.**
// 문서를 놓고 걸음을 하나씩 밟는다 — 두 나라를 바꿔 읽어 보고, 그 문장이 문서에 있는지
// 답하고, 조항이 누구에게 무엇을 주는지 고른다. 답할 때마다 문서 여백에 주석이 붙어,
// 끝나면 **학생이 단 주석으로 덮인 문서**가 남는다.
//
// 걸음의 종류
//   flip   두 나라를 바꿔 읽는다 → 「이 문장도 문서에 있는가」를 고른다.
//          교과서 111쪽 「생각 키우기」의 그 활동이다(불리한 조항을 평등한 조항으로 바꾸어 보자).
//   pick   보기 가운데 하나를 고른다.
//   fill   문서의 빈칸에 낱말을 놓는다(systems/cloze.js 와 같은 셈).
//
// 이 파일은 셈만 한다. DOM 을 모른다.
import { parseLine } from './cloze.js'

/** 문서의 대목들 — 글 안의 {낱말} 은 fill 걸음에서 채우는 빈칸이다. */
export function sectionsOf(study) {
  let n = 0
  return (study?.sections ?? []).map(sec => ({
    ...sec,
    parts: parseLine(sec.text).map(part => (part.blank == null ? part : { blank: `${sec.id}:${n++}`, answer: part.blank })),
  }))
}

export function blanksOf(study) {
  return sectionsOf(study).flatMap(sec => sec.parts.filter(p => p.blank).map(p => ({ id: p.blank, answer: p.answer, section: sec.id })))
}

export function initialStudy() {
  return { step: 0, flipped: false, misses: 0, notes: [], filled: {}, used: {}, activeBlank: null, done: false }
}

export const stepAt = (study, state) => (state.done ? null : study?.steps?.[state.step] ?? null)
export const stepCount = study => study?.steps?.length ?? 0

function advance(study, state, note) {
  const notes = note ? [...state.notes, note] : state.notes
  const step = state.step + 1
  return { ...state, step, flipped: false, misses: 0, notes, done: step >= stepCount(study) }
}

/** 두 나라를 바꿔 읽는다(flip 걸음에서만). 바꿔 읽어야 답할 수 있다. */
export function flip(study, state) {
  const s = stepAt(study, state)
  if (!s || s.kind !== 'flip') return state
  return { ...state, flipped: true }
}

// 빈칸 채우기 — 낱말 조각(섞인 차례).
export function chipsOf(study, step) {
  const answers = (step.blanks ?? blanksOf(study).map(b => b.id))
    .map(id => blanksOf(study).find(b => b.id === id)?.answer).filter(Boolean)
  const words = [...answers, ...(step.extra ?? [])]
  const key = w => { let h = 2166136261; for (const c of `${w}/${words.length}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
  return words.map((word, i) => ({ id: `c${i}`, word })).sort((a, b) => key(a.word) - key(b.word))
}

function fillTargets(study, step) {
  const all = blanksOf(study)
  return step.blanks ? all.filter(b => step.blanks.includes(b.id)) : all
}

/**
 * 한 걸음에 답한다.
 *   flip·pick  payload = 보기의 id
 *   fill       payload = { blank, word } — blank 를 주지 않으면 아직 안 찬 첫 칸에 놓는다
 * 돌려주는 것: { state, ok, say } — say 는 화면이 띄울 한 줄.
 * 맞지 않아도 깎지 않는다. 다만 왜 아닌지를 그 보기에 맞춰 말한다.
 */
export function answer(study, state, payload) {
  const s = stepAt(study, state)
  if (!s) return { state, ok: false, say: '' }

  if (s.kind === 'fill') {
    const targets = fillTargets(study, s)
    const open = targets.filter(b => !state.filled[b.id])
    const blank = targets.find(b => b.id === (payload?.blank ?? state.activeBlank)) ?? open[0]
    if (!blank || state.filled[blank.id]) return { state, ok: false, say: '' }
    if (payload?.word !== blank.answer) {
      return { state: { ...state, misses: state.misses + 1, activeBlank: blank.id }, ok: false, say: s.miss ?? STUDY_LINES.fillMiss }
    }
    const filled = { ...state.filled, [blank.id]: blank.answer }
    const left = targets.filter(b => !filled[b.id])
    const next = { ...state, filled, activeBlank: left[0]?.id ?? null, misses: 0 }
    if (left.length > 0) return { state: next, ok: true, say: '' }
    return { state: advance(study, next, s.note ? { section: s.section ?? null, text: s.note } : null), ok: true, say: s.ok ?? '' }
  }

  const option = (s.options ?? []).find(o => o.id === payload)
  if (!option) return { state, ok: false, say: '' }
  if (s.kind === 'flip' && !state.flipped) return { state, ok: false, say: STUDY_LINES.flipFirst }
  if (option.id !== s.answer) {
    return { state: { ...state, misses: state.misses + 1 }, ok: false, say: option.say ?? s.miss ?? STUDY_LINES.miss }
  }
  return { state: advance(study, state, s.note ? { section: s.section ?? null, text: s.note } : null), ok: true, say: s.ok ?? '' }
}

/** fill 걸음에서 채울 칸을 고른다. */
export function focusBlank(study, state, blankId) {
  const s = stepAt(study, state)
  if (!s || s.kind !== 'fill' || state.filled[blankId]) return state
  if (!fillTargets(study, s).some(b => b.id === blankId)) return state
  return { ...state, activeBlank: blankId }
}

export function activeBlank(study, state) {
  const s = stepAt(study, state)
  if (!s || s.kind !== 'fill') return null
  const targets = fillTargets(study, s).filter(b => !state.filled[b.id])
  return targets.find(b => b.id === state.activeBlank)?.id ?? targets[0]?.id ?? null
}

// 두 번 헛짚으면 그 보기(낱말)가 스스로 빛난다 — 갇히는 학생이 없게.
export const STUDY_HINT_AFTER = 2
export function studyHint(study, state) {
  const s = stepAt(study, state)
  if (!s || state.misses < STUDY_HINT_AFTER) return null
  if (s.kind === 'fill') {
    const id = activeBlank(study, state)
    return blanksOf(study).find(b => b.id === id)?.answer ?? null
  }
  return s.answer
}

export const STUDY_LINES = {
  flipFirst: '먼저 「두 나라를 바꿔 읽는다」를 눌러 보라.',
  miss: '문서를 다시 읽어 보라.',
  fillMiss: '그 낱말은 이 자리에 붙지 않는다.',
}

// 사초함에 남길 기록 — 학생이 문서에 단 주석들.
export function studyRecord(study, state) {
  return { kind: 'study', selected: state.notes.map(n => n.text), text: '', compared: state.done }
}
