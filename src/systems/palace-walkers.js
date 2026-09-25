// 궁을 오가는 사람들의 걸음 — 어디를 지나고, 지금 어디쯤인가.
//
// 선생님(2026-09-26): 「오가게 만드는 거부터 해.」
// 왜 신하가 아니라 따로 세운 사람들이 오가는지는 data/walkers.js 머리말에 적었다.
//
// 길은 손으로 적지 않는다. 방과 방 사이는 systems/route.js 의 길찾기(objectiveRoute)가
// 벽과 문간을 피해 이어 준다 — 그 함수는 임금이 「지금의 여정」 판을 눌렀을 때 쓰는
// 바로 그 길찾기다. 같은 길을 쓰므로, 사람이 지나갈 수 있는 곳은 임금도 지나갈 수
// 있고 그 반대도 참이다. 조작권은 'A'(다 열림)로 둔다: 궁인의 출입을 임금의 조작권으로
// 막으면, 임금이 갇힌 막에서 궁이 통째로 멈춘다.
//
// 이 파일은 DOM 도 three.js 도 모른다. 자리·방향·굽힘만 값으로 낸다.
import { objectiveRoute } from './route.js'
import { roomAt } from '../data/palaces.js'
import { BOW_NEAR, BOW_FAR, BOW_IN_MS, BOW_OUT_MS } from './palace-life.js'

// 궁인의 걸음. 임금보다 느리다 — 초속 1.05m 로, 급한 걸음이 아니라 일하는 걸음이다.
export const WALKER_SPEED = 1.05
export const WALKER_PAUSE_MS = 4400
const MAX_STEP_MS = 120

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v }
function ease(p) { const c = clamp01(p); return c * c * (3 - 2 * c) }

// 들른 곳 하나를 자리로 바꾼다 — 방 이름이면 그 방 한가운데, 좌표면 그대로.
export function stopPoint(def, stop) {
  if (!stop) return null
  if (typeof stop === 'object') return { x: stop.x, z: stop.z }
  const room = def?.rooms?.find(r => r.id === stop)
  return room ? { x: room.x, z: room.z } : null
}

/**
 * 한 사람이 지나는 자리를 통째로 편다. 들른 곳 사이를 길찾기로 이어 붙인 뒤,
 * 되짚어 돌아오는 길까지 한 줄로 만든다(왕복 — 궁인은 갔다가 돌아온다).
 * 길이 막혀 한 토막도 못 이으면 빈 배열이다 — 그런 사람은 세우지 않는다.
 */
export function walkerPath(def, walker) {
  const points = (walker?.stops ?? []).map(s => stopPoint(def, s)).filter(Boolean)
  if (points.length < 2 || !def) return []
  const out = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const from = out[out.length - 1]
    const to = points[i]
    // 길찾기는 「방으로」와 「이 자리로」 두 가지를 다 받는다. 방 한가운데를 노리므로
    // 언제나 destination 을 준다 — 방 id 만 주면 문간에서 멈춘다.
    const legs = objectiveRoute(def, roomAt(def, to.x, to.z)?.id ?? null, from, 'A', to)
    if (!legs.length) return []
    for (const p of legs) out.push(p)
  }
  // 돌아오는 길 — 마지막 자리는 겹치니 뺀다.
  const back = out.slice(0, -1).reverse()
  return [...out, ...back]
}

// 자리마다의 누적 거리. 여기서 한 번 재 두면 프레임마다 다시 세지 않는다.
export function measurePath(points) {
  const marks = [0]
  for (let i = 1; i < points.length; i++) {
    marks.push(marks[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z))
  }
  return { points, marks, length: marks[marks.length - 1] ?? 0 }
}

// 걸은 거리 d 에서의 자리와 방향.
export function pointAt(path, d) {
  const { points, marks, length } = path
  if (!points.length) return null
  if (points.length === 1 || length <= 0) return { x: points[0].x, z: points[0].z, yaw: null }
  const walked = Math.max(0, Math.min(length, d))
  let i = 1
  while (i < marks.length - 1 && marks[i] < walked) i++
  const a = points[i - 1], b = points[i]
  const span = marks[i] - marks[i - 1]
  const u = span > 0 ? (walked - marks[i - 1]) / span : 0
  const dx = b.x - a.x, dz = b.z - a.z
  return {
    x: a.x + dx * u, z: a.z + dz * u,
    yaw: Math.hypot(dx, dz) > 0.001 ? Math.atan2(dx, dz) : null,
  }
}

