import { createRush, reachedAt, isOverAt } from '../core/countdown.js'

export function startRush({ track, totalMs, goalRoom, now }) {
  const rush = createRush({ track, totalMs, startedAt: now })
  let settled = null

  return {
    rush,
    goalRoom,
    tick(t, playerRoom) {
      if (settled) return settled
      if (playerRoom === goalRoom) { settled = 'arrived'; return settled }
      if (reachedAt(rush, goalRoom, t) || isOverAt(rush, t)) { settled = 'caught'; return settled }
      return 'running'
    },
  }
}
