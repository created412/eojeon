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
  return { hit: null, misses: 0 }
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

export const readDone = state => state?.hit != null

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
}

// 사초함에 남길 기록.
export function readRecord(spec, state) {
  const part = partsOf(spec)[state.hit]
  return { kind: 'read', selected: part ? [part.text.trim()] : [], text: '', compared: readDone(state), misses: state.misses }
}
