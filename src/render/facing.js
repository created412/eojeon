// 어느 그림을 보여줄 것인가 — 인물이 바라보는 쪽과 카메라가 있는 쪽의 각도만으로
// 턴어라운드 넉 장(앞·비스듬·옆·뒤) 중 하나를 고르고, 필요하면 좌우를 뒤집는다.
//
// 시트에는 왼쪽을 향한 비스듬·옆모습만 있다. 오른쪽은 좌우를 뒤집어 쓴다 —
// 사람의 왼쪽과 오른쪽은 이 크기에서 구별되지 않고, 그림 넉 장으로 여섯 방향을 낸다.
//
// three.js 를 부르지 않는다. 순수 함수라서 Node 에서 그대로 검사할 수 있다.

const TAU = Math.PI * 2

// 각을 -π..π 로 접는다.
export function wrapAngle(rad) {
  let a = (rad + Math.PI) % TAU
  if (a < 0) a += TAU
  return a - Math.PI
}

// 한 밀리초에 돌 수 있는 각. 한 바퀴에 약 0.6초다.
export const TURN_PER_MS = 0.010

/**
 * 지금 향한 각(cur)에서 향하고 싶은 각(want)으로 **조금씩** 돈다.
 *
 * 왜 필요한가. 예전에는 걷는 방향이 바뀌는 순간 인물이 그 각으로 **즉시** 튀었다.
 * 자판은 여덟 방향뿐이라 W 를 누르다 A 를 누르면 90도가 한 프레임에 돌았고,
 * 이리저리 눌러 가며 걷는 학생의 화면에서는 임금이 좌우로 홱홱 도는 것으로 보였다
 * (선생님 지적 5번: "발걸음이 좌우로 움직여서 부자연스러워"). 시간으로 재어 돌면
 * 프레임이 빠른 기계에서만 빨리 도는 일도 없다.
 */
export function turnToward(cur, want, dtMs, rate = TURN_PER_MS) {
  const d = wrapAngle(want - cur)
  const max = rate * Math.max(0, dtMs)
  if (Math.abs(d) <= max) return wrapAngle(want)
  return wrapAngle(cur + Math.sign(d) * max)
}

// 경계 각(라디안). rel 이 0 이면 카메라가 인물의 정면에 있다.
const FRONT = Math.PI * 30 / 180
const THREE_Q = Math.PI * 75 / 180
const SIDE = Math.PI * 135 / 180

/**
 * rel — 카메라 방향에서 인물이 바라보는 방향을 뺀 각(라디안).
 *       0 = 카메라가 정면, ±π = 카메라가 등 뒤.
 * 반환 { view, mirror } — view 는 시트의 이름, mirror 면 좌우를 뒤집어 그린다.
 */
export function viewForRelYaw(rel) {
  const a = wrapAngle(rel)
  const m = Math.abs(a)
  const mirror = a > 0
  if (m <= FRONT) return { view: 'front', mirror: false }
  if (m <= THREE_Q) return { view: 'three_q', mirror }
  if (m <= SIDE) return { view: 'side', mirror }
  return { view: 'back', mirror: false }
}

/**
 * 아틀라스 한 칸의 UV 좌표 여덟 개. three.js PlaneGeometry 의 uv 는
 * 왼위·오른위·왼아래·오른아래 순서다.
 *
 * frame  [x, y, w, h] — 아틀라스 안의 화소 좌표(왼쪽 위가 원점)
 * mirror 좌우를 뒤집는다
 */
export function uvForFrame(frame, atlasW, atlasH, mirror = false) {
  const [x, y, w, h] = frame
  let u0 = x / atlasW
  let u1 = (x + w) / atlasW
  if (mirror) [u0, u1] = [u1, u0]
  // three.js 텍스처의 v 는 아래에서 위로 올라간다 — 아틀라스 y 를 뒤집는다.
  const v1 = 1 - y / atlasH
  const v0 = 1 - (y + h) / atlasH
  return new Float32Array([u0, v1, u1, v1, u0, v0, u1, v0])
}

/**
 * 빌보드가 카메라를 마주 보게 하는 두 각.
 *
 * 이 게임의 카메라는 인물보다 한참 위에 있다(높이 30, 거리 34 — 약 41°).
 * 판을 수직으로 세워 두면 그 각도에서 눌려 보여 사람이 뭉툭해진다. 그래서
 * **발이 닿는 아래 모서리를 축으로 뒤로 눕힌다** — 그림은 눌리지 않고
 * 발은 바닥에 붙어 있다.
 *
 * from  카메라 위치 { x, y, z }
 * at    인물이 선 자리 { x, y, z } (발밑)
 * 반환  { yaw, pitch } — yaw 는 Y 축 회전, pitch 는 X 축 회전(음수 = 뒤로 눕는다)
 */
export function billboardAngles(from, at) {
  const dx = from.x - at.x
  const dz = from.z - at.z
  const flat = Math.hypot(dx, dz)
  const yaw = Math.atan2(dx, dz)
  const pitch = flat < 1e-6 ? -Math.PI / 2 : -Math.atan2(from.y - at.y, flat)
  return { yaw, pitch }
}
