import { roomProgressAt } from '../core/countdown.js'
import { isCoarse } from '../ui/controls-hint.js'

// C1(자경전 화재) 등 촉박 비트가 쓰는 시간 완화·불자리 계산. 판정은 항상 시각(now)
// 하나로만 하고, 프레임이 몇 번 불렸는지는 절대 보지 않는다 — countdown.js 와 같은 규율.
export const TOUCH_RELIEF = 1.3

// 손가락은 키보드보다 느리다(설계서 12.3) — 터치 기기에는 제한 시간을 1.3배 준다.
export function rushDurationMs(baseMs, isTouch) {
  return Math.round(baseMs * (isTouch ? TOUCH_RELIEF : 1))
}

// 기기 판정은 controls-hint.js 한 곳에서만 한다. 예전에는 여기가 따로
// navigator.maxTouchPoints 를 봤는데, 터치스크린 달린 노트북에서 그 답과
// main.js 의 (pointer: coarse) 가 어긋났다 — 안내는 「화면을 짚으세요」라 하는데
// 짚을 단추는 안 붙고, 시간만 1.3배 늘어나 있었다. 시간 완화의 근거는
// 「손가락으로 조작한다」이므로, 실제로 손가락 조작이 붙는 조건과 같아야 한다.
export function isTouchDevice() {
  return isCoarse()
}

// 트랙을 따라 번지는 불이 지금(now) 어느 방에 얼마나 붙어 있는지 — roomProgressAt() 이
// 준 filled(0..1)를 그대로 세기(strength)로 쓴다. 아직 붙지 않은 방(filled<=0)은 뺀다.
// def 에 없는 방(트랙에는 있어도 이 궁 데이터에는 없는 방)은 건너뛴다.
export function fireSourcesAt(def, rush, now) {
  const out = []
  for (const p of roomProgressAt(rush, now)) {
    if (p.filled <= 0) continue
    const room = def.rooms.find(r => r.id === p.id)
    if (!room) continue
    out.push({ x: room.x, z: room.z, strength: p.filled })
  }
  return out
}
