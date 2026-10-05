import { createRush, reachedAt, isOverAt } from '../core/countdown.js'

// 촉박 한 판. 목적지는 둘 가운데 하나다.
//   goalRoom   그 방에 들어서면 닿은 것이다. 뒤쫓는 쪽이 그 방에 먼저 닿으면 늦은 것이다.
//   goalPoint  { x, z, r } — 방이 아니라 **담의 한 자리**다(5막의 후원 뒷문). 안내도에 이름이
//              없고 표지도 서지 않는다: 학생이 찾아야 한다. 시간이 다 가면 늦은 것이다.
// 선생님(2026-10-06): 「이동할 때 연경당보단 어디 뒷문이라고 해서 찾기 어렵게 해 두는 게 좋아 보여.」
export function reachedPoint(goalPoint, pos) {
  if (!goalPoint || !pos) return false
  return Math.hypot(pos.x - goalPoint.x, pos.z - goalPoint.z) <= (goalPoint.r ?? 2.5)
}

export function startRush({ track, totalMs, goalRoom = null, goalPoint = null, now }) {
  const rush = createRush({ track, totalMs, startedAt: now })
  let settled = null

  return {
    rush,
    goalRoom,
    goalPoint,
    tick(t, playerRoom, pos = null) {
      if (settled) return settled
      if (goalPoint ? reachedPoint(goalPoint, pos) : playerRoom === goalRoom) { settled = 'arrived'; return settled }
      if ((goalRoom && reachedAt(rush, goalRoom, t)) || isOverAt(rush, t)) { settled = 'caught'; return settled }
      return 'running'
    },
  }
}
