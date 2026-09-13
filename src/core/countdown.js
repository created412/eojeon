export function createRush({ track, totalMs, startedAt }) {
  return Object.freeze({ track: [...track], totalMs, startedAt })
}

function ratio(rush, now) {
  if (rush.totalMs <= 0) return 1
  const t = (now - rush.startedAt) / rush.totalMs
  if (t < 0) return 0
  if (t > 1) return 1
  return t
}

export function frontAt(rush, now) {
  const last = rush.track.length - 1
  if (last <= 0) return 0
  return ratio(rush, now) * last
}

export function reachedAt(rush, roomId, now) {
  const i = rush.track.indexOf(roomId)
  if (i < 0) return false
  return frontAt(rush, now) >= i
}

export function remainingMs(rush, now) {
  return Math.max(0, rush.totalMs - (now - rush.startedAt))
}

export function isOverAt(rush, now) {
  return remainingMs(rush, now) <= 0
}

export function roomProgressAt(rush, now) {
  const front = frontAt(rush, now)
  return rush.track.map((id, i) => {
    if (i === 0) return { id, filled: 1 }
    const filled = front - (i - 1)
    return { id, filled: Math.min(1, Math.max(0, filled)) }
  })
}
