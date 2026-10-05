// 카메라를 담장 안에 붙들어 둔다.
//
// 2026-10-05 전체 점검에서 나온 것. 카메라는 임금 뒤로 12m 물러나 서는데
// (render/scene.js CAM_DIST), 5막의 작은 궁들은 그만한 뒷자리가 없다:
//
//   경우궁  터 36×32 · 시작 z 13 → 카메라 z 25 / 담 16
//   계동궁  터 44×40 · 시작 z 12 → 카메라 z 24 / 담 20
//   북묘·영방  터 56×52 · 시작 z 16 → 카메라 z 28 / 담 26
//
// 카메라가 **담장 밖**에 서게 되어, 대문과 행각의 지붕이 화면 양옆을 검게 덮었다
// (경우궁은 화면의 3분의 1이 지붕 밑이었다). 큰 궁(창덕궁·경복궁)에서는 한 번도
// 일어나지 않는 일이라 그동안 드러나지 않았다.
//
// 그래서 카메라의 자리를 터 안으로 당긴다. 당긴 만큼 **위로 올려** 임금과의
// 거리를 지킨다 — 뒤로 못 가면 위로 간다. 담 가까이에서는 내려다보는 각이 되고,
// 마당 안쪽으로 걸어 들어가면 본래 각으로 돌아온다.
//
// three.js 를 모른다 — 수만 다룬다. 그래야 Node 에서 시험한다.

// 담에서 이만큼은 떨어뜨린다. 담 위 기와가 카메라에 닿지 않을 만큼.
export const WALL_MARGIN = 2.2

// 임금과 이만큼은 떨어져 있어야 한다(바닥에서 잰 거리).
//
// ⚠ 처음에는 이 바닥이 없었다. 담 안으로 **끝까지** 당겼더니, 대문 앞에 선 임금
//   (경우궁의 시작 자리는 담에서 3m 다)의 카메라가 머리 꼭대기로 올라가 **바로
//   위에서 내려다보는** 그림이 됐다 — 지붕은 안 가리지만 궁도 안 보였다.
//   찍어 보고서야 알았다. 그래서 이 거리 밑으로는 당기지 않는다: 담을 조금
//   넘더라도, 높이 올라가 있으므로 지붕 너머로 마당을 비스듬히 내려다본다.
//   7.5 와 5.5 를 찍어 견주었다 — 7.5 는 화면 아래 4할이 담 너머였고, 5.5 는 2할이다.
//
// ⚠ 다 고친 것이 아니다. 시작 자리가 대문에서 3m 인 한(data/palaces.js spawn),
//   첫 화면은 여느 궁보다 가파르게 내려다본다. 마당 안쪽으로 몇 걸음 걸으면
//   본래 각으로 돌아온다. 시작 자리를 옮기는 일은 장면의 동선과 얽혀 있어
//   여기서는 손대지 않았다.
export const MIN_FLAT = 5.5

/**
 *   shot    { x, y, z, ... }  카메라가 서려던 자리
 *   target  { x, z }          카메라가 바라보는 임금의 자리
 *   ground  { w, d }          궁터(원점이 한가운데)
 * 돌려주는 것: 터 쪽으로 당기고 그만큼 높인 shot. 당길 필요가 없으면 **그 값 그대로**.
 */
export function clampShotToGround(shot, target, ground, margin = WALL_MARGIN, minFlat = MIN_FLAT) {
  if (!shot || !target || !ground) return shot
  const halfW = ground.w / 2 - margin
  const halfD = ground.d / 2 - margin
  if (!(halfW > 0) || !(halfD > 0)) return shot
  let x = Math.max(-halfW, Math.min(halfW, shot.x))
  let z = Math.max(-halfD, Math.min(halfD, shot.z))
  if (x === shot.x && z === shot.z) return shot
  // 본래 임금과 떨어져 있던 거리(비스듬한 직선)를 지킨다.
  const flat0 = Math.hypot(shot.x - target.x, shot.z - target.z)
  const reach = Math.hypot(flat0, shot.y)
  let flat = Math.hypot(x - target.x, z - target.z)
  // 너무 바짝 당겨졌으면 본래 방향으로 minFlat 까지만 물린다(담을 조금 넘을 수 있다).
  const floor = Math.min(minFlat, flat0)
  if (flat < floor && flat0 > 0) {
    const k = floor / flat0
    x = target.x + (shot.x - target.x) * k
    z = target.z + (shot.z - target.z) * k
    flat = floor
  }
  const y = Math.sqrt(Math.max(shot.y * shot.y, reach * reach - flat * flat))
  return { ...shot, x, y, z }
}