/**
 * 궁인들의 걸음을 들고 있는 물건. 궁이 바뀌면 setPalace() 로 길을 다시 편다.
 *
 * 걸음은 시계 하나로 정해진다(now). 그래서 프레임이 건너뛰어도 사람이 제자리를
 * 지키고, 시험이 같은 시각에 같은 답을 받는다. 다만 읍은 시계로 정할 수 없다 —
 * 임금이 어디 있느냐에 달렸으므로 사람마다 상태를 하나씩 들고 있는다.
 */
export function createWalkers() {
  let paths = new Map()     // id -> { path, walker, offset }
  let bows = new Map()      // id -> { p, bowing, last, held }

  return {
    // 이 궁에서 걸을 사람과 그 길. 길이 안 나오는 사람은 조용히 빠진다.
    setPalace(def, walkers = []) {
      paths = new Map()
      bows = new Map()
      for (const w of walkers) {
        const points = walkerPath(def, w)
        if (points.length < 2) continue
        const path = measurePath(points)
        if (path.length <= 0) continue
        // 사람마다 출발 시점을 다르게 둔다(ms) — 아니면 모두가 한 박자로 움직여
        // 살아 있는 궁이 아니라 무리 동작이 된다.
        const cycleMs = path.length / WALKER_SPEED * 1000 + (w.pause ?? WALKER_PAUSE_MS)
        const offset = cycleMs * ((paths.size * 0.37) % 1)
        paths.set(w.id, { path, walker: w, offset })
      }
      return [...paths.keys()]
    },

    ids() { return [...paths.keys()] },
    pathOf(id) { return paths.get(id)?.path ?? null },

    /**
     * 한 프레임. now 는 ms, king 은 임금의 자리(없으면 읍하지 않는다).
     * reducedMotion 이면 걸음을 멈추고 길의 첫 자리에 선다 — 읍은 남긴다(자세다).
     * 돌려주는 것: [{ id, x, z, yaw, walking, bow }] — render/scene.js 의 약속과 같다.
     */
    tick({ now = 0, king = null, reducedMotion = false } = {}) {
      const out = []
      for (const [id, entry] of paths) {
        const { path, walker, offset } = entry
        const pauseMs = walker.pause ?? WALKER_PAUSE_MS
        let bow = bows.get(id)
        if (!bow) { bow = { p: 0, bowing: false, last: now, held: 0, at: pointAt(path, 0) }; bows.set(id, bow) }
        const dt = Math.min(Math.max(now - bow.last, 0), MAX_STEP_MS)
        bow.last = now

        // 읍 — 신하와 같은 문턱을 쓴다(systems/palace-life.js). 재는 자리는 지난
        // 프레임에 실제로 서 있던 자리다: 학생이 보고 있는 몸이 판정의 근거여야 한다.
        const dist = king && bow.at ? Math.hypot(king.x - bow.at.x, king.z - bow.at.z) : Infinity
        bow.bowing = bow.bowing ? dist <= BOW_FAR : dist <= BOW_NEAR
        bow.p = clamp01(bow.p + (bow.bowing ? dt / BOW_IN_MS : -dt / BOW_OUT_MS))
        const depth = ease(bow.p)
        // 굽히는 동안에는 **그 사람의 시계가 선다** — 임금이 지나가면 서 있던 자리에서
        // 다시 걷는다. 시계가 계속 갔다면 임금이 물러난 순간 저만치로 튄다.
        if (depth > 0 || reducedMotion) bow.held += dt

        // 한 바퀴: 출발 자리에서 잠시 서 있다가, 길을 통째로 걷는다. 길 자체가 이미
        // 갔다 오는 왕복이라(walkerPath) 한 바퀴를 돌면 제자리로 돌아와 있다.
        const walkMs = path.length / WALKER_SPEED * 1000
        const cycle = walkMs + pauseMs
        const clock = now - bow.held + offset
        const t = ((clock % cycle) + cycle) % cycle
        const walking = t >= pauseMs
        const d = walking ? (t - pauseMs) / 1000 * WALKER_SPEED : 0
        const at = reducedMotion ? pointAt(path, 0) : pointAt(path, d)
        bow.at = at
        out.push({ id, x: at.x, z: at.z,
          // 굽히는 동안에는 걸음을 멈추고 임금을 마주 본다(yaw=null 은 「임금을 본다」).
          yaw: depth > 0 ? null : at.yaw,
          walking: walking && depth === 0 && !reducedMotion,
          bow: depth })
      }
      return out
    },
  }
}
