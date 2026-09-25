import { roomAt, isPassable } from '../data/palaces.js'
import { collides } from '../data/hall-geometry.js'

// 궁의 하루 — 서성임과 읍(揖).
//
// 선생님의 오래된 불만이 여기에 있다: 「궁이 죽어 있다. 재미가 없다.」 실제로 그랬다.
// 신하들은 data/npcs.js 가 적어 둔 좌표에 붙박여, 임금이 코앞을 지나가도 눈길 하나
// 주지 않고 스무 해를 같은 자리에 서 있었다. 그래서 2026-09-25 에 이렇게 여쭈고
// 허락을 받았다:
//
//   「궁을 살아 있게 합니다. 지금 신하들은 제자리에 붙박여 있습니다. 방 사이를
//    천천히 걷고, 임금이 가까이 가면 고개를 숙이게 하면 같은 공간이 전혀 달라
//    보입니다.」
//
// 얹는 것은 두 가지뿐이다.
//   ① 서성임 — 제자리 주변을 천천히 오가다 몇 초 쉬고 또 옮긴다. 시장이 아니라
//      궁이므로 느리고 점잔아야 한다.
//   ② 읍(揖)  — 임금이 다가오면 걸음을 멈추고 임금을 향해 고개를 숙인다. 임금이
//      떠날 때까지 그 자세로 있는다. 궁이 임금을 알아보는 그 한 동작이다.
//
// ⚠ **앵커에서 멀리 가면 안 된다.** npcNear(data/npcs.js)는 눈에 보이는 몸이 아니라
// **데이터 좌표**(n.x/n.z)에서 거리를 잰다. 그 값은 여기서 절대 건드리지 않는다 —
// 몸만 움직이고 말이 걸리는 자리는 그대로다. 그래서 몸이 앵커에서 멀어지면 학생이
// 보이는 몸 앞에 서 있는데 E 가 안 먹거나, 반대로 아무도 없는 자리에서 말이 걸리는
// 어긋남이 생긴다. DRIFT_MAX 는 그 어긋남을 사람 한 걸음 안에 묶어 두는 수이고,
// ANCHOR_BOUND 는 어떤 경우에도 넘지 않는 한계다(시험이 이 값을 붙든다).
//
// ⚠ **알현·행렬과 싸우지 않는다.** 그 장면들은 매 프레임 ctx.placeNpc() 로 신하의
// 자리를 직접 정한다. 이 모듈은 낮(day)에만 불린다(main.js frame()) — 여기서 국면을
// 다시 판정하지 않는 까닭도 그것이다. 같은 판정을 두 곳에서 하면 언젠가 갈린다.
// 장면이 신하를 몰기 시작하면 render/scene.js 가 forget() 으로 그 사람의 서성임을
// 지워, 낮이 돌아왔을 때 앵커에서 다시 시작한다.
//
// 이 파일은 DOM 도 three.js 도 모른다. 자리와 「얼마나 굽혔는가」만 계산해 돌려주고,
// 실제로 허리를 굽히는 일은 render/scene.js 가 한다.

// 앵커에서 이만큼까지만 간다. 두 수를 나누어 둔 까닭은, 읽는 사람이 「얼마나
// 움직이는가」(DRIFT_MAX)와 「무슨 일이 있어도 넘지 않는 선」(ANCHOR_BOUND)을
// 다른 것으로 보아야 하기 때문이다.
export const ANCHOR_BOUND = 2.0
// DRIFT_MAX 를 한계(2.0)보다 훨씬 작게 둔 데는 눈에 보이는 까닭이 하나 더 있다 —
// 머리 위 이름표와 바닥의 고리(render/scene.js setInteractionCues)는 **데이터 좌표**에
// 선다. 몸이 그보다 멀어지면 표지가 사람 옆의 빈 자리를 가리킨다. 1m 안쪽이면
// 표지가 여전히 그 사람 위에 있는 것으로 읽힌다.
export const DRIFT_MAX = 1.1
export const DRIFT_MIN = 0.45

