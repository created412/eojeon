// 알현(謁見) — 임금은 어좌 앞에 서 있고, **사람이 임금에게로 온다.**
//
// 왜 이 비트 종류가 따로 있는가. 선생님의 지적 7번:
//
//   "가장 심각한 오류는 고종이 궁궐을 마음대로 돌아다니면서 다음 단계로 넘어갈
//    것들을 찾는다는거야. 고종은 가만히 있다가 상황에 따라 신하, 대원군,
//    민비에 의해 끌려다녀야해."
//
// 탐색(explore) 비트는 그 반대를 가르친다: 임금이 규장각까지 걸어가 책을 집어 온다.
// 열두 살의 고종이 그렇게 하지 않았다. 문서는 신하가 들고 왔고, 임금은 어전에
// 있었다. 그래서 1863년의 하루는 이제 걸어 다니는 낮이 아니라 **알현**이다.
//
// 이 파일은 셈만 한다 — 누가 어디에 서고, 문에서 임금 앞까지 몇 초에 걸어오고,
// 어느 쪽을 바라보는가. 화면·소리·대화는 main.js 가 이 값을 받아 그린다.
// 그래야 3D 없이 Node 에서 통째로 검사할 수 있다.
import { THRONE_FROM_BACK, THRONE_DEPTH, ROOM_SHRINK } from '../render/palace.js'
import { roomAt } from '../data/palaces.js'

// 어좌 앞면에서 임금이 서는 자리까지. 어좌에 올라앉히지 않는 까닭은 하나다 —
// 카메라가 임금의 뒤 위쪽에 매여 있어(render/scene.js CAM_DIST·CAM_HEIGHT),
// 앉히면 어좌와 카메라 사이에 임금이 끼어 화면이 어좌 등받이로 가득 찬다.
export const KING_FROM_THRONE = 1.7
// 임금과, 그 앞에 나와 아뢰는 사람 사이. 3D 인물의 키가 2.89 이므로 4 는
// 화면에서 「마주 서 있다」로 읽히는 거리다.
export const VISITOR_GAP = 3.0
// 그리고 **오른쪽으로 비켜선다.** 카메라는 임금의 앞쪽(문 쪽)에 매여 있어서
// (render/scene.js CAM_DIST), 임금 정면에 세우면 아뢰는 사람이 카메라와 임금
// 사이에 서서 **뒤통수로 화면을 가린다.** 실제로 그렇게 났다 — 첫 미리보기에서
// 호조 관리가 등을 보이고 서 있었다. 옆으로 비켜 세우면 옆얼굴이 보이고,
// 왼쪽에 선 대원군과 좌우가 갈라져 셋이 한 화면에 들어온다.
export const VISITOR_SIDE = 2.4
// 곁에 선 사람(대원군)이 임금에게서 옆으로 떨어진 거리. 임금의 **왼쪽**에 선다.
export const BESIDE_GAP = 2.9
// 곁에 선 사람은 임금보다 반 걸음 앞이다 — 열두 살 임금을 대신해 말하는 자리다.
export const BESIDE_FORWARD = 0.7
// 문에서 임금 앞까지 걸어오는 데 걸리는 시간. 프레임이 아니라 시간이다.
export const APPROACH_MS = 1800
// 물러나는 데 걸리는 시간 — 들어올 때보다 조금 빠르다.
export const DEPART_MS = 1200
// 같은 꾸중을 다시 내기까지. 이보다 자주 내면 배너가 겹쳐 글자가 안 읽힌다.
export const REBUKE_MS = 2600

export function roomOf(palaceDef, roomId) {
  return (palaceDef?.rooms ?? []).find(r => r.id === roomId) ?? null
}

// 어좌의 한가운데 z. render/palace.js 의 buildThrone 이 쓰는 셈과 **같은 상수**로
// 잰다 — 여기서 1.3 을 다시 적으면 어좌를 옮기는 날 임금만 제자리에 남는다.
export function throneZ(room) {
  return room.z - (room.d * ROOM_SHRINK) / 2 + THRONE_FROM_BACK
}

// 임금이 서는 자리 — 어좌 바로 앞, 방의 한가운데 축.
export function kingSpot(room) {
  return { x: room.x, z: throneZ(room) + THRONE_DEPTH / 2 + KING_FROM_THRONE }
}

// 곁에 서는 사람의 자리. 여럿이면 왼쪽으로 차례로 벌어진다.
export function besideSpot(room, i = 0) {
  const k = kingSpot(room)
  return { x: k.x - BESIDE_GAP * (i + 1), z: k.z + BESIDE_FORWARD }
}

// 나와 아뢰는 사람이 서는 자리 — 임금의 앞, 오른쪽으로 비켜선 자리.
export function visitorSpot(room) {
  const k = kingSpot(room)
  return { x: k.x + VISITOR_SIDE, z: k.z + VISITOR_GAP }
}

// 임금이 방 안을 걸은 뒤의 아뢰는 자리 — 선생님 요청(2026-09-13): 알현 중에도 전각 안은
// 걷는다. 그러면 아뢰는 사람은 어좌 앞 고정 자리가 아니라 **임금이 지금 선 자리** 앞에 서야
// 한다. 벽을 넘지 않게 방 안으로 당긴다.
export function visitorSpotFor(room, king) {
  const halfW = (room.w * ROOM_SHRINK) / 2 - 1.2
  const halfD = (room.d * ROOM_SHRINK) / 2 - 1.2
  const clamp = (v, c, h) => Math.max(c - h, Math.min(c + h, v))
  return { x: clamp(king.x + VISITOR_SIDE, room.x, halfW), z: clamp(king.z + VISITOR_GAP, room.z, halfD) }
}

