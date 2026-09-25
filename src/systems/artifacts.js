// 궁 안의 물건을 만지는 일 — 어디에 있고, 무엇을 이미 보았는가.
//
// 선생님(2026-09-25): 마당의 물건을 만질 수 있게 하고, 방 안에도 찾아낼 것을 두라.
// 데이터는 data/artifacts.js 에 있고, 여기서는 **판정**만 한다 — DOM 도 three.js 도
// 모른다. 그래서 Node 에서 그대로 구동해 시험할 수 있다(tests/systems/artifacts.test.js).
//
// 값을 치르지 않는다(data/artifacts.js 머리말). 그래서 이 파일에는 spend() 가 없다.
import { ARTIFACT_SPOTS, artifactById } from '../data/artifacts.js'
import { roomAt } from '../data/palaces.js'

// 마당 물건은 얼마나 가까이 가야 만져지는가. 굴뚝처럼 큰 것은 멀리서도 보이지만
// 만지는 것은 그 앞에 섰을 때다. 방 안은 세간 사이가 좁아 더 짧다.
export const YARD_REACH = 4.6
export const ROOM_REACH = 3.6

// 이 궁에 있는 물건 전부 — 마당에 선 것(yard.props)과 방 안에 둔 것(ARTIFACT_SPOTS)을
// 한 목록으로 합친다. 같은 물건이 마당에 둘 놓여 있으면(드무·해치는 한 쌍이다)
// 자리마다 하나씩 들어가지만, 본 것으로 치는 것은 물건 하나다 — key 가 물건 id 다.
export function artifactsIn(def, year = null) {
  const out = []
  for (const p of def?.yard?.props ?? []) {
    // 해설이 없는 물건은 그냥 배경으로 서 있는다(마당 물건 전부에 글이 있는 것은 아니다).
    // render/yard-props.js 를 여기서 부르지 않는 까닭: 그 파일은 three 의 GLTFLoader 를
    // 끌고 온다 — 이 판정은 Node 에서 그대로 돌아야 한다.
    if (!artifactById(p.id)) continue
    // 아직 세워지지 않은 것은 만질 수 없다. 척화비는 1871년에 섰다.
    if (p.fromYear != null && year != null && year < p.fromYear) continue
    out.push({ id: p.id, kind: 'yard', x: p.x, z: p.z, reach: YARD_REACH, room: null })
  }
  for (const s of ARTIFACT_SPOTS[def?.id] ?? []) {
    if (!artifactById(s.id)) continue
    // 자리를 적는 방법이 둘이다.
    //   { room, dx, dz } — 그 방 한가운데에서 dx·dz 만큼. 세간 사이에 놓인 물건이다.
    //   { x, z }         — 마당의 그 자리. 다리·길·품계석처럼 방이 없는 것들이다.
    if (s.room == null) {
      out.push({ id: s.id, kind: 'yard', x: s.x, z: s.z, reach: YARD_REACH, room: null })
      continue
    }
    const room = def.rooms.find(r => r.id === s.room)
    if (!room) continue
    out.push({ id: s.id, kind: 'room', x: room.x + (s.dx ?? 0), z: room.z + (s.dz ?? 0),
      reach: ROOM_REACH, room: room.id })
  }
  return out
}

// 지금 선 자리에서 만질 수 있는 물건 하나. 방 안 물건은 그 방에 들어와 있어야 한다 —
// 벽 하나 건너에서 E 가 먹히면 학생은 무엇 앞에 섰는지 알 수 없다.
export function artifactNear(def, x, z, { year = null, room = null } = {}) {
  let best = null
  for (const a of artifactsIn(def, year)) {
    if (a.room && a.room !== (room ?? roomAt(def, x, z)?.id ?? null)) continue
    const d = Math.hypot(a.x - x, a.z - z)
    if (d > a.reach) continue
    if (!best || d < best.dist) best = { ...a, dist: d }
  }
  return best
}

export function seenArtifacts(state) {
  return state?.lore?.seen ?? []
}

export function hasSeen(state, id) {
  return seenArtifacts(state).includes(id)
}

export function markArtifactSeen(state, id) {
  if (hasSeen(state, id)) return state
  return { ...state, lore: { ...state.lore, seen: [...seenArtifacts(state), id] } }
}

// 「본 물건 N개」. 전체 수는 궁마다 다르므로 세지 않는다 — 학생이 다섯 궁을 다 돌지도
// 않고, 분모를 보여 주면 다 채우지 못한 것이 실패처럼 보인다. 센 것만 보여 준다.
export function artifactCount(state) {
  return seenArtifacts(state).length
}

// 기록(記錄) 복사에 들어가는 줄. 사료 목록과 섞이지 않게 제목을 따로 붙인다.
export function artifactRecord(state) {
  const ids = seenArtifacts(state)
  if (ids.length === 0) return []
  return [`[궁 안의 물건] ${ids.map(id => artifactById(id)?.name ?? id).join(' · ')} — ${ids.length}개`]
}
