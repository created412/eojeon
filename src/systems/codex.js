const MAX_SURVIVORS = 3

function clone(state) {
  return {
    ...state,
    sources: {
      held: [...state.sources.held],
      read: [...state.sources.read],
      lost: [...state.sources.lost],
    },
  }
}

export function isLost(state, cardId) {
  return state.sources.lost.includes(cardId)
}

export function isRead(state, cardId) {
  return state.sources.read.includes(cardId)
}

export function pickUp(state, cardId) {
  if (isLost(state, cardId)) return state
  if (state.sources.held.includes(cardId)) return state
  const next = clone(state)
  next.sources.held.push(cardId)
  return next
}

export function markRead(state, cardId) {
  if (!state.sources.held.includes(cardId)) return state
  if (isRead(state, cardId)) return state
  const next = clone(state)
  next.sources.read.push(cardId)
  return next
}

function lose(state, ids) {
  const gone = new Set(ids)
  const next = clone(state)
  next.sources.held = next.sources.held.filter(id => !gone.has(id))
  next.sources.read = next.sources.read.filter(id => !gone.has(id))
  for (const id of gone) if (!next.sources.lost.includes(id)) next.sources.lost.push(id)
  return next
}

export function plunder(state, cardIds) {
  return lose(state, cardIds)
}

// ⚠ 2026-09-26 — 이 함수를 부르는 **장면이 지금은 없다.** 1876년 경복궁 대화재에서
// 사관이 지고 나온 것만 남기고 나머지를 태우던 그 화면을, 선생님이 걷어 내라 하셨다
// (「스토리에 방해되는 사건 날리기」). 함수는 남긴다 — 사초함의 잃음 모델(약탈·불탐)이
// 이 하나로 닫혀 있고, 불로 잃는 장면이 다시 붙을 자리가 여기이기 때문이다.
export function survive(state, keepIds) {
  const kept = keepIds
    .filter(id => state.sources.held.includes(id))
    .slice(0, MAX_SURVIVORS)
  const doomed = state.sources.held.filter(id => !kept.includes(id))
  return lose(state, doomed)
}
