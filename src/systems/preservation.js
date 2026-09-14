// 대화재에서 무엇을 먼저 꺼내라 했는가 — 학생의 선택과 이유를 기록한다.
// 사초함의 사료는 건드리지 않는다: 실제로 탄 것은 사료 카드가 아니라 실록이 적은 옥새·부신·어필이다.
export function recordPreservation(state, id, { selected, reason }, allowedIds = null) {
  const allowed = allowedIds ? new Set(allowedIds) : null
  const picked = [...new Set(selected ?? [])].filter(x => !allowed || allowed.has(x))
  return { ...state, preservation: { ...(state.preservation ?? {}), [id]: {
    selected: picked,
    reason: String(reason ?? '').trim().slice(0, 1600),
  } } }
}

// 고른 것 가운데 실제로 건진 것과 탄 것 — 결과 화면이 쓴다.
export function compareWithActual(treasures, selected) {
  const chosen = new Set(selected)
  return {
    savedChosen: treasures.filter(t => chosen.has(t.id) && t.saved).map(t => t.id),
    lostChosen: treasures.filter(t => chosen.has(t.id) && !t.saved).map(t => t.id),
    savedActual: treasures.filter(t => t.saved).map(t => t.id),
  }
}
