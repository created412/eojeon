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

export function survive(state, keepIds) {
  const kept = keepIds
    .filter(id => state.sources.held.includes(id))
    .slice(0, MAX_SURVIVORS)
  const doomed = state.sources.held.filter(id => !kept.includes(id))
  return lose(state, doomed)
}
