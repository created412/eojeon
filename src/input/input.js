const KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1],  ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0],  ArrowRight: [1, 0],
}

// 글을 쓰는 칸에 커서가 있으면 이 모듈은 키를 건드리지 않는다.
//
// 예전에는 포커스와 무관하게 W·A·S·D·방향키에 preventDefault() 를 걸었다. 그래서
// 어전회의 끝의 「왜 그렇게 정했는가」 칸에 **한 글자도 쓸 수 없었다** — 「왜」를
// 치려면 ㅇ·ㅙ 가 필요한데 자판이 막혀 있었고, 방향키로 커서도 못 옮겼다.
// 그 칸이 이 수업의 산출물(세특의 밑감)이다.
export function isTyping(e) {
  const el = e?.target
  if (!el) return false
  const tag = el.tagName
  return tag === 'TEXTAREA' || tag === 'INPUT' || el.isContentEditable === true
}

// 손가락을 뗄 때 탭으로 볼 것인가 — 14px 안에서 0.6초 안에 뗐으면 탭이다.
export const TAP_MOVE_PX = 14
export const TAP_MS = 600
export function isTap(movedPx, heldMs) { return movedPx <= TAP_MOVE_PX && heldMs <= TAP_MS }

// 자판과 조이스틱을 한 방향으로 — 자판이 눌려 있으면 자판, 아니면 조이스틱(input/joystick.js). 순수 함수.
// 선생님(2026-10-11): 「모바일버전에서는 왼쪽에 작게 움직일수 있는 조이스틱 같은 형태가 있었으면 좋겠어.」
export function mergeAxis(keys, stick) {
  if (keys.x !== 0 || keys.z !== 0) return keys
  if (stick && (stick.x !== 0 || stick.z !== 0)) return { x: stick.x, z: stick.z }
  return { x: 0, z: 0 }
}

export function createInput(target) {
  const down = new Set()
  let shift = false
  let pending = null
  let stick = { x: 0, z: 0 }     // 조이스틱이 넘기는 방향(길이 0~1). 자판이 없을 때만 쓴다.

  const onKeyDown = (e) => {
    if (isTyping(e)) return          // 글 쓰는 중에는 임금을 움직이지 않는다
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shift = true
    if (KEYS[e.code]) { down.add(e.code); e.preventDefault() }
  }
  const onKeyUp = (e) => {
    // keyup 은 글 쓰는 중이어도 지운다 — 키를 누른 채 칸으로 들어가면
    // 그 키가 눌린 채로 남아 임금이 혼자 걸어간다.
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') shift = false
    down.delete(e.code)
  }
  const onBlur = () => { down.clear(); shift = false }
  // 마우스는 누르는 순간이 곧 탭이다. 손가락(touch·pen)은 떼는 순간에 가른다 — 조금만 움직이고 곧 뗐으면
  // 「그곳으로 걷기」, 끌었으면 시점 돌리기(render/scene.js)다. 대는 순간 걷기를 걸면 끌 때마다 임금이 걸어간다(2026-09-14).
  let press = null
  const onPointer = (e) => {
    if (e.button !== 0) return
    if (e.pointerType === 'touch' || e.pointerType === 'pen') { press = { x: e.clientX, y: e.clientY, t: e.timeStamp ?? performance.now() }; return }
    const r = target.getBoundingClientRect()
    pending = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }
  const onPointerUp = (e) => {
    if (!press) return
    const moved = Math.hypot(e.clientX - press.x, e.clientY - press.y)
    const held = (e.timeStamp ?? performance.now()) - press.t
    press = null
    if (!isTap(moved, held)) return
    const r = target.getBoundingClientRect()
    pending = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }

  addEventListener('keydown', onKeyDown)
  addEventListener('keyup', onKeyUp)
  addEventListener('blur', onBlur)
  target.addEventListener('pointerdown', onPointer)
  target.addEventListener('pointerup', onPointerUp)
  target.addEventListener('pointercancel', () => { press = null })

  return {
    axis() {
      let x = 0, z = 0
      for (const code of down) { x += KEYS[code][0]; z += KEYS[code][1] }
      const len = Math.hypot(x, z)
      return mergeAxis(len === 0 ? { x: 0, z: 0 } : { x: x / len, z: z / len }, stick)
    },
    setStick(v) { stick = v && Number.isFinite(v.x) && Number.isFinite(v.z) ? { x: v.x, z: v.z } : { x: 0, z: 0 } },
    running() { return shift },
    tap() { const t = pending; pending = null; return t },
    dispose() {
      removeEventListener('keydown', onKeyDown)
      removeEventListener('keyup', onKeyUp)
      removeEventListener('blur', onBlur)
      target.removeEventListener('pointerdown', onPointer)
      target.removeEventListener('pointerup', onPointerUp)
    },
  }
}