// 한 걸음의 마디 — 4.6초 서 있고 3.4초 걷는다. 궁의 걸음이라 느리다:
// 최대 2.7m 를 3.4초에 가니 초속 0.8m 가 안 된다(임금의 걸음보다 한참 느리다).
export const PAUSE_MS = 4600
export const WALK_MS = 3400
export const LEG_MS = PAUSE_MS + WALK_MS

// 읍하는 거리. 들어올 때와 나갈 때의 문턱을 달리 둔다 — 하나로 두면 딱 그 거리에
// 선 임금 앞에서 신하가 굽혔다 펴기를 끝없이 반복한다(간판이 깜박이는 그 결함이다).
export const BOW_NEAR = 5.0
export const BOW_FAR = 6.4
export const BOW_IN_MS = 500
export const BOW_OUT_MS = 760

// 한 프레임에 흘렸다고 인정하는 최대 시간. 탭을 오래 벗어났다 돌아오거나 대화판이
// 한참 떠 있었을 때, 밀린 시간을 한 번에 먹으면 신하가 순간이동한다.
const MAX_STEP_MS = 120

// 몸이 차지하는 반지름 — render/scene.js placeNpc 가 쓰는 safePosition(.8) 과 같은 값이다.
// 여기서 이미 벽을 피해 두어야 placeNpc 의 구조 로직이 사람을 엉뚱한 데로 밀지 않는다.
const BODY_R = 0.8

