// 문서에서 문제의 글자를 찾는다 — 1868년 일본이 보내온 서계.
//
// 선생님(2026-10-06):
//   「일본 외교문서를 보고받는 거에서 약간의 오류가 있는 거 같아.」
//   「외교문서 게임에 글자 찾는 건 메인 게임 글자들이 잘 안 보이네.」
//   「일본 외교문서 게임에서 못 찾아내면 안 넘어가져야 해. 그리고 실제 정답은 이거와 같아」
//     — 보내 주신 그림: 세로로 쓴 서계에서 「皇」과 「新印」 두 곳에 붉은 테가 쳐져 있다.
//
// 예전 판은 낱말 일곱 개를 가로로 늘어놓고 「皇」과 「勅」을 고르게 했다. 틀린 데가 셋이었다.
//   ① 답이 달랐다 — 교과서의 서계 사본에서 조선이 문제 삼은 것으로 짚는 것은 「皇」과
//      새 도장(新印)이다. 「勅」은 이 사본에 없다.
//   ② 문서가 문서처럼 보이지 않았다 — 작은 글씨 일곱 낱이 줄지어 있을 뿐이었다.
//   ③ 하나만 짚고 아무 글이나 여덟 자 쓰면 넘어갔다.
//
// 이제 문서를 그림 그대로 세로로 펴 놓고, 낱말을 눌러 **뜻을 들여다본 뒤** 문제 삼을 곳을
// 짚는다. 두 곳을 다 찾아야 문서를 덮을 수 있다. 이 파일은 셈만 한다(DOM 을 모른다).

/** 문서의 낱말을 읽는 차례(오른쪽 줄부터, 위에서 아래로)로 편다. 도장이 맨 끝이다. */
export function unitsOf(doc) {
  const out = []
  for (const col of doc?.columns ?? []) for (const u of col) out.push(u)
  if (doc?.seal) out.push(doc.seal)
  return out
}

export function targetsOf(doc) {
  return unitsOf(doc).filter(u => u.target).map(u => u.id)
}

export function initialSeek() {
  return { picked: null, found: [], looked: [], misses: 0 }
}

/** 낱말 하나를 들여다본다 — 뜻이 뜬다. 짚는 것은 아니다. */
export function look(doc, state, id) {
  if (!unitsOf(doc).some(u => u.id === id)) return state
  const looked = state.looked.includes(id) ? state.looked : [...state.looked, id]
  return { ...state, picked: id, looked }
}

/**
 * 지금 들여다보는 낱말을 「문제 삼는다」.
 * 돌려주는 것: { state, ok, line } — line 은 화면이 띄울 한 줄.
 * 맞지 않아도 깎지 않는다. 다만 **왜 아닌지**를 그 낱말에 맞춰 말해 준다.
 */
export function nominate(doc, state) {
  const unit = unitsOf(doc).find(u => u.id === state.picked)
  if (!unit) return { state, ok: false, line: doc?.lines?.pickFirst ?? '' }
  if (state.found.includes(unit.id)) return { state, ok: false, line: doc?.lines?.already ?? '' }
  if (unit.target) {
    return { state: { ...state, found: [...state.found, unit.id] }, ok: true, line: unit.why ?? '' }
  }
  return {
    state: { ...state, misses: state.misses + 1 },
    ok: false,
    line: unit.miss ?? doc?.lines?.miss ?? '',
  }
}

export function seekDone(doc, state) {
  return targetsOf(doc).every(id => state.found.includes(id))
}

export function leftCount(doc, state) {
  return targetsOf(doc).filter(id => !state.found.includes(id)).length
}

// 몇 번 헛짚으면 귀띔을 준다. 귀띔은 차례로 하나씩 — 마지막 것은 거의 답이다.
export const HINT_EVERY = 2

/** 지금 보여 줄 귀띔. 아직 아니면 null. */
export function seekHint(doc, state) {
  const hints = doc?.hints ?? []
  if (seekDone(doc, state) || state.misses < HINT_EVERY || hints.length === 0) return null
  return hints[Math.min(hints.length, Math.floor(state.misses / HINT_EVERY)) - 1]
}

// 사초함에 남길 기록 — 예전 사료 탐구(state.inquiries)와 같은 모양이다.
export function seekRecord(doc, state) {
  const byId = new Map(unitsOf(doc).map(u => [u.id, u]))
  return {
    kind: 'seek',
    selected: state.found.map(id => byId.get(id)?.han ?? id),
    text: '',
    compared: seekDone(doc, state),
    misses: state.misses,
  }
}