// 알현 방을 벗어났는가 — 아룀이 다 끝난 뒤 문으로 걸어 나가면 다음 비트로 넘어간다.
export function audienceLeft(def, roomId, x, z) {
  return roomAt(def, x, z)?.id !== roomId
}

// 문에서 들어서는 자리. 문은 방의 +z 면이다(data/palaces.js doorOf).
export function doorSpot(room) {
  return { x: room.x, z: room.z + (room.d * ROOM_SHRINK) / 2 - 0.6 }
}

// 걸어오는 도중의 자리. u 는 0..1. 처음과 끝을 부드럽게 한다 — 등속으로 오다
// 뚝 서면 사람이 아니라 밀려온 상자로 보인다.
export function walkAt(from, to, u) {
  const t = Math.max(0, Math.min(1, u))
  const e = t * t * (3 - 2 * t)
  return { x: from.x + (to.x - from.x) * e, z: from.z + (to.z - from.z) * e }
}

// from 에 선 사람이 to 를 바라보는 각(Y). render/scene.js 의 왕이 도는 셈과 같다.
export function yawToward(from, to) {
  return Math.atan2(to.x - from.x, to.z - from.z)
}

// 이 비트에 나오는 사람 — 곁에 선 사람과 찾아오는 사람.
export function besideIds(beat) {
  const b = beat?.beside
  return b == null ? [] : (Array.isArray(b) ? b : [b])
}

export function visitorsOf(beat) {
  return beat?.visitors ?? []
}

// 행렬 — 임금을 데리고 가는 사람들. 알현이 「사람이 임금에게 온다」면
// 이쪽은 「사람이 임금을 데려간다」다(선생님 지적 6번). 둘 다 임금이 스스로
// 걷지 않는다는 점에서 같은 것이고, 그래서 같은 국면(phase 'audience')을 쓴다.
export function escortIds(beat) {
  const e = beat?.escort
  if (e == null) return []
  return (Array.isArray(e) ? e : [e]).map(v => (typeof v === 'string' ? v : v.npc))
}

// 행렬에서 그 사람이 임금으로부터 얼마나 떨어져 걷는가. 걷는 방향을 +z 로 본 값이다.
// 적어 두지 않았으면 뒤로 한 줄 세운다.
export function escortOffsets(beat) {
  const e = beat?.escort ?? []
  const list = Array.isArray(e) ? e : [e]
  return list.map((v, i) => {
    if (typeof v === 'string') return { npc: v, dx: (i % 2 ? 1 : -1) * 2.6, dz: -2.2 - Math.floor(i / 2) * 2.4 }
    return { npc: v.npc, dx: v.dx ?? 0, dz: v.dz ?? -2.4 }
  })
}

// 이 비트가 화면에 세워야 할 사람 전부. 곁에 선 사람이 먼저다.
// **겹치면 한 번만 센다** — 곁에 선 사람이 스스로 말하는 자리(from:'beside')가 있어
// 같은 id 가 두 목록에 다 있을 수 있다. 두 번 세우면 같은 사람이 둘 서게 된다.
// from:'voice' 로만 나오는 사람(발 뒤의 대비, 문 너머의 왕비·궁인)은 무대에 세우지 않는다 —
// 이 게임의 3D 몸은 남자 관복뿐이다. 여성 인물에게 남자 몸을 입히느니 목소리로만 둔다.
export function castOf(beat) {
  const out = []
  const voiced = new Set(visitorsOf(beat).filter(v => v.from === 'voice').map(v => v.npc))
  for (const id of [...besideIds(beat), ...escortIds(beat), ...visitorsOf(beat).map(v => v.npc)]) {
    if (!voiced.has(id) && !out.includes(id)) out.push(id)
  }
  return out
}

// 이 사람이 문으로 걸어 들어오는가. from:'beside' 는 이미 곁에 서 있는 사람이
// 제 자리에서 말하는 것이다 — 대원군이 그렇다.
export function entersOf(visitor) {
  return visitor?.from !== 'beside' && visitor?.from !== 'voice'
}

// 이 알현이 끝나며 자리를 뜨는 사람. 걸어 나가고 화면에서 사라진다 —
// 1873년 흥선대원군이 그렇다. 「아버지가 운현궁으로 물러가셨다」를 글로만 적어
// 두었더니 학생이 본 것은 아무것도 없었다(선생님 지적 10번).
export function departIds(beat) {
  const d = beat?.depart
  return d == null ? [] : (Array.isArray(d) ? d : [d])
}

// 찾아온 사람이 바닥에 내려놓는 물건(지금은 도끼 하나뿐이다).
export function propOf(visitor) {
  return visitor?.prop ?? null
}

// 내려놓는 자리 — 임금과 그 사람 사이, 조금 임금 쪽이다.
export function propSpot(room) {
  const k = kingSpot(room)
  const v = visitorSpot(room)
  return { x: (k.x + v.x) / 2, z: (k.z + v.z) / 2 }
}

// 임금이 움직이려 할 때 누가 말리는가. 곁에 선 사람이 있으면 그 사람이,
// 없으면 비트가 적어 둔 말만 나간다.
export function rebukeOf(beat) {
  const line = beat?.blockLine
  if (!line) return null
  return { npcId: besideIds(beat)[0] ?? escortIds(beat)[0] ?? null, line }
}

// 행렬이 걷는 데 걸리는 시간. 수업 한 시간 안에서 볼 장면이라 길게 두지 않는다.
export const PROCESSION_MS = 6800
