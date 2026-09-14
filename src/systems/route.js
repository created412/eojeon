// 여정 길 찾기 — 태블릿에서 「지금의 여정」 판을 누르면 그 방까지 걸어갈 지점들을 낸다(2026-09-14).
//
// 3D 바닥을 여러 번 짚어 문을 찾는 것은 손가락으로 번거롭다. 곧장 방을 향하면 앞의 전각(근정전 뒤의
// 자경전처럼)에 막히므로, 바닥을 격자로 나눠 벽(hall-geometry.collides)과 못 들어가는 방(조작권·봉쇄)을
// 피하는 가장 짧은 길을 찾는다. 걷는 것은 여전히 movement.step() 이다 — 여기서는 지점만 고른다.
import { roomAt, isPassable } from '../data/palaces.js'
import { collides } from '../data/hall-geometry.js'
import { isRoomOpen } from '../core/control.js'

const CELL = 0.75

export function objectiveRoute(def, roomId, from, control = 'A') {
  const room = def?.rooms?.find(r => r.id === roomId)
  if (!room || !from || roomAt(def, from.x, from.z)?.id === roomId) return []
  const half = { w: def.ground.w / 2 - 2, d: def.ground.d / 2 - 2 }
  const cols = Math.floor((half.w * 2) / CELL), rows = Math.floor((half.d * 2) / CELL)
  const toCell = (x, z) => [Math.round((x + half.w) / CELL), Math.round((z + half.d) / CELL)]
  const toWorld = (c, r) => ({ x: -half.w + c * CELL, z: -half.d + r * CELL })
  const ok = (c, r) => {
    if (c < 0 || r < 0 || c > cols || r > rows) return false
    const p = toWorld(c, r)
    const rm = roomAt(def, p.x, p.z)
    if (rm && (!isRoomOpen(control, rm) || !isPassable(rm))) return false
    return !collides(def, p, 0.6)
  }
  // 목표: 방 안, 앞문 쪽 가까운 칸들
  const goal = (c, r) => roomAt(def, toWorld(c, r).x, toWorld(c, r).z)?.id === roomId
  const [sc, sr] = toCell(from.x, from.z)
  const key = (c, r) => r * (cols + 1) + c
  const prev = new Map([[key(sc, sr), null]])
  const queue = [[sc, sr]]
  let end = null
  for (let i = 0; i < queue.length; i++) {
    const [c, r] = queue[i]
    if (goal(c, r) && !(c === sc && r === sr)) { end = [c, r]; break }
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr, k = key(nc, nr)
      if (prev.has(k) || !ok(nc, nr)) continue
      prev.set(k, [c, r]); queue.push([nc, nr])
    }
  }
  if (!end) return []
  const cells = []
  for (let cur = end; cur; cur = prev.get(key(cur[0], cur[1]))) cells.unshift(cur)
  // 방향이 바뀌는 칸만 남긴다 — 매 칸을 목표로 두면 걸음이 뚝뚝 끊긴다.
  const pts = []
  for (let i = 1; i < cells.length; i++) {
    const a = cells[i - 1], b = cells[i], n = cells[i + 1]
    if (!n || n[0] - b[0] !== b[0] - a[0] || n[1] - b[1] !== b[1] - a[1]) pts.push(toWorld(b[0], b[1]))
  }
  // 방에 막 들어선 칸에서 멈추지 않고 한가운데까지 — 걸음은 목표 1.5m 앞에서 멈추므로(movement.js
  // ARRIVE_RADIUS) 문간 칸만 짚으면 광화문처럼 얇은 문간에서는 문 밖에 서 버린다.
  pts.push({ x: room.x, z: room.z })
  return pts
}