function hashId(id) {
  let h = 2166136261
  for (let i = 0; i < String(id).length; i++) {
    h ^= String(id).charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// 씨앗과 번호에서 0~1 하나를 뽑는다. Math.random() 을 쓰지 않는 까닭이 두 가지다 —
// 시험이 흔들리지 않아야 하고, 학생이 새로 고쳐도 같은 궁을 보아야 한다.
function rnd(seed, i) {
  let x = (seed ^ Math.imul(i + 1, 0x9e3779b9)) >>> 0
  x ^= x << 13; x >>>= 0
  x ^= x >>> 17
  x ^= x << 5; x >>>= 0
  return x / 4294967296
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v }
// 부드럽게 시작하고 부드럽게 멈춘다. 걸음에도, 굽히는 각에도 같은 곡선을 쓴다.
function ease(p) { const c = clamp01(p); return c * c * (3 - 2 * c) }

// 그 자리에 설 수 있는가 — 담 안이고, 제 방을 벗어나지 않고, 벽·기둥에 겹치지 않는가.
// 방을 견주는 것은 roomAt 이 돌려주는 **그 객체 자신**이다: 마당에 선 사람(room 이
// null)은 마당에 머물고, 방에 선 사람은 제 방 안에만 머문다.
function standable(palace, room, p) {
  if (!palace) return true
  const g = palace.ground
  if (g && (Math.abs(p.x) > g.w / 2 - 1 || Math.abs(p.z) > g.d / 2 - 1)) return false
  if (roomAt(palace, p.x, p.z) !== room) return false
  return !collides(palace, p, BODY_R)
}

// 두 자리 사이를 걸어갈 수 있는가. **끝점만 보면 안 된다** — 경복궁 수정전의 선공감
// 서리가 실제로 그렇게 걸렸다: 서는 자리 둘 다 멀쩡한데 그 사이에 기둥이 하나 있어,
// 걸어가는 중간에 기둥을 통과했다(2026-09-25 시험이 붙들었다).
function walkable(palace, room, a, b) {
  for (const u of [0.25, 0.5, 0.75]) {
    if (!standable(palace, room, { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u })) return false
  }
  return true
}

// m 번째로 나가 서는 자리 — 앵커에서 한 걸음 옆이다.
// 막히면 절반씩 당겨 보고, 끝까지 막히면 앵커에 그대로 선다: 벽을 뚫는 대신
// 움직이지 않는 편을 고른다.
function driftSpot(npc, seed, m, palace, room) {
  const anchor = { x: npc.x, z: npc.z }
  const angle = rnd(seed, m * 2) * Math.PI * 2
  const reach = DRIFT_MIN + rnd(seed, m * 2 + 1) * (DRIFT_MAX - DRIFT_MIN)
  for (let shrink = 1; shrink > 0.24; shrink *= 0.5) {
    const p = { x: npc.x + Math.cos(angle) * reach * shrink, z: npc.z + Math.sin(angle) * reach * shrink }
    if (standable(palace, room, p) && walkable(palace, room, anchor, p)) return p
  }
  return anchor
}

// 마디 하나의 「어디서 어디로」. **걸음은 언제나 앵커를 거친다** — 나갔다가 제자리로
// 돌아오고, 다시 다른 쪽으로 나간다. 신하가 제 자리를 지키는 모양이기도 하고,
// 무엇보다 지나갈 길이 안전한 것으로 보장된다: 앵커는 npcs.js 가 이미 safePosition
// 으로 걸러 둔 자리이고, 앵커에서 나가는 한 걸음만 검사하면 되기 때문이다.
// (예전에는 옆자리에서 옆자리로 곧장 갔다 — 그때는 두 자리 사이의 기둥을 아무도
//  검사하지 않았다. 그리고 「막히면 그 마디를 쉰다」로 덮으면 다음 마디의 출발점이
//  실제로 서 있는 자리와 달라져 몸이 튄다.)
// life — 자리를 한 번 고르면 들고 있는다(life.spot). 같은 m 의 답은 언제나 같은데,
// 그것을 매 프레임 다시 재면 벽 검사(collides)가 사람 수 × 열두 번씩 돈다. 이 게임은
// 태블릿에서 돌아간다 — 프레임을 그런 데 쓰지 않는다.
function legOf(npc, life, k, palace, room) {
  const anchor = { x: npc.x, z: npc.z }
  const m = Math.floor(k / 2)
  if (life.spot?.m !== m) life.spot = { m, at: driftSpot(npc, life.seed, m, palace, room) }
  const spot = life.spot.at
  return k % 2 === 0 ? { from: anchor, to: spot } : { from: spot, to: anchor }
}

// 서성일 수 있는 사람인가. 목소리로만 나오는 인물(몸이 없다)은 뺀다. 제 방이 봉해진
// 사람도 그 자리에 선다 — 불탄 방(palaces.js burntVariant)에서 몸을 옮길 곳이 없다.
function canDrift(npc, palace) {
  if (!npc || npc.voice) return false
  if (!palace) return true
  const room = roomAt(palace, npc.x, npc.z)
  return room ? isPassable(room) : true
}

/**
 * 궁 하나의 서성임을 들고 있는 물건. 신하마다 상태가 하나씩 붙는다.
 *
 * 상태는 시계(age)와 읍의 깊이(p) 둘뿐이다. **읍하는 동안에는 시계가 서 있는다** —
 * 그래야 임금이 떠난 뒤 굽히던 그 자리에서 걸음을 이어 간다(시계가 계속 갔다면
 * 임금이 물러난 순간 신하가 저만치로 튄다).
 */
export function createPalaceLife() {
  const lives = new Map()

  function lifeOf(npc, now) {
    let s = lives.get(npc.id)
    if (!s) {
      const seed = hashId(npc.id)
      s = {
        seed, last: now, age: 0,
        // 사람마다 처음 한 번 더 서 있는 시간이 다르다. 이게 없으면 궁 안의 모두가
        // 같은 박자로 한꺼번에 걷기 시작해, 살아 있는 궁이 아니라 무리 동작이 된다.
        delay: rnd(seed, 7) * LEG_MS,
        p: 0, bowing: false, x: npc.x, z: npc.z,
        spot: null,   // 지금 마디에서 나가 서는 자리 — 한 번만 고른다(legOf)
      }
      lives.set(npc.id, s)
    }
    return s
  }

  return {
    // 장면이 그 사람을 직접 몰았다 — 서성임을 지운다. 낮이 돌아오면 앵커에서 다시 센다.
    forget(id) { lives.delete(id) },

    /**
     * 한 프레임. npcs 는 지금 이 궁·이 막에 서 있는 목록(data/npcs.js npcsAt),
     * king 은 임금의 자리, palace 는 지금 궁의 정의(data/palaces.js), now 는 ms.
     * reducedMotion 이면 서성임을 걷어 낸다 — 읍은 남긴다. 그것은 움직임이 아니라 자세다.
     *
     * 돌려주는 것: [{ id, x, z, yaw, walking, bow }] — yaw 가 null 이면 「임금을 본다」
     * (render/scene.js placeNpc 의 약속 그대로다).
     */
    tick({ npcs = [], now = 0, king = null, palace = null, reducedMotion = false } = {}) {
      const out = []
      const present = new Set()
      for (const npc of npcs) {
        if (!npc || npc.voice) continue
        present.add(npc.id)
        const s = lifeOf(npc, now)
        const dt = Math.min(Math.max(now - s.last, 0), MAX_STEP_MS)
        s.last = now

        // 읍 — 임금과의 거리로 정한다. 재는 자리는 데이터 좌표가 아니라 지난 프레임에
        // 실제로 서 있던 자리다: 학생이 보고 있는 몸이 판정의 근거여야 한다.
        const dist = king ? Math.hypot(king.x - s.x, king.z - s.z) : Infinity
        s.bowing = s.bowing ? dist <= BOW_FAR : dist <= BOW_NEAR
        s.p = clamp01(s.p + (s.bowing ? dt / BOW_IN_MS : -dt / BOW_OUT_MS))
        const bow = ease(s.p)

        // 굽히는 동안에는 서성임의 시계가 선다(위 주석 참고). 정지 선호(reducedMotion)
        // 에서도 서지 않는다 — 그러면 시계가 0 에 머물러 언제나 앵커에 선다.
        const drifting = canDrift(npc, palace) && bow === 0 && !reducedMotion
        if (drifting) s.age += dt

        let x = npc.x, z = npc.z, yaw = null, walking = false
        const t = s.age - s.delay
        if (t > 0) {
          const room = palace ? roomAt(palace, npc.x, npc.z) : null
          const k = Math.floor(t / LEG_MS)
          const u = t - k * LEG_MS
          const { from, to } = legOf(npc, s, k, palace, room)
          x = from.x; z = from.z
          if (u >= PAUSE_MS) {
            const e = ease((u - PAUSE_MS) / WALK_MS)
            x = from.x + (to.x - from.x) * e
            z = from.z + (to.z - from.z) * e
            const dx = to.x - from.x, dz = to.z - from.z
            // 걷는 동안은 가는 쪽을 본다. 자리가 거의 같으면 각을 짓지 않는다(0 으로 튄다).
            if (Math.hypot(dx, dz) > 0.05) { yaw = Math.atan2(dx, dz); walking = true }
          }
        }
        // 굽히는 동안에는 걸음을 멈추고 임금을 마주 본다(yaw=null).
        if (bow > 0) { walking = false; yaw = null }
        s.x = x; s.z = z
        out.push({ id: npc.id, x, z, yaw, walking, bow })
      }
      // 이 궁·이 막에 없는 사람의 상태는 버린다 — 막이 바뀌어 같은 사람이 다시
      // 서면 앵커에서 처음부터 센다(옛 시계를 들고 오면 첫 프레임에 튄다).
      for (const id of [...lives.keys()]) if (!present.has(id)) lives.delete(id)
      return out
    },
  }
}
